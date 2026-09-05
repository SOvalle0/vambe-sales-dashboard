# Estructura del Dashboard Vambe — Sales Intelligence (V2 Consolidada)

Este documento es la **fuente única de verdad** para la implementación del frontend del Vambe Sales Intelligence Dashboard. Consolida la arquitectura de información, componentes visuales, lógica de insights, metodología de cálculo y objetivo de negocio de cada uno de los **5 tabs**.

---

## Contexto General

### Estado Actual vs. Propuesta

El dashboard original tenía 3 tabs: Overview, Explorador de Clientes y Análisis de Conversión. Con la incorporación de nuevas variables derivadas del modelo de IA, la estructura se reorganiza en **5 tabs** (3 refactorizados + 2 nuevos).

### Variables Nuevas Disponibles

Estas variables no existían cuando se construyeron las vistas originales y deben integrarse en los tabs correspondientes:

`acv_estimado`, `mrr_estimado`, `buyer_readiness`, `deal_complexity`, `deal_priority_score`, `estimated_close_days`, `conversion_probability`, `pmf_signal`, `integration_complexity`, `volumen_es_estimado`

### Criterios de Evaluación

La prueba evalúa: **funcionalidad**, **creatividad/visión de producto**, y **valor para el equipo Vambe**. La reclutadora confirmó que retención es un problema real de Vambe — el Tab 5 es el diferenciador del proyecto.

### Convenciones del Documento

- ⚡ = Motor Lógico de Insight (condicional If/Else que genera texto adaptativo)
- ⚙️ = "¿Cómo se calcula?" (metodología transparente, siempre visible como colapsable)
- \* (asterisco) = Variable extraída o calculada con IA
- Cada gráfico DEBE incluir: botón "Insight" (generado adaptativamente) + botón "¿Cómo se calcula?" (metodología)

---

## Tab 1: Overview — "¿Cómo estamos?"

**Usuario Objetivo:** CEO / Sales Manager  
**Objetivo del Tab:** Entregar un *snapshot* ejecutivo en 10 segundos para entender el estado general del pipeline.

---

### KPIs Principales (Fila 1)

| KPI | Cálculo Técnico | Por qué importa |
| :--- | :--- | :--- |
| **Total Leads** | `array.length` (conteo total) | Contexto general de volumen |
| **Win Rate** | `count(estado === 'Won') / count(estado in ['Won','Lost'])` | La métrica de conversión core |
| **Pipeline Value** | `sum(acv_estimado)` de todos los leads | Revenue total en juego (nuevo) |
| **MRR Ganado** | `sum(acv_estimado / 12)` donde `estado === 'Won'` | Impacto real en caja — revenue mensualizado (nuevo) |

### KPIs Secundarios (Fila 2)

| KPI | Cálculo Técnico | Por qué importa |
| :--- | :--- | :--- |
| **Risk Promedio** | `average(retention_risk_score)` solo `Won`. Mostrar valor real (ej: "1.2") con color: verde < 1, amarillo 1-2, rojo ≥ 3. Escala real del dato es 0-N (basada en cantidad de flags). | Salud y probabilidad de churn de la base |
| **% PMF Fuerte** | `(count(pmf_signal === 'Fuerte') / total) * 100` | Visibilidad sistémica de adaptación al mercado (nuevo) |
| **ACV Promedio** | `average(acv_estimado)` de todos los leads | Tamaño promedio del deal en el pipeline (nuevo) |
| **Potencial expansión** | `tipo_empresa === 'Startup' \|\| patron_demanda === 'Crecimiento'` — % de ganados que cumplen | Señala clientes con trayectoria de crecimiento natural (upsell orgánico) |

---

### Visualizaciones (3 filas de 2 gráficos)

#### Fila 1

**1. Cierre por Vendedor** — `Stacked Horizontal Bar` agrupando por `vendedor` (Won, Lost)

- ⚡ *Motor Lógico de Insight:*
  - *Caso 1 (Diferencia Win Rate < 10%):* "Rendimiento parejo; la tracción final depende estrictamente del volumen asignado".
  - *Caso 2 (Brecha > 15% Win Rate):* "[Vendedor Top] domina el cierre. Analizar sus calls para replicar metodología en el resto del equipo".
  - *Caso 3 (Volumen Alto / Conversión Baja):* "[Vendedor X] opera el mayor pipeline ($Y), pero arrastra el menor Win Rate. Riesgo de cuello de botella".
- ⚙️ *¿Cómo se calcula?:* Tabulación de estados `Won` vs `Lost` agrupados por la variable `vendedor`.

**2. Pipeline Value por Plan** — `Vertical BarChart` agrupando `sum(acv_estimado)` por `plan_sugerido`

