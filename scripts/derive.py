"""Validación y derivación heurística post-LLM.

Tres capas:
1. `validate_response`: normaliza los campos devueltos por el LLM contra
   los enums cerrados usando fuzzy matching.
2. `derive_all`: ejecuta sobre el dataset completo para poder imputar
   volumen, calcular win rate por segmento y señales agregadas. Recalcula
   el modelo de imputación cada corrida → sin medianas hardcoded.

Ninguna función de este módulo llama a la API del LLM ni tiene side effects
de I/O. Eso vive en `categorize.py`.
"""

import re
from collections import Counter, defaultdict
from difflib import get_close_matches
from statistics import median

from enums import (
    CASO_USO_INTEGRACION_DEFAULT,
    ENUMS,
    HIGH_VOLUME_KEYWORDS,
    OBJECIONES_ENUM,
    PLAN_PRICES,
)


# ── Validación de campos ────────────────────────────────────────
def validate_field(value, field_name):
    """Valida un campo contra su enum. Fuzzy match si no coincide exacto."""
    allowed = ENUMS.get(field_name)
    if not allowed:
        return value

    if value in allowed:
        return value

    matches = get_close_matches(value, allowed, n=1, cutoff=0.4)
    if matches:
        corrected = matches[0]
        print(f"  🔧 {field_name}: '{value}' → '{corrected}'")
        return corrected

    fallback = "Otro" if "Otro" in allowed else allowed[0]
    print(f"  ⚠ {field_name}: '{value}' sin match → '{fallback}'")
    return fallback


def validate_objeciones(objeciones_list):
    """Valida lista de objeciones contra el enum."""
    if not objeciones_list or objeciones_list == ["Ninguna"]:
        return ["Ninguna"]

    validated = []
    for obj in objeciones_list:
        if obj in OBJECIONES_ENUM:
            validated.append(obj)
        else:
            matches = get_close_matches(obj, OBJECIONES_ENUM, n=1, cutoff=0.4)
            if matches:
                print(f"  🔧 objeción: '{obj}' → '{matches[0]}'")
                validated.append(matches[0])

    return validated if validated else ["Ninguna"]


def derive_volumen_mensual(vol_raw):
    """Convierte volumen raw a estimación mensual. None si no hay número."""
    if not vol_raw or vol_raw == "null" or vol_raw == "None":
        return None

    numbers = re.findall(r'(\d+)', vol_raw)
    if not numbers:
        return None

    num = int(numbers[0])
    vol_lower = vol_raw.lower()

    if "semana" in vol_lower:
        return num * 4
    if "mes" in vol_lower:
        return num
    return num * 30  # asumir diario


def validate_response(data):
    """Valida campos del LLM y extrae volumen real. NO imputa — eso va en pasada 2."""
    # Normalizar campo con typo del LLM
    if "necesita_integration" in data and "necesita_integracion" not in data:
        data["necesita_integracion"] = data.pop("necesita_integration")

    for field in ENUMS:
        if field in data:
            data[field] = validate_field(data[field], field)

    if "objeciones" in data:
        data["objeciones"] = validate_objeciones(data["objeciones"])

    data["_vol_real"] = derive_volumen_mensual(data.get("volumen_interacciones_raw", ""))

    # Limpiar campos viejos
    for old_key in ["risk_objeciones_no_resueltas", "risk_integracion_compleja",
                    "risk_caso_uso_no_core", "risk_expectativas_desalineadas",
                    "retention_risk_razones"]:
        data.pop(old_key, None)

    return data


# ── Modelo de imputación dinámico ────────────────────────────────
def build_imputation_model(clients):
    """Construye tablas de medianas y P75 dinámicamente desde los clientes
    que SÍ tienen volumen numérico. Se recalcula cada vez que corre el script."""
    con_dato = [c for c in clients if c.get("_vol_real") is not None]
    if not con_dato:
        return {}, {}, {}, {}, {}

    # Medianas y P75 por segmento (tipo_empresa × patron_demanda)
    segment_vols = defaultdict(list)
    for c in con_dato:
        segment_vols[(c["tipo_empresa"], c["patron_demanda"])].append(c["_vol_real"])

    segment_medians = {}
    segment_p75 = {}
    for key, vols in segment_vols.items():
        vols_sorted = sorted(vols)
        segment_medians[key] = median(vols_sorted)
        p75_idx = int(len(vols_sorted) * 0.75)
        segment_p75[key] = vols_sorted[min(p75_idx, len(vols_sorted) - 1)]

    # Fallback: mediana por tipo_empresa solo
    tipo_vols = defaultdict(list)
    for c in con_dato:
        tipo_vols[c["tipo_empresa"]].append(c["_vol_real"])
    tipo_medians = {t: median(v) for t, v in tipo_vols.items()}

    # Moduladores por caso_uso / feature: ratio de mediana vs global
    global_med = median([c["_vol_real"] for c in con_dato])
    caso_vols = defaultdict(list)
    feature_vols = defaultdict(list)
    for c in con_dato:
        caso_vols[c.get("caso_uso", "Otro")].append(c["_vol_real"])
        feature_vols[c.get("feature_valorada", "")].append(c["_vol_real"])

    caso_mult = {}
    for caso, vols in caso_vols.items():
        ratio = median(vols) / global_med if global_med else 1.0
        caso_mult[caso] = max(0.6, min(1.4, ratio))

    feature_mult = {}
    for feat, vols in feature_vols.items():
        ratio = median(vols) / global_med if global_med else 1.0
        feature_mult[feat] = max(0.7, min(1.3, ratio))

    return segment_medians, segment_p75, tipo_medians, caso_mult, feature_mult


