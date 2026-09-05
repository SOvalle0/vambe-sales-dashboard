# Guía de Diseño — Vambe Sales Intelligence Dashboard

---

## 1. Dirección Visual

**Objetivo:** Un dashboard que se sienta como producto interno de Vambe. No copiar su sitio web, pero sí alinearse con su lenguaje visual para que el evaluador piense "esto podría ser nuestro".

**Mood:** Profesional, limpio, data-driven. No decorativo — cada elemento visual tiene función.

**Referencia real de Vambe:**
- Sitio: fondo oscuro con hero espacial/montañas, pero la app interna (Mercur) usa fondos claros
- Tipografía clean, sin serif
- Colores: predomina azul profundo con acentos cyan/violeta
- Cards con bordes sutiles, mucho aire
- La plataforma Mercur tiene UI tipo dashboard con pipelines, chats y métricas

**Nuestra decisión:** Dashboard en modo **claro** (light mode). Los dashboards de datos se leen mejor en claro. El fondo oscuro es para marketing, no para herramientas de trabajo.

---

## 2. Paleta de Colores

### Colores base (light mode dashboard)

| Nombre | Hex | Uso |
|--------|-----|-----|
| Background | `#F8FAFC` | Fondo general de la app |
| Surface (cards) | `#FFFFFF` | Fondo de cards y paneles |
| Border | `#E2E8F0` | Bordes de cards y separadores |
| Text Primary | `#0F172A` | Títulos, texto principal |
| Text Secondary | `#64748B` | Subtítulos, labels, texto de soporte |
| Text Muted | `#94A3B8` | Placeholders, texto terciario |

### Color de marca (alineado a Vambe)

| Nombre | Hex | Uso |
|--------|-----|-----|
| Brand Primary | `#2563EB` | Botones primarios, links, elementos activos |
| Brand Hover | `#1D4ED8` | Hover de botones |
| Brand Light | `#EFF6FF` | Fondo de badges, selección activa |
| Brand Soft | `#DBEAFE` | Hover suave en filas de tabla |

### Colores semánticos (para datos)

| Nombre | Hex | Uso |
|--------|-----|-----|
| Success / Cerrado | `#16A34A` | Deals cerrados, métricas positivas |
| Success Light | `#F0FDF4` | Badge fondo "cerrado" |
| Danger / Perdido | `#DC2626` | Deals perdidos, riesgo alto |
| Danger Light | `#FEF2F2` | Badge fondo "perdido" |
| Warning / Riesgo Medio | `#F59E0B` | Risk score medio |
| Warning Light | `#FFFBEB` | Badge fondo "riesgo medio" |
| Info | `#0EA5E9` | Información neutral, tooltips |

### Colores para gráficos (serie de datos)

Usar esta secuencia cuando hay múltiples categorías en un gráfico:

```
#2563EB  (azul brand - siempre primero)
#7C3AED  (violeta)
#0EA5E9  (cyan)
#F59E0B  (amber)
#16A34A  (verde)
#EC4899  (pink)
#64748B  (slate - último recurso)
```

**Regla:** Máximo 6-7 colores en un gráfico. Si hay más categorías, agrupar las menores en "Otros".

---

## 3. Tipografía

### Fuente: Inter

Inter es la fuente correcta para dashboards — optimizada para pantalla, excelente legibilidad en tamaños pequeños, y es lo que usa la gran mayoría del ecosistema SaaS moderno.

```css
font-family: 'Inter', system-ui, -apple-system, sans-serif;
```

**Importar desde Google Fonts:**
```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
```

### Jerarquía

| Elemento | Tamaño | Peso | Color | Uso |
|----------|--------|------|-------|-----|
| H1 (título página) | 24px | 700 (bold) | Text Primary | "Overview", "Análisis de Conversión" |
| H2 (título sección) | 18px | 600 (semibold) | Text Primary | Título de card/sección |
| H3 (subtítulo) | 14px | 600 (semibold) | Text Secondary | Labels de gráficos |
| Body | 14px | 400 (regular) | Text Primary | Texto general |
| Small | 13px | 500 (medium) | Text Secondary | Datos en tabla, leyendas |
| Caption | 12px | 400 (regular) | Text Muted | Footers de cards, timestamps |
| KPI Number | 32px | 700 (bold) | Text Primary | Números grandes en KPI cards |
| KPI Label | 13px | 500 (medium) | Text Secondary | Label debajo del número |

