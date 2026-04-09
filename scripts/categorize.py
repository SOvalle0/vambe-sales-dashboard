import os
import json
import time
import pandas as pd
from dotenv import load_dotenv
from concurrent.futures import ThreadPoolExecutor, as_completed
from difflib import get_close_matches
import google.generativeai as genai

load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

model = genai.GenerativeModel("gemini-3.1-flash-lite-preview")

# ── Enums cerrados ──────────────────────────────────────────────
ENUMS = {
    "industria": [
        "Tecnología",
        "E-commerce",
        "Salud",
        "Educación",
        "Servicios prof.",
        "Food & Bev.",
        "Turismo",
        "Logística",
        "Ind. creativa",
        "Otro",
    ],
    "tipo_empresa": ["Startup", "SMB", "Empresa Establecida", "ONG"],
    "caso_uso": [
        "Atención al cliente",
        "Reservas y Citas",
        "Soporte técnico",
        "Ventas y Cotizaciones",
        "Gestión de pedidos",
        "Otro",
    ],
    "canal_descubrimiento": [
        "Conferencia o Evento",
        "Referido",
        "Búsqueda orgánica",
        "Contenido online",
        "LinkedIn",
        "Webinar",
        "Podcast",
        "Foro",
    ],
    "urgencia": ["Alta", "Media", "Baja"],
    "sentimiento": ["Entusiasta", "Interesado", "Cauteloso", "Escéptico"],
    "pain_point_principal": [
        "Sobrecarga operativa",
        "Picos de demanda estacionales",
        "Crecimiento inmanejable",
        "Calidad de servicio en riesgo",
        "Expansión geográfica/internacional",
        "Ineficiencia en procesos manuales",
    ],
    "patron_demanda": ["Constante", "Estacional", "Crecimiento"],
    "feature_valorada": [
        "Automatización de respuestas",
        "Personalización del tono de marca",
        "Integración con sistemas existentes",
        "Escalabilidad en picos de demanda",
        "Clasificación inteligente de consultas",
        "Respuestas en tiempo real",
    ],
}

OBJECIONES_ENUM = [
    "Pérdida del toque personal",
    "Complejidad técnica de integración",
    "Precisión/calidad de respuestas",
    "Confidencialidad de datos",
    "Ninguna",
]

# ── Prompt ──────────────────────────────────────────────────────
PROMPT_TEMPLATE = """Eres un analista senior de ventas de Vambe.ai, una plataforma de IA conversacional para comercio en Latinoamérica.

Analiza esta transcripción de reunión de ventas y responde las preguntas sobre el prospecto.

TRANSCRIPCIÓN:
"{transcripcion}"

CONTEXTO:
- Vendedor: {vendedor}
- Fecha: {fecha}

Responde ÚNICAMENTE con un JSON válido (sin markdown, sin explicaciones). Elige EXACTAMENTE entre los valores permitidos.

{{
  "industria": "¿En qué sector opera el negocio del cliente? Elige: Tecnología | E-commerce | Salud | Educación | Servicios prof. | Food & Bev. | Turismo | Logística | Ind. creativa | Otro",
  "tipo_empresa": "¿Qué tan grande y establecida es la organización según lo que describe? Elige: Startup | SMB | Empresa Establecida | ONG",
  "pain_point_principal": "¿Qué problema concreto los motivó a buscar una solución como Vambe? Elige: Sobrecarga operativa | Picos de demanda estacionales | Crecimiento inmanejable | Calidad de servicio en riesgo | Expansión geográfica/internacional | Ineficiencia en procesos manuales",
  "caso_uso": "¿Para qué proceso específico quieren usar Vambe? Elige: Atención al cliente | Reservas y Citas | Soporte técnico | Ventas y Cotizaciones | Gestión de pedidos | Otro",
  "necesita_integracion": "¿El cliente menciona que necesita conectar Vambe con algún sistema que ya usan? true o false",
  "tipo_integracion": "Si necesita integración, ¿qué sistema específico mencionan? texto o null",
  "canal_descubrimiento": "¿Cómo cuenta el cliente que se enteró de Vambe? Elige: Conferencia o Evento | Referido | Búsqueda orgánica | Contenido online | LinkedIn | Webinar | Podcast | Foro",
  "urgencia": "Según el lenguaje del cliente, ¿qué tan urgente es su necesidad? Elige: Alta | Media | Baja",
  "sentimiento": "¿Cuál es la actitud general del cliente hacia implementar IA en su negocio? Elige: Entusiasta | Interesado | Cauteloso | Escéptico",
  "objeciones": ["¿Qué preocupaciones o dudas expresó sobre la implementación? Elige de: Pérdida del toque personal | Complejidad técnica de integración | Precisión/calidad de respuestas | Confidencialidad de datos | Ninguna"],
  "risk_motivacion_reactiva": "¿El cliente habla solo de apagar un problema inmediato, o también menciona mejoras a largo plazo? true si solo urgencia inmediata, false si menciona estrategia o crecimiento",
  "volumen_interacciones_raw": "¿Cuántas interacciones con clientes manejan? Cita el texto exacto o null si no lo mencionan",
  "patron_demanda": "¿La demanda del cliente es constante o tiene picos? Elige: Constante | Estacional | Crecimiento",
  "feature_valorada": "¿Qué capacidad de Vambe generó más interés o entusiasmo en el cliente? Elige: Automatización de respuestas | Personalización del tono de marca | Integración con sistemas existentes | Escalabilidad en picos de demanda | Clasificación inteligente de consultas | Respuestas en tiempo real",
  "resumen_ejecutivo": "Resume quién es este prospecto y qué busca en 2 oraciones"
}}"""


