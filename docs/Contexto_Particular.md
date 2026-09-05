# Vambe Sales Intelligence Dashboard
## Guía Estratégica Consolidada — Prueba Técnica Growth Engineer

---

## 1. Tesis del Proyecto: Esto es una herramienta de Growth, no un dashboard

La prueba pide "categorizar transcripciones y mostrar métricas". La mayoría de candidatos va a hacer exactamente eso: un dashboard genérico con gráficos bonitos.

**Nuestra tesis es diferente.** Este proyecto es una herramienta de Growth operativo para Vambe — diseñada como si ya fuéramos parte del equipo. Cada métrica, cada categoría, cada vista responde a una pregunta real del negocio.

### Las preguntas que responde este dashboard:

| Pregunta de negocio | Quién la necesita | Dónde la respondemos |
|---------------------|-------------------|---------------------|
| ¿Por qué se pierden ventas? | Ventas + Growth | Análisis de deals perdidos |
| ¿Qué vendedor necesita coaching? | Sales Manager | Performance de vendedores |
| ¿Qué vertical deberíamos priorizar? | Growth + Marketing | Conversión por industria |
| ¿Qué canal de adquisición es más eficiente? | Growth + Marketing | Conversión por canal |
| ¿Qué cliente va a hacer churn? | CS + Retención | Retention Risk Score |
| ¿Dónde está la fricción del embudo? | Growth Engineer | Análisis del funnel completo |
| ¿Cómo mejorar la retención? | CS + Growth | Señales tempranas de riesgo desde la conversación de venta |

### Esto demuestra las 3 cosas que buscan en el puesto:
- **Mirada estratégica** → Entiendo el negocio, no solo los datos
- **Marketing y Growth** → Pienso en loops, CAC, LTV, retención, no solo en gráficos
- **Programación** → Lo ejecuto técnicamente con criterio de ingeniería

---

## 2. Conexión con el Negocio Real de Vambe

### Lo que sabemos de Vambe:
- Plataforma de "Agentic AI" para comercio conversacional (WhatsApp, IG, FB, Webchat)
- +1.700 clientes en 15 países, crecimiento ~20% MoM
- Serie A de $14M, expandiéndose a Brasil
- Clientes: desde SMBs hasta empresas como Global66, Chevrolet, UAI
- Stack: Anthropic + OpenAI + Gemini (agnósticos en LLM)
- Problema actual confirmado: **retención de clientes**

### Lo que este dashboard aporta al equipo:
1. **Para el equipo de ventas:** Visibilidad de qué funciona y qué no en las reuniones
2. **Para CS/Retención:** Identificar señales de riesgo desde la conversación de venta (clientes que entran con expectativas desalineadas = churn futuro)
3. **Para Growth:** Data accionable sobre qué canales de adquisición traen leads de mayor calidad

---

## 3. Framework de Growth Aplicado (AARRR)

El puesto de Growth Engineer pide: "optimizar la conversión en cada etapa del embudo (acquisition → activation → retention → revenue → referral)". Este dashboard mapea exactamente eso.

### Cómo el dashboard cubre el framework AARRR de Vambe:

**ACQUISITION (Adquisición):**
- Métrica: Conversión por canal de descubrimiento
- Insight: ¿Qué loop de adquisición funciona mejor? (Referidos vs. Conferencias vs. Contenido orgánico vs. Búsqueda)
- Aplicación Growth: Identificar si Vambe depende de loops de pago o tiene loops orgánicos activos. Priorizar loops virales y de contenido sobre los de pago, ya que estos últimos son vulnerables a competidores con mayor flujo de caja.
- Con los datos podemos ver: los referidos (loop viral) vs. Google (loop de contenido) vs. conferencias (loop de pago) — ¿cuál convierte mejor?

**ACTIVATION (Activación):**
- Métrica: Análisis del "momento Aha" en las transcripciones
- Insight: ¿Qué feature o capacidad de Vambe genera el click en el prospecto?
- Aplicación Growth: Si sabemos qué parte de Vambe genera el "Aha" en la reunión de venta, podemos acelerar ese momento en el onboarding.

