# Arquitectura y Decisiones Clave — Vambe Sales Intelligence

Este documento explica las decisiones de ingeniería y diseño detrás de la solución técnica entregada para la prueba de Growth Engineer.

---

## 1. Arquitectura Técnica

```
┌──────────────────────────────────────────────────────┐
│                   FLUJO DE DATOS                      │
│                                                       │
│  CSV (60 clientes)                                    │
│       │                                               │
│       ▼                                               │
│  Script Python (categorize.py)                        │
│       │                                               │
│       ├── CAPA 1: Extracción LLM                      │
│       │   Lee cada transcripción → Gemini API         │
│       │   NO pasa el campo "closed" al LLM            │
│       │   Recibe categorías estructuradas (JSON)      │
│       │   Valida con fuzzy matching contra enums       │
│       │                                               │
│       ├── CAPA 2: Derivación heurística (Python)      │
│       │   Risk Score (flags compuestos)               │
│       │   Buyer Readiness, Deal Complexity             │
│       │   Priority Score, ACV, Plan sugerido           │
│       │   Imputación de volumen con modelo estadístico │
│       │                                               │
│       ├── CAPA 3: Métricas agregadas (dataset completo)│
│       │   Conversion Probability (win rate segmento)  │
│       │   PMF Signal (conversión × volumen)           │
│       │   Estimated Close Days (readiness × complexity)│
│       │                                               │
│       └── Genera clients_categorized.json              │
│               │                                       │
│               ▼                                       │
│  React App (Dashboard)                                │
│       │── Importa JSON                                │
│       │── Deriva campo `estado` (closed → Won/Lost)   │
│       │── Calcula métricas agregadas del frontend     │
│       │   (Segmentos Validados, terciles, etc.)       │
│       │── Renderiza 5 tabs con métricas y gráficos    │
│       │── Búsqueda, filtros y modal de detalle        │
│       ▼                                               │
│  Deploy en Vercel (link funcional)                    │
└──────────────────────────────────────────────────────┘
```

### Stack
- **Procesamiento:** Python + Google Gemini API (gemini-3.1-flash-lite-preview)
- **Frontend:** React (JSX) + Tailwind CSS + Recharts
- **Deploy:** Vercel
- **Versionamiento:** GitHub

---

## 2. Decisiones Clave

### ¿Por qué estas categorías y no otras?
No categorizamos por categorizar. Cada dimensión mapea a una etapa del framework AARRR (Acquisition → Activation → Retention → Revenue → Referral) y responde a una pregunta operativa del equipo de Growth, Ventas o CS de Vambe.

### ¿Por qué un Retention Risk Score?
Vambe crece ~20% MoM con +1.700 clientes. En esta etapa, retener un cliente es más valioso que adquirir uno nuevo. El Risk Score permite que CS intervenga proactivamente desde el día 0, antes de que el cliente entre en curva de churn. Esto transforma datos de venta en un activo de retención — un Macroloop de Datos.

### ¿Por qué no pasamos `closed` al LLM en el prompt?
Para que el Retention Risk Score sea genuinamente predictivo. Si el LLM sabe el resultado, ajusta inconscientemente el score. Al no pasarlo, el score refleja solo señales de la transcripción. Después cruzamos score vs. resultado real en el dashboard para validar su poder predictivo.

### ¿Por qué la arquitectura es "Sin backend"?
Los datos de la prueba son estáticos (60 clientes fijos). Un backend con base de datos sería sobre-ingeniería sin valor real para el usuario final. En un escenario de producción, este cliente web se conectaría a la misma "Vambe Axis/Connect API" del ecosistema Vambe. Esto se asume como una virtud de extensibilidad de la arquitectura JAMstack elegida.

### ¿Por qué incluimos el CSV de clientes en el repositorio?
Para **reproducibilidad total "out-of-the-box"**. El evaluador debe poder clonar el proyecto y ver la app levantada sin bloqueos operacionales. Al tratarse de un dataset de sandbox para la prueba técnica, es lícito empaquetarlo en el código fuente para facilitar la auditoría.

### ¿Por qué Gemini API?
El tier gratuito es extremadamente generoso (ideal para la prueba). Además, Vambe opera con una postura agnóstica sobre OpenAI, Anthropic y Gemini.

