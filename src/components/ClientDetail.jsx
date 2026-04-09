import { X } from 'lucide-react'

const fmt = (n) => {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`
  return `$${n}`
}

function RiskDot({ score }) {
  const color = score === 0 ? 'bg-green-500' : score <= 2 ? 'bg-yellow-500' : 'bg-red-500'
  return <span className={`inline-block w-2.5 h-2.5 rounded-full ${color}`} />
}

function Badge({ children, variant = 'neutral' }) {
  const styles = {
    success: 'bg-green-50 text-green-700',
    danger: 'bg-red-50 text-red-700',
    warning: 'bg-yellow-50 text-yellow-700',
    neutral: 'bg-blue-50 text-blue-700',
  }
  return (
    <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${styles[variant]}`}>
      {children}
    </span>
  )
}

function readinessLabel(score) {
  if (score >= 3) return 'Listo para comprar'
  if (score >= 2) return 'Interesado'
  if (score >= 1) return 'Tibio'
  return 'Frío'
}

function complexityLabel(score) {
  if (score >= 3) return 'Alta fricción'
  if (score >= 2) return 'Fricción moderada'
  if (score >= 1) return 'Baja fricción'
  return 'Sin fricción'
}

function pmfVariant(signal) {
  if (signal === 'Fuerte') return 'success'
  if (signal === 'Moderada') return 'warning'
  return 'danger'
}