---

## 4. Componentes del Dashboard

### 4.1 KPI Card

```
┌─────────────────────────┐
│  📊 Tasa de Cierre       │  ← ícono + label (13px, text-secondary)
│                          │
│  70%                     │  ← número (32px, bold, text-primary)
│  42 de 60 leads          │  ← subtítulo (13px, text-muted)
└─────────────────────────┘
```

**Estilos:**
- Background: `#FFFFFF`
- Border: `1px solid #E2E8F0`
- Border radius: `12px`
- Padding: `20px 24px`
- Shadow: `0 1px 3px rgba(0,0,0,0.05)`
- Hover: shadow `0 4px 12px rgba(0,0,0,0.08)`

**Layout:** 4 cards en fila (grid de 4 columnas), responsive a 2 columnas en móvil.

### 4.2 Card de Gráfico

```
┌─────────────────────────────────────┐
│  Conversión por Industria           │  ← título (18px, semibold)
│  Tasa de cierre por vertical        │  ← subtítulo (13px, text-secondary)
│                                     │
│  ┌─────────────────────────────┐    │
│  │                             │    │
│  │     [GRÁFICO RECHARTS]      │    │
│  │                             │    │
│  └─────────────────────────────┘    │
│                                     │
└─────────────────────────────────────┘
```

**Estilos:** Mismos que KPI Card pero con más padding (24px).
**El gráfico ocupa todo el ancho de la card menos el padding.**

### 4.3 Tabla de Clientes

```
┌───────────────────────────────────────────────────────────────┐
│  🔍 [Buscar por nombre...________]  [Vendedor ▼] [Estado ▼]  │
│  [Industria ▼] [Risk Score ▼]        Mostrando 42 de 60      │
├───────┬──────────┬──────────┬────────┬───────┬────────┬───────┤
│Nombre │ Industria│ Vendedor │ Canal  │Urgenc.│ Risk   │Estado │
├───────┼──────────┼──────────┼────────┼───────┼────────┼───────┤
│Carlos │ Fintech  │ Toro     │ Conf.  │ Alta  │ ●● 3   │🟢Cerr │
│Paula  │ Logíst.  │ Boa      │ Cont.  │ Media │ ●●● 6  │🔴Perd │
│...    │          │          │        │       │        │       │
└───────┴──────────┴──────────┴────────┴───────┴────────┴───────┘
```

**Estilos de tabla:**
- Header: `background: #F8FAFC`, texto `text-secondary`, 13px, semibold, uppercase
- Filas: fondo blanco, hover `#F1F5F9`
- Filas alternas: no (se ve anticuado en dashboards modernos)
- Borde entre filas: `1px solid #F1F5F9` (casi invisible)
- Padding por celda: `12px 16px`
- Click en fila: abre detalle del cliente

**Badges de estado:**
- Cerrado: texto `#16A34A`, fondo `#F0FDF4`, border-radius `9999px`
- Perdido: texto `#DC2626`, fondo `#FEF2F2`, border-radius `9999px`

**Risk Score visual:**
- 1-3: punto verde `#16A34A` + número
- 4-6: punto amarillo `#F59E0B` + número
- 7-10: punto rojo `#DC2626` + número

### 4.4 Sidebar / Navegación

```
┌──────────────────┬─────────────────────────────────────┐
│                  │                                     │
│  VAMBE           │     [Contenido de la vista]         │
│  Sales Intel     │                                     │
│                  │                                     │
│  ▸ Overview      │                                     │
│    Conversión    │                                     │
│    Clientes      │                                     │
│  ─────────       │                                     │
│    Vendedores    │                                     │
│    Retención     │                                     │
│    Deals Perd.   │                                     │
│                  │                                     │
└──────────────────┴─────────────────────────────────────┘
```