### ¿Por qué React y no Streamlit o Python puro?
La prueba exige medir la calidad de Experiencia de Usuario y UI. React permite vistas fluidas con estados de hover, tooltips y filtros cruzados dinámicos con una calidad inalcanzable por Streamlit.

### ¿Por qué un Script de Python independiente?
Garantiza la modularización y reproducibilidad. Permite correr la categorización en un terminal para validar que el prompt engineering produce el JSON correcto, abstrayéndolo del problema de frontend.

---

## 3. Decisiones de Categorización

### ¿Por qué categorías cerradas (enums) en vez de texto libre?
**Problema:** En la primera iteración dejamos que el LLM respondiera libremente. Resultado: 57 industrias distintas para 60 clientes y 60 pain points todos únicos. Imposible agrupar, imposible graficar.

**Decisión:** Cada campo categórico tiene máximo 10 valores fijos. El LLM elige entre opciones predefinidas, no inventa. Los gráficos siempre muestran agrupaciones reales.

### ¿Por qué validación en dos capas (Prompt + Python)?
**Problema:** Incluso con enums en el prompt, el LLM a veces devuelve variantes ("Small (<100 interacciones/día)" en vez de "Small") o valores fuera de lista.

**Decisión:** Python valida cada campo contra su lista de valores permitidos. Si el LLM se desvía, fuzzy matching lo corrige al valor más cercano. Si no hay match, asigna "Otro". Resultado: 100% de los campos son graficables.

### ¿Por qué las transcripciones son sintéticas y qué implica?
**Descubrimiento:** Las 60 transcripciones del CSV son generadas por IA. Señales: todas son monólogo (sin diálogo vendedor-cliente), todas mencionan "Vambe" por nombre, siguen la misma estructura, y no hay diferencia real de tono entre deals cerrados y perdidos.

**Impacto:** Los campos semánticos (industria, caso_uso, canal, pain_point) funcionan bien porque las transcripciones los mencionan explícitamente. Pero los campos emocionales (sentimiento, expectativas) son planos porque todas suenan igual de interesadas. Esto explica por qué sentimiento solo tiene 2 valores y 2 de 5 risk flags del LLM nunca se activan.

**Decisión:** Compensamos la falta de variabilidad emocional derivando señales de riesgo desde datos duros en Python. En vez de depender del LLM para matices que no existen en el texto, usamos combinaciones de campos factuales que sí tienen variabilidad real.

### ¿Por qué nombres cortos en las categorías?
**Problema:** Labels como "Tecnología / SaaS" o "Logística y Transporte" no caben en ejes de gráficos sin rotar o truncar.

**Decisión:** Acortamos todo (Tecnología, E-commerce, Logística, etc.). Un gráfico legible vale más que una etiqueta completa.

---

## 4. Evolución del Risk Score

### ¿Por qué un Risk Score con flags binarios en vez de un número del 1 al 10?
**Problema:** Pedirle al LLM "dame un score del 1 al 10" producía scores uniformemente bajos (57 de 60 clientes con score 2). El LLM no tiene criterios concretos para diferenciar, así que juega seguro. Un score sin variabilidad no sirve para análisis.

**Decisión:** En vez de un número abstracto, descompusimos el riesgo en preguntas concretas de sí/no. Cada "sí" es un flag. Python suma los flags → score. El resultado es auditable: puedes ver exactamente por qué un cliente tiene score 3.

### ¿Por qué el Risk Score es híbrido (LLM + Python)?
**Problema:** El LLM tiende a ser conservador con evaluaciones binarias. Dos de los cinco flags originales del LLM nunca se activaron. El score funcionaba con solo 3 de 5 palancas.

**Decisión:** Reducimos los flags del LLM a solo `risk_motivacion_reactiva` (el único que aporta señal real que Python no puede calcular). El resto del score se calcula en Python con señales compuestas que cruzan datos factuales. Un flag por concepto, sin duplicados.

### ¿Por qué eliminamos el doble conteo?
**Problema:** El score original sumaba por lo mismo dos veces. Ejemplo: `objeciones ≠ Ninguna` (Python) + `risk_objeciones_no_resueltas` (LLM) = +2 por objeciones. Lo mismo con integración.