def impute_volumen(data, segment_medians, segment_p75, tipo_medians, caso_mult, feature_mult):
    """Imputa volumen mensual usando estadísticas calculadas del dataset actual."""
    tipo = data.get("tipo_empresa", "")
    patron = data.get("patron_demanda", "Constante")
    caso = data.get("caso_uso", "Otro")
    feature = data.get("feature_valorada", "")
    vol_raw = data.get("volumen_interacciones_raw") or ""

    is_high = any(kw in vol_raw.lower() for kw in HIGH_VOLUME_KEYWORDS)

    # Base: P75 si texto cualitativo alto, si no mediana del segmento
    segment_key = (tipo, patron)
    if is_high and segment_key in segment_p75:
        base = segment_p75[segment_key]
    elif segment_key in segment_medians:
        base = segment_medians[segment_key]
    elif tipo in tipo_medians:
        base = tipo_medians[tipo]
    else:
        base = 2500  # fallback global

    cm = caso_mult.get(caso, 1.0)
    fm = feature_mult.get(feature, 1.0)
    estimated = int(base * cm * fm)

    return round(estimated / 100) * 100


def derive_plan_sugerido(vol_mensual):
    """Asigna plan Vambe según volumen mensual."""
    if vol_mensual is None:
        return "Sin dato"
    if vol_mensual <= 1500:
        return "Standard"
    if vol_mensual <= 2500:
        return "Advanced"
    return "Corporate"


def build_integracion_map(clients):
    """Construye mapa dinámico caso_uso×industria → tipo_integracion más común."""
    by_combo = defaultdict(list)
    for c in clients:
        ti = c.get("tipo_integracion")
        if not ti or ti in ("None", "null", "none", ""):
            continue
        by_combo[(c.get("caso_uso", ""), c.get("industria", ""))].append(ti)

    return {k: Counter(v).most_common(1)[0][0] for k, v in by_combo.items()}


# ── Pasada 2: derivación completa sobre el dataset ───────────────
def derive_all(clients):
    """Construye modelo de imputación del dataset actual y deriva todas las
    métricas por cliente + señales agregadas. Muta `clients` in place."""
    # Recalcular _vol_real (necesario si se carga de JSON guardado)
    for c in clients:
        c["_vol_real"] = derive_volumen_mensual(c.get("volumen_interacciones_raw", ""))

    model_args = build_imputation_model(clients)
    integ_combo = build_integracion_map(clients)

    for data in clients:
        _derive_per_client(data, model_args, integ_combo)

    _derive_dataset_signals(clients)


