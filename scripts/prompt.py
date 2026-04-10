"""Prompt estructurado para Gemini.

Se mantiene aislado del resto para poder iterar sobre redacción o incluir
diferentes variantes (A/B testing de prompts) sin tocar el código de
ejecución.
"""

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