**Decisión:** Un flag por concepto. Si Python ya detecta objeciones del JSON, no necesitamos que el LLM también lo evalúe.

### Risk Score final: 5 señales compuestas (0-5)
**Problema:** Con datos sintéticos planos, flags simples generan poca variabilidad. Necesitamos señales que capturen combinaciones de riesgo.

**Decisión:** El Risk Score (0-5) combina:
1. **Tiene objeciones** (+1) — entró con dudas
2. **Requiere integración** (+1) — onboarding más complejo, más fricción
3. **Motivación reactiva** (+1, LLM) — vino a apagar un incendio, no por estrategia
4. **Presión de implementación** (+1) — urgencia Alta + requiere integración = quiere rápido algo complejo
5. **Recursos limitados** (+1) — Startup/SMB + requiere integración = equipo chico para implementación compleja

Cada flag tiene justificación de negocio: no es artificial, son combinaciones que en la realidad aumentan la probabilidad de churn. Los buckets para la UI son: 0 (Sano), 1-2 (Precaución), 3+ (Riesgo).

---

## 5. Métricas Derivadas (Capa 2)

Estas métricas no salen del LLM — son **reglas de negocio en Python** que combinan las categorías extraídas para generar scores accionables. Es el mismo enfoque que usa cualquier CRM moderno (HubSpot lead scoring, Salesforce Einstein): heurísticas transparentes sobre datos estructurados.

### Buyer Readiness (0-4): ¿Qué tan listo está para comprar?
Cada señal positiva suma +1:
- Urgencia Alta → el prospecto tiene prisa
- Sentimiento Entusiasta → actitud favorable
- No tiene motivación reactiva → visión de largo plazo, más compromiso
- Patrón de demanda en Crecimiento → necesidad creciente, más motivación de compra

**Para qué sirve:** El vendedor sabe si necesita "nutrir" al prospecto o si puede cerrar rápido.

### Deal Complexity (0-4): ¿Qué tan difícil es cerrar/implementar?
Cada señal de fricción suma +1:
- Necesita integración → más stakeholders técnicos
- Tiene objeciones → dudas por resolver
- Empresa Establecida → más burocracia y stakeholders
- Múltiples objeciones (>1) → mayor fricción acumulada

**Para qué sirve:** Anticipa el esfuerzo de venta necesario. Un deal de alta complejidad requiere Sales Engineering, no solo un closer.

### Deal Priority Score (0-10): ¿A quién persigo primero?
Fórmula: `(value_tier × (readiness + 1)) / (complexity + 1)`, normalizado a 0-10.
- `value_tier`: Corporate=3, Advanced=2, Standard=1
- Se amplifica por readiness (más listo = más valioso) y se penaliza por complexity (más difícil = menos prioritario)

**Nota:** La distribución real tiende a concentrarse en valores bajos (la mayoría de los deals están entre 1-5). Por eso el dashboard usa terciles dinámicos (percentiles del dataset) en vez de rangos fijos para los buckets Baja/Media/Alta.

### ACV Estimado (Annual Contract Value)
Basado en el plan sugerido × 12 meses:
- Standard: $413/mes → $4,956/año
- Advanced: $574/mes → $6,888/año
- Corporate: $2,173/mes → $26,076/año

**Para qué sirve:** Permite calcular Pipeline Value, Revenue Ganado/Perdido, y MRR en Riesgo — las métricas financieras del dashboard.

### Integration Complexity (0-3): Para priorización de Producto
- +1 si necesita integración
- +1 si el sistema es legacy/hospitalario/ERP/propietario
- +1 si menciona múltiples sistemas o plataformas

**Para qué sirve:** El equipo de CS sabe qué onboardings van a ser difíciles y necesitan soporte técnico dedicado.

### Imputación de Volumen
**Problema:** No todos los prospectos mencionan un número exacto de interacciones. Algunos dicen "gran volumen" o no mencionan nada.

