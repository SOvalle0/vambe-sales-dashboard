# Paso a Paso — Implementación del Proyecto Vambe
## De cero a app desplegada

---

## Estructura del Proyecto Final

```
vambe-sales-dashboard/
├── data/
│   ├── vambe_clients.csv              ← CSV original
│   └── clients_categorized.json        ← JSON generado por el script
├── scripts/
│   └── categorize.py                   ← Script de categorización con Gemini
├── src/
│   ├── App.jsx                         ← Componente principal + navegación
│   ├── main.jsx                        ← Entry point React
│   ├── index.css                       ← Estilos globales + Tailwind
│   ├── data/
│   │   └── clients.js                  ← Importa y procesa el JSON
│   ├── components/
│   │   ├── Layout.jsx                  ← Sidebar + header
│   │   ├── KPICard.jsx                 ← Card reutilizable de métrica
│   │   ├── ClientTable.jsx             ← Tabla con búsqueda y filtros
│   │   ├── ClientDetail.jsx            ← Modal/vista detalle de un cliente
│   │   ├── ConversionChart.jsx         ← Gráfico de barras comparativo
│   │   ├── RiskScoreChart.jsx          ← Distribución del Risk Score
│   │   └── Filters.jsx                 ← Componente de filtros compartido
│   └── pages/
│       ├── Overview.jsx                ← Vista 1: KPIs principales
│       ├── ConversionAnalysis.jsx      ← Vista 2: Análisis de conversión
│       ├── ClientsExplorer.jsx         ← Vista 3: Tabla filtrable
│       ├── SellerPerformance.jsx       ← Vista 4: Performance vendedores (Fase 2)
│       ├── RetentionIntel.jsx          ← Vista 5: Retention Intelligence (Fase 2)
│       └── LostDeals.jsx              ← Vista 6: Deals perdidos (Fase 2)
├── public/
├── package.json
├── tailwind.config.js
├── vite.config.js
├── README.md                           ← Instrucciones de ejecución
└── DECISIONES.md                       ← Documentación de arquitectura
```

---

## FASE 0 — Setup Inicial (30 min)

### Paso 0.1: Crear repositorio en GitHub
```bash
# Crear repo en GitHub (interfaz web o CLI)
# Nombre sugerido: vambe-sales-dashboard

git clone https://github.com/TU_USUARIO/vambe-sales-dashboard.git
cd vambe-sales-dashboard
```

### Paso 0.2: Obtener API Key de Gemini
1. Ir a https://aistudio.google.com/apikey
2. Click "Create API Key"
3. Copiar la key
4. Guardarla en un archivo `.env` (NO subir a GitHub):
```bash
echo "GEMINI_API_KEY=tu_key_aqui" > .env
echo ".env" >> .gitignore
```

### Paso 0.3: Preparar carpeta de datos
```bash
mkdir -p data scripts src
cp /ruta/al/vambe_clients.csv data/
```

---

## FASE 1A — Script de Categorización (Día 1)

### Paso 1.1: Instalar dependencias Python
```bash
pip install google-generativeai python-dotenv pandas
```

### Paso 1.2: Escribir `scripts/categorize.py`

**Qué hace este script:**
1. Lee el CSV con los 60 clientes
2. Para cada cliente, envía la transcripción a Gemini
3. Gemini devuelve un JSON con las categorías
4. El script guarda todo en `data/clients_categorized.json`

**Puntos críticos del script:**
- **CRÍTICO: El Merge Final.** Como no enviamos el campo `closed` a Gemini, el JSON devuelto no incluye quién es el cliente, quién se lo vendió, ni si se cerró. El script de Python DEBE buscar los valores originales (`closed`, `vendedor`, `nombre`, etc.) del CSV y pegarlos (hacer merge) al diccionario que recibe de Gemini antes de guardarlo. Sin esto, React no tendrá qué renderizar.
- NO pasar el campo `closed` a Gemini (para que el Risk Score sea predictivo)
- Manejar errores de API (rate limits, respuestas malformadas)
- Incluir reintentos automáticos
- Guardar progreso parcial (por si falla a mitad)
- Agregar un pequeño delay entre llamadas (evitar rate limit)

**Estructura del script:**
```python
# 1. Cargar variables de entorno y CSV
# 2. Configurar cliente de Gemini
# 3. Definir el prompt (ver sección 6 de la Guía Estratégica)
# 4. Loop por cada fila del CSV:
#    a. Armar prompt con transcripción + vendedor + fecha
#    b. Llamar a Gemini
#    c. Parsear JSON de respuesta
#    d. Agregar campos originales (nombre, email, teléfono, closed, vendedor)
#    e. Guardar en lista
# 5. Exportar lista completa como JSON
```