# ── Validación post-LLM ────────────────────────────────────────
def validate_field(value, field_name):
    """Valida un campo contra su enum. Fuzzy match si no coincide exacto."""
    allowed = ENUMS.get(field_name)
    if not allowed:
        return value

    if value in allowed:
        return value

    # Fuzzy match
    matches = get_close_matches(value, allowed, n=1, cutoff=0.4)
    if matches:
        corrected = matches[0]
        print(f"  🔧 {field_name}: '{value}' → '{corrected}'")
        return corrected

    # Sin match razonable
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
    import re
    if not vol_raw or vol_raw == "null" or vol_raw == "None":
        return None

    numbers = re.findall(r'(\d+)', vol_raw)
    if not numbers:
        return None

    num = int(numbers[0])
    vol_lower = vol_raw.lower()

    if "semana" in vol_lower:
        return num * 4
    elif "mes" in vol_lower:
        return num
    else:  # asumir diario
        return num * 30


# ── Imputación dinámica de volumen ────────────────────────────
HIGH_VOLUME_KEYWORDS = [
    "gran cantidad", "gran volumen", "exponencial", "duplica", "triplica",
    "numerosas", "numerosos", "muchísimas", "muchísimos", "masivo", "enorme",
]


def build_imputation_model(clients):
    """Construye tablas de medianas y P75 dinámicamente desde los clientes
    que SÍ tienen volumen numérico. Se recalcula cada vez que corre el script."""
    from statistics import median
    from collections import defaultdict

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

    # Moduladores por caso_uso: ratio de mediana del grupo vs mediana global
    global_med = median([c["_vol_real"] for c in con_dato])
    caso_vols = defaultdict(list)
    feature_vols = defaultdict(list)
    for c in con_dato:
        caso_vols[c.get("caso_uso", "Otro")].append(c["_vol_real"])
        feature_vols[c.get("feature_valorada", "")].append(c["_vol_real"])

    caso_mult = {}
    for caso, vols in caso_vols.items():
        ratio = median(vols) / global_med if global_med else 1.0
        caso_mult[caso] = max(0.6, min(1.4, ratio))  # clamp entre 0.6 y 1.4

    feature_mult = {}
    for feat, vols in feature_vols.items():
        ratio = median(vols) / global_med if global_med else 1.0
        feature_mult[feat] = max(0.7, min(1.3, ratio))  # clamp entre 0.7 y 1.3

    return segment_medians, segment_p75, tipo_medians, caso_mult, feature_mult