**Decisión:** Python primero intenta parsear un número del texto (`volumen_interacciones_raw`). Si lo encuentra, lo convierte a mensual (diario ×30, semanal ×4). Si no hay número parseable, imputa usando un modelo estadístico: mediana del segmento (`tipo_empresa × patron_demanda`), modulada por caso de uso y feature valorada. El campo `volumen_es_estimado` marca explícitamente si el dato es real o imputado.

### Plan Sugerido (alineado a pricing real de Vambe)
En vez de tiers genéricos, Python convierte el volumen mensual al plan Vambe correspondiente: Standard (≤1,500/mes), Advanced (≤2,500/mes), Corporate (3,000+/mes). El equipo de ventas ve inmediatamente en qué plan cae cada prospecto.

### Potencial de Expansión
`true` si `tipo_empresa === 'Startup'` o `patron_demanda === 'Crecimiento'`. Identifica clientes con trayectoria de crecimiento natural — hoy pagan Standard pero mañana serán Corporate.

---

## 6. Métricas Agregadas (Capa 3)

Estas métricas requieren el dataset completo para calcularse. Se generan en la última pasada de `categorize.py`.

### Conversion Probability
Win rate histórico del segmento, con cascada de fallbacks:
1. Win rate del cruce `caso_uso × industria` (si hay ≥3 deals en ese cruce)
2. Win rate del `caso_uso` solo (si hay ≥3 deals)
3. Win rate global del dataset

**Limitación honesta:** Es circular — predice cierre con datos de cierre del mismo dataset. Sin split train/test con 60 datos, es una tasa histórica de referencia, no una predicción. Con acceso a un CRM con datos longitudinales, se calibraría con datos fuera de muestra.

### PMF Signal (Fuerte / Moderada / Débil)
Se asigna por cliente individual combinando dos señales:
- `Fuerte`: conversion_probability ≥ 65% AND volumen ≥ 2,500
- `Moderada`: una de las dos condiciones
- `Débil`: ninguna

**Nota:** En el Tab 4 del dashboard existe una métrica diferente llamada "Segmentos Validados" que se calcula en el frontend cruzando `industria × caso_uso` y filtrando combos con ≥3 deals y win rate >65%. Son métricas complementarias pero distintas.

### Estimated Close Days
Fórmula: `30 - (readiness × 5) + (complexity × 10)`, clamped entre 7 y 90.

**Limitación honesta:** Es una estimación sobre estimaciones. No hay fechas de cierre reales en el dataset — solo fecha de reunión y resultado. Con datos reales de CRM (timestamps de cada etapa del deal), se calcularía con duración real del ciclo de venta. En el dashboard se muestra con disclaimer en "¿Cómo se calcula?".

---

## 7. Decisiones de Producto y UX (Dashboard)

### ¿Por qué 5 Tabs con esta estructura?
El dashboard original tenía 3 tabs (Overview, Explorador de Clientes, Análisis de Conversión). Con las métricas derivadas nuevas, reorganizamos en 5 tabs que siguen un flujo mental de negocio:

1. **Overview** — "¿Cómo estamos?" → CEO/Manager
2. **Pipeline Intelligence** — "¿A quién persigo primero?" → Sales Rep
3. **Explorador de Clientes** — "Déjame buscar y filtrar" → Todo el equipo
4. **Growth Analysis** — "¿Dónde están las palancas?" → Growth/RevOps
5. **Retention Intelligence** — "¿Quién va a hacer churn?" → Customer Success

Cada tab tiene un usuario objetivo y preguntas concretas que responde. No es reorganización cosmética — la estructura determina qué decisiones puede tomar cada rol.

### ¿Por qué un "Motor Lógico" (If/Else) para Insights en lugar de texto estático?
**Problema:** La mayoría de los dashboards entregan gráficos que el usuario debe interpretar. En un entorno de alta velocidad, no hay tiempo para buscar anomalías manualmente.

**Decisión:** Cada gráfico tiene un cerebro lógico (`generateInsight`). Comparamos variables contra umbrales y generamos texto adaptativo. Esto transforma al dashboard de una herramienta de visualización en una herramienta de **diagnóstico automático**.

### ¿Por qué eliminamos Radar Charts y limitamos Donut Charts?
**Problema:** Los Radar Charts son cognitivamente difíciles de comparar. Los Donut Charts con más de 3 categorías se vuelven ilegibles.