- ⚡ *Motor Lógico de Insight:*
  - *Caso 1 (Plan Superior concentra > 50%):* "El flujo proyectado ($X) recae fuertemente en cuentas del segmento Corporate. Priorizar asistencia ejecutiva para esos deals".
  - *Caso 2 (Planes base dominan):* "Alta concentración de volumen en planes bajos. El equipo genera ticket promedio ($Y) apostando a velocidad".
- ⚙️ *¿Cómo se calcula?:* Suma de USD `acv_estimado` filtrada por bucket agrupador `plan_sugerido`\*.

#### Fila 2

**3. Pain Points Principales** — `Horizontal BarChart` por `pain_point_principal` (orden descendente)

- ⚡ *Motor Lógico de Insight:*
  - *Caso 1 (Dominador Absoluto > 40%):* "[Pain Point X] es el trigger evidente que atrae demanda comercial. Ajustar marketing para explotarlo activamente".
  - *Caso 2 (Distribución plana en top 3):* "Mercado divergente; el prospecto manifiesta dolores heterogéneos sin que uno centralice la razón universal de búsqueda".
- ⚙️ *¿Cómo se calcula?:* Frecuencia absoluta de etiquetas de `pain_point_principal`\*, ordenadas de mayor a menor.

**4. Caso de Uso** — `Horizontal BarChart` por `caso_uso_principal`

- ⚡ *Motor Lógico de Insight:*
  - *Caso 1 (Nicho dominador > 45%):* "[Caso X] señala consolidación temprana del Producto/Mercado (PMF)".
  - *Caso 2 (Fragmentación):* "Tracción repartida entre múltiples utilidades periféricas. El producto corre el riesgo de parecer disperso".
- ⚙️ *¿Cómo se calcula?:* Conteo cuantitativo simple para comparar la intencionalidad final de la demanda.

#### Fila 3

**5. Timeline de Crecimiento** — `Area Chart` acumulativo por `fecha_registro`

- ⚡ *Motor Lógico de Insight:*
  - *Caso 1 (Crecimiento MoM positivo continuo):* "Rally escalado de demanda a ritmo de X% intermensual en adquisición cruda".
  - *Caso 2 (Caída abrupta en último mes):* "Contracción de Lead Velocity de -X%. El flujo superior del sistema de ventas requiere inyección".
- ⚙️ *¿Cómo se calcula?:* Gráfica de área totalizando leads de entrada indexados temporalmente por Mes (`fecha_registro`).

**6. Tipo de Empresa** — `Horizontal BarChart` por segmentación corporativa

- ⚡ *Motor Lógico de Insight:*
  - *Caso 1 (Demografía Pyme):* "Atracción pesada en Startups/SMB. Mapear esto contra el Pipeline Value real para no falsear expectativas empresariales largas".
  - *Caso 2 (Tracción Enterprise):* "Alta densidad de grandes cuentas. Incrementa ticket promedio pero dilatará los Días Promedio al Cierre naturalmente".
- ⚙️ *¿Cómo se calcula?:* Frecuencias crudas derivadas de `tipo_empresa`\*.

> *Nota: Se saca "Objeciones" de Overview (es detalle operativo, migra a Growth Analysis). Se saca "Días prom. al cierre" de KPIs ejecutivos (métrica débil basada en fórmula inventada — queda solo en Tab 2 con disclaimer). Se agrega "Pipeline Value por Plan" y "ACV Promedio" como métricas de revenue que faltaban.*

---

## Tab 2: Pipeline Intelligence — "¿A quién persigo primero?"

**Usuario Objetivo:** Sales Rep que abre esto a las 9am para planificar su día  
**Objetivo del Tab:** Organizar prioridades operativas diarias basándose en probabilidad de cierre, complejidad y valor del negocio

### Preguntas que debe responder

1. ¿Cuáles son mis deals más valiosos y más probables de cerrar?
2. ¿Cuáles necesitan más trabajo (nurturing) vs cuáles están listos?
3. ¿Dónde estoy perdiendo tiempo en deals que no van a cerrar?
4. ¿Cuánto revenue tengo en juego y en cuánto tiempo?

---

### KPIs Principales

| KPI | Cálculo | Decisión que habilita |
| :--- | :--- | :--- |
| **Pipeline Total** | `sum(acv_estimado)` de todos los deals (Won + Lost) | "¿Cuánto valor total pasó por el pipeline?" |
| **Deals Alta Prioridad** | `count(deal_priority_score >= P75)` donde P75 = percentil 75 del dataset. Threshold dinámico porque la distribución real de scores tiende a concentrarse en valores bajos (fórmula: `(value_tier × (readiness+1)) / (complexity+1)`, normalizado a 0-10). | "¿Cuántos merecen mi atención hoy?" |
| **ACV Promedio** | `average(acv_estimado)` | "¿Mis deals son grandes o chicos?" |
| **Días Prom. al Cierre** | `average(estimated_close_days)` | "¿Qué tan rápido estoy cerrando?" |