### Paso 1.3: Ejecutar y validar
```bash
python scripts/categorize.py
```

**Validación manual:**
- Abrir `data/clients_categorized.json`
- Revisar 5-10 clientes aleatorios
- Verificar que las categorías tengan sentido vs. la transcripción
- Verificar que el Risk Score sea coherente (no todos iguales)
- Verificar que todos los campos estén presentes

**Si hay problemas:**
- Respuestas cortadas → Aumentar `max_output_tokens`
- JSON malformado → Agregar instrucción más estricta en el prompt
- Categorías inconsistentes → Ser más específico en los valores posibles
- Rate limit → Aumentar delay entre llamadas

### Paso 1.4: Commit del progreso
```bash
git add data/clients_categorized.json scripts/categorize.py
git commit -m "feat: script de categorización con Gemini + datos procesados"
git push
```

---

## FASE 1B — Setup del Frontend React (Día 2 mañana)

### Paso 1.5: Crear proyecto React con Vite
```bash
npm create vite@latest . -- --template react
npm install
npm install tailwindcss @tailwindcss/vite recharts lucide-react
```

### Paso 1.6: Configurar Tailwind
En `vite.config.js`:
```javascript
import tailwindcss from '@tailwindcss/vite'
export default {
  plugins: [tailwindcss()]
}
```

En `src/index.css` importa Tailwind e inyecta las variables de Diseño:
```css
@import "tailwindcss";

:root {
  /* 
    Pega aquí TAL CUAL las variables CSS declaradas en `Diseño.md` 
    (Por ejemplo: --brand, --success, etc.)
    No las inventes de cero, mantén la consistencia visual.
  */
}
```
*(Importante: Para que las clases nativas como `bg-brand` funcionen, debes mapearlas en el `tailwind.config.js` tal como indica la sección 8 de Diseño.md)*

### Paso 1.7: Copiar JSON a src
```bash
cp data/clients_categorized.json src/data/
```

Crear `src/data/clients.js`:
```javascript
import rawData from './clients_categorized.json'
// Aquí se pueden agregar funciones helper para filtrar/agrupar datos
export default rawData
```

### Paso 1.8: Verificar que corre
```bash
npm run dev
```
Abrir http://localhost:5173 — debería verse la app de React por defecto.

### Paso 1.9: Commit
```bash
git add .
git commit -m "feat: setup React + Tailwind + datos importados"
git push
```

---

## FASE 1C — Vista 1: Overview / KPIs (Día 2 tarde)

### Paso 1.10: Crear Layout base
**Archivo:** `src/components/Layout.jsx`

**Qué incluye:**
- Sidebar con navegación entre vistas (Overview, Conversión, Clientes)
- Header con logo/título "Vambe Sales Intelligence"
- Área de contenido principal

### Paso 1.11: Crear componente KPICard
**Archivo:** `src/components/KPICard.jsx`

**Props:** título, valor, subtítulo, ícono, color
**Ejemplo de uso:** `<KPICard titulo="Tasa de Cierre" valor="70%" subtitulo="42 de 60 leads" />`

### Paso 1.12: Crear página Overview
**Archivo:** `src/pages/Overview.jsx`

**Contenido:**
- Fila de KPI Cards:
  - Tasa de cierre global (42/60 = 70%)
  - Total de leads (60)
  - Leads cerrados (42)
  - Leads perdidos (18)
- Gráfico de barras: Cierre por vendedor (Toro, Puma, Zorro, Boa, Tiburón)
- Gráfico de dona: Distribución por industria
- Gráfico de barras horizontal: Top pain points

### Paso 1.13: Conectar navegación en App.jsx
**Archivo:** `src/App.jsx`
- Importar Layout y Overview
- Configurar estado para la vista activa
- Renderizar la página correspondiente

### Paso 1.14: Verificar y commit
- ¿Las KPI cards muestran datos correctos?
- ¿Los gráficos renderizan sin errores?
- ¿La navegación funciona?

```bash
git add .
git commit -m "feat: vista Overview con KPIs y gráficos principales"
git push
```

---

## FASE 1D — Vista 3: Tabla de Clientes (Día 2 noche o Día 3 mañana)

> La tabla va ANTES que el análisis de conversión porque es requisito explícito
> ("búsquedas y filtrados precisos") y es lo más probable que prueben primero.