**Decisión:** Regla de "Legibilidad Extrema": **Horizontal Bar Charts** para comparar magnitudes o categorías largas. Donuts solo para estados ternarios críticos (ej: Riesgo de Churn: Sano/Precaución/Riesgo).

### ¿Por qué la metodología "¿Cómo se calcula?" es obligatoria?
**Problema:** La IA genera desconfianza ("Caja Negra"). Si un Sales Manager ve un "Priority Score 7", necesita saber qué factores lo elevaron para confiar en el dato.

**Decisión:** Cada componente visual incluye un toggle de metodología. Explicamos de forma transparente qué variables Python/IA se sumaron para llegar a ese número. La transparencia es la base de la adopción.

### ¿Por qué el Tab 2 (Pipeline Intelligence) se diseñó para las "9:00 AM"?
**Problema:** Los dashboards suelen ser retrospectivos (¿qué pasó el mes pasado?).

**Decisión:** El Tab 2 es una herramienta de **planificación diaria**. El ranking por `deal_priority_score` y el gráfico de cuadrantes `Readiness vs Complexity` están ahí para que el vendedor decida sus llamadas del día en 30 segundos. Con los datos actuales (todos Won/Lost, sin Open), funciona como análisis retrospectivo que entrena el criterio: "si volviera a tener estos deals, ¿a cuáles les dedicaría tiempo primero?"

### ¿Por qué el Tab 5 (Retention) es el diferenciador?
Vambe tiene retención como problema real. Este tab transforma datos de venta en un activo de retención — el **Macroloop de Datos** del framework de Growth: cada deal cerrado alimenta el modelo predictivo → mejora la intervención de CS → mejora retención → mejora LTV → permite más agresividad en CAC. El Playbook de Retención al final del tab convierte el dashboard de descriptivo a **prescriptivo**: no solo "qué pasa" sino "qué hacer".

---

## 8. Decisiones de Implementación (Tab 5: Retention Intelligence)

### ¿Por qué eliminamos el Scatter Chart que estaba en el plan?
**Problema:** El plan original usaba un scatter bidimensional — Fricción de Activación en el eje X y Riesgo de Permanencia en el eje Y, con el tamaño de cada punto proporcional al MRR. En papel suena elegante. En la práctica, CS tiene que calibrar dos ejes simultáneamente para entender dónde está cada cliente. A las 9am planificando el día, ese esfuerzo cognitivo no es aceptable.

**Decisión:** Eliminamos el scatter y reemplazamos con barras horizontales ordenadas de mayor a menor riesgo. El orden de la lista = el orden de las llamadas del día. Regla establecida: **un gráfico que requiere "aprender a leerlo" no sirve para decisiones operativas diarias.**

### ¿Por qué usamos 3 colores y no 4?
**Problema:** El diseño inicial tenía 4 colores: Azul (Necesita CS), Ámbar (Necesita Soporte), Rojo (Prioridad Máxima) y Verde (Safe). El azul generaba confusión porque es el mismo `brand color` que usan los links, botones y highlights de la UI.

**Decisión:** Colapsamos a 3 colores usando el semáforo del design system: Verde (`--color-success`) = Safe, Ámbar (`--color-warning`) = En Riesgo, Rojo (`--color-danger`) = Crítico. Con semáforo, cualquier persona entiende la escala sin necesidad de leyenda. El detalle de qué *tipo* de riesgo (técnico vs relacional) queda en los badges de flags individuales dentro de la tabla.

### ¿Por qué el tab terminó con 7 gráficos y no los 3 del plan?
**Problema:** Los 3 gráficos del plan (Ranking, MRR por exposición, Perfil por Plan) respondían "¿quién tiene riesgo?" pero no "¿por qué?" ni "¿de dónde viene el problema?". Eso lo convierte en un monitor de riesgo, no en un sistema de diagnóstico.

**Decisión:** Expandimos a 7 visualizaciones organizadas en 5 bloques narrativos que forman una historia completa: primero el estado global de la cartera (Health Bar + Waterfall), luego la naturaleza del problema (frecuencia de flags + urgencia), luego el origen (canal + vendedor), luego el impacto financiero (MRR por flag), y finalmente el mapa completo (matriz cliente × flag). Cada bloque responde una pregunta distinta — no son gráficos decorativos, son capas de análisis.