def impute_volumen(data, segment_medians, segment_p75, tipo_medians, caso_mult, feature_mult):
    """Imputa volumen mensual usando estadísticas calculadas del dataset actual."""
    tipo = data.get("tipo_empresa", "")
    patron = data.get("patron_demanda", "Constante")
    caso = data.get("caso_uso", "Otro")
    feature = data.get("feature_valorada", "")
    vol_raw = data.get("volumen_interacciones_raw") or ""

    is_high = any(kw in vol_raw.lower() for kw in HIGH_VOLUME_KEYWORDS)

    # Base: P75 si texto cualitativo alto, sino mediana del segmento
    segment_key = (tipo, patron)
    if is_high and segment_key in segment_p75:
        base = segment_p75[segment_key]
    elif segment_key in segment_medians:
        base = segment_medians[segment_key]
    elif tipo in tipo_medians:
        base = tipo_medians[tipo]
    else:
        base = 2500  # fallback global

    # Moduladores dinámicos
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
    elif vol_mensual <= 2500:
        return "Advanced"
    else:
        return "Corporate"


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

    # Extraer volumen real (puede ser None)
    vol_raw = data.get("volumen_interacciones_raw", "")
    data["_vol_real"] = derive_volumen_mensual(vol_raw)

    # Limpiar campos viejos
    for old_key in ["risk_objeciones_no_resueltas", "risk_integracion_compleja",
                    "risk_caso_uso_no_core", "risk_expectativas_desalineadas",
                    "retention_risk_razones"]:
        data.pop(old_key, None)

    return data


CASO_USO_INTEGRACION_DEFAULT = {
    "Atención al cliente": "CRM o plataforma de gestión",
    "Reservas y Citas": "sistema de citas",
    "Soporte técnico": "sistema de tickets",
    "Ventas y Cotizaciones": "CRM",
    "Gestión de pedidos": "sistema de pedidos",
    "Otro": "sistema interno",
}


def build_integracion_map(clients):
    """Construye mapa dinámico caso_uso×industria → tipo_integracion más común."""
    from collections import defaultdict, Counter

    by_combo = defaultdict(list)

    for c in clients:
        ti = c.get("tipo_integracion")
        if not ti or ti in ("None", "null", "none", ""):
            continue
        by_combo[(c.get("caso_uso", ""), c.get("industria", ""))].append(ti)

    combo_map = {k: Counter(v).most_common(1)[0][0] for k, v in by_combo.items()}
    return combo_map