**RETENTION (Retención):**
- Métrica: Retention Risk Score (nuestro diferenciador)
- Insight: ¿Qué clientes van a hacer churn antes de que empiecen a usar Vambe?
- Aplicación Growth: La reclutadora confirmó que retención es un problema real. La retención es la prueba definitiva de Product Market Fit y la palanca más poderosa para la adquisición. Un Risk Score desde la venta permite intervención proactiva antes de que el cliente entre en "espiral de muerte".

**REVENUE (Monetización):**
- Métrica: Tamaño de operación × Conversión
- Insight: ¿A qué tamaño de cliente apuntar para maximizar revenue?
- Aplicación Growth: Calibración de fricción — ¿estamos vendiendo a clientes Small que generan bajo ARPU o a clientes Large con ciclos de venta más largos pero mayor LTV?

**REFERRAL (Referencia):**
- Métrica: % de leads que llegaron por referido × su tasa de cierre
- Insight: ¿El loop viral está funcionando? ¿Los referidos cierran más?
- Aplicación Growth: Si los referidos convierten mejor, hay una oportunidad de construir un loop de referencia formal.

### Vambe como sistema — Diagnóstico estratégico:

1. **Alineación de Misión** → ¿Los clientes que cierran son los que Vambe debería atender? (verticales core vs. edge cases)
2. **Auditoría de Adquisición** → ¿Dependemos de canales de pago o hay loops orgánicos? (canal de descubrimiento × cierre)
3. **Fugas de Retención** → ¿El problema es captación o que los clientes no llegan al "momento Aha"? (Retention Risk Score)
4. **Calibración de Fricción** → ¿Hay verticales con alta urgencia pero baja conversión? (urgencia × cierre por vertical)
5. **Barreras de Defensa** → ¿Estamos construyendo activos de datos con estas transcripciones? (esto mismo es un activo — Macroloop de Datos)

### De observación a experimentación — Lo que haría con estos datos (Semana 2+)

El dashboard es el punto de partida, no el destino. El valor real está en las hipótesis que genera y los experimentos que permite correr. Estos son ejemplos concretos de lo que propondría al equipo:

| Hipótesis | Experimento | Métrica de éxito | Etapa AARRR |
|-----------|-------------|-------------------|-------------|
| Los referidos convierten 2x más que leads de conferencias | Lanzar programa de referral formal vs. invertir en 2 conferencias más este Q | Tasa de cierre por canal + CAC por canal | Acquisition |
| Los clientes que valoran feature X tienen menor churn | Rediseñar onboarding para que el "momento Aha" de esa feature ocurra en los primeros 15 min | Time-to-value + retención a 30 días | Activation |
| Clientes con Risk Score ≥ 7 hacen churn 3x más | Crear alerta automática para CS cuando cierra un deal con score alto → intervención proactiva en onboarding | Churn rate en cohorte intervenida vs. control | Retention |
| La vertical X tiene alta urgencia pero baja conversión → el pitch no está calibrado | Test de 2 scripts de venta distintos para esa vertical (A: enfocado en ROI, B: enfocado en ease-of-use) | Tasa de cierre vertical X pre vs. post | Activation |
| Los clientes Large tienen ciclos largos pero mejor LTV | Crear fast-track de onboarding para Large con dedicated CSM | Revenue por cohorte Large + NPS a 60 días | Revenue |

**Por qué incluir esto:** El puesto dice "diseñar y ejecutar experimentos de growth para validar hipótesis" y "A/B testing, automatizaciones, funnels, onboardings". El dashboard genera las hipótesis; estos experimentos demuestran que pienso como Growth Engineer, no como Data Analyst.

### Extensibilidad y automatización (visión de producción)

La prueba es un dataset estático, pero el diseño está pensado para escalar. Esto es lo que documentaría como "next steps" en la entrega:

