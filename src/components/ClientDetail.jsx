import React from 'react'
import { createPortal } from 'react-dom'
import { 
  Building2, 
  MapPin, 
  DollarSign, 
  Calendar, 
  TrendingUp, 
  CheckCircle2, 
  AlertTriangle, 
  ExternalLink,
  Target,
  Clock,
  MessageSquare,
  Zap,
  BarChart3,
  X 
} from 'lucide-react'

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
    success: 'bg-green-50 text-green-700 border border-green-100',
    danger: 'bg-red-50 text-red-700 border border-red-100',
    warning: 'bg-yellow-50 text-yellow-700 border border-yellow-100',
    neutral: 'bg-blue-50 text-blue-700 border border-blue-100',
  }
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${styles[variant]} ${variant === 'success' ? 'badge-won' : ''}`}>
      {variant === 'success' && <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />}
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

  const content = (
    <div
      className="fixed inset-0 flex items-center justify-center z-[1000]"
      style={{ 
        background: 'rgba(15,23,42,0.65)', 
        animation: 'overlayIn 0.22s ease forwards',
        backdropFilter: 'blur(4px)'
      }}
      onClick={onClose}
    >
      <div
        className="bg-surface rounded-2xl max-w-2xl w-full mx-4 p-8 shadow-2xl max-h-[90vh] overflow-y-auto"
        style={{ 
          animation: 'modalSlideIn 0.28s cubic-bezier(0.34,1.56,0.64,1) forwards',
          opacity: 1
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-brand/10 flex items-center justify-center text-brand">
              <Building2 size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-text">{client.nombre}</h2>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                <span className="flex items-center gap-1 text-sm text-text-secondary">
                  <MessageSquare size={14} className="text-text-muted" />
                  {client.correo}
                </span>
                <span className="flex items-center gap-1 text-sm text-text-secondary">
                  <Zap size={14} className="text-text-muted" />
                  {client.telefono}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={client.closed === 1 ? 'success' : 'danger'}>
              {client.closed === 1 ? 'Won' : 'Lost'}
            </Badge>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-bg rounded-lg transition-colors text-text-muted hover:text-text"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Resumen */}
        {client.resumen_ejecutivo && (
          <div className="mb-8 bg-bg/50 rounded-xl p-4 border border-border/50">
            <h3 className="text-xs font-bold text-text-muted uppercase tracking-widest mb-2 flex items-center gap-2">
              <CheckCircle2 size={12} />
              Resumen Ejecutivo
            </h3>
            <p className="text-sm text-text leading-relaxed font-medium">{client.resumen_ejecutivo}</p>
          </div>
        )}

        {/* Grid de categorías */}
        <div className="grid grid-cols-2 gap-x-8 gap-y-5 mb-8">
          {[
            { label: 'Industria', val: client.industria, icon: Building2 },
            { label: 'Tipo empresa', val: client.tipo_empresa, icon: MapPin },
            { label: 'Pain Point', val: client.pain_point_principal, icon: Target },
            { label: 'Caso de uso', val: client.caso_uso, icon: BarChart3 },
            { label: 'Canal', val: client.canal_descubrimiento, icon: ExternalLink },
            { label: 'Urgencia', val: client.urgencia, icon: Clock },
            { label: 'Sentimiento', val: client.sentimiento, icon: MessageSquare },
            { label: 'Feature valorada', val: client.feature_valorada, icon: Zap },
            { label: 'Plan sugerido', val: client.plan_sugerido || '—', icon: DollarSign },
            { label: 'Patrón demanda', val: client.patron_demanda || '—', icon: TrendingUp },
          ].map((item, idx) => (
            <div key={idx} className="flex gap-3">
              <div className="mt-1 text-text-muted/60">
                <item.icon size={16} />
              </div>
              <div>
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-tight">{item.label}</span>
                <p className="text-sm font-semibold text-text">{item.val || '—'}</p>
              </div>
            </div>
          ))}

          {typeof client.volumen_mensual_estimado === 'number' && (
            <div className="col-span-2 bg-brand/[0.03] p-3 rounded-lg flex items-center justify-between border border-brand/10">
              <div className="flex items-center gap-2">
                <TrendingUp size={16} className="text-brand" />
                <span className="text-xs font-bold text-text-secondary">Volumen mensual estimado</span>
              </div>
              <p className="text-sm font-bold text-brand">
                {client.volumen_es_estimado ? '~' : ''}{client.volumen_mensual_estimado.toLocaleString()} / mes
              </p>
            </div>
          )}
        </div>

        {/* Sales Intelligence */}
        <div className="border-t border-border pt-6 mb-8">
          <h3 className="text-xs font-bold text-text-muted uppercase tracking-widest mb-4 flex items-center gap-2">
            <BarChart3 size={12} />
            Sales Intelligence
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-bg rounded-xl p-4 border border-border/50">
              <span className="text-[10px] font-bold text-text-muted uppercase">Deal Priority</span>
              <p className="text-xl font-black text-text mt-1">
                {(client.deal_priority_score || 0).toFixed(1)}
              </p>
            </div>
            <div className="bg-bg rounded-xl p-4 border border-border/50">
              <span className="text-[10px] font-bold text-text-muted uppercase">ACV Estimado</span>
              <p className="text-xl font-black text-text mt-1">
                {fmt(client.acv_estimado || 0)}
              </p>
            </div>
            <div className="bg-bg rounded-xl p-4 border border-border/50">
              <span className="text-[10px] font-bold text-text-muted uppercase">Conv. Prob.</span>
              <p className="text-xl font-black text-text mt-1">
                {convProb}%
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="bg-bg rounded-xl p-4 border border-border/50">
              <span className="text-[10px] font-bold text-text-muted uppercase">Buyer Readiness</span>
              <p className="text-sm font-bold text-text mt-1">{readinessLabel(client.buyer_readiness ?? 0)}</p>
              <div className="flex gap-1 mt-2">
                {[1,2,3,4].map(s => (
                  <div key={s} className={`h-1 flex-1 rounded-full ${s <= (client.buyer_readiness ?? 0) ? 'bg-brand' : 'bg-brand/10'}`} />
                ))}
              </div>
            </div>
            <div className="bg-bg rounded-xl p-4 border border-border/50">
              <span className="text-[10px] font-bold text-text-muted uppercase">Deal Complexity</span>
              <p className="text-sm font-bold text-text mt-1">{complexityLabel(client.deal_complexity ?? 0)}</p>
              <div className="flex gap-1 mt-2">
                {[1,2,3,4].map(s => (
                  <div key={s} className={`h-1 flex-1 rounded-full ${s <= (client.deal_complexity ?? 0) ? 'bg-warning' : 'bg-warning/10'}`} />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Retention Risk */}
        <div className="border-t border-border pt-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-text-muted uppercase tracking-widest flex items-center gap-2">
              <AlertTriangle size={12} />
              Retention Risk Intelligence
            </h3>
            <Badge variant={riskVariant}>{riskLabel}</Badge>
          </div>
          <div className="flex items-center gap-6 bg-red-50/50 rounded-xl p-4 border border-red-100/50">
            <div className="text-center border-r border-red-200 pr-6">
              <span className="text-[10px] font-bold text-red-400 uppercase">Score</span>
              <p className="text-3xl font-black text-red-600">{client.retention_risk_score}/5</p>
            </div>
            <div className="flex-1">
              {client.retention_risk_flags?.length > 0 ? (
                <ul className="space-y-2">
                  {client.retention_risk_flags.map((flag, i) => (
                    <li key={i} className="text-sm font-medium text-red-800 flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                      {flag}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm font-medium text-green-700">No se detectan señales de riesgo churn actuales.</p>
              )}
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between mt-4 p-4 bg-brand/[0.02] rounded-xl border border-brand/5">
          <div className="flex items-center gap-2">
             <span className="text-xs font-bold text-text-muted uppercase">PMF Signal:</span>
             <Badge variant={pmfVariant(client.pmf_signal)}>{client.pmf_signal}</Badge>
          </div>
          {client.potencial_expansion && (
            <div className="flex items-center gap-2 text-brand">
              <TrendingUp size={14} />
              <span className="text-xs font-bold">Potencial de expansión detectado</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  return createPortal(content, document.body)
}