def derive_all(clients):
    """Pasada 2: construye modelo de imputación del dataset actual y deriva todo."""
    # Recalcular _vol_real para todos (necesario si se carga de JSON guardado)
    for c in clients:
        c["_vol_real"] = derive_volumen_mensual(c.get("volumen_interacciones_raw", ""))

    model_args = build_imputation_model(clients)
    integ_combo = build_integracion_map(clients)

    for data in clients:
        vol_real = data.get("_vol_real")
        if vol_real is not None:
            data["volumen_mensual_estimado"] = vol_real
            data["volumen_es_estimado"] = False
        else:
            data["volumen_mensual_estimado"] = impute_volumen(data, *model_args)
            data["volumen_es_estimado"] = True

        data["plan_sugerido"] = derive_plan_sugerido(data["volumen_mensual_estimado"])
        # Derivar tamaño de operación basado en el volumen derivado
        if data["volumen_mensual_estimado"] <= 1500:
            data["tamano_operacion"] = "Small"
        elif data["volumen_mensual_estimado"] <= 2500:
            data["tamano_operacion"] = "Medium"
        else:
            data["tamano_operacion"] = "Large"

        # tipo_integracion: rellenar si necesita pero Gemini no especificó cuál
        ti = data.get("tipo_integracion")
        ti_is_null = not ti or ti in ("None", "null", "none", "")
        if data.get("necesita_integracion") is True and ti_is_null:
            combo_key = (data.get("caso_uso", ""), data.get("industria", ""))
            inferred = integ_combo.get(combo_key) or CASO_USO_INTEGRACION_DEFAULT.get(data.get("caso_uso", ""), "sistema interno")
            if inferred:
                data["tipo_integracion"] = inferred
                data["tipo_integracion_estimado"] = True
        elif not ti_is_null:
            data["tipo_integracion_estimado"] = False

        # Potencial de expansión
        data["potencial_expansion"] = (
            data.get("tipo_empresa") == "Startup"
            or data.get("patron_demanda") == "Crecimiento"
        )

        # ── Risk Score (0-5) ──
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

        # Mapeo a la escala 1-10 documentada en Estructura_Dashboard
        # 0->1, 1->3, 2->5, 3->7, 4->9, 5->10
        escala_1_10 = {0: 1, 1: 3, 2: 5, 3: 7, 4: 9, 5: 10}
        data["retention_risk_score"] = escala_1_10.get(score, 1)
        data["retention_risk_flags"] = flags

        # ── ACV estimado (Annual Contract Value) ──
        plan_monthly = {"Standard": 413, "Advanced": 574, "Corporate": 2173}
        monthly = plan_monthly.get(data["plan_sugerido"], 0)
        data["acv_estimado"] = monthly * 12
        data["mrr_estimado"] = monthly

        # ── Buyer Readiness (0-4): qué tan listo para comprar ──
        readiness = 0
        if data.get("urgencia") == "Alta":
            readiness += 1
        if data.get("sentimiento") == "Entusiasta":
            readiness += 1
        if not data.get("risk_motivacion_reactiva"):
            readiness += 1  # visión largo plazo = más comprometido
        if data.get("patron_demanda") == "Crecimiento":
            readiness += 1  # necesidad creciente = más motivación de compra
        data["buyer_readiness"] = readiness

        # ── Deal Complexity (0-4): qué tan difícil es cerrar/implementar ──
        complexity = 0
        if necesita_int:
            complexity += 1
        if tiene_objeciones:
            complexity += 1
        if data.get("tipo_empresa") == "Empresa Establecida":
            complexity += 1  # más stakeholders, burocracia
        if len(objeciones) > 1:
            complexity += 1  # múltiples objeciones = más fricción
        data["deal_complexity"] = complexity

        # ── Integration Complexity (0-3): para priorización de Producto ──
        integ_score = 0
        if necesita_int:
            integ_score += 1
            ti = data.get("tipo_integracion", "")
            # Sistemas legacy/hospitalarios/propietarios son más complejos
            if any(kw in ti.lower() for kw in ["hospital", "legacy", "erp", "sap", "propietario"]):
                integ_score += 1
            # Múltiples sistemas o "sistemas" en plural
            if any(kw in ti.lower() for kw in ["sistemas", "plataformas", "múltiples"]):
                integ_score += 1
        data["integration_complexity"] = integ_score

        # ── Deal Priority Score (0-10): ¿a quién persigo primero? ──
        # Fórmula: (valor × readiness) / (complexity + 1), normalizado a 0-10
        value_tier = {"Corporate": 3, "Advanced": 2, "Standard": 1}.get(data["plan_sugerido"], 1)
        raw_priority = (value_tier * (readiness + 1)) / (complexity + 1)
        # raw_priority range: min=1*1/5=0.2, max=3*5/1=15 → normalizar a 0-10
        data["deal_priority_score"] = round(min(10, raw_priority * 10 / 15), 1)

        # Limpiar campo temporal
        data.pop("_vol_real", None)

    # ── Métricas que requieren el dataset completo (pasada sobre todos) ──

    # Conversion probability: win rate dinámico por segmento caso_uso × industria
    from collections import defaultdict
    seg_wins = defaultdict(lambda: [0, 0])  # [wins, total]
    for c in clients:
        key = (c.get("caso_uso", ""), c.get("industria", ""))
        seg_wins[key][1] += 1
        if c.get("closed") == 1:
            seg_wins[key][0] += 1

    # Fallback: win rate por caso_uso solo
    caso_wins = defaultdict(lambda: [0, 0])
    for c in clients:
        caso_wins[c.get("caso_uso", "")][1] += 1
        if c.get("closed") == 1:
            caso_wins[c.get("caso_uso", "")][0] += 1

    global_wr = sum(1 for c in clients if c.get("closed") == 1) / len(clients) if clients else 0

    for c in clients:
        key = (c.get("caso_uso", ""), c.get("industria", ""))
        wins, total = seg_wins[key]
        if total >= 3:  # mínimo 3 para que sea estadísticamente algo
            c["conversion_probability"] = round(wins / total, 2)
        else:
            cw, ct = caso_wins[c.get("caso_uso", "")]
            c["conversion_probability"] = round(cw / ct, 2) if ct >= 3 else round(global_wr, 2)

    # Product-Market Fit signal: segmentos con alta conversión + alto volumen
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

    # Deal velocity: días estimados hasta cierre basado en readiness y complexity
    for c in clients:
        base_days = 30
        readiness = c.get("buyer_readiness", 0)
        complexity = c.get("deal_complexity", 0)
        # Más ready = más rápido, más complejo = más lento
        days = base_days - (readiness * 5) + (complexity * 10)
        c["estimated_close_days"] = max(7, min(90, days))


