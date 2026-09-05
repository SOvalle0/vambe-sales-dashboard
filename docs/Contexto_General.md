# CLAUDE.md — Contexto del Proyecto

---

## Quién soy

Soy **Sebastián Ovalle**, Ingeniero Comercial de la Universidad de los Andes (Chile), especializado en Marketing y Estrategia. Estoy postulando al puesto de **Growth Engineer en Vambe AI**. Esta prueba técnica es la etapa final del proceso de selección.

### Mi perfil técnico:
- 4 años programando de forma autodidacta
- Python para análisis y automatización
- JavaScript vía Google Apps Script y N8n
- Swift/SwiftUI para desarrollo móvil (app propia: Buenos Días App)
- Power BI, DAX, SQL, Google Analytics
- CRM custom en Google Sheets con Apps Script
- Flujos de automatización en N8n conectando APIs
- Claude Code y herramientas de IA como parte del flujo de trabajo diario
- Prompt engineering (certificación Platzi)

### Mi experiencia relevante:
- **Softys (CMPC):** Analicé patrones de compra de +10.000 clientes, segmenté y prioricé para vendedores. Dashboards en Power BI. Automaticé consolidación de datos con Python.
- **Lavandería C&C:** Implementé tienda Shopify, campañas Google/Facebook Ads, automaticé sincronización de contactos con Apps Script.
- **Buenos Días App:** App móvil propia con 3 años de iteración. Swift/SwiftUI, Firebase, integraciones con APIs, diseño en Figma.
- **Innova Emprende:** Fundé el club de emprendimiento de la Universidad de los Andes.

### Lo que buscan en el puesto (confirmado por reclutadora y contactos):
1. **Mirada estratégica** — Entender el negocio, no solo ejecutar código
2. **Marketing y Growth** — Pensar en adquisición, activación, retención, loops
3. **Programación** — Ejecutar técnicamente las soluciones

### Dato clave de la reclutadora:
La **retención de clientes** es un problema real y actual de Vambe. El Retention Risk Score que creamos ataca esto directamente.

---

## Qué es Vambe

**Vambe AI** es una plataforma de "Agentic AI" para comercio conversacional en Latinoamérica.

### El producto:
- Agentes de IA autónomos que venden, atienden y hacen seguimiento por WhatsApp, Instagram, Facebook y Webchat
- Plataforma no-code para que empresas configuren flujos de venta automatizados
- Integración con CRMs (HubSpot, Pipedrive, Zoho), e-commerce (Shopify) y sistemas internos
- Multi-agente: diferentes IAs especializadas en calificación, catálogo, logística, pagos
- Procesa notas de voz, imágenes, documentos

### Números:
- +1.700 clientes en 15 países
- Crecimiento ~20% MoM
- Serie A de $14M USD (Monashees, Cathay Latam, M13, Atlantico, Tekton, Nazca)
- Simón Borrero (fundador de Rappi) en el directorio
- +80 personas en el equipo
- Expandiéndose a Brasil en 2026

### Equipo fundador:
- **Nicolás Camhi** (CEO) — Ing. Civil Industrial PUC, Berkeley SkyDeck
- **Matías Pérez Pefaur** (CAIO) — Arquitecto de la lógica de conversación
- **Diego Chahuán** (CTO) — Infraestructura y escalabilidad

### Stack técnico:
- IA agnóstica: Anthropic + OpenAI + Google Gemini
- Productos: Mercur (plataforma principal), Iris (SMBs), Axis (API), Ads (atribución), Connect (integraciones)

### Clientes notables:
- Global66 (fintech, 60k+ chats/mes)
- Reuse (e-commerce, triplicó ventas)
- Universidad Adolfo Ibáñez (matrículas 100% con IA)
- Chevrolet Peregrina (leads automotrices)

---

## La Prueba Técnica

### Qué piden:
Crear una aplicación que:
1. Procese un CSV de 60 clientes con transcripciones de reuniones de ventas
2. Categorice automáticamente usando un LLM (definir las dimensiones libremente)
3. Muestre métricas en un panel interactivo con búsqueda y filtros

### Criterios de evaluación:
- **Funcionalidad:** Procesa y categoriza correctamente. Panel con búsquedas y filtrados precisos.
- **Calidad de código:** Limpio, modular, bien estructurado.
- **Creatividad y visión de producto:** Categorías innovadoras, propuesta de valor clara.
- **Experiencia de usuario:** Interfaz intuitiva, presentación visual atractiva.

### Entregables:
- Repositorio en GitHub
- Link funcional de la app (Vercel)
- README con instrucciones para ejecutar localmente
- Documentación de arquitectura y decisiones clave

### Deadline: Viernes 10 de abril 2026 a las 18:00

---

## Qué estamos construyendo

### Vambe Sales Intelligence Dashboard

No es solo un dashboard — es una herramienta de Growth operativo diseñada como si ya fuéramos parte del equipo de Vambe.

### Arquitectura Tecnológica y Vistas del Dashboard:
*(Todo el detalle del diagrama de flujo de datos, el stack tecnológico y las vistas fase 1/fase 2 han sido unificados en sus documentos oficiales. Consulta `DECISIONES.md` para arquitectura técnica y la Sección 5 de `Contexto_Particular.md` para las vistas).*

---

## Guías del Proyecto

La documentación de este proyecto está estrictamente dividida para mantener una única fuente de verdad:

1. **Contexto_Particular.md** — Estrategia de producto, framework AARRR, dimensiones de categorización y reglas de negocio.
2. **Paso_a_Paso.md** — Implementación técnica fase por fase, y **Estructura oficial del Proyecto** (carpetas y archivos).
3. **Diseño.md** — Paleta de colores, tipografía, componentes UI y variables de Tailwind.
4. **DECISIONES.md** — Arquitectura de software, flujo de datos y justificaciones técnicas (para evaluación).

---

## Principios de desarrollo

1. **Fase 1 perfecta antes de Fase 2** — 3 vistas impecables > 6 mediocres
2. **La tabla filtrable es sagrada** — Es requisito explícito, debe ser el componente más robusto
3. **Commit frecuente** — Cada paso completado es un commit con mensaje descriptivo
4. **Sin backend** — Datos estáticos, JSON importado. En producción se conectaría a Vambe Axis API
5. **Sin sobre-ingeniería** — El stack más simple que cumpla los requisitos
6. **Probar en Vercel después de cada fase** — Lo que funciona local puede fallar en deploy

---

## Estructura del proyecto

*(La estructura exacta de carpetas y componentes requeridos está documentada exclusivamente en la Sección "Estructura del Proyecto Final" de `Paso_a_Paso.md` para evitar inconsistencias durante el mapeo de rutas).*