- **Automatización del pipeline:** Conectar `categorize.py` a un webhook que se dispare cuando se sube una nueva transcripción al CRM (Vambe Axis/Connect) → categorización automática en tiempo real, sin intervención manual.
- **Alertas de retención:** Si un deal se cierra con Risk Score ≥ 7, trigger automático a Slack del equipo de CS con el resumen ejecutivo y las razones del score. Intervención proactiva antes del onboarding.
- **Integración con herramientas de marketing:** Exportar segmentos del dashboard (ej: verticales con alta conversión) a herramientas de ads o email para crear audiencias lookalike.
- **Loop de feedback:** Cuando CS marca un cliente como churned, actualizar el modelo para validar si el Risk Score fue predictivo y recalibrar los criterios.

Esto no se construye en la prueba, pero se documenta para mostrar que pienso en "integrar y automatizar herramientas de marketing, ventas y producto para escalar procesos" — que es responsabilidad explícita del puesto.

---

## 4. Dimensiones de Categorización (LLM)

Cada dimensión responde a una necesidad estratégica. Están organizadas por su función en el framework de Growth.

### 4.1 Dimensiones del Cliente (Quién es)

| Dimensión | Valores posibles | Función Growth | Por qué importa para Vambe |
|-----------|-----------------|----------------|----------------------------|
| **Industria/Vertical** | Fintech, E-commerce, Salud, Educación, Logística, Food & Beverage, Servicios profesionales, Tecnología, Retail, etc. | Acquisition: ¿Qué vertical priorizar? | Permite identificar verticales con mayor tasa de cierre y priorizar esfuerzos de adquisición |
| **Tamaño de operación** | Small (<100 interacciones/día), Medium (100-300/día), Large (300+/día) | Revenue: ¿Correlación tamaño-cierre? | Correlacionar tamaño con conversión y ticket potencial |
| **Tipo de empresa** | Startup, SMB, Empresa Establecida, ONG | Activation: ¿Quién necesita qué onboarding? | Segmentación para personalizar approach de venta |

### 4.2 Dimensiones del Problema (Qué necesita)

| Dimensión | Valores posibles | Función Growth | Por qué importa |
|-----------|-----------------|----------------|-----------------|
| **Pain point principal** | Sobrecarga operativa, Picos de demanda, Crecimiento inmanejable, Expansión internacional, Calidad de servicio | Activation: ¿Qué dolor genera el "Aha"? | Entender qué motiva la compra para mejorar messaging y pitch |
| **Caso de uso** | Atención al cliente, Reservas/Citas, Soporte técnico, Ventas/Cotizaciones, Gestión de pedidos | Retention: ¿Qué caso de uso retiene más? | Alinear producto con necesidades reales del mercado |
| **Necesidad de integración** | Sí/No + tipo (CRM, citas, e-commerce, tickets, ERP) | Retention: más integrado = mayor costo de cambio = menor churn | Indica complejidad de implementación y potencial de retención |

### 4.3 Dimensiones de la Venta (Cómo llegó y cómo fue)

| Dimensión | Valores posibles | Función Growth | Por qué importa |
|-----------|-----------------|----------------|-----------------|
| **Canal de descubrimiento** | Conferencia/Evento, Referido/Colega, Búsqueda orgánica, Contenido online, LinkedIn, Webinar, Podcast, Foro | Acquisition: ¿Qué loop funciona? | Optimizar CAC por canal — saber qué canal trae leads que cierran |
| **Nivel de urgencia** | Alta, Media, Baja | Revenue: priorización de pipeline | Priorización de pipeline para vendedores |
| **Sentimiento/Temperatura** | Entusiasta, Interesado, Cauteloso, Escéptico | Activation: señal predictiva de cierre | Señal predictiva de cierre y de retención futura |
| **Objeciones detectadas** | Privacidad/Confidencialidad, Pérdida de toque personal, Complejidad técnica, Costo, Escalabilidad | Activation: mejorar el pitch | Insight para mejorar el pitch y anticipar objeciones en ventas futuras |

### 4.4 Dimensión Estratégica: Retention Risk Score (DIFERENCIADOR)

**Concepto:** Score de 1-10 generado por el LLM que predice riesgo de churn futuro, basado en:

- ¿El cliente tiene expectativas realistas sobre lo que la IA puede hacer?
- ¿El caso de uso es core para Vambe o edge case?
- ¿Hay señales de que está buscando una "bala de plata" sin compromiso interno?
- ¿Menciona necesidades de integración complejas que podrían dificultar el onboarding?
- ¿Su motivación es reactiva (apagar incendio) o estratégica (mejorar operación)?

**Criterios de scoring:**
- 1-3 (bajo riesgo): Caso de uso claro y core, expectativas realistas, motivación estratégica, equipo interno comprometido
- 4-6 (riesgo medio): Caso de uso viable pero con complejidades, algunas expectativas que podrían no cumplirse, integraciones moderadas
- 7-10 (alto riesgo): Expectativas desalineadas, caso de uso edge, busca solución mágica sin compromiso, integraciones muy complejas, motivación puramente reactiva

**Por qué esto es poderoso:** Le dice al equipo de CS antes de que el cliente empiece a usar Vambe qué tan probable es que tenga problemas. Permite intervención proactiva. Transforma datos de venta en un activo de retención — un Macroloop de Datos.

### 4.5 Campo adicional: `feature_valorada`

Detecta qué capacidad de Vambe generó el "momento Aha" en la conversación. Esto alimenta directamente la estrategia de Activation — si sabemos qué feature genera el click, podemos acelerar ese momento en el onboarding.

---

## 5. Mapeo AARRR del Dashboard (Vistas Core)

*(Nota: La estructura técnica exacta y los gráficos de cada vista se detallan en `Paso_a_Paso.md` en la sección "Fase 1C: Construcción del Dashboard y Vistas Core").*

El dashboard se diseña para visualizar directamente este framework, agrupándose en las siguientes responsabilidades de negocio:

1.  **Overview (Métricas Core y Adquisición/Activación):**
    ¿Cuántos prospectos evaluamos? ¿Cuál es el Win Rate real? ¿De qué industria vienen (Acquisition) y qué casos de uso buscan (Activation)?
2.  **Explorador de Clientes (Tabla Interactiva):**
    El buscador y filtros robustos exigidos en la prueba. Permite al usuario "hablar con la base de datos", buscando nombres específicos o filtrando por canales.
3.  **Análisis de Conversión (Revenue):**
    Visualiza embudos cruzados. Si "Urgencia = Inmediato", ¿el Win Rate es 100%? Si "Industria = Retail", ¿cerramos más deals? Entrelaza los campos generados por el LLM directamente con el outcome de negocio.

---

## 6. Arquitectura Técnica

*(Toda la arquitectura, flujo de datos y decisiones del stack tecnológico han sido movidas a su documento oficial final: `DECISIONES.md`. Consulta ese archivo para los detalles de implementación).*

---

## 7. Prompt Engineering para Gemini

### Prompt completo:

```
Eres un analista senior de ventas de Vambe.ai, una plataforma de IA 
conversacional para comercio en Latinoamérica.

Tu trabajo es analizar transcripciones de reuniones de ventas y extraer 
dimensiones estratégicas que ayuden al equipo de Growth a tomar decisiones.

TRANSCRIPCIÓN DE LA REUNIÓN:
"{transcripcion}"

CONTEXTO:
- Vendedor asignado: {vendedor}
- Fecha de reunión: {fecha}

Analiza la transcripción y responde ÚNICAMENTE con un JSON válido 
(sin markdown, sin explicaciones) con esta estructura exacta:

{
  "industria": "sector específico del cliente",
  "tipo_empresa": "Startup | SMB | Empresa Establecida | ONG",
  "tamano_operacion": "Small | Medium | Large",
  "volumen_interacciones_raw": "texto exacto mencionado sobre volumen",
  "pain_point_principal": "dolor principal que los trae a Vambe",
  "caso_uso": "Atención al cliente | Reservas y Citas | Soporte técnico | Ventas y Cotizaciones | Gestión de pedidos | Otro",
  "necesita_integracion": true o false,
  "tipo_integracion": "tipo de sistema mencionado o null",
  "canal_descubrimiento": "Conferencia o Evento | Referido | Búsqueda orgánica | Contenido online | LinkedIn | Webinar | Podcast | Foro",
  "urgencia": "Alta | Media | Baja",
  "sentimiento": "Entusiasta | Interesado | Cauteloso | Escéptico",
  "objeciones": ["lista de preocupaciones detectadas"],
  "retention_risk_score": número del 1 al 10,
  "retention_risk_razones": ["razones del score asignado"],
  "feature_valorada": "qué capacidad de Vambe mencionó como más importante",
  "resumen_ejecutivo": "2 oraciones máximo resumiendo al prospecto"
}

CRITERIOS PARA EL RETENTION RISK SCORE:
- 1-3 (bajo riesgo): Caso de uso claro y core, expectativas realistas, 
  motivación estratégica, equipo interno comprometido
- 4-6 (riesgo medio): Caso de uso viable pero con complejidades, 
  algunas expectativas que podrían no cumplirse, integraciones moderadas
- 7-10 (alto riesgo): Expectativas desalineadas, caso de uso edge, 
  busca solución mágica sin compromiso, integraciones muy complejas,
  motivación puramente reactiva
```