# ── Core ────────────────────────────────────────────────────────
def categorize_client(row):
    prompt = PROMPT_TEMPLATE.format(
        transcripcion=row["Transcripcion"],
        vendedor=row["Vendedor asignado"],
        fecha=row["Fecha de la Reunion"],
    )

    for attempt in range(3):
        try:
            response = model.generate_content(prompt)
            text = response.text.strip()
            if text.startswith("```"):
                text = text.split("\n", 1)[1]
                text = text.rsplit("```", 1)[0]
            parsed = json.loads(text)
            return validate_response(parsed)
        except Exception as e:
            error_str = str(e)
            print(f"  Intento {attempt + 1} falló: {e}")

            # Cuota diaria agotada → no tiene sentido reintentar
            if "PerDay" in error_str or "per day" in error_str.lower():
                print("  ❌ Cuota diaria agotada. Re-correr mañana.")
                return None

            wait = 15 if "429" in error_str else 2 ** attempt
            print(f"  Esperando {wait}s...")
            time.sleep(wait)

    return None


def process_row(i, row, total):
    print(f"[{i+1}/{total}] {row['Nombre']}...")
    categories = categorize_client(row)
    if categories is None:
        print(f"  ⚠ No se pudo categorizar a {row['Nombre']}")
        return None

    categories["nombre"] = row["Nombre"]
    categories["correo"] = row["Correo Electronico"]
    categories["telefono"] = str(row["Numero de Telefono"])
    categories["fecha_reunion"] = row["Fecha de la Reunion"]
    categories["vendedor"] = row["Vendedor asignado"]
    categories["closed"] = int(row["closed"])
    return categories


def main():
    df = pd.read_csv("data/vambe_clients.csv")
    output_path = "data/clients_categorized.json"
    results = []

    if os.path.exists(output_path):
        with open(output_path, "r") as f:
            results = json.load(f)
        print(f"Progreso anterior: {len(results)} clientes")

    processed_names = {r["nombre"] for r in results}
    pending = [(i, row) for i, row in df.iterrows() if row["Nombre"] not in processed_names]

    if pending:
        print(f"Procesando {len(pending)} clientes (secuencial, 2s delay)...\n")
        for i, row in pending:
            result = process_row(i, row, len(df))
            if result:
                results.append(result)
                # Guardar progreso parcial (solo validación, sin derivaciones)
                with open(output_path, "w") as f:
                    json.dump(results, f, ensure_ascii=False, indent=2)
            time.sleep(2)

    # Pasada 2: derivar todo con modelo dinámico del dataset completo
    print(f"\nDerivando métricas ({len(results)} clientes)...")
    derive_all(results)

    with open(output_path, "w") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    con_dato = sum(1 for c in results if not c.get("volumen_es_estimado"))
    estimados = sum(1 for c in results if c.get("volumen_es_estimado"))
    print(f"✅ {len(results)} clientes → {output_path}")
    print(f"   Volumen real: {con_dato} | Imputado: {estimados}")


if __name__ == "__main__":
    main()