### ¿Por qué la tabla de clientes está antes que los gráficos?
**Problema:** En el plan, la tabla iba después de las visualizaciones. En la práctica, CS no arranca por los patrones agregados — arranca por nombres. "¿Quiénes son exactamente y qué necesitan?" es la primera pregunta, no la segunda.

**Decisión:** La tabla es el primer elemento visible después de los KPIs. Los gráficos son el contexto que explica los patrones que ya viste en la tabla, no al revés. Esto aplica como regla general para tabs operativos (Tab 2 y Tab 5): **la tabla de individuos va antes que las visualizaciones agregadas.**

### ¿Por qué el Playbook es un 2×2 interactivo y no un bloque de texto?
**Problema:** El plan tenía un playbook de texto plano con 3 items (URGENTE, ONBOARDING, ACTIVACIÓN) que decía "X clientes críticos necesitan intervención esta semana". Saber que hay X clientes críticos no es suficiente — hay que saber exactamente quiénes son y a qué equipo asignarlos.

**Decisión:** El playbook es un grid 2×2 con 4 cuadrantes según el tipo de riesgo: CS + Soporte (ambos riesgos), solo Soporte Técnico, solo Customer Success, y Monitorear (sin riesgo). Cada cuadrante muestra chips con los nombres reales de los clientes — clickeables para abrir su ficha de detalle. La diferencia entre "X clientes" y "estos clientes específicos, asignar a este equipo" es la diferencia entre diagnóstico y acción.

### ¿Por qué colapsamos de 4 categorías de riesgo a 3?
**Problema:** El plan distinguía entre Solo Activación, Solo Permanencia y Doble Riesgo como tres categorías separadas. Eso requería que CS entendiera primero la diferencia entre los dos tipos de riesgo antes de interpretar el gráfico. Un paso de onboarding del dashboard que nunca debería existir.

**Decisión:** Tres niveles: Safe (0 flags), En Riesgo (cualquier flag activo), Crítico (ambos tipos o ≥3 flags). La distinción por tipo de riesgo (técnico vs relacional) no desapareció — está visible en los badges de flags en la tabla y en los cuadrantes del Playbook, que sí asignan equipos distintos según el tipo. La diferencia es que esa distinción aparece en contexto operativo, no como sistema de clasificación que hay que memorizar.

---

## 9. Decisiones de Implementación (Tab 2: Pipeline Intelligence)

### ¿Por qué no implementamos la tabla de ranking que era el componente central del plan?
**Problema:** El plan establecía una tabla con columnas de Priority Score, Buyer Readiness, Deal Complexity, Días Estimados y Conv. Probability como la pieza central del tab — el vendedor lee de arriba a abajo = orden de prioridad del día. Con los datos disponibles (todos Won o Lost, ninguno Open), una tabla de "¿a quién persigo?" pierde su utilidad operativa: no hay deals abiertos que priorizar en este momento.

**Decisión:** El tab se convirtió en análisis retrospectivo: "si volviera a tener estos deals, ¿cuáles merecían más tiempo?" sin una tabla que simula una acción imposible con datos sin estado Open. Los 4 gráficos (Scatter, Vendor Pipeline, Histograma, Priority × Resultado) son suficientes para validar si el scoring funciona como herramienta de criterio, que es el valor real del tab con este dataset.

### ¿Por qué mantuvimos el Scatter Chart en Tab 2 aunque lo eliminamos en Tab 5?
**Problema:** Si el scatter es cognitivamente costoso, ¿por qué mantenerlo aquí y no en Retention?

**Decisión:** En Tab 2 el scatter tiene un propósito diferente — no es para identificar individuos urgentes a las 9am, es para validar la lógica de cuadrantes como criterio de priorización. El usuario del Tab 2 (Sales Rep) tiene más contexto analítico que CS, y el scatter le muestra visualmente por qué el scoring funciona. En Tab 5 el objetivo es operativo puro (de esta lista de nombres, ¿a quién llamo?). Distinto usuario, distinta pregunta, distinta justificación para el mismo tipo de gráfico.

