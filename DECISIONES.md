# Arquitectura y Decisiones Clave — Vambe Sales Intelligence

Este documento explica las decisiones de ingeniería y diseño detrás de la solución técnica entregada para la prueba de Growth Engineer.

---

## 1. Arquitectura Técnica

```
┌─────────────────────────────────────────────────┐
│                  FLUJO DE DATOS                  │
│                                                  │
│  CSV (60 clientes)                               │
│       │                                          │
│       ▼                                          │
│  Script Python (categorize.py)                   │
│       │── Lee cada transcripción                 │
│       │── Envía a Gemini API con prompt           │
│       │── NO pasa el campo "closed" al LLM       │
│       │── Recibe categorías estructuradas (JSON) │
│       │── Valida y corrige respuestas (Capa 2)   │
│       │── Calcula Risk Score híbrido (LLM+Python)│
│       │── Genera clients_categorized.json        │
│       ▼                                          │
│  JSON procesado (se importa en React)            │
│       │                                          │
│       ▼                                          │
│  React App (Dashboard)                           │
│       │── Importa JSON + datos originales CSV    │
│       │── Cruza categorías LLM con closed/vendor │
│       │── Renderiza métricas y gráficos          │
│       │── Búsqueda y filtros interactivos        │
│       │── Tabla detallada con vista por cliente   │
│       ▼                                          │
│  Deploy en Vercel (link funcional)               │
└─────────────────────────────────────────────────┘
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
Para que el Retention Risk Score sea genuinamente predictivo. Si el LLM sabe el resultado, ajusta inconscientemente el score. Al no pasarlo, el score refleja solo señales de la transcripción. Después cruzamos score vs. resultado real en el dashboard para validar su real poder predictivo.

### ¿Por qué la arquitectura es "Sin backend"?
Los datos de la prueba son estáticos (60 clientes fijos). Un backend con base de datos sería sobre-ingeniería sin valor real para el usuario final. En un escenario de producción, este cliente web se conectaría a la misma "Vambe Axis/Connect API" del ecosistema Vambe. Esto se asume como una virtud de extensibilidad de la arquitectura JAMstack elegida.

### ¿Por qué incluimos el CSV de clientes en el repositorio final de GitHub?
Como consideración de seguridad estándar, los archivos que contienen datos sensibles de negocio (como historiales y nombres de clientes) suelen excluirse estrictamente hacia `.gitignore`. Sin embargo, para los propósitos exclusivos de esta prueba técnica, es una directiva asegurar la **reproducibilidad total "out-of-the-box"**. El evaluador debe poder clonar el proyecto y ver la app levantada sin bloqueos operacionales de falta de datos. Al asumir este dataset de 60 clientes como datos encriptados o demográficos de "sandbox", es lícito empaquetarlo en el código fuente para facilitar la auditoría.

### ¿Por qué Gemini API?
El tier gratuito es extremadamente generoso (ideal para la prueba). Además, Vambe cuenta con una postura explícitamente "agnóstica" operando sobre OpenAI, Anthropic y Gemini. 

### ¿Por qué React y no Streamlit o Python puro?
La prueba exige medir la calidad de Experiencia de Usuario y UI. React nos permite agregar vistas fluidas, con estados de hover, tooltips y filtros cruzados dinámicos con una velocidad inalcanzable por Streamlit en la misma medida sin fricciones.

### ¿Por qué un Script de Python independiente?
Garantiza la modularización y la reproducibilidad exacta por parte de los evaluadores. Permite correr un test de categorización en un terminal puramente para validar que el prompt engineering produce el JSON final, abstrayendolo del problema de frontend.

---

## 3. Decisiones de Categorización

### ¿Por qué categorías cerradas (enums) en vez de texto libre?
**Problema:** En la primera iteración dejamos que el LLM respondiera libremente. Resultado: 57 industrias distintas para 60 clientes y 60 pain points todos únicos. Cada cliente tenía su propia categoría — imposible agrupar, imposible graficar.

**Decisión:** Cada campo categórico tiene máximo 10 valores fijos. El LLM elige entre opciones predefinidas, no inventa. Esto garantiza que los gráficos del dashboard siempre muestran agrupaciones reales.

### ¿Por qué validación en dos capas (Prompt + Python)?
**Problema:** Incluso con enums en el prompt, el LLM a veces devuelve variantes ("Small (<100 interacciones/día)" en vez de solo "Small") o valores que no están en la lista.

**Decisión:** No delegamos toda la responsabilidad a la IA. Python valida cada campo contra su lista de valores permitidos. Si el LLM se desvía, fuzzy matching lo corrige al valor más cercano. Si no hay match, asigna "Otro". Resultado: 100% de los campos son graficables, siempre.

### ¿Por qué un Risk Score con flags binarios en vez de un número del 1 al 10?
**Problema:** Pedirle al LLM "dame un score del 1 al 10" producía scores uniformemente bajos (57 de 60 clientes con score 2). El LLM no tiene criterios concretos para diferenciar, así que juega seguro. Un score sin variabilidad no sirve para análisis.

**Decisión:** En vez de un número abstracto, el LLM responde 5 preguntas de sí/no concretas (¿objeciones sin resolver? ¿integración compleja? ¿motivación reactiva?). Cada "sí" es un flag. Python suma los flags → score. El resultado es auditable: no es una caja negra, puedes ver exactamente por qué un cliente tiene score 3.

### ¿Por qué el Risk Score es híbrido (LLM + Python)?
**Problema:** El LLM tiende a ser conservador con evaluaciones binarias. Dos de los cinco flags nunca se activaron. El score funcionaba con solo 3 de 5 palancas.

**Decisión:** Agregamos 3 señales que Python calcula directamente de los datos, sin depender del LLM:
- Si tiene objeciones registradas → +1 (es un hecho del JSON, no interpretación)
- Si necesita integración → +1 (dato explícito)
- Si el sentimiento es cauteloso/escéptico → +1

Score final (0-8) tiene distribución real con flags auditables.

### ¿Por qué las transcripciones son sintéticas y qué implica?
**Descubrimiento:** Las 60 transcripciones del CSV son generadas por IA. Señales: todas son monólogo (sin diálogo vendedor-cliente), todas mencionan "Vambe" por nombre, siguen la misma estructura (soy X, tengo problema Y, descubrí Vambe por Z), y no hay diferencia real de tono entre deals cerrados y perdidos. Un vendedor (Toro) tiene 100% win rate.

**Impacto:** Los campos semánticos (industria, caso_uso, canal, pain_point) funcionan bien porque las transcripciones mencionan esos datos explícitamente. Pero los campos emocionales (sentimiento, expectativas, objeciones no resueltas) son planos porque todas las transcripciones suenan igual de interesadas. Esto explica por qué sentimiento solo tiene 2 valores (0 Cautelosos, 0 Escépticos) y 2 de 5 risk flags del LLM nunca se activan.

**Decisión:** Compensamos la falta de variabilidad emocional derivando señales de riesgo desde datos duros en Python. En vez de depender del LLM para detectar matices que no existen en el texto, usamos combinaciones de campos factuales que sí tienen variabilidad real.

### ¿Por qué eliminamos el doble conteo en el Risk Score?
**Problema:** El score original sumaba por lo mismo dos veces. Ejemplo: `objeciones ≠ Ninguna` (Python) + `risk_objeciones_no_resueltas` (LLM) = +2 por objeciones. Lo mismo con integración: `necesita_integracion` (Python) + `risk_integracion_compleja` (LLM) = +2. Además, 2 flags del LLM nunca se activaron (`risk_caso_uso_no_core`, `risk_expectativas_desalineadas`).

**Decisión:** Reducimos los flags del LLM a solo `risk_motivacion_reactiva` (el único que aporta señal real). El resto del score se calcula en Python con señales compuestas que cruzan datos factuales. Un flag por concepto, sin duplicados.

### ¿Por qué el Risk Score final usa señales compuestas?
**Problema:** Con datos sintéticos planos, flags simples generan poca variabilidad. Necesitamos señales que capturen combinaciones de riesgo, no solo factores individuales.

**Decisión:** El Risk Score (0-5) combina:
1. **Tiene objeciones** (+1) — entró con dudas
2. **Requiere integración** (+1) — onboarding más complejo, más fricción
3. **Motivación reactiva** (+1, LLM) — vino a apagar un incendio, no por estrategia
4. **Presión de implementación** (+1) — urgencia Alta + requiere integración = quiere rápido algo complejo
5. **Recursos limitados** (+1) — tamaño Small + requiere integración = equipo chico para implementación compleja

Cada flag tiene justificación de negocio: no es artificial, son combinaciones que en la realidad aumentan la probabilidad de churn.

### ¿Por qué derivar `tamano_operacion` en Python?
**Problema:** El LLM clasificaba tamaño por intuición, no por reglas. María López con 300 mensajes/día quedaba como "Small". Inconsistencia visible que erosiona confianza.

**Decisión:** Python intenta parsear el número de `volumen_interacciones_raw`. Si encuentra un número diario: <100 = Small, 100-300 = Medium, 300+ = Large. Si el volumen es semanal, lo divide por 5. Si no hay número parseable, usa la clasificación del LLM como fallback.

### ¿Por qué alineamos los tiers de volumen a los planes reales de Vambe?
**Descubrimiento:** Vambe cobra por conversaciones mensuales: Standard (≤1,500/mes, $413), Advanced (≤2,500/mes, $574), Corporate (3,000+/mes, $2,173).

**Decisión:** En vez de tiers genéricos ("bajo/medio/alto"), Python convierte el volumen raw a mensual (diario ×30, semanal ×4) y asigna el plan Vambe correspondiente. Esto permite al equipo de ventas ver inmediatamente en qué plan cae cada prospecto y priorizar por revenue potencial. Los clientes sin dato de volumen quedan como "Sin dato" — no inventamos.

### ¿Por qué agregar patrón de demanda y potencial de expansión?
**Descubrimiento:** Algunas transcripciones mencionan que el volumen "se triplica en temporadas" mientras otros tienen demanda constante. Un cliente Standard que triplica en picos sube a Corporate esos meses — es un upgrade natural.

**Decisión:** Agregamos dos campos derivados:
- `patron_demanda` (Constante | Estacional | Crecimiento): lo clasifica el LLM porque requiere entender el contexto de la transcripción.
- `potencial_expansion` (true/false): lo calcula Python — true si es Startup o si el patrón es Crecimiento. Identifica clientes que hoy pagan Standard pero mañana serán Corporate.

### ¿Por qué nombres cortos en las categorías?
**Problema:** Labels como "Tecnología / SaaS" o "Logística y Transporte" no caben en ejes de gráficos sin rotar o truncar.

**Decisión:** Acortamos todo (Tecnología, E-commerce, Logística, etc.). Un gráfico legible vale más que una etiqueta completa.