**Estilos sidebar:**
- Ancho: `240px` fijo
- Background: `#FFFFFF`
- Border derecho: `1px solid #E2E8F0`
- Item activo: fondo `#EFF6FF`, texto `#2563EB`, font-weight 600
- Item hover: fondo `#F8FAFC`
- Item normal: texto `#64748B`, font-weight 500
- Separador entre Fase 1 y Fase 2: línea `#E2E8F0`

### 4.5 Filtros / Dropdowns

**Input de búsqueda:**
- Height: `40px`
- Background: `#FFFFFF`
- Border: `1px solid #E2E8F0`
- Border radius: `8px`
- Focus: border `#2563EB`, ring `0 0 0 3px rgba(37,99,235,0.1)`
- Placeholder: `#94A3B8`
- Ícono de lupa a la izquierda

**Select/Dropdown:**
- Mismo estilo que input
- Flecha a la derecha
- Opciones con hover `#F1F5F9`

### 4.6 Modal de Detalle del Cliente

Se abre al hacer click en una fila de la tabla.

```
┌─────────────────────────────────────────────┐
│  ✕                                          │
│                                             │
│  Carlos Pérez              🟢 Cerrado       │
│  c.perez@example.com | +56912345678         │
│  Vendedor: Toro | Fecha: 2024-03-15         │
│                                             │
│  ─────────────────────────────────────────   │
│                                             │
│  RESUMEN EJECUTIVO                          │
│  "Empresa de servicios financieros con      │
│   500 interacciones semanales..."           │
│                                             │
│  ┌──────────────┬──────────────┐            │
│  │ Industria    │ Fintech      │            │
│  │ Tamaño       │ Large        │            │
│  │ Pain Point   │ Sobrecarga   │            │
│  │ Caso de uso  │ Atención     │            │
│  │ Canal        │ Conferencia  │            │
│  │ Urgencia     │ Alta         │            │
│  │ Sentimiento  │ Interesado   │            │
│  └──────────────┴──────────────┘            │
│                                             │
│  RETENTION RISK: ●●● 4/10 (Riesgo Medio)   │
│  Razones:                                   │
│  • Caso de uso core para Vambe              │
│  • Integraciones moderadas requeridas       │
│                                             │
│  OBJECIONES DETECTADAS                      │
│  • Privacidad de datos                      │
│                                             │
│  FEATURE VALORADA                           │
│  Respuestas automáticas a consultas         │
│  repetitivas                                │
└─────────────────────────────────────────────┘
```

**Estilos modal:**
- Overlay: `rgba(0,0,0,0.4)`
- Modal: fondo blanco, border-radius `16px`, max-width `640px`
- Padding: `32px`
- Shadow: `0 25px 50px rgba(0,0,0,0.15)`

---

## 5. Layout General

### Breakpoints
- Desktop: `≥1024px` — sidebar visible + contenido
- Tablet: `768-1023px` — sidebar colapsada
- Mobile: `<768px` — sidebar oculta, menú hamburguesa

### Espaciado
- Gap entre KPI cards: `16px`
- Gap entre secciones: `24px`
- Padding del área de contenido: `24px 32px`
- Margin top del título de página: `0` (arriba de todo)

### Grid de contenido
```
Área de contenido = 100% - 240px (sidebar)

KPI Cards:     grid-cols-4 (desktop) / grid-cols-2 (tablet/mobile)
Gráficos:      grid-cols-2 (desktop) / grid-cols-1 (mobile)
Tabla:         100% ancho siempre
```

---

## 6. Gráficos (Recharts)

### Configuración global

```javascript
// Colores para series de datos
const CHART_COLORS = [
  '#2563EB', '#7C3AED', '#0EA5E9', 
  '#F59E0B', '#16A34A', '#EC4899'
];

// Tooltip personalizado
const tooltipStyle = {
  backgroundColor: '#FFFFFF',
  border: '1px solid #E2E8F0',
  borderRadius: '8px',
  padding: '8px 12px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
  fontSize: '13px'
};
```

### Tipos de gráficos por vista