def _derive_per_client(data, model_args, integ_combo):
    vol_real = data.get("_vol_real")
    if vol_real is not None:
        data["volumen_mensual_estimado"] = vol_real
        data["volumen_es_estimado"] = False
    else:
        data["volumen_mensual_estimado"] = impute_volumen(data, *model_args)
        data["volumen_es_estimado"] = True

    data["plan_sugerido"] = derive_plan_sugerido(data["volumen_mensual_estimado"])

    vol_est = data["volumen_mensual_estimado"]
    if vol_est <= 1500:
        data["tamano_operacion"] = "Small"
    elif vol_est <= 2500:
        data["tamano_operacion"] = "Medium"
    else:
        data["tamano_operacion"] = "Large"

    # tipo_integracion: rellenar si hace falta pero el LLM no especificó
    ti = data.get("tipo_integracion")
    ti_is_null = not ti or ti in ("None", "null", "none", "")
    if data.get("necesita_integracion") is True and ti_is_null:
        combo_key = (data.get("caso_uso", ""), data.get("industria", ""))
        inferred = integ_combo.get(combo_key) or CASO_USO_INTEGRACION_DEFAULT.get(
            data.get("caso_uso", ""), "sistema interno"
        )
        if inferred:
            data["tipo_integracion"] = inferred
            data["tipo_integracion_estimado"] = True
    elif not ti_is_null:
        data["tipo_integracion_estimado"] = False

    data["potencial_expansion"] = (
        data.get("tipo_empresa") == "Startup"
        or data.get("patron_demanda") == "Crecimiento"
    )

    # ── Risk Score (0-5, = cantidad de flags concurrentes) ──
    score = 0
    flags = []

    objeciones = data.get("objeciones", ["Ninguna"])
    tiene_objeciones = objeciones != ["Ninguna"] and len(objeciones) > 0
    if tiene_objeciones:
        score += 1
        flags.append("tiene objeciones")

    necesita_int = data.get("necesita_integracion") is True
    if necesita_int:
        score += 1
        flags.append("requiere integración")

    if data.get("risk_motivacion_reactiva") is True:
        score += 1
        flags.append("motivación reactiva")

    if data.get("urgencia") == "Alta" and necesita_int:
        score += 1
        flags.append("presión de implementación")

    if data.get("tipo_empresa") in ("Startup", "SMB") and necesita_int:
        score += 1
        flags.append("recursos limitados")

    data["retention_risk_score"] = score
    data["retention_risk_flags"] = flags

    # ── ACV / MRR estimado ──
    monthly = PLAN_PRICES.get(data["plan_sugerido"], 0)
    data["acv_estimado"] = monthly * 12
    data["mrr_estimado"] = monthly

    # ── Buyer Readiness (0-4) ──
    readiness = 0
    if data.get("urgencia") == "Alta":
        readiness += 1
    if data.get("sentimiento") == "Entusiasta":
        readiness += 1
    if not data.get("risk_motivacion_reactiva"):
        readiness += 1  # visión largo plazo = más comprometido
    if data.get("patron_demanda") == "Crecimiento":
        readiness += 1
    data["buyer_readiness"] = readiness

    # ── Deal Complexity (0-4) ──
    complexity = 0
    if necesita_int:
        complexity += 1
    if tiene_objeciones:
        complexity += 1
    if data.get("tipo_empresa") == "Empresa Establecida":
        complexity += 1  # más stakeholders
    if len(objeciones) > 1:
        complexity += 1
    data["deal_complexity"] = complexity

    # ── Integration Complexity (0-3) ──
    integ_score = 0
    if necesita_int:
        integ_score += 1
        ti_val = data.get("tipo_integracion", "") or ""
        if any(kw in ti_val.lower() for kw in ["hospital", "legacy", "erp", "sap", "propietario"]):
            integ_score += 1
        if any(kw in ti_val.lower() for kw in ["sistemas", "plataformas", "múltiples"]):
            integ_score += 1
    data["integration_complexity"] = integ_score

    # ── Deal Priority Score (0-10) ──
    value_tier = {"Corporate": 3, "Advanced": 2, "Standard": 1}.get(data["plan_sugerido"], 1)
    raw_priority = (value_tier * (readiness + 1)) / (complexity + 1)
    data["deal_priority_score"] = round(min(10, raw_priority * 10 / 15), 1)

    data.pop("_vol_real", None)


def _derive_dataset_signals(clients):
    """Conversion probability, PMF signal y velocity requieren ver el dataset entero."""
    # Conversion probability: win rate por segmento caso_uso × industria
    seg_wins = defaultdict(lambda: [0, 0])
    for c in clients:
        key = (c.get("caso_uso", ""), c.get("industria", ""))
        seg_wins[key][1] += 1
        if c.get("closed") == 1:
            seg_wins[key][0] += 1

    caso_wins = defaultdict(lambda: [0, 0])
    for c in clients:
        caso_wins[c.get("caso_uso", "")][1] += 1
        if c.get("closed") == 1:
            caso_wins[c.get("caso_uso", "")][0] += 1

    global_wr = sum(1 for c in clients if c.get("closed") == 1) / len(clients) if clients else 0

    for c in clients:
        key = (c.get("caso_uso", ""), c.get("industria", ""))
        wins, total = seg_wins[key]
        if total >= 3:
            c["conversion_probability"] = round(wins / total, 2)
        else:
            cw, ct = caso_wins[c.get("caso_uso", "")]
            c["conversion_probability"] = round(cw / ct, 2) if ct >= 3 else round(global_wr, 2)

    # PMF signal: alta conversión + alto volumen
    for c in clients:
        cp = c.get("conversion_probability", 0)
        vol = c.get("volumen_mensual_estimado", 0)
        high_conversion = cp >= 0.65
        high_volume = vol >= 2500
        if high_conversion and high_volume:
            c["pmf_signal"] = "Fuerte"
        elif high_conversion or high_volume:
            c["pmf_signal"] = "Moderada"
        else:
            c["pmf_signal"] = "Débil"

    # Deal velocity: días hasta cierre basado en readiness y complexity
    for c in clients:
        base_days = 30
        readiness = c.get("buyer_readiness", 0)
        complexity = c.get("deal_complexity", 0)
        days = base_days - (readiness * 5) + (complexity * 10)
        c["estimated_close_days"] = max(7, min(90, days))
