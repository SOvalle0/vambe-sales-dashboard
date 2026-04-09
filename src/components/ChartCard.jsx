import { useState } from 'react'

/**
 * ChartCard — tarjeta reutilizable de gráfico con:
 *   • accentColor: color del borde superior (por defecto azul brand)
 *   • insight: texto de diagnóstico generado por lógica condicional
 *   • methodology: texto de "¿cómo se calcula?"
 *   • isAI: muestra asterisco si el campo es categorizado por IA
 */
function EmptyChart() {
  return (
    <div className="flex flex-col items-center justify-center h-[200px] gap-2 select-none">
      <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-2xl">📭</div>
      <p className="text-sm font-semibold text-text-secondary">Sin datos</p>
      <p className="text-xs text-text-muted">Ajusta los filtros activos</p>
    </div>
  )
}

export default function ChartCard({
  title,
  subtitle,
  isAI = false,
  insight,
  methodology,
  accentColor = '#2563EB',
  isEmpty = false,
  children,
}) {
  const [showMethod, setShowMethod] = useState(false)
  const [showInsight, setShowInsight] = useState(true)

  return (
    <div
      className="bg-surface border border-border rounded-2xl p-5 transition-all duration-300 group"
      style={{
        boxShadow: '0 1px 4px rgba(15,23,42,0.05)',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = `0 8px 28px rgba(37,99,235,0.07), 0 2px 8px rgba(15,23,42,0.05)`
        e.currentTarget.style.transform = 'translateY(-1px)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = '0 1px 4px rgba(15,23,42,0.05)'
        e.currentTarget.style.transform = 'translateY(0)'
      }}
    >
      {/* Header */}
      <div className="flex items-baseline gap-1 mb-1">
        <h2 className="text-[15px] font-semibold text-text tracking-normal">{title}</h2>
        {isAI && (
          <span className="text-text-muted text-xs" title="Categorizado por IA">
            *
          </span>
        )}
      </div>
      {subtitle && (
        <p className="text-xs text-text-muted mb-4">{subtitle}</p>
      )}

      {/* Contenido del gráfico */}
      {isEmpty ? <EmptyChart /> : children}

      {/* Botonera */}
      <div className="flex gap-3 mt-3">
        {insight && (
          <button
            onClick={() => setShowInsight(!showInsight)}
            className="text-[11px] text-brand hover:text-brand-hover font-medium transition-colors"
          >
            {showInsight ? '▾ Ocultar insight' : '▸ Insight'}
          </button>
        )}
        {methodology && (
          <button
            onClick={() => setShowMethod(!showMethod)}
            className="text-[11px] text-text-muted hover:text-text-secondary transition-colors"
          >
            {showMethod ? '▾ Ocultar metodología' : '▸ ¿Cómo se calcula?'}
          </button>
        )}
      </div>

      {/* Insight panel */}
      {showInsight && insight && (
        <p
          className="mt-2 text-xs leading-relaxed pl-3 py-2 rounded-r"
          style={{
            color: accentColor,
            background: `${accentColor}12`,
            borderLeft: `2px solid ${accentColor}50`,
          }}
        >
          ⚡ {insight}
        </p>
      )}

      {/* Metodología panel */}
      {showMethod && methodology && (
        <p className="mt-2 text-[11px] text-text-muted leading-relaxed border-l-2 border-border pl-3">
          {methodology}
        </p>
      )}
    </div>
  )
}
