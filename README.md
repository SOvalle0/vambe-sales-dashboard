# Vambe Sales Intelligence Dashboard

Panel interactivo que procesa transcripciones de reuniones de ventas, categoriza automáticamente con IA (Gemini) y visualiza métricas estratégicas para los equipos de Ventas, Growth y Customer Success.

## 🔗 Link de la aplicación

> *(agregar URL de Vercel después del deploy)*

---

## ¿Qué hace esta aplicación?

A partir de un CSV con 60 transcripciones de reuniones de ventas, el sistema:

1. **Extrae categorías** con Gemini API — industria, caso de uso, canal de adquisición, pain point, PMF signal, riesgo de retención y más
2. **Calcula un Risk Score híbrido** (LLM + Python) que mide probabilidad de churn desde el momento del cierre
3. **Visualiza todo** en 5 tabs especializados por rol

### Los 5 tabs

| Tab | Título | Para quién | Pregunta que responde |
|:---|:---|:---|:---|
| 1 | Overview | CEO / Sales Manager | ¿Cómo estamos? |
| 2 | Pipeline Intelligence | Sales Rep | ¿A quién persigo primero? |
| 3 | Explorador de Clientes | Todo el equipo | Déjame buscar y filtrar |
| 4 | Growth Analysis | Growth / RevOps | ¿Dónde están las palancas? |
| 5 | Retention Intelligence | Customer Success | ¿Quién va a hacer churn? |

---

## Ejecutar localmente

### Requisitos

- Node.js 18+
- Python 3.8+ *(solo si quieres re-correr la categorización)*
- API Key de Google Gemini *(solo si quieres re-correr la categorización)*

### 1. Clonar el repositorio

```bash
git clone https://github.com/SOvalle0/vambe-sales-dashboard.git
cd vambe-sales-dashboard
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Correr la aplicación

```bash
npm run dev
```

Abrir [http://localhost:5173](http://localhost:5173)

> Los datos ya están procesados en `src/data/clients_categorized.json`. No necesitas correr el script de Python para ver la app.

---

## Re-procesar los datos (opcional)

Si quieres volver a categorizar los clientes con Gemini:

### 1. Instalar dependencias de Python

```bash
pip install google-generativeai python-dotenv pandas
```

### 2. Configurar API Key

```bash
echo "GEMINI_API_KEY=tu_api_key_aqui" > .env
```

Obtener una key gratuita en: [https://aistudio.google.com/apikey](https://aistudio.google.com/apikey)

### 3. Correr el script

```bash
python scripts/categorize.py
```

Genera `data/clients_categorized.json`. Luego copiar al src:

```bash
cp data/clients_categorized.json src/data/
```

---

## Arquitectura

```
CSV (60 clientes)
       │
       ▼
scripts/categorize.py
       │── Lee cada transcripción
       │── Envía a Gemini API con prompt estructurado
       │── NO pasa el campo "closed" al LLM (para que el Risk Score sea predictivo)
       │── Recibe categorías en JSON con enums cerrados
       │── Valida con fuzzy matching en Python
       │── Calcula Risk Score híbrido (5 flags compuestos)
       │── Genera clients_categorized.json
       ▼
src/data/clients_categorized.json
       │
       ▼
React App (5 tabs)
       │── Filtros globales compartidos entre tabs
       │── Insights dinámicos generados por lógica condicional
       │── Gráficos con Recharts
       │── Column picker en tabla de clientes
       ▼
Vercel (deploy estático)
```

### Stack

- **Procesamiento:** Python 3 + Google Gemini API (`gemini-2.0-flash-lite`)
- **Frontend:** React + Vite + Recharts + Lucide Icons
- **Estilos:** Tailwind CSS con design system personalizado
- **Deploy:** Vercel
- **Versionamiento:** GitHub

---

## Decisiones clave

Ver [`DECISIONES.md`](./DECISIONES.md) para la documentación completa de las decisiones de arquitectura, categorización y diseño del dashboard.

### Resumen rápido

- **Risk Score híbrido:** El LLM responde flags de sí/no concretos, Python los combina con señales compuestas. Auditable y con variabilidad real.
- **Sin backend:** Los datos son estáticos para esta prueba. La arquitectura JAMstack conecta fácilmente a una API real en producción.
- **5 tabs por rol:** Cada tab tiene un usuario objetivo distinto y responde una pregunta diferente. No es un dashboard genérico — es una herramienta de trabajo.
- **Insights adaptativos:** Los textos de insight debajo de cada gráfico se generan con lógica condicional (if/else) sobre los datos reales, no son textos fijos.

---

## Estructura del proyecto

```
vambe-sales-dashboard/
├── data/
│   ├── vambe_clients.csv              ← CSV original de la prueba
│   └── clients_categorized.json       ← JSON procesado por el script
├── scripts/
│   └── categorize.py                  ← Script de categorización con Gemini
├── src/
│   ├── App.jsx                        ← Navegación entre tabs
│   ├── index.css                      ← Design system + variables CSS
│   ├── data/
│   │   └── clients_categorized.json   ← Copia importada por React
│   ├── components/
│   │   ├── Layout.jsx                 ← Sidebar + header
│   │   ├── KPICard.jsx                ← Card reutilizable de métrica
│   │   ├── ClientDetail.jsx           ← Modal de ficha de cliente
│   │   └── Filters.jsx                ← Filtros compartidos (5 tabs)
│   ├── hooks/
│   │   └── useFilteredClients.js      ← Lógica de filtrado global
│   └── pages/
│       ├── Overview.jsx               ← Tab 1
│       ├── PipelineIntelligence.jsx   ← Tab 2
│       ├── ClientsExplorer.jsx        ← Tab 3
│       ├── GrowthAnalysis.jsx         ← Tab 4
│       └── RetentionIntelligence.jsx  ← Tab 5
├── .gitignore
├── package.json
├── vite.config.js
├── DECISIONES.md
└── README.md
```