export default function ClientDetail({ client, onClose }) {
  if (!client) return null

  const riskLabel = client.retention_risk_score === 0 ? 'Sano' : client.retention_risk_score <= 2 ? 'Precaución' : 'Riesgo'
  const riskVariant = client.retention_risk_score === 0 ? 'success' : client.retention_risk_score <= 2 ? 'warning' : 'danger'
  const convProb = Math.round((client.conversion_probability || 0) * 100)

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-surface rounded-2xl max-w-2xl w-full mx-4 p-8 shadow-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-xl font-bold text-text">{client.nombre}</h2>
            <p className="text-sm text-text-secondary">{client.correo} · {client.telefono}</p>
            <p className="text-xs text-text-muted mt-1">Vendedor: {client.vendedor} · {client.fecha_reunion}</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={client.closed === 1 ? 'success' : 'danger'}>
              {client.closed === 1 ? 'Won' : 'Lost'}
            </Badge>
            <button onClick={onClose} className="text-text-muted hover:text-text">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Resumen */}
        {client.resumen_ejecutivo && (
          <div className="mb-6">
            <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Resumen Ejecutivo</h3>
            <p className="text-sm text-text leading-relaxed">{client.resumen_ejecutivo}</p>
          </div>
        )}

        {/* Grid de categorías */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 mb-6">
          <div>
            <span className="text-xs text-text-muted">Industria</span>
            <p className="text-sm font-medium text-text">{client.industria}</p>
          </div>
          <div>
            <span className="text-xs text-text-muted">Tipo empresa</span>
            <p className="text-sm font-medium text-text">{client.tipo_empresa}</p>
          </div>
          <div>
            <span className="text-xs text-text-muted">Pain Point</span>
            <p className="text-sm font-medium text-text">{client.pain_point_principal}</p>
          </div>
          <div>
            <span className="text-xs text-text-muted">Caso de uso</span>
            <p className="text-sm font-medium text-text">{client.caso_uso}</p>
          </div>
          <div>
            <span className="text-xs text-text-muted">Canal</span>
            <p className="text-sm font-medium text-text">{client.canal_descubrimiento}</p>
          </div>
          <div>
            <span className="text-xs text-text-muted">Urgencia</span>
            <p className="text-sm font-medium text-text">{client.urgencia}</p>
          </div>
          <div>
            <span className="text-xs text-text-muted">Sentimiento</span>
            <p className="text-sm font-medium text-text">{client.sentimiento}</p>
          </div>
          <div>
            <span className="text-xs text-text-muted">Feature valorada</span>
            <p className="text-sm font-medium text-text">{client.feature_valorada}</p>
          </div>
          <div>
            <span className="text-xs text-text-muted">Plan sugerido</span>
            <p className="text-sm font-medium text-text">{client.plan_sugerido || 'Sin dato'}</p>
          </div>
          <div>
            <span className="text-xs text-text-muted">Patrón demanda</span>
            <p className="text-sm font-medium text-text">{client.patron_demanda || 'Sin dato'}</p>
          </div>
          {client.volumen_mensual_estimado && (
            <div className="col-span-2">
              <span className="text-xs text-text-muted">Volumen mensual</span>
              <p className="text-sm font-medium text-text">
                {client.volumen_es_estimado ? '~' : ''}{client.volumen_mensual_estimado.toLocaleString()}/mes
                {client.volumen_es_estimado && <span className="text-xs text-text-muted ml-1">(estimado)</span>}
              </p>
            </div>
          )}
        </div>

        {/* Sales Intelligence */}
        <div className="border-t border-border pt-4 mb-4">
          <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">Sales Intelligence</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="bg-bg rounded-lg p-3">
              <span className="text-xs text-text-muted">Deal Priority</span>
              <p className="text-lg font-bold text-text">{(client.deal_priority_score || 0).toFixed(1)}<span className="text-xs text-text-muted font-normal">/10</span></p>
            </div>
            <div className="bg-bg rounded-lg p-3">
              <span className="text-xs text-text-muted">ACV Estimado</span>
              <p className="text-lg font-bold text-text">{fmt(client.acv_estimado || 0)}<span className="text-xs text-text-muted font-normal">/año</span></p>
            </div>
            <div className="bg-bg rounded-lg p-3">
              <span className="text-xs text-text-muted">Buyer Readiness</span>
              <p className="text-lg font-bold text-text">{client.buyer_readiness ?? 0}<span className="text-xs text-text-muted font-normal">/4</span></p>
              <p className="text-[11px] text-text-secondary">{readinessLabel(client.buyer_readiness ?? 0)}</p>
            </div>
            <div className="bg-bg rounded-lg p-3">
              <span className="text-xs text-text-muted">Deal Complexity</span>
              <p className="text-lg font-bold text-text">{client.deal_complexity ?? 0}<span className="text-xs text-text-muted font-normal">/4</span></p>
              <p className="text-[11px] text-text-secondary">{complexityLabel(client.deal_complexity ?? 0)}</p>
            </div>
            <div className="bg-bg rounded-lg p-3">
              <span className="text-xs text-text-muted">Días estimados</span>
              <p className="text-lg font-bold text-text">~{client.estimated_close_days ?? 30}d</p>
              <p className="text-[11px] text-text-muted">Requiere calibración CRM</p>
            </div>
            <div className="bg-bg rounded-lg p-3">
              <span className="text-xs text-text-muted">Conv. Probability</span>
              <p className="text-lg font-bold text-text">{convProb}%</p>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className="text-xs text-text-muted">PMF Signal:</span>
            <Badge variant={pmfVariant(client.pmf_signal)}>{client.pmf_signal || 'Sin dato'}</Badge>
          </div>
        </div>

        {/* Retention Risk */}
        <div className="border-t border-border pt-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Retention Risk</h3>
            <RiskDot score={client.retention_risk_score} />
            <span className="text-sm font-bold text-text">{client.retention_risk_score}/5</span>
            <Badge variant={riskVariant}>{riskLabel}</Badge>
          </div>
          {client.retention_risk_flags?.length > 0 ? (
            <ul className="space-y-1">
              {client.retention_risk_flags.map((flag, i) => (
                <li key={i} className="text-sm text-text-secondary flex items-center gap-2">
                  <span className="text-warning">•</span> {flag}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-text-muted">Sin flags de riesgo</p>
          )}
        </div>

        {/* Objeciones */}
        {client.objeciones && client.objeciones[0] !== 'Ninguna' && (
          <div className="border-t border-border pt-4 mb-4">
            <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Objeciones</h3>
            <div className="flex flex-wrap gap-2">
              {client.objeciones.map((obj, i) => (
                <Badge key={i} variant="warning">{obj}</Badge>
              ))}
            </div>
          </div>
        )}

        {/* Potencial de expansión */}
        {client.potencial_expansion && (
          <div className="border-t border-border pt-4">
            <div className="flex items-center gap-2">
              <Badge variant="neutral">Potencial de expansión</Badge>
              <span className="text-xs text-text-muted">
                {client.tipo_empresa === 'Startup' ? 'Startup en crecimiento' : 'Patrón de crecimiento detectado'}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
