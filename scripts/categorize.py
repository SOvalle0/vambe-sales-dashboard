"""Orquesta la categorización: lee CSV → llama a Gemini → deriva métricas → guarda JSON.

Todas las responsabilidades específicas viven en módulos separados:
- `enums.py`   → listas de valores permitidos
- `prompt.py`  → plantilla del prompt
- `derive.py`  → validación + imputación + señales agregadas

Este archivo se queda solo con el bucle de ejecución y la interacción con la API.
"""

import json
import os
import time

import google.generativeai as genai
import pandas as pd
from dotenv import load_dotenv

from derive import derive_all, validate_response
from prompt import PROMPT_TEMPLATE

load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

model = genai.GenerativeModel("gemini-3.1-flash-lite-preview")

CSV_PATH = "data/vambe_clients.csv"
OUTPUT_PATH = "src/data/clients_categorized.json"


def categorize_client(row):
    """Llama a Gemini con reintentos exponenciales y devuelve el dict validado."""
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
    df = pd.read_csv(CSV_PATH)
    results = []

    if os.path.exists(OUTPUT_PATH):
        with open(OUTPUT_PATH, "r") as f:
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
                # Guardar progreso parcial sin derivaciones (se recalculan al final)
                with open(OUTPUT_PATH, "w") as f:
                    json.dump(results, f, ensure_ascii=False, indent=2)
            time.sleep(2)

    # Pasada 2: derivar todo con modelo dinámico del dataset completo
    print(f"\nDerivando métricas ({len(results)} clientes)...")
    derive_all(results)

    with open(OUTPUT_PATH, "w") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    con_dato = sum(1 for c in results if not c.get("volumen_es_estimado"))
    estimados = sum(1 for c in results if c.get("volumen_es_estimado"))
    print(f"✅ {len(results)} clientes → {OUTPUT_PATH}")
    print(f"   Volumen real: {con_dato} | Imputado: {estimados}")


if __name__ == "__main__":
    main()
