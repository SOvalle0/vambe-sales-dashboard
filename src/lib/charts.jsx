// Primitives compartidos entre las vistas de análisis (Retention, Growth,
// Conversion). Antes estaban duplicados en cada página.

export const RISK_COLORS = {
  safe:    '#16A34A',
  warning: '#F59E0B',
  danger:  '#DC2626',
  neutral: '#64748B',
}

// Promedio de risk (escala 0-5) → color semántico.
export function riskColorByValue(v) {
  if (v >= 2) return RISK_COLORS.danger
  if (v >= 1) return RISK_COLORS.warning
  return RISK_COLORS.safe
}

// Intensidad de celda para heatmaps (0-100%).
export function heatColor(pct) {
  if (pct === 0)   return { bg: '',             text: 'text-text-muted' }
  if (pct <= 33)   return { bg: 'bg-amber-50',  text: 'text-amber-700' }
  if (pct <= 66)   return { bg: 'bg-amber-200', text: 'text-amber-900' }
  return                  { bg: 'bg-amber-400', text: 'text-white' }
}

// Custom shape para Recharts <Bar shape={<LollipopBar />} />.
// Línea horizontal + círculo al final.
export function LollipopBar({ x, y, width, height, fill, r = 8 }) {
  const cy = y + height / 2
  return (
    <g>
      <line x1={x} y1={cy} x2={x + width} y2={cy} stroke={fill} strokeWidth={2.5} strokeLinecap="round" />
      <circle cx={x + width} cy={cy} r={r} fill={fill} stroke="white" strokeWidth={2} />
    </g>
  )
}

// Tooltip minimal. Primera línea en negrita, resto en secundario.
export function TBox({ lines }) {
  return (
    <div
      className="bg-surface border border-border rounded-lg px-3 py-2 text-sm"
      style={{ boxShadow: '0 4px 16px rgba(37,99,235,0.10), 0 1px 4px rgba(15,23,42,0.06)' }}
    >
      {lines.map((l, i) => (
        <p key={i} className={i === 0 ? 'font-medium text-text' : 'text-text-secondary text-xs mt-0.5'}>{l}</p>
      ))}
    </div>
  )
}

export function SectionHeader({ title, subtitle }) {
  return (
    <div className="mt-8 mb-4">
      <h2 className="text-lg font-bold text-text">{title}</h2>
      {subtitle && <p className="text-xs text-text-muted mt-0.5">{subtitle}</p>}
    </div>
  )
}