| Vista | Gráfico | Tipo Recharts |
|-------|---------|---------------|
| Overview | Cierre por vendedor | `BarChart` vertical |
| Overview | Distribución por industria | `PieChart` o `BarChart` horizontal |
| Conversión | Industria × cierre | `BarChart` con 2 barras (total / cerrados) |
| Conversión | Canal × cierre | `BarChart` con 2 barras |
| Conversión | Risk Score distribución | `BarChart` (histograma) |
| Vendedores | Heatmap vendedor × industria | Grid de celdas con color por intensidad |
| Retención | Risk Score en cerrados | `BarChart` con colores por rango |
| Deals Perdidos | Objeciones frecuencia | `BarChart` horizontal |

### Reglas de gráficos
- Siempre incluir tooltips con hover
- Labels del eje X rotados 45° si son largos
- No usar 3D nunca
- No usar leyenda si hay solo 1 serie — ponerla en el título
- Barras con border-radius top: `4px`
- Grid lines sutiles: `#F1F5F9`
- Axis lines: `#E2E8F0`
- Axis labels: `#64748B`, 12px

---

## 7. Variables CSS Listas

```css
:root {
  /* Background */
  --bg: #F8FAFC;
  --surface: #FFFFFF;
  --border: #E2E8F0;
  --hover: #F1F5F9;

  /* Text */
  --text: #0F172A;
  --text-secondary: #64748B;
  --text-muted: #94A3B8;

  /* Brand */
  --brand: #2563EB;
  --brand-hover: #1D4ED8;
  --brand-light: #EFF6FF;
  --brand-soft: #DBEAFE;

  /* Semantic */
  --success: #16A34A;
  --success-light: #F0FDF4;
  --danger: #DC2626;
  --danger-light: #FEF2F2;
  --warning: #F59E0B;
  --warning-light: #FFFBEB;
  --info: #0EA5E9;

  /* Sizing */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-full: 9999px;

  --shadow-sm: 0 1px 3px rgba(0,0,0,0.05);
  --shadow-md: 0 4px 12px rgba(0,0,0,0.08);
  --shadow-lg: 0 25px 50px rgba(0,0,0,0.15);

  /* Sidebar */
  --sidebar-width: 240px;
}
```

---

## 8. Tailwind Classes Cheatsheet

Para no pensar cada vez — las clases más usadas del dashboard:

```
Card:           bg-white border border-slate-200 rounded-xl p-5 shadow-sm
Card hover:     hover:shadow-md transition-shadow
KPI Number:     text-3xl font-bold text-slate-900
KPI Label:      text-sm font-medium text-slate-500
Section Title:  text-lg font-semibold text-slate-900
Body Text:      text-sm text-slate-700
Muted Text:     text-xs text-slate-400

Badge Cerrado:  text-xs font-medium px-2.5 py-0.5 rounded-full bg-green-50 text-green-700
Badge Perdido:  text-xs font-medium px-2.5 py-0.5 rounded-full bg-red-50 text-red-700
Badge Neutral:  text-xs font-medium px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700

Button Primary: bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700
Button Secondary: border border-slate-200 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-50

Input:          w-full h-10 px-3 border border-slate-200 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100

Table Header:   text-xs font-semibold text-slate-500 uppercase tracking-wider
Table Row:      border-b border-slate-100 hover:bg-slate-50 cursor-pointer
Table Cell:     px-4 py-3 text-sm text-slate-700

Sidebar:        w-60 bg-white border-r border-slate-200
Sidebar Active: bg-blue-50 text-blue-600 font-semibold
Sidebar Item:   text-slate-500 font-medium hover:bg-slate-50
```

---

## 9. Lo que NO hacer

- ❌ Dark mode — los dashboards de datos se leen mejor en claro
- ❌ Gradientes en cards — se ve genérico "AI slop"
- ❌ Glassmorphism — bonito en landing pages, distrae en dashboards
- ❌ Sombras exageradas — shadow-sm es suficiente para cards
- ❌ Más de 7 colores en un gráfico
- ❌ Animaciones pesadas — transiciones sutiles de 150ms máximo
- ❌ Bordes gruesos — siempre 1px
- ❌ Texto más pequeño que 12px
- ❌ Colores de Vambe exactos del sitio web — esto es una herramienta interna, no su landing page