> *Nota sobre Pipeline Total: No existe estado "Open" en los datos — todos los deals son Won o Lost. Este tab funciona como análisis retrospectivo: "si volviera a tener estos deals, ¿a cuáles les dedicaría tiempo primero?" — entrena el criterio del vendedor.*

---

### Componente Central: Tabla Ranking por Deal Priority Score

La pieza central del tab. Ordenada por `deal_priority_score` **descendente** — el vendedor lee de arriba a abajo = de más importante a menos. Click en fila abre el modal de detalle (mismo de Explorador de Clientes).

| Columna | Para qué |
| :--- | :--- |
| **Nombre** | Identificar al prospecto |
| **Plan / ACV** | Cuánto vale el deal |
| **Priority Score (0-10)** | Ranking visual con color (verde/amarillo/rojo) |
| **Buyer Readiness (0-4)** | ¿Está listo o falta nurturing? |
| **Deal Complexity (0-4)** | ¿Es fácil o va a requerir esfuerzo? |
| **Días estimados** | ¿Cuándo cierra? |
| **Conv. Probability** | % win rate del segmento (cascada: caso_uso × industria → caso_uso → global) |
| **Estado** | Won / Lost |

---

### Visualizaciones Analíticas (2 filas de 2 gráficos)

> *El gráfico de cuadrantes es el que más valor agrega — transforma dos números abstractos en una decisión visual: "los de arriba-izquierda son tus Quick Wins, empieza ahí".*

#### Fila 1

**1. Readiness vs Complexity (Scatter / Cuadrantes)** — Cruza `buyer_readiness` (Eje Y) vs `integration_complexity` (Eje X). Datos: todos los deals con tooltips (Nombre, ACV, Estado).

Cuadrantes:
- **Superior-Izquierdo:** Quick Wins (ready + fácil) → Cerrar ya
- **Superior-Derecho:** Push Hard (ready + difícil) → Involucrar Sales Engineering
- **Inferior-Izquierdo:** Nurture (no ready + fácil) → Secuencia de nurturing
- **Inferior-Derecho:** Deprioritize (no ready + difícil) → Considerar abandonar

- ⚡ *Motor Lógico de Insight:*
  - *Caso 1 (Densidad cuadrante superior-izquierdo):* "Sweet spot: Hay volumen pesado de leads rápidos y listos para cerrar. Asegurar los 'Quick Wins' aquí".
  - *Caso 2 (Densidad cuadrante superior-derecho):* "Deals atractivos (Push Hard) pero retenidos en burocracia técnica. Involucrar Sales Engineering (Preventa) inmediatamente".
- ⚙️ *¿Cómo se calcula?:* Gráfico de dispersión ubicando `buyer_readiness`\* en Y, e `integration_complexity`\* en X (cuadrantes de 0 a 4).

**2. Pipeline Value por Vendedor (Barras Stacked)** — Agrupación por `vendedor`, subdividida por `estado` sumando `acv_estimado`

- ⚡ *Motor Lógico de Insight:*
  - *Caso 1 (Vendedor X domina Pipeline pero >70% es Lost):* "Alta fuga de capital detectada en pipeline de [Vendedor X]. Analizar objeciones y ajustar pitch".
  - *Caso 2 (Proporción sana global):* "Tensión controlada: los equipos rotan la base y liberan capital proyectado constantemente".
- ⚙️ *¿Cómo se calcula?:* Agrupación de `sum(acv_estimado)` fraccionada por proporciones de `estado` para cada `vendedor`.

#### Fila 2

**3. Distribución de Días al Cierre (Histograma)** — Distribución de frecuencias de `estimated_close_days`

- ⚡ *Motor Lógico de Insight:*
  - *Caso 1 (Right skew, moda < 15 días):* "Ciclo comercial transaccional-rápido. El cliente decide estadísticamente en impulso corto; eliminar fricciones contractuales".
  - *Caso 2 (Left skew/Plana, cola larga > 45 días):* "Maduración Enterprise. Necesaria inversión en secuencias agresivas de Lead Nurturing para evitar olvido post-demo".
- ⚙️ *¿Cómo se calcula?:* Conteo de frecuencias en rangos estandarizados de `estimated_close_days`\*. Fórmula base: `base_days(30) - (readiness × 5) + (complexity × 10)`, clamped entre 7 y 90. **Nota:** Es estimación basada en perfil del prospecto — requiere calibración con datos reales de CRM.

**4. Priority Score × Resultado (100% Stacked Bar)** — Agrupado por terciles dinámicos de `deal_priority_score` (Baja = tercil inferior, Media = tercil medio, Alta = tercil superior) mostrando % Won / Lost