### ¿Por qué "Días prom. al cierre" quedó como KPI aquí y se sacó del Tab 1?
**Problema:** La métrica `estimated_close_days` es una estimación sobre una fórmula inventada (30 - readiness×5 + complexity×10) — no son datos reales de CRM. Ponerla en el Overview ejecutivo implicaba presentarla como un dato confiable a nivel de management.

**Decisión:** La sacamos de Tab 1 y la dejamos solo en Tab 2, siempre acompañada del disclaimer "¿Cómo se calcula?" que explica que es estimación basada en perfil del prospecto y requiere calibración con datos reales de CRM. En contexto analítico del Sales Rep tiene valor como referencia relativa — en el Overview ejecutivo generaría falsa confianza.

---

## 10. Decisiones de Implementación (Tab 4: Growth Analysis)

### ¿Por qué el tab cambió de una estructura por secciones a una narrativa por actos?
**Problema:** El plan organizaba Tab 4 en 4 secciones temáticas mecánicas: Adquisición, Activación, Revenue y PMF/Defendibilidad. Era una taxonomía, no una historia. Un Growth Engineer que abre el tab ve información ordenada alfabéticamente por concepto, no por prioridad de decisión.

**Decisión:** Restructuramos en un flujo narrativo: primero el sistema (Loops de adquisición), luego el mercado (ICP y dónde está el dinero), luego el cliente ideal (qué predice el cierre), luego las señales de conversión (qué dimensiones separan Won de Lost) y finalmente las acciones recomendadas. Cada sección responde una pregunta más profunda que la anterior. El tab se lee como un diagnóstico, no como un reporte.

### ¿Por qué el primer gráfico (Loops) es una tabla y no un bar chart?
**Problema:** El plan pedía un bar chart de Win Rate por canal. Un bar chart simple de Win Rate ignora todo el contexto necesario para tomar una decisión: ¿cuánto MRR genera cada loop? ¿Qué tan rápido cierra? ¿Vale la pena escalar ese canal aunque convierta menos?

**Decisión:** La primera visualización es una tabla con tres dimensiones simultáneas: Win Rate (con barra visual), MRR Won (el resultado financiero real) y Días promedio al cierre (la velocidad). Esto permite comparar "Canal A convierte 60% en 45 días" vs "Canal B convierte 50% en 20 días con el doble de MRR" — una decisión que no es visible en un bar chart de Win Rate solo.

### ¿Por qué el "Mapa de PMF" del plan se convirtió en un Bubble Chart de industrias?
**Problema:** El plan proponía un Heatmap de `industria × caso_uso` coloreado por win rate. Con el dataset real de 60 deals, la mayoría de combinaciones tienen 0-1 deals — el heatmap sería principalmente celdas vacías con pocos puntos aislados, imposible de interpretar.

**Decisión:** La pregunta "¿dónde está el dinero?" se responde mejor con un Bubble Chart de industrias donde cada burbuja = una industria, con Win Rate en X, MRR por deal en Y, y tamaño = volumen de deals. Esto revela cuadrantes estratégicos (alta conversión + alto ticket = cuadrante ideal) con datos suficientes para cada punto. El heatmap de `industria × tipo_empresa` sí se implementó porque tiene las dimensiones correctas para crear clusters con este volumen de datos.

### ¿Por qué agregamos un Radar Chart de Won vs Lost si el plan no lo incluía?
**Problema:** El plan no tenía un gráfico que respondiera directamente "¿qué distingue sistemáticamente a los deals ganados de los perdidos?" — había gráficos individuales por dimensión pero ninguno que mostrara el patrón multidimensional completo.

**Decisión:** El Radar de 6 dimensiones normalizadas (Conv. Probability, Complejidad, Días, Risk, Readiness, Priority) resuelve esto en una sola imagen: la forma del polígono azul (Won) vs rojo (Lost) muestra de un vistazo qué dimensiones separan ambas poblaciones y en qué dirección. Es la única excepción en el dashboard donde usamos Radar Chart — están justificados cuando el objetivo es comparar dos perfiles multidimensionales, no magnitudes individuales.