### Paso 1.15: Crear componente ClientTable
**Archivo:** `src/components/ClientTable.jsx`

**Funcionalidades requeridas:**
- Búsqueda por nombre (input de texto, filtra en tiempo real)
- Filtros dropdown por:
  - Vendedor (Toro, Puma, Zorro, Boa, Tiburón)
  - Estado (Cerrado / No cerrado)
  - Industria (valores del LLM)
  - Canal de descubrimiento
  - Rango de Risk Score (1-3, 4-6, 7-10)
- Tabla con columnas: Nombre, Industria, Vendedor, Canal, Urgencia, Risk Score, Estado
- Ordenamiento por columna (click en header)
- Indicador visual del Risk Score (color: verde/amarillo/rojo)
- Indicador visual del estado (badge cerrado/perdido)

### Paso 1.16: Crear componente ClientDetail
**Archivo:** `src/components/ClientDetail.jsx`

**Se abre al hacer click en una fila de la tabla.**

**Muestra:**
- Datos de contacto (nombre, email, teléfono)
- Vendedor asignado y fecha
- Resumen ejecutivo (generado por LLM)
- Todas las categorías con labels claros
- Retention Risk Score con las razones
- Feature valorada
- Objeciones detectadas
- Estado de la venta (cerrado/perdido)

### Paso 1.17: Crear página ClientsExplorer
**Archivo:** `src/pages/ClientsExplorer.jsx`

Integra ClientTable + ClientDetail + Filters.
Muestra contadores dinámicos: "Mostrando X de 60 clientes"

### Paso 1.18: Verificar y commit
- ¿La búsqueda filtra correctamente por nombre?
- ¿Los filtros combinados funcionan? (ej: Vendedor=Toro + Estado=Cerrado)
- ¿El detalle muestra toda la información?
- ¿El Risk Score tiene colores correctos?

```bash
git add .
git commit -m "feat: tabla de clientes con búsqueda, filtros y vista detalle"
git push
```

---

## FASE 1E — Vista 2: Análisis de Conversión (Día 3 mañana)

### Paso 1.19: Crear página ConversionAnalysis
**Archivo:** `src/pages/ConversionAnalysis.jsx`

**Gráficos incluidos:**
1. **Conversión por industria** — Barras agrupadas (total leads vs. cerrados por industria)
2. **Conversión por canal de descubrimiento** — Barras agrupadas (total vs. cerrados por canal)
3. **Conversión por tamaño de operación** — Barras (Small vs Medium vs Large)
4. **Conversión por urgencia** — Barras (Alta vs Media vs Baja)
5. **Distribución del Retention Risk Score** — Histograma o barras (scores 1-10)
6. **Risk Score vs Resultado** — Scatter o barras agrupadas mostrando score promedio en cerrados vs perdidos

**Cada gráfico debe tener:**
- Título descriptivo
- Tooltip al hacer hover
- Leyenda si aplica
- Interpretación en texto breve debajo (1 línea de insight)

### Paso 1.20: Verificar y commit
```bash
git add .
git commit -m "feat: análisis de conversión con 6 gráficos cruzados"
git push
```

---

## FASE 1F — Deploy y Validación (Día 3 tarde)

### Paso 1.21: Deploy en Vercel
```bash
npm install -g vercel
vercel
# Seguir instrucciones, seleccionar proyecto, framework Vite
```

O conectar el repo de GitHub directo en https://vercel.com/new

### Paso 1.22: Validación completa de la app desplegada

**Checklist de funcionalidad:**
- [ ] La app carga sin errores en el link de Vercel
- [ ] Overview muestra KPIs correctos (verificar 42/60 = 70%)
- [ ] Los gráficos del Overview renderizan con datos reales
- [ ] La tabla de clientes carga los 60 registros
- [ ] La búsqueda por nombre funciona (probar "Carlos", "María")
- [ ] Los filtros por vendedor funcionan
- [ ] Los filtros por estado funcionan
- [ ] Los filtros combinados funcionan
- [ ] El detalle de un cliente muestra toda la información del LLM
- [ ] Los gráficos de conversión muestran datos coherentes
- [ ] La navegación entre vistas funciona sin errores
- [ ] Se ve bien en móvil (responsive básico)

**Si algo falla → arreglar antes de seguir a Fase 2.**

### Paso 1.23: Commit del deploy
```bash
git add .
git commit -m "feat: Fase 1 completa - app desplegada con 3 vistas funcionales"
git push
```

---