- ⚡ *Motor Lógico de Insight:*
  - *Caso 1 (Alta correlación Score vs Win Rate):* "El Priority Score predice exitosamente (~X%). Instruir al equipo a ignorar colas bajas y accionar sobre top scores".
  - *Caso 2 (Anomalía: Media-Baja cierra igual o más):* "Fallo predictivo. Cuentas de baja calificación están cerrando igual. Recalibrar parámetros del score".
- ⚙️ *¿Cómo se calcula?:* Agrupamiento de estados normalizado al 100% condicionado a buckets del `deal_priority_score`\*.

---

## Tab 3: Explorador de Clientes — "Déjame buscar y filtrar"

**Usuario Objetivo:** Todo el equipo (búsqueda cruzada)  
**Objetivo del Tab:** Filtrar de forma granular toda la base de clientes y analizar prospectos de manera individual. Es requisito explícito de la prueba ("búsquedas y filtrados precisos").

> *Es el tab que menos cambio estructural necesita — es más agregar datos que rediseñar.*

---

### Tabla Principal — Columnas

| Columna | Detalle |
| :--- | :--- |
| **Nombre** | Se mantiene |
| **Industria** | Se mantiene |
| **Vendedor** | Se mantiene |
| **Canal de Descubrimiento** | Se mantiene |
| **Urgencia** | Se mantiene |
| **Plan / ACV** | Se mantiene Plan, agregar ACV como subtexto ($413/mes, etc.) |
| **Priority Score** | Nuevo — `deal_priority_score` con color (verde/amarillo/rojo) |
| **Risk Score** | Se mantiene |
| **Estado** | Se mantiene |

### Filtros Avanzados

**Existentes (se mantienen):** Búsqueda por nombre (multi-select), vendedor, estado, industria, canal, plan, rango de risk score, urgencia, sentimiento.

**Nuevos:**
- **PMF Signal:** Fuerte / Moderada / Débil
- **Buyer Readiness:** Rango 0-4
- **Volumen estimado:** Checkbox "Ocultar volumen estimado" (filtra los imputados)

---

### Modal de Detalle (Ficha de Cliente)

**Contenido existente (se mantiene):** Datos de contacto, resumen ejecutivo, grid de categorías (industria, tipo, pain point, caso uso, canal, urgencia, sentimiento, feature, plan, patrón, volumen), retention risk con flags, objeciones, potencial de expansión.

**Mejoras al grid:** Mostrar explícitamente el Sentimiento/Temperatura general y la lista de Objeciones Detectadas.

**Nueva sección "Sales Intelligence"** — se ubica entre el grid de categorías y retention risk:

| Campo | Valor ejemplo | Formato |
| :--- | :--- | :--- |
| **Deal Priority** | 6.0/10 | Badge con color |
| **ACV Estimado** | $26,076/año | Moneda |
| **Buyer Readiness** | 3/4 — "Listo para comprar" | Score + label interpretativo |
| **Deal Complexity** | 1/4 — "Baja fricción" | Score + label interpretativo |
| **Días estimados** | ~25 días | Con nota: requiere calibración CRM |
| **Conv. Probability** | 72% | Win rate del segmento caso_uso × industria (min 3 deals), fallback a caso_uso, fallback a global |
| **PMF Signal** | Fuerte / Moderada / Débil | Badge con color |

**Disclaimer de Volumen:** Si `volumen_es_estimado === true` → mostrar "~2,300/mes (estimado)" en texto muted. Si `false` → "2,400/mes" normal.

---

## Tab 4: Growth Analysis — "¿Dónde están las palancas del sistema?"

**Usuario Objetivo:** Growth Engineer / RevOps  
**Objetivo del Tab:** Mapear el pipeline real como un "motor sistémico", analizando loops de adquisición, fricción de activación, revenue y defendibilidad de PMF. Organizado siguiendo el **Protocolo de Diagnóstico Estratégico** del framework de Growth.

> *No es solo "conversión por X" — mapea al sistema de Growth completo con lenguaje de loops.*

---

### KPIs de Growth

| KPI | Cálculo | Pregunta de Growth |
| :--- | :--- | :--- |
| **% Orgánico vs Pago** | `count(canal in ['Búsqueda Orgánica','Referidos']) / total` | "¿Cuánto de nuestra adquisición es autosustentable?" |
| **Revenue Won** | `sum(acv_estimado)` donde `estado === 'Won'` | "¿Cuánto cerramos?" |
| **Revenue Lost** | `sum(acv_estimado)` donde `estado === 'Lost'` | "¿Cuánto dejamos en la mesa?" |
| **Segmentos Validados** | Combos industria × caso_uso con conversión >65% y volumen >3 deals | "¿En cuántos mercados tenemos tracción real?" |

---

### Sección 1: Auditoría de Adquisición — "¿De dónde vienen y qué funciona?"