### ¿Por qué el "Playbook de Acciones" aparece en Tab 4 y no estaba en el plan?
**Problema:** El plan terminaba Tab 4 en visualizaciones descriptivas. Un Growth Engineer que entiende los datos ya sabe lo que ve — lo que necesita al final es una lista priorizada de qué hacer con eso, en lenguaje de palancas de sistema, no de reportes.

**Decisión:** El último bloque del tab es un Playbook de 6 acciones generadas dinámicamente desde los datos: qué loop escalar, qué segmento atacar, qué señal re-calibrar, qué pain point priorizar, qué plan empujar y cuál es el predictor #1 de conversión. Cada acción tiene badge de prioridad (Alta/Media) generado por lógica condicional. Esto convierte Tab 4 de descriptivo a prescriptivo — la misma filosofía del Playbook del Tab 5.

---

## 11. Decisiones de Implementación (Tab 3: Explorador de Clientes)

### ¿Por qué las columnas son configurables en lugar de fijas?
**Problema:** El plan listaba columnas fijas: Nombre, Industria, Vendedor, Canal, Urgencia, Plan/ACV, Priority Score, Risk Score, Estado. Para un usuario que busca un cliente específico, ver todas las columnas juntas genera ruido — y para otro que quiere comparar Conv. Probability de varios clientes, no tener esa columna visible es un bloqueo.

**Decisión:** Se implementó un **Column Picker dinámico** (botón `+` en el header de la tabla) que permite activar o desactivar cada columna individualmente. El estado por defecto muestra 8 columnas operativas (Nombre, Fecha, Industria, Vendedor, Plan/ACV, Priority, Risk, Estado). Las 7 restantes (Tipo empresa, Canal, Urgencia, Sentimiento, PMF Signal, Conv. Prob., Días al cierre) son opt-in. El usuario configura la vista según su contexto sin necesitar diferentes tabs o modos.

### ¿Por qué se expandieron los filtros más allá del plan?
**Problema:** El plan pedía filtros nuevos de PMF Signal, Buyer Readiness (rango 0-4) y un checkbox de "Ocultar volumen estimado". Los filtros de rango numérico requieren un componente UI distinto (slider o inputs de min/max) que aumenta la complejidad del `Filters` component — el mismo que se reutiliza en los 5 tabs.

**Decisión:** En lugar de filtros de rango numérico, se expandió el sistema de multi-select a campos con mayor valor operativo en la práctica: `pain_point_principal`, `canal_descubrimiento` y `patron_demanda`. Permiten cruzar "¿qué clientes vienen por LinkedIn con dolor de Gestión?" sin ningún slider. El checkbox de "Ocultar volumen estimado" se descartó porque `volumen_es_estimado` ya aparece en el modal de detalle con contexto suficiente — filtrarlo como booleano en la tabla tiene bajo valor operativo.

### ¿Por qué se agregó sorting por columna si el plan no lo mencionaba?
**Problema:** Una tabla de 60+ clientes sin orden configurable obliga a usar el buscador para cualquier comparación. Si quiero ver quién tiene mayor Priority Score tengo que saberlos de memoria o ir a Tab 2.

**Decisión:** Todas las columnas son clickeables para ordenar ascendente/descendente (toggle en click). El sort es compatible con el Column Picker — si ordenas por una columna y luego la ocultas, el criterio de sort sigue activo. Esto convierte el explorador en una herramienta de análisis rápido sin exportar datos.

### ¿Por qué Buyer Readiness no es columna si estaba en el plan?
**Problema:** `buyer_readiness` es un score 0-4 que sin contexto interpretativo no le dice nada al usuario mirando la lista. Un "2" en la tabla no tiene significado sin saber que "2 = Explorando activamente".

**Decisión:** `buyer_readiness` y `deal_complexity` quedaron exclusivamente dentro del modal de detalle bajo la sección "Sales Intelligence", donde aparecen con su etiqueta interpretativa ("3/4 — Listo para comprar", "1/4 — Baja fricción"). En la vista de lista, esas columnas suman ruido sin el contexto que las hace legibles. Si en el futuro se quiere agregar, se incluye en `ALL_COLUMNS` en una línea — la arquitectura del Column Picker lo soporta sin cambios adicionales.