## FASE 2A — Vista 4: Performance de Vendedores (Día 3-4)

### Paso 2.1: Crear página SellerPerformance
**Archivo:** `src/pages/SellerPerformance.jsx`

**Contenido:**
- Cards por vendedor con: total leads, cerrados, tasa de cierre, Risk Score promedio
- Gráfico de barras comparativo: tasa de cierre por vendedor
- Tabla: vendedor × industria con tasa de cierre (heatmap con colores)
- Sentimiento promedio por vendedor

---

## FASE 2B — Vista 5: Retention Intelligence (Día 4)

### Paso 2.2: Crear página RetentionIntel
**Archivo:** `src/pages/RetentionIntel.jsx`

**Contenido:**
- Distribución del Risk Score solo en deals cerrados (estos son los clientes activos)
- Lista de clientes de alto riesgo (score ≥ 7 que cerraron) con razones
- Objeciones más frecuentes comparando cerrados vs. perdidos
- Features más valoradas por los clientes que cerraron
- Insight de texto: "X% de los clientes cerrados tienen riesgo alto de churn"

---

## FASE 2C — Vista 6: Deals Perdidos (Día 4)

### Paso 2.3: Crear página LostDeals
**Archivo:** `src/pages/LostDeals.jsx`

**Contenido:**
- Los 18 deals perdidos con sus categorías
- Patrones comunes: ¿qué industrias se pierden más? ¿qué canal trae leads que no cierran?
- Objeciones predominantes en deals perdidos
- Comparación lado a lado: perfil promedio de deal cerrado vs. perdido

---

## FASE 2D — Re-deploy (Día 4)

### Paso 2.4: Re-deploy y validación
```bash
git add .
git commit -m "feat: Fase 2 completa - 6 vistas con análisis avanzado"
git push
# Vercel re-deploya automáticamente si está conectado a GitHub
```

---

## FASE 3 — Documentación y Entrega (Día 4-5)

### Paso 3.1: Escribir README.md

**Estructura del README:**
```markdown
# Vambe Sales Intelligence Dashboard

## Descripción
Aplicación que procesa transcripciones de reuniones de ventas, 
categoriza automáticamente con IA (Gemini) y visualiza métricas 
estratégicas en un panel interactivo.

## Link de la aplicación
🔗 [vambe-dashboard.vercel.app](URL)

## Ejecutar localmente

### Requisitos
- Node.js 18+
- Python 3.8+
- API Key de Google Gemini

### Instalación
git clone ...
cd vambe-sales-dashboard
npm install

### Ejecutar el script de categorización (opcional)
pip install google-generativeai python-dotenv pandas
echo "GEMINI_API_KEY=tu_key" > .env
python scripts/categorize.py
# Genera data/clients_categorized.json

### Ejecutar la aplicación
npm run dev
# Abrir http://localhost:5173

## Arquitectura
[Diagrama del flujo de datos]

## Decisiones clave
[Ver DECISIONES.md]
```

### Paso 3.2: Escribir DECISIONES.md
Tomar las decisiones clave de la sección 9 de la Guía Estratégica v2 y expandirlas brevemente.

### Paso 3.3: Revisión visual final
- ¿El diseño se ve profesional y limpio?
- ¿Hay textos cortados o overflow?
- ¿Los colores son coherentes?
- ¿Los gráficos tienen títulos claros?

### Paso 3.4: Push final
```bash
git add .
git commit -m "docs: README y documentación de decisiones"
git push
```

### Paso 3.5: Enviar entrega
- Link del repo de GitHub
- Link de la app en Vercel
- Confirmar que ambos funcionan

---

## Resumen de Entregables

| Entregable | Requisito | Formato |
|------------|-----------|---------|
| Código fuente | Repositorio en GitHub | Repo público |
| App funcional | Link funcional | Vercel URL |
| Script de categorización | Procesar CSV con LLM | `scripts/categorize.py` |
| Datos procesados | Categorías extraídas | `data/clients_categorized.json` |
| Instrucciones locales | README | `README.md` |
| Documentación | Arquitectura y decisiones | `DECISIONES.md` |

---

## Reglas para No Perderse

1. **Si algo no funciona, arréglalo antes de agregar más cosas**
2. **Commit frecuente** — cada paso completado es un commit
3. **Probar en Vercel después de cada fase** — lo que funciona local puede fallar en deploy
4. **La tabla filtrable es sagrada** — es el requisito más explícito, debe ser impecable
5. **No optimizar diseño hasta que todo funcione** — primero funcional, después bonito