**Clasificación de canales por tipo de loop:**
- **Loop Viral:** Referido
- **Loop de Contenido:** Búsqueda orgánica, Contenido online, Podcast, Foro
- **Loop de Pago:** Conferencia, LinkedIn, Webinar

**Gráfico: Conversión por Canal** — `Horizontal BarChart` de Win Rate agrupando por `canal_descubrimiento`

- ⚡ *Motor Lógico de Insight:*
  - *Caso 1 (Referidos domina Win Rate):* "El loop viral es el más efectivo. Cada deal por referido es adquisición a costo cero que financia más agresividad en loops de pago. Urge sistematizar programa de referidos".
  - *Caso 2 (Canal de volumen no convierte):* "[Canal X] trae volumen grueso pero <X% Win Rate. Revisar CAC porque es plomo vacío".
- ⚙️ *¿Cómo se calcula?:* Tasa de ganados sobre totales filtrado y agrupado por `canal_descubrimiento`.

---

### Sección 2: Activación — "¿Qué genera el momento Aha?"

**Gráfico 1: Feature Valorada × Conversión** — `Barras 100% stacked` (existe, se mantiene)

- ⚡ *Motor Lógico de Insight:*
  - *Caso 1 (Feature X cierra más):* "Si [Feature X] es el momento Aha, acelerar su presencia en onboarding y demos".
- ⚙️ *¿Cómo se calcula?:* Porcentajes normalizados de estado condicionados a `feature_valorada`\*.

**Gráfico 2: Pain Point × Conversión** — `Barras stacked` (nuevo en este tab)

- ⚡ *Motor Lógico de Insight:*
  - *Caso 1 (Pain X + Feature Y = alta conversión):* "El Aha viene de resolver [dolor correcto] con [feature correcta]. Esto es el playbook de la demo".
- ⚙️ *¿Cómo se calcula?:* Tasa de conversión agrupada por `pain_point_principal`\*.

---

### Sección 3: Revenue y Fricción — "¿Dónde está el dinero y dónde se fuga?"

**KPIs auxiliares:** Revenue Ganado / Revenue Perdido / ACV promedio ganado vs perdido.

**Gráfico 1: Revenue por Industria** — `Barras horizontales` con ACV acumulado, color won/lost (nuevo)

- ⚡ *Motor Lógico de Insight:*
  - *Caso 1 (Fuga masiva en Industria Top):* "[Industria X] demanda el producto pero perdemos $Y USD. Ajustar discurso radicalmente para esa vertical".
  - *Caso 2 (Cierres perfectos en Industria Menor):* "[Industria Y] genera volumen bajo pero captura casi 100% del ACV. Triplicar ataque ahí".
- ⚙️ *¿Cómo se calcula?:* Sumatoria de ACV segmentada por industria y apilada por color de Estado.

> *Una vertical puede tener pocos deals pero alto ACV. Esto cambia la priorización — no es solo conversión sino cuánto $ representa cada vertical.*

**Gráfico 2: Conversión por Plan Sugerido** — `Barras stacked` (existe, se mantiene)

- ⚡ *Motor Lógico de Insight:*
  - *Caso 1 (Corporate convierte menos pero genera 5x revenue):* "Calibrar fricción, no abandonar el segmento. Standard = baja fricción, Corporate = alta fricción. ¿Estamos perdiendo Corporate por precio/complejidad, o por pitch desalineado?"
- ⚙️ *¿Cómo se calcula?:* Tasa de conversión normalizada por `plan_sugerido`\*.

**Gráfico 3: Objeciones en Tratos Perdidos** — `Horizontal BarChart` de frecuencias tabulando arrays de `objeciones` excluyendo deals Won (recuperado del diseño original)

- ⚡ *Motor Lógico de Insight:*
  - *Caso 1 (Precio domina):* "Elasticidad de precio tocada. Revisar si atraemos un demográfico con bajo poder adquisitivo".
  - *Caso 2 (Funcionalidad / Integración):* "Deuda técnica penalizando las ventas de frente. Priorizar roadmap de integraciones".
- ⚙️ *¿Cómo se calcula?:* Conteo absoluto iterando el array `objeciones`\* en deals Lost.

---

### Sección 4: PMF y Defendibilidad — "¿Dónde encajamos y qué protege eso?"

**Gráfico 1: Mapa de PMF** — `Heatmap/tabla` de industria × caso_uso, coloreada por win rate (nuevo)

> *El gráfico más estratégico de todo el dashboard.* No es "Salud convierte X%". Es "Salud × Reservas y Citas tiene 80% win rate con 5 deals — ahí tenemos PMF validado. Salud × Soporte tiene 0 deals — territorio inexplorado."

- ⚡ *Motor Lógico de Insight:*
  - *Caso 1 (Clusters claros de PMF):* "PMF validado en [X] segmentos. Concentrar adquisición ahí antes de expandir".
