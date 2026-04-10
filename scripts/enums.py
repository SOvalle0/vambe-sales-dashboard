"""Enums cerrados para categorización LLM y constantes derivadas.

Separar los enums del código de ejecución permite que el prompt, la validación
y cualquier futura UI de edición lean la misma fuente de verdad.
"""

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

# Keywords usadas para detectar volumen alto cuando el LLM devuelve texto
# cualitativo en lugar de un número.
HIGH_VOLUME_KEYWORDS = [
    "gran cantidad", "gran volumen", "exponencial", "duplica", "triplica",
    "numerosas", "numerosos", "muchísimas", "muchísimos", "masivo", "enorme",
]

# Default de tipo_integracion por caso de uso cuando la transcripción lo
# implica pero no lo nombra explícitamente.
CASO_USO_INTEGRACION_DEFAULT = {
    "Atención al cliente": "CRM o plataforma de gestión",
    "Reservas y Citas": "sistema de citas",
    "Soporte técnico": "sistema de tickets",
    "Ventas y Cotizaciones": "CRM",
    "Gestión de pedidos": "sistema de pedidos",
    "Otro": "sistema interno",
}

# Precios de referencia de los planes Vambe (USD/mes).
PLAN_PRICES = {"Standard": 413, "Advanced": 574, "Corporate": 2173}
