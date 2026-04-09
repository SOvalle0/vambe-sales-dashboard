const BADGE = {
  ALTA:  'bg-red-100 text-red-700',
  MEDIA: 'bg-amber-100 text-amber-700',
  BAJA:  'bg-slate-100 text-slate-600',
}

const BORDER = {
  ALTA:  '#DC2626',
  MEDIA: '#F59E0B',
  BAJA:  '#CBD5E1',
}

/**
 * AccionesRecomendadas — grid de cards de acción.
 *
 * acciones: Array<{
 *   prioridad: 'ALTA' | 'MEDIA' | 'BAJA'
 *   tema:      string
 *   icon:      string (emoji)
 *   titulo:    string
 *   texto:     string
 * }>
 */
export default function AccionesRecomendadas({ acciones = [] }) {
  if (!acciones.length) return null
  return (
    <div className="mt-10 mb-2">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <div className="h-px flex-1" style={{ background: 'linear-gradient(to right, transparent, #E2E8F0)' }} />
        <div className="text-center">
          <p className="text-base font-bold text-text">Acciones Recomendadas</p>
          <p className="text-xs text-text-muted mt-0.5">Priorización basada en los datos actuales</p>
        </div>
        <div className="h-px flex-1" style={{ background: 'linear-gradient(to left, transparent, #E2E8F0)' }} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-2">
        {acciones.map((a, i) => (
          <div
            key={i}
            className="bg-surface border border-border rounded-xl p-5 transition-all duration-200 hover:-translate-y-0.5"
            style={{
              borderTop: `2px solid ${BORDER[a.prioridad]}`,
              boxShadow: '0 1px 4px rgba(15,23,42,0.05)',
            }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 6px 20px rgba(15,23,42,0.08)' }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 4px rgba(15,23,42,0.05)' }}
          >
            <div className="flex items-center gap-2 mb-3">
              <span className={`text-[10px] font-bold tracking-wider px-2 py-0.5 rounded ${BADGE[a.prioridad]}`}>
                {a.prioridad}
              </span>
              <span className="text-[10px] text-text-muted font-medium uppercase tracking-wide">{a.tema}</span>
            </div>
            <h3 className="font-bold text-text mb-1.5 text-sm leading-snug">{a.icon} {a.titulo}</h3>
            <p className="text-xs text-text-secondary leading-relaxed">{a.texto}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