- ⚙️ *¿Cómo se calcula?:* Matriz de win rate cruzando `industria` × `caso_uso_principal`\*, filtrada por combos con ≥3 deals.

**Gráfico 2: PMF Signal × Resultado** — `100% Stacked BarChart` agrupado por `pmf_signal`

- ⚡ *Motor Lógico de Insight:*
  - *Caso 1 (Alta correlación 'Fuerte' a Won):* "El motor predictivo es exacto. Desechar leads 'Débil' apenas entren en la bandeja".
  - *Caso 2 (Deals 'Fuerte' perdiéndose):* "El problema no es el fit del producto, sino el precio o el proceso mismo de ventas".
- ⚙️ *¿Cómo se calcula?:* Porcentajes 100% normalizados entre estado y clasificación de `pmf_signal`\*.

---

### Resumen Visual del Tab
## Tab 5: Retention Intelligence — "¿Quién va a hacer churn?"

**Usuario Objetivo:** Customer Success / Retention Managers  
**Objetivo del Tab:** Predecir activamente qué clientes *ganados* pueden cancelar su suscripción, permitiendo intervenciones oportunas para defender el LTV.

> **Alcance:** Solo clientes CERRADOS (Won). Los perdidos no son relevantes aquí — ya se fueron. La pregunta es: de los que entraron, ¿quién va a salir?

> **Diferenciador del proyecto:** La retención es un problema real de Vambe. Este tab transforma datos de venta en un activo de retención — exactamente el **Macroloop de Datos** del framework de Growth: cada deal cerrado alimenta el modelo predictivo → mejora la intervención de CS → mejora retención → mejora LTV → permite más agresividad en CAC.

---

### Concepto Clave: Dos Tipos de Riesgo

Este tab distingue dos tipos de riesgo con intervenciones distintas:

| Tipo | Flags que lo componen | Cuándo aparece | Cómo se resuelve |
| :--- | :--- | :--- | :--- |
| 🔵 **Riesgo de Activación** | `requiere_integracion`, `baja_readiness` (complexity ≥ 2 o readiness ≤ 1) | Primeras 2-4 semanas | Ingeniero de onboarding dedicado + docs técnicas |
| 🟠 **Riesgo de Permanencia** | `motivacion_reactiva`, `objeciones_no_resueltas` | Semanas 4-12 (post-activación) | Llamadas de valor, pruebas de ROI, casos de uso aplicados |

> *Un cliente puede tener ambos tipos (🔴 Doble Riesgo) — estos son los casos más urgentes.*

---

### KPIs de Riesgo

| KPI | Cálculo | Decisión |
| :--- | :--- | :--- |
| **Clientes Activos** | `count(estado === 'Won')` | Base total |
| **En Riesgo** | `count(retention_risk_score >= 3)` para Won | "¿Cuántos necesitan intervención?" (se escala a rojo) |
| **MRR en Riesgo** | `sum(acv_estimado/12)` de clientes con `retention_risk_score >= 3` | "¿Cuánto revenue podemos perder?" — lo que hace que CS preste atención |
| **Onboarding Difícil** | `count(integration_complexity >= 2)` para Won | "¿Cuántos onboardings necesitan ingeniería dedicada?" |

> *El KPI de MRR en Riesgo es el más poderoso. No es "3 clientes tienen riesgo alto" — es "$6,519/mes están en peligro". Eso mueve a la gente.*

---

### Sección 1: Detalle por Cliente — "¿Quiénes son exactamente y qué necesitan?"

**Tabla interactiva** — solo clientes Won, ordenada por `retention_risk_score` descendente. Click en fila abre modal de detalle. **Sube al inicio porque CS necesita nombres reales primero, los gráficos son el contexto.**

| Columna | Detalle |
| :--- | :--- |
| **Nombre** | Identificación |
| **Plan** | Nivel de servicio |
| **MRR** | `acv_estimado / 12` |
| **Risk Score** | Con color por gravedad (0 = 🟢, 1-2 = 🟡, 3+ = 🔴) |
| **Tipo de Riesgo** | Badge: 🔵 Activación / 🟠 Permanencia / 🔴 Doble / 🟢 Safe |
| **Flags** | `retention_risk_flags` como badges legibles |
| **Onboarding** | `integration_complexity` — label interpretativo: "Sin fricción" / "Asistencia puntual" / "Ingeniero dedicado" |

- ⚡ *Insight dinámico:* "X% de los clientes cerrados tienen riesgo ≥ 3 — representan $X/mes. Los flags más comunes son: [Y, Z]. Los [N] con integración compleja necesitan asignación de ingeniero antes de la semana 1."

---

### Sección 2: Visualizaciones — "¿Cuál es el patrón del riesgo?"