---

---

## 9. Checklist de Requisitos Explícitos

Mapeo directo entre lo que piden y lo que entregamos:

| Requisito explícito | ✅ | Dónde |
|---------------------|---|-------|
| Procesar CSV con datos de clientes | ✅ | Script Python lee CSV |
| Definir dimensiones de categorización | ✅ | 13 dimensiones + Risk Score + Feature Valorada |
| Usar LLM para categorizar automáticamente | ✅ | Gemini API |
| El modelo identifica correctamente las categorías | ✅ | Prompt estructurado con JSON estricto |
| Panel interactivo | ✅ | React app con filtros |
| Visualizar métricas | ✅ | KPIs + gráficos Recharts |
| Gráficos o tablas con insights | ✅ | Análisis de conversión + tabla detallada |
| **Búsquedas y filtrados precisos** | ✅ | **Tabla como componente central** con búsqueda por nombre y filtros múltiples |
| Métricas consideran categorías del LLM | ✅ | Todas las métricas cruzan categorías LLM con datos originales |
| Código limpio, modular, bien estructurado | ✅ | Componentes React separados, script Python modular |
| Definición innovadora de categorías | ✅ | Retention Risk Score + Feature Valorada |
| Propuesta de valor clara | ✅ | Framework AARRR aplicado a Vambe |
| Interfaz intuitiva y amigable | ✅ | Diseño profesional con Tailwind |
| README con instrucciones locales | ✅ | Fase 3 |
| Documentación de arquitectura y decisiones | ✅ | Fase 3 |
| Repositorio en GitHub | ✅ | Desde Día 1 |
| Link funcional de la aplicación | ✅ | Vercel deploy en Día 3 |

---

## 10. Decisiones Clave (para documentación de entrega)

*(Las justificaciones sobre las dimensiones elegidas, la exclusión del campo `closed` en el prompt, y el resto de las decisiones estratégicas de ingeniería han sido oficializadas y movidas al archivo `DECISIONES.md` para la entrega final).*

---

## 11. Narrativa y Posicionamiento

### Para la presentación:
> "No construí solo un dashboard — construí la herramienta que usaría mi primer día como Growth Engineer en Vambe. Una que responde: ¿dónde invertir en adquisición? ¿qué vendedor necesita coaching? ¿qué cliente va a hacer churn antes de que pase? Todo alimentado por IA, todo mapeado al framework AARRR, todo accionable."

### Lo que comunica sobre mí como candidato:
1. **Entiendo Growth** — Cada métrica conecta con Acquisition, Activation, Retention, Revenue o Referral
2. **Entiendo Vambe** — Investigué el negocio, conozco sus clientes, su stack, su problema de retención
3. **Ejecuto con criterio** — Stack eficiente, fases claras, priorización brutal
4. **Anticipo problemas** — El Risk Score ataca retención desde la venta, no reactivamente
5. **Sé comunicar** — La documentación cuenta una historia de negocio, no solo describe código
6. **Pienso en sistemas** — No veo datos aislados, veo loops y palancas de crecimiento