> *CS abre esto a las 9am. Cada gráfico responde una pregunta específica en 5 segundos — no requiere interpretación.*

#### Gráfico A: Ranking Visual de Clientes por Riesgo — "¿Quién va primero en la lista de CS?"

**`Horizontal Stacked BarChart` — Top 15 clientes Won, barras segmentadas por tipo de flag**

- Cada barra = un cliente. Longitud total = cantidad de flags activos.
- Color segmentado dentro de la barra: **🔵 Azul** = flags de Activación / **🟠 Naranja** = flags de Permanencia.
- Ordenado de más flags a menos → lectura de arriba a abajo = orden de prioridad de intervención.
- Tooltip al hover: nombre + MRR + plan + lista de flags activos.

- ⚡ *Motor Lógico de Insight:*
  - *Caso 1 (Azul domina en los primeros 5):* "El riesgo está concentrado en Activación — los clientes llegaron pero no están conectados. El problema es el onboarding, no el producto ni el fit."
  - *Caso 2 (Naranja domina):* "El riesgo está en Permanencia — los clientes están activos pero con motivación frágil. Hay que agregar valor antes de que el incendio inicial se apague."
  - *Caso 3 (Mixto en los primeros):* "Perfiles de riesgo doble detectados — estos clientes necesitan intervención tanto técnica como estratégica. Asignar senior de CS."
- ⚙️ *¿Cómo se calcula?:* Conteo de `retention_risk_flags` clasificados en tipo Activación o Permanencia según el nombre del flag. Barras apiladas por cliente, ordenadas por total de flags descendente.

---

#### Gráfico B: MRR por Tipo de Riesgo — "¿Cuánto dinero está expuesto y por qué?"

**Una sola `Horizontal Stacked Bar` — MRR total desglosado por categoría de exposición**

- Una sola barra dividida en 4 segmentos:
  - 🟢 **Safe** — sin flags activos
  - 🔵 **Solo Activación** — solo flags técnicos de onboarding
  - 🟠 **Solo Permanencia** — solo flags de motivación/expectativa
  - 🔴 **Doble Riesgo** — ambos tipos de flags activos
- Ancho de cada segmento = suma del MRR de los clientes en esa categoría.
- Tooltip por segmento: cantidad de clientes + MRR total.

- ⚡ *Motor Lógico de Insight:*
  - *Caso 1 (Rojo > 20% del MRR total):* "Alerta Crítica: $X/mes en clientes con doble riesgo. Intervención ejecutiva requerida."
  - *Caso 2 (Azul domina el MRR expuesto):* "El riesgo es operativo, no estratégico. Resolver el onboarding tiene ROI directo sobre retención."
  - *Caso 3 (Verde > 60%):* "La base es sana. El MRR en riesgo es manejable con intervención focalizada."
- ⚙️ *¿Cómo se calcula?:* `sum(acv_estimado/12)` agrupado por categoría de exposición (combinación de flags activos por cliente).

---

#### Gráfico C: Perfil de Riesgo por Plan — "¿Dónde concentrar el esfuerzo según tier?"

**`Vertical Stacked BarChart` — una barra por plan (Standard / Advanced / Corporate)**

- Cada barra = un plan. Altura = total de clientes Won en ese plan.
- Segmentos de color (mismos 4 de Gráfico B): Safe / Solo Activación / Solo Permanencia / Doble Riesgo.
- Responde: "¿los Corporate entran con más riesgo que los Standard?" → CS ajusta el nivel de dedicación por tier.

- ⚡ *Motor Lógico de Insight:*
  - *Caso 1 (Corporate concentra Doble Riesgo):* "Los clientes de mayor ticket tienen el perfil de mayor riesgo. El onboarding corporativo necesita un proceso dedicado — no el mismo flujo self-service que Standard."
  - *Caso 2 (Standard domina en flagged):* "Sorpresa: los clientes de menor ticket tienen más flags activos. El onboarding self-service no es suficiente para este segmento — revisar si el proceso de venta está sobreprometiendo."
  - *Caso 3 (Distribución pareja entre planes):* "El riesgo no está segmentado por precio. Los factores de riesgo son transversales — revisar si el proceso de ventas necesita más calificación técnica en todos los tiers."
- ⚙️ *¿Cómo se calcula?:* Conteo de clientes Won agrupados por `plan_sugerido`, subdivididos por su categoría de exposición al riesgo (combinación de flags activos).

---

### Sección 3: Playbook de Retención (Recomendaciones Dinámicas)

Bloque de texto **generado dinámicamente** basado en los datos. Convierte el dashboard de descriptivo a **prescriptivo**.

Estructura del playbook:

1. **URGENTE:** [X] clientes con Risk ≥ 3 representan $[Y]/mes → Agendar llamada de onboarding personalizada esta semana.
2. **ONBOARDING:** [X] clientes tienen `integration_complexity >= 2` → Asignar ingeniero de soporte dedicado antes de la semana 1.
3. **ACTIVACIÓN:** La feature más valorada en cerrados es "[Z]" → Asegurar que esta feature esté configurada en las primeras 24h para todos los clientes nuevos.

> *Este bloque es lo que diferencia a un Growth Engineer de un Data Analyst. No solo "qué pasa" sino "qué hacer esta semana".*

---

### Resumen Visual del Tab

```
┌──────────────────────────────────────────────────────┐
│ KPIs: Activos | En Riesgo | MRR en Riesgo | Int.Cmplx│
├──────────────────────────────────────────────────────┤
│                                                      │
│  MAPA DE RIESGO                                      │
│  [Tabla: clientes cerrados por risk score desc]      │
│                                                      │
│  ANATOMÍA DEL RIESGO                                 │
│  [Risk Score distrib.]    [Flags frecuentes]         │
│                                                      │
│  SEÑALES CRUZADAS                                    │
│  [Integ. × Industria]    [Feature won vs lost]       │
│                                                      │
│  PLAYBOOK DE RETENCIÓN                               │
│  [Recomendaciones dinámicas basadas en los datos]    │
│                                                      │
└──────────────────────────────────────────────────────┘
```

---

## Notas de Implementación Globales

1. **Cada gráfico** debe contener botón "Insight" (generado adaptativamente con lógica if/else) y botón "¿Cómo se calcula?" (metodología transparente con asterisco para variables IA).

2. **Modal de detalle** es compartido entre Tab 2 (Pipeline Intelligence), Tab 3 (Explorador) y Tab 5 (Retention). Un solo componente reutilizable.

3. **Variables con asterisco (\*)** en la UI significan que su captura o cálculo subyacente utiliza variables extraídas con IA.

4. **`estimated_close_days`** es la métrica más débil — es una estimación sobre estimaciones (fórmula: `30 - (readiness × 5) + (complexity × 10)`, clamped 7-90). Se sacó de KPIs ejecutivos (Tab 1). Solo aparece en Tab 2 (KPI + histograma + tabla) y modal de detalle, siempre con disclaimer en "¿Cómo se calcula?".

5. **`retention_risk_score`** usa escala 0-5 cruda (cada punto = un flag real de riesgo). Buckets: 0 (Sano), 1-2 (Precaución), 3+ (Riesgo). **Pendiente en código:** eliminar el mapeo `escala_1_10` en `derive_all()` y guardar el score crudo directamente. El mapeo actual (0→1, 1→3, 2→5...) distorsiona la escala sin agregar información.

6. **No existe estado "Open"** en los datos — todos los deals son Won (`closed: 1`) o Lost (`closed: 0`). Los gráficos que referenciaban "Open" se ajustan a Won/Lost.

7. **Filtros compartidos** entre tabs cuando aplique (vendedor, industria, estado).

8. **Insights en lenguaje de Growth:** Los insights del Tab 4 y Tab 5 hablan en lenguaje de loops y sistema, no solo en porcentajes.

9. **Nombres diferenciados para PMF:** Tab 1 usa "% PMF Fuerte" (leads individuales con `pmf_signal === 'Fuerte'`). Tab 4 usa "Segmentos Validados" (combos industria × caso_uso con conversión >65% y ≥3 deals). Son métricas distintas.

10. **Transformación `closed` → `estado`:** Los datos crudos traen `closed: 1` (Won) / `closed: 0` (Lost). El frontend debe derivar un campo `estado` al cargar: `closed === 1 ? 'Won' : 'Lost'`. Todas las fórmulas del documento usan `estado` como string.

11. **"Segmentos Validados" (Tab 4)** es un cálculo que hace el frontend sobre los datos agregados — NO sale del campo `pmf_signal`. Se calcula cruzando `industria × caso_uso`, filtrando combos con ≥3 deals y win rate >65%.

12. **`conversion_probability`** usa una cascada de fallbacks: (1) win rate del cruce `caso_uso × industria` si hay ≥3 deals, (2) win rate del `caso_uso` solo si hay ≥3 deals, (3) win rate global. El "¿Cómo se calcula?" debe explicar esta cascada.

13. **`deal_priority_score`** tiene distribución sesgada a valores bajos (fórmula: `(value_tier × (readiness+1)) / (complexity+1)`, normalizado a 0-10). Usar percentil 75 o terciles dinámicos en vez de thresholds fijos para los buckets Baja/Media/Alta.

14. **`tamano_operacion`** existe en los datos (Small/Medium/Large, derivado del volumen) pero no se usa en ninguna visualización. **Decisión: no mostrarlo en la UI.** Si se necesita segmentar por tamaño, usar `plan_sugerido` que ya refleja el volumen y es más legible. Candidato a eliminar del código en limpieza posterior.
