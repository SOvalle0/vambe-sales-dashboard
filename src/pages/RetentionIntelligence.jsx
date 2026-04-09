import { useState, useMemo } from 'react'
import { Users, AlertTriangle, DollarSign, Flame } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Cell, LabelList,
} from 'recharts'
import KPICard from '../components/KPICard'
import ClientDetail from '../components/ClientDetail'
import useFilteredClients from '../hooks/useFilteredClients'
import Filters from '../components/Filters'

const fmt = (n) => {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`
  return `$${n}`
}

const C = {
  safe:    '#16A34A',
  warning: '#F59E0B',
  danger:  '#DC2626',
  neutral: '#64748B',
}

const ACTIVATION_FLAGS = new Set(['requiere integración', 'presión de implementación', 'recursos limitados'])
const PERMANENCE_FLAGS = new Set(['tiene objeciones', 'motivación reactiva'])
const ALL_FLAGS = ['tiene objeciones', 'requiere integración', 'motivación reactiva', 'presión de implementación', 'recursos limitados']
const FLAG_SHORT = {
  'tiene objeciones':          'Objeciones',
  'requiere integración':      'Integración',
  'motivación reactiva':       'Mot. reactiva',
  'presión de implementación': 'Presión impl.',
  'recursos limitados':        'Rec. limitados',
}

function calcAxes(client) {
  const flags = client.retention_risk_flags || []
  return {
    activacion:  flags.filter(f => ACTIVATION_FLAGS.has(f)).length,
    permanencia: flags.filter(f => PERMANENCE_FLAGS.has(f)).length,
  }
}

function getRiskLevel(activacion, permanencia) {
  const total = activacion + permanencia
  if (total === 0) return 'safe'
  if (total >= 3 || (activacion >= 1 && permanencia >= 1)) return 'critical'
  return 'warning'
}

function riskColor(level) {
  if (level === 'critical') return C.danger
  if (level === 'warning')  return C.warning
  return C.safe
}

function riskColorByValue(v) {
  if (v >= 2) return C.danger
  if (v >= 1) return C.warning
  return C.safe
}

function heatColor(pct) {
  if (pct === 0)   return { bg: '',             text: 'text-text-muted' }
  if (pct <= 33)   return { bg: 'bg-amber-50',  text: 'text-amber-700' }
  if (pct <= 66)   return { bg: 'bg-amber-200', text: 'text-amber-900' }
  return                  { bg: 'bg-amber-400', text: 'text-white' }
}

// ── ChartCard ──
function ChartCard({ title, subtitle, isAI, insight, methodology, children }) {
  const [showInsight, setShowInsight] = useState(true)
  const [showMethod,  setShowMethod]  = useState(false)
  return (
    <div className="bg-surface border border-border rounded-xl p-5 shadow-sm">
      <div className="flex items-baseline gap-1 mb-1">
        <h2 className="text-base font-semibold text-text">{title}</h2>
        {isAI && <span className="text-text-muted text-sm" title="Variable derivada con IA">*</span>}
      </div>
      <p className="text-xs text-text-muted mb-4">{subtitle}</p>
      {children}
      <div className="flex gap-3 mt-3">
        {insight && (
          <button onClick={() => setShowInsight(v => !v)} className="text-[11px] text-brand hover:text-brand-hover font-medium transition-colors">
            {showInsight ? '▾ Ocultar insight' : '▸ Insight'}
          </button>
        )}
        {methodology && (
          <button onClick={() => setShowMethod(v => !v)} className="text-[11px] text-text-muted hover:text-text-secondary transition-colors">
            {showMethod ? '▾ Ocultar metodología' : '▸ ¿Cómo se calcula?'}
          </button>
        )}
      </div>
      {showInsight && insight && (
        <p className="mt-2 text-xs text-brand/80 leading-relaxed bg-brand-light border-l-2 border-brand/30 pl-3 py-2 rounded-r">⚡ {insight}</p>
      )}
      {showMethod && methodology && (
        <p className="mt-2 text-[11px] text-text-muted leading-relaxed border-l-2 border-border pl-3">{methodology}</p>
      )}
    </div>
  )
}

function SectionHeader({ title, subtitle }) {
  return (
    <div className="mt-8 mb-4">
      <h2 className="text-lg font-bold text-text">{title}</h2>
      {subtitle && <p className="text-xs text-text-muted mt-0.5">{subtitle}</p>}
    </div>
  )
}

// ── Lollipop custom bar shape ──
function LollipopBar({ x, y, width, height, fill }) {
  const cy = y + height / 2
  return (
    <g>
      <line x1={x} y1={cy} x2={x + width} y2={cy} stroke={fill} strokeWidth={2.5} strokeLinecap="round" />
      <circle cx={x + width} cy={cy} r={8} fill={fill} stroke="white" strokeWidth={2} />
    </g>
  )
}

// ── Tooltip helper ──
function TBox({ lines }) {
  return (
    <div className="bg-surface border border-border rounded-lg px-3 py-2 shadow-md text-sm">
      {lines.map((l, i) => (
        <p key={i} className={i === 0 ? 'font-medium text-text' : 'text-text-secondary text-xs mt-0.5'}>{l}</p>
      ))}
    </div>
  )
}

// ── Insight generators ──
function insightHealthBar(hb) {
  if (!hb.total.count) return ''
  const expPct = Math.round(((hb.warning.mrr + hb.critical.mrr) / (hb.total.mrr || 1)) * 100)
  if (hb.critical.mrr > hb.total.mrr * 0.15)
    return `${fmt(hb.critical.mrr)}/mes en zona crítica — intervención urgente esta semana. ${expPct}% del MRR activo tiene algún nivel de riesgo.`
  return `${expPct}% del MRR activo tiene algún nivel de riesgo. ${hb.safe.count} clientes (${fmt(hb.safe.mrr)}/mes) en condiciones de entrada saludables.`
}

function insightWaterfall(critMRR, totalMRR) {
  const pct = Math.round(critMRR / (totalMRR || 1) * 100)
  if (pct > 15) return `Alerta: ${pct}% del MRR en zona crítica — requiere coordinación inmediata CS + Soporte.`
  return `${pct}% del MRR en zona crítica — manejable con esfuerzo focalizado en los primeros 14 días.`
}

function insightFlagsFreq(data) {
  if (!data.length) return ''
  const top = data[0], second = data[1]
  return `"${top.fullFlag}" es el riesgo más frecuente (${top.pct}% de clientes). "${second?.fullFlag}" en segundo lugar (${second?.pct}%). El onboarding debe priorizarlos en ese orden.`
}

function insightUrgency(data) {
  const alta  = data.find(d => d.urgencia === 'Alta')
  const media = data.find(d => d.urgencia === 'Media')
  if (!alta || !media) return ''
  const diff = (alta['Crítico'] || 0) - (media['Crítico'] || 0)
  if (diff > 5) return `Clientes con urgencia Alta tienen ${diff} puntos porcentuales más de riesgo crítico. Urgencia = señal de alerta, no de facilidad. Asignar CS dedicado desde el día 1.`
  return 'La distribución de riesgo es similar entre urgencias Alta y Media. El onboarding estándar aplica para ambos segmentos.'
}

function insightCanal(data) {
  if (!data.length) return ''
  const worst = data[0], best = data[data.length - 1]
  return `${worst.canal} genera el mayor riesgo promedio (${worst.avgRisk}/4). ${best.canal} el menor (${best.avgRisk}/4). Ajustar el protocolo de bienvenida según el canal de origen.`
}

function insightVendedor(data) {
  if (data.length < 2) return ''
  const worst = data[0], best = data[data.length - 1]
  return `${worst.vendedor} cierra deals con risk promedio ${worst.avgRisk} vs ${best.avgRisk} de ${best.vendedor}. Puede reflejar que cada vendedor trabaja segmentos con distinta complejidad técnica.`
}

function insightIndustria(data) {
  if (!data.length) return ''
  const worst = data[0]
  const topFlag = [...worst.flags].sort((a, b) => b.pct - a.pct)[0]
  return `${worst.ind} concentra el mayor riesgo promedio (${worst.avgRisk}/4) — ${topFlag?.pct}% de sus clientes tienen "${topFlag?.flag}". Preparar guía de onboarding específica para esta vertical.`
}

function insightMrrByFlag(data) {
  if (!data.length) return ''
  const top = data[0]
  return `"${top.fullFlag}" tiene mayor MRR expuesto (${fmt(top.mrr)}/mes en ${top.count} clientes). Resolver esta fricción primero tiene el mayor impacto en revenue.`
}

function insightTable(wonClients, criticalCount, mrrExposed) {
  if (criticalCount === 0) return 'Ningún cliente con múltiples tipos de riesgo. Cartera con condiciones de entrada saludables.'
  const pct = Math.round((criticalCount / (wonClients.length || 1)) * 100)
  return `${pct}% de clientes activos con múltiples tipos de riesgo — representan ${fmt(mrrExposed)}/mes. Priorizar intervención en las primeras 2 semanas.`
}

const riskBadge = (level) => {
  if (level === 'critical') return { label: 'Crítico',   cls: 'bg-red-50 text-red-700 border-red-200' }
  if (level === 'warning')  return { label: 'En Riesgo', cls: 'bg-amber-50 text-amber-700 border-amber-200' }
  return                           { label: 'Safe',      cls: 'bg-green-50 text-green-700 border-green-200' }
}

const flagClass = (flag) => {
  if (ACTIVATION_FLAGS.has(flag)) return 'bg-amber-50 text-amber-700 border-amber-200'
  if (PERMANENCE_FLAGS.has(flag)) return 'bg-red-50 text-red-700 border-red-200'
  return 'bg-bg text-text-secondary border-border'
}

// ── Componente principal ──
export default function RetentionIntelligence() {
  const { filtered: clients, searchQuery, setSearchQuery, clearAll, filters, setFilter } = useFilteredClients()
  const [selectedClient, setSelectedClient] = useState(null)

  const wonClients = useMemo(() => clients.filter(c => c.closed === 1), [clients])

  const baseData = useMemo(() =>
    wonClients.map(c => {
      const axes = calcAxes(c)
      return {
        ...axes,
        riskLevel: getRiskLevel(axes.activacion, axes.permanencia),
        nombre:    c.nombre,
        mrr:       Math.round((c.acv_estimado || 0) / 12),
        plan:      c.plan_sugerido || 'Sin plan',
        flags:     c.retention_risk_flags || [],
        _raw:      c,
      }
    }),
    [wonClients]
  )

  const criticalClients = baseData.filter(d => d.riskLevel === 'critical')
  const mrrExposed      = criticalClients.reduce((s, d) => s + d.mrr, 0)
  const reactiveCount   = wonClients.filter(c => (c.retention_risk_flags || []).includes('motivación reactiva')).length

  const riskTable = useMemo(() =>
    [...baseData].sort((a, b) => (b.activacion + b.permanencia) - (a.activacion + a.permanencia)),
    [baseData]
  )

  // [1] Health Bar
  const healthBar = useMemo(() => {
    const safe     = baseData.filter(d => d.riskLevel === 'safe')
    const warning  = baseData.filter(d => d.riskLevel === 'warning')
    const critical = baseData.filter(d => d.riskLevel === 'critical')
    const tc = baseData.length || 1
    const tm = baseData.reduce((s, d) => s + d.mrr, 0) || 1
    const sumMRR = arr => arr.reduce((s, d) => s + d.mrr, 0)
    return {
      safe:     { count: safe.length,     mrr: sumMRR(safe),     cPct: Math.round(safe.length / tc * 100),     mPct: Math.round(sumMRR(safe) / tm * 100) },
      warning:  { count: warning.length,  mrr: sumMRR(warning),  cPct: Math.round(warning.length / tc * 100),  mPct: Math.round(sumMRR(warning) / tm * 100) },
      critical: { count: critical.length, mrr: sumMRR(critical), cPct: Math.round(critical.length / tc * 100), mPct: Math.round(sumMRR(critical) / tm * 100) },
      total: { count: tc, mrr: tm },
    }
  }, [baseData])

  // [2] Waterfall
  const waterfallData = useMemo(() => [
    { label: 'MRR Total',  base: 0,                                               value: healthBar.total.mrr,    fill: C.neutral },
    { label: 'Crítico',    base: 0,                                               value: healthBar.critical.mrr, fill: C.danger  },
    { label: 'En Riesgo',  base: healthBar.critical.mrr,                          value: healthBar.warning.mrr,  fill: C.warning },
    { label: 'Safe',       base: healthBar.critical.mrr + healthBar.warning.mrr,  value: healthBar.safe.mrr,     fill: C.safe    },
  ], [healthBar])

  // [3] Flags frecuencia
  const flagsFreq = useMemo(() =>
    ALL_FLAGS.map(f => ({
      flag:     FLAG_SHORT[f],
      fullFlag: f,
      count:    wonClients.filter(c => (c.retention_risk_flags || []).includes(f)).length,
      pct:      Math.round(wonClients.filter(c => (c.retention_risk_flags || []).includes(f)).length / (wonClients.length || 1) * 100),
      type:     ACTIVATION_FLAGS.has(f) ? 'activacion' : 'permanencia',
    })).sort((a, b) => b.count - a.count),
    [wonClients]
  )

  // [4] Urgencia distribución
  const urgencyDist = useMemo(() =>
    ['Alta', 'Media'].map(u => {
      const g = wonClients.filter(c => c.urgencia === u)
      const total = g.length || 1
      const counts = { safe: 0, warning: 0, critical: 0 }
      g.forEach(c => { const ax = calcAxes(c); counts[getRiskLevel(ax.activacion, ax.permanencia)]++ })
      return {
        urgencia: u,
        n: g.length,
        Safe:        Math.round(counts.safe / total * 100),
        'En Riesgo': Math.round(counts.warning / total * 100),
        'Crítico':   Math.round(counts.critical / total * 100),
      }
    }),
    [wonClients]
  )

  // [5] Canal → risk
  const canalRisk = useMemo(() => {
    const canales = [...new Set(wonClients.map(c => c.canal_descubrimiento))]
    return canales.map(canal => {
      const g = wonClients.filter(c => c.canal_descubrimiento === canal)
      const avgRisk = parseFloat((g.reduce((s, c) => s + c.retention_risk_score, 0) / (g.length || 1)).toFixed(1))
      const short = canal
        .replace('Conferencia o Evento', 'Conferencia')
        .replace('Búsqueda orgánica', 'Orgánica')
        .replace('Contenido online', 'Contenido')
      return { canal: short, avgRisk, count: g.length }
    }).sort((a, b) => b.avgRisk - a.avgRisk)
  }, [wonClients])

  // [6] Industria × flag heatmap
  const industriaHeatmap = useMemo(() => {
    const industries = [...new Set(wonClients.map(c => c.industria))].filter(Boolean)
    return industries.map(ind => {
      const g = wonClients.filter(c => c.industria === ind)
      const avgRisk = parseFloat((g.reduce((s, c) => s + c.retention_risk_score, 0) / (g.length || 1)).toFixed(1))
      return {
        ind, total: g.length, avgRisk,
        flags: ALL_FLAGS.map(f => ({
          flag:  f,
          short: FLAG_SHORT[f],
          pct:   Math.round(g.filter(c => (c.retention_risk_flags || []).includes(f)).length / (g.length || 1) * 100),
          count: g.filter(c => (c.retention_risk_flags || []).includes(f)).length,
        })),
      }
    }).sort((a, b) => b.avgRisk - a.avgRisk)
  }, [wonClients])

  // [7] Vendedor lollipop
  const vendorRisk = useMemo(() => {
    return ['Toro', 'Puma', 'Zorro', 'Boa', 'Tiburón'].map(v => {
      const g = wonClients.filter(c => c.vendedor === v)
      if (!g.length) return null
      const avgRisk = parseFloat((g.reduce((s, c) => s + c.retention_risk_score, 0) / g.length).toFixed(1))
      return { vendedor: v, avgRisk, count: g.length, color: riskColorByValue(avgRisk) }
    }).filter(Boolean).sort((a, b) => b.avgRisk - a.avgRisk)
  }, [wonClients])

  // [8] MRR por flag
  const mrrByFlag = useMemo(() =>
    ALL_FLAGS.map(f => {
      const cl = wonClients.filter(c => (c.retention_risk_flags || []).includes(f))
      return {
        flag:     FLAG_SHORT[f],
        fullFlag: f,
        mrr:      cl.reduce((s, c) => s + (c.mrr_estimado || 0), 0),
        count:    cl.length,
        type:     ACTIVATION_FLAGS.has(f) ? 'activacion' : 'permanencia',
      }
    }).sort((a, b) => b.mrr - a.mrr),
    [wonClients]
  )

  // [9] Client × flag matrix
  const clientMatrix = useMemo(() => {
    const ORDER = { critical: 0, warning: 1, safe: 2 }
    return [...baseData]
      .sort((a, b) => ORDER[a.riskLevel] - ORDER[b.riskLevel])
      .map(d => {
        const parts = d.nombre.split(' ')
        const short = parts[0] + (parts[1] ? ' ' + parts[1][0] + '.' : '')
        return { nombre: short, flagsActive: ALL_FLAGS.map(f => d.flags.includes(f)), riskLevel: d.riskLevel, _raw: d._raw }
      })
  }, [baseData])

  // [10] Playbook quads
  const playbookQuads = useMemo(() => ({
    both:     baseData.filter(d => d.activacion > 0 && d.permanencia > 0),
    techOnly: baseData.filter(d => d.activacion > 0 && d.permanencia === 0),
    csOnly:   baseData.filter(d => d.activacion === 0 && d.permanencia > 0),
    safe:     baseData.filter(d => d.activacion === 0 && d.permanencia === 0),
  }), [baseData])

  return (
    <div>
      <h1 className="text-2xl font-bold text-text mb-1">Onboarding Risk</h1>
      <p className="text-sm text-text-secondary mb-6">
        Condiciones de entrada de clientes activos — ¿qué necesita cada uno para activarse?
      </p>

      <Filters searchQuery={searchQuery} onSearch={setSearchQuery} onClearAll={clearAll} filters={filters} onFilter={setFilter} totalFiltered={clients.length} />

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 mb-2 sm:grid-cols-4">
        <KPICard icon={Users}         title="Clientes Activos"    value={wonClients.length}      subtitle="Deals cerrados (Won)" />
        <KPICard icon={AlertTriangle} title="Riesgo Crítico"      value={criticalClients.length} subtitle="Múltiples tipos de flag" />
        <KPICard icon={DollarSign}    title="MRR Expuesto"        value={fmt(mrrExposed)}        subtitle="Revenue en riesgo crítico" />
        <KPICard icon={Flame}         title="Motivación Reactiva" value={reactiveCount}          subtitle="Compraron por urgencia" />
      </div>

      {/* ── TABLA ── */}
      <SectionHeader title="Detalle por Cliente" subtitle="Ordenados por nivel de riesgo — click para ver la ficha completa" />
      <div className="bg-surface border border-border rounded-xl shadow-sm mb-4">
        <div className="px-5 py-2 bg-brand-light border-b border-brand/10">
          <p className="text-xs text-brand/80 leading-relaxed">⚡ {insightTable(wonClients, criticalClients.length, mrrExposed)}</p>
        </div>
        <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-bg">
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Nombre</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Plan</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider">MRR</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-text-secondary uppercase tracking-wider">Nivel</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Flags activos</th>
              </tr>
            </thead>
            <tbody>
              {riskTable.map((d, i) => {
                const badge = riskBadge(d.riskLevel)
                return (
                  <tr key={i} onClick={() => setSelectedClient(d._raw)} className="border-b border-border/50 hover:bg-hover cursor-pointer transition-colors">
                    <td className="px-4 py-3 font-medium text-text">{d.nombre}</td>
                    <td className="px-4 py-3 text-text-secondary">{d.plan}</td>
                    <td className="px-4 py-3 text-right text-text">{fmt(d.mrr)}/mes</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${badge.cls}`}>{badge.label}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {d.flags.map((f, j) => (
                          <span key={j} className={`text-[10px] px-1.5 py-0.5 rounded border ${flagClass(f)}`}>{f}</span>
                        ))}
                        {d.flags.length === 0 && <span className="text-[10px] text-text-muted">—</span>}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Leyenda global */}
      <div className="flex flex-wrap gap-5 mb-2 text-[11px] text-text-muted">
        {[['safe', 'Safe — sin flags activos'], ['warning', 'En Riesgo — un tipo de flag'], ['danger', 'Crítico — múltiples tipos']].map(([k, label]) => (
          <span key={k} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ backgroundColor: C[k] }} />
            {label}
          </span>
        ))}
      </div>

      {/* ══ 1: ESTADO DE LA CARTERA ══ */}
      <SectionHeader title="Estado de la cartera" subtitle="¿Cuántos clientes y cuánto MRR tiene cada nivel de riesgo?" />

      {/* [1] Portfolio Health Bar */}
      <div className="mb-4">
        <ChartCard
          title="Portfolio Health"
          subtitle="Distribución de clientes y MRR — escala al número de clientes activos"
          insight={insightHealthBar(healthBar)}
          methodology="Clientes Won clasificados en Safe (0 flags), En Riesgo (1 tipo de flag) y Crítico (ambos tipos o ≥3 flags). Barras proporcionales al total en cada dimensión."
        >
          <div className="space-y-5 py-1">
            {[
              {
                label: 'Clientes', total: `${healthBar.total.count} activos`,
                segs: [
                  { pct: healthBar.safe.cPct,     val: `${healthBar.safe.count}`,     color: 'bg-success' },
                  { pct: healthBar.warning.cPct,  val: `${healthBar.warning.count}`,  color: 'bg-warning' },
                  { pct: healthBar.critical.cPct, val: `${healthBar.critical.count}`, color: 'bg-danger'  },
                ],
              },
              {
                label: 'MRR', total: `${fmt(healthBar.total.mrr)}/mes`,
                segs: [
                  { pct: healthBar.safe.mPct,     val: fmt(healthBar.safe.mrr),     color: 'bg-success' },
                  { pct: healthBar.warning.mPct,  val: fmt(healthBar.warning.mrr),  color: 'bg-warning' },
                  { pct: healthBar.critical.mPct, val: fmt(healthBar.critical.mrr), color: 'bg-danger'  },
                ],
              },
            ].map(row => (
              <div key={row.label}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-text-secondary">{row.label}</span>
                  <span className="text-xs text-text-muted">{row.total}</span>
                </div>
                <div className="flex h-8 rounded-lg overflow-hidden gap-px">
                  {row.segs.map((seg, i) => (
                    <div key={i} style={{ width: `${seg.pct}%` }} className={`${seg.color} flex items-center justify-center flex-shrink-0`}>
                      {seg.pct >= 12 && <span className="text-white text-[11px] font-semibold">{seg.pct}%</span>}
                    </div>
                  ))}
                </div>
                <div className="flex justify-between mt-1 text-[10px]">
                  <span className="text-success font-medium">Safe: {row.segs[0].val}</span>
                  <span className="text-warning font-medium">En Riesgo: {row.segs[1].val}</span>
                  <span className="text-danger font-medium">Crítico: {row.segs[2].val}</span>
                </div>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* [2] Waterfall MRR */}
      <div className="mb-4">
        <ChartCard
          title="Desglose de MRR por Nivel de Riesgo"
          subtitle="¿Cuánto revenue está expuesto en cada categoría?"
          insight={insightWaterfall(healthBar.critical.mrr, healthBar.total.mrr)}
          methodology="MRR (ACV/12) de clientes Won agrupado por nivel de riesgo. Crítico parte desde 0; En Riesgo se apoya sobre Crítico; Safe completa el total."
        >
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={waterfallData} layout="vertical" barSize={36} margin={{ top: 0, right: 90, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
              <XAxis type="number" tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: '#64748B' }} />
              <YAxis type="category" dataKey="label" tick={{ fontSize: 12, fill: '#475569' }} width={90} />
              <Tooltip content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null
                const d = waterfallData.find(r => r.label === label)
                return <TBox lines={[label, `${fmt(d?.value || 0)}/mes`]} />
              }} />
              <Bar dataKey="base"  stackId="wf" fillOpacity={0} strokeWidth={0} legendType="none" isAnimationActive={false} />
              <Bar dataKey="value" stackId="wf" radius={[0, 4, 4, 0]} isAnimationActive={false}>
                {waterfallData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                <LabelList dataKey="value" position="right" formatter={v => fmt(v)} style={{ fontSize: 11, fill: '#475569', fontWeight: 500 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ══ 2: NATURALEZA DEL RIESGO ══ */}
      <SectionHeader title="Naturaleza del riesgo" subtitle="¿Qué tipo de fricción domina y quién llega con más riesgo?" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* [3] Frecuencia de flags */}
        <ChartCard
          title="Frecuencia de Flags*"
          subtitle="¿Cuál es el problema de activación más frecuente?"
          isAI
          insight={insightFlagsFreq(flagsFreq)}
          methodology="% de clientes Won con cada flag activo. Ámbar = flag de activación (técnico). Rojo = flag de permanencia (relacional)."
        >
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={flagsFreq} layout="vertical" barSize={22} margin={{ top: 0, right: 48, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#64748B' }} allowDecimals={false} />
              <YAxis type="category" dataKey="flag" tick={{ fontSize: 11, fill: '#475569' }} width={112} />
              <Tooltip content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null
                const d = flagsFreq.find(f => f.flag === label)
                return <TBox lines={[d?.fullFlag || label, `${d?.count} clientes (${d?.pct}%)`, d?.type === 'activacion' ? 'Flag de activación' : 'Flag de permanencia']} />
              }} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {flagsFreq.map((d, i) => <Cell key={i} fill={d.type === 'activacion' ? C.warning : C.danger} />)}
                <LabelList dataKey="pct" position="right" formatter={v => `${v}%`} style={{ fontSize: 11, fill: '#64748B' }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* [4] Urgencia → distribución */}
        <ChartCard
          title="Urgencia → Nivel de Riesgo*"
          subtitle="Clientes con urgencia Alta llegan con mayor riesgo de activación"
          isAI
          insight={insightUrgency(urgencyDist)}
          methodology="Clientes Won agrupados por urgencia declarada, subdivididos por nivel de riesgo. Muestra si urgencia como trigger de compra genera condiciones de entrada más complejas."
        >
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={urgencyDist} barSize={72} margin={{ top: 10, right: 20, bottom: 0, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="urgencia" tick={{ fontSize: 12, fill: '#475569' }} tickFormatter={v => { const d = urgencyDist.find(x => x.urgencia === v); return `${v} (n=${d?.n})` }} />
              <YAxis tick={{ fontSize: 11, fill: '#64748B' }} unit="%" domain={[0, 100]} />
              <Tooltip content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null
                return (
                  <div className="bg-surface border border-border rounded-lg px-3 py-2 shadow-md text-sm">
                    <p className="font-medium text-text mb-1">{label}</p>
                    {payload.map((p, i) => p.value > 0 && (
                      <p key={i} className="text-text-secondary">{p.name}: {p.value}%</p>
                    ))}
                  </div>
                )
              }} />
              <Bar dataKey="Safe"       name="Safe"       stackId="a" fill={C.safe} />
              <Bar dataKey="En Riesgo"  name="En Riesgo"  stackId="a" fill={C.warning} />
              <Bar dataKey="Crítico"    name="Crítico"    stackId="a" fill={C.danger} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ══ 3: ORIGEN DEL RIESGO ══ */}
      <SectionHeader title="Origen del riesgo" subtitle="¿El canal de adquisición y el vendedor predicen el perfil de onboarding?" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* [5] Canal → risk */}
        <ChartCard
          title="Canal de Adquisición → Risk"
          subtitle="¿De dónde vienen los clientes con mayor fricción de entrada?"
          insight={insightCanal(canalRisk)}
          methodology="Risk score promedio (0-4) de clientes Won por canal de origen. Score alto = mayor probabilidad de necesitar intervención durante el onboarding."
        >
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={canalRisk} layout="vertical" barSize={20} margin={{ top: 0, right: 48, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
              <XAxis type="number" domain={[0, 4]} ticks={[0, 1, 2, 3, 4]} tick={{ fontSize: 11, fill: '#64748B' }} allowDecimals={false} />
              <YAxis type="category" dataKey="canal" tick={{ fontSize: 11, fill: '#475569' }} width={88} />
              <Tooltip content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null
                const d = canalRisk.find(c => c.canal === label)
                return <TBox lines={[label, `Risk promedio: ${d?.avgRisk}/4`, `${d?.count} cliente${d?.count !== 1 ? 's' : ''}`]} />
              }} />
              <Bar dataKey="avgRisk" radius={[0, 4, 4, 0]}>
                {canalRisk.map((d, i) => <Cell key={i} fill={riskColorByValue(d.avgRisk)} />)}
                <LabelList dataKey="avgRisk" position="right" style={{ fontSize: 11, fill: '#64748B' }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* [7] Vendedor lollipop */}
        <ChartCard
          title="Risk Promedio por Vendedor"
          subtitle="¿Cada vendedor cierra deals con distinto perfil de riesgo?"
          insight={insightVendedor(vendorRisk)}
          methodology="Risk score promedio de clientes Won por vendedor. No indica calidad del vendedor — puede reflejar que cada uno trabaja segmentos con distinta complejidad técnica."
        >
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={vendorRisk} layout="vertical" barSize={20} margin={{ top: 0, right: 48, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
              <XAxis type="number" domain={[0, 4]} ticks={[0, 1, 2, 3, 4]} tick={{ fontSize: 11, fill: '#64748B' }} allowDecimals={false} />
              <YAxis type="category" dataKey="vendedor" tick={{ fontSize: 12, fill: '#475569' }} width={68} />
              <Tooltip content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null
                const d = vendorRisk.find(v => v.vendedor === label)
                return <TBox lines={[label, `Risk promedio: ${d?.avgRisk}/4`, `${d?.count} clientes Won`]} />
              }} />
              <Bar dataKey="avgRisk" shape={<LollipopBar />}>
                {vendorRisk.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ══ 4: CONCENTRACIÓN POR SEGMENTO ══ */}
      <SectionHeader title="Concentración por segmento" subtitle="¿Qué industrias concentran más flags? CS ajusta el protocolo por vertical." />

      {/* [6] Heatmap industria × flag */}
      <div className="mb-4">
        <ChartCard
          title="Heatmap Industria × Flag*"
          subtitle="Intensidad = % de clientes de esa industria con ese flag activo — ordenado por riesgo promedio"
          isAI
          insight={insightIndustria(industriaHeatmap)}
          methodology="Para cada industria, % de clientes Won que tienen cada flag. Color más intenso = mayor concentración de riesgo en esa vertical."
        >
          <div className="overflow-x-auto mt-2">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr>
                  <th className="text-left text-xs font-semibold text-text-secondary py-2 pr-4 whitespace-nowrap">Industria</th>
                  <th className="text-center text-xs font-semibold text-text-secondary py-2 px-2 whitespace-nowrap">n</th>
                  <th className="text-center text-xs font-semibold text-text-secondary py-2 px-2 whitespace-nowrap">Risk</th>
                  {ALL_FLAGS.map(f => (
                    <th key={f} className="text-center text-[10px] font-semibold text-text-secondary py-2 px-3 whitespace-nowrap">{FLAG_SHORT[f]}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {industriaHeatmap.map((row, i) => (
                  <tr key={i} className="border-t border-border/40">
                    <td className="text-xs font-medium text-text py-2.5 pr-4 whitespace-nowrap">{row.ind}</td>
                    <td className="text-center text-[11px] text-text-muted py-2.5 px-2">{row.total}</td>
                    <td className="text-center text-[11px] py-2.5 px-2">
                      <span className={`font-medium ${row.avgRisk >= 2 ? 'text-danger' : row.avgRisk >= 1 ? 'text-warning' : 'text-success'}`}>{row.avgRisk}</span>
                    </td>
                    {row.flags.map((cell, j) => {
                      const { bg, text } = heatColor(cell.pct)
                      return (
                        <td key={j} className={`text-center text-[11px] py-2.5 px-3 ${bg} ${text}`} title={`${cell.flag}: ${cell.count}/${row.total} (${cell.pct}%)`}>
                          {cell.pct > 0 ? `${cell.pct}%` : '—'}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartCard>
      </div>

      {/* ══ 5: IMPACTO FINANCIERO ══ */}
      <SectionHeader title="Impacto financiero" subtitle="¿Cuánto MRR está expuesto por cada tipo de riesgo?" />

      {/* [8] MRR por flag */}
      <div className="mb-4">
        <ChartCard
          title="MRR Expuesto por Flag*"
          subtitle="Suma de MRR de clientes con cada flag activo — prioriza por impacto económico, no solo frecuencia"
          isAI
          insight={insightMrrByFlag(mrrByFlag)}
          methodology="Suma del MRR estimado de todos los clientes Won que tienen activo ese flag. Un cliente puede contribuir a múltiples flags. Prioriza qué fricción resolver primero según impacto en revenue."
        >
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={mrrByFlag} layout="vertical" barSize={22} margin={{ top: 0, right: 90, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
              <XAxis type="number" tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: '#64748B' }} />
              <YAxis type="category" dataKey="flag" tick={{ fontSize: 11, fill: '#475569' }} width={112} />
              <Tooltip content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null
                const d = mrrByFlag.find(f => f.flag === label)
                return <TBox lines={[d?.fullFlag || label, `${fmt(d?.mrr || 0)}/mes expuesto`, `${d?.count} clientes`]} />
              }} />
              <Bar dataKey="mrr" radius={[0, 4, 4, 0]}>
                {mrrByFlag.map((d, i) => <Cell key={i} fill={d.type === 'activacion' ? C.warning : C.danger} />)}
                <LabelList dataKey="mrr" position="right" formatter={v => fmt(v)} style={{ fontSize: 11, fill: '#475569', fontWeight: 500 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ══ 6: MAPA COMPLETO ══ */}
      <SectionHeader title="Mapa completo de la cartera" subtitle="Cada cliente × cada flag. Ordenado de crítico a safe. Click en nombre para ver ficha." />

      {/* [9] Client × flag matrix */}
      <div className="mb-4">
        <ChartCard
          title="Mapa Cliente × Flag*"
          subtitle="Ámbar = flag de activación · Rojo = flag de permanencia · Click en cliente para ver ficha"
          isAI
          insight={`${clientMatrix.filter(d => d.riskLevel === 'critical').length} clientes críticos (izq) → ${clientMatrix.filter(d => d.riskLevel === 'warning').length} en riesgo → ${clientMatrix.filter(d => d.riskLevel === 'safe').length} safe (der). Patrón de co-ocurrencia visible de un vistazo.`}
          methodology="Tabla completa de clientes Won × 5 flags. Celda coloreada = flag activo. Clientes ordenados por nivel de riesgo: crítico → en riesgo → safe."
        >
          <div className="overflow-x-auto -mx-1 mt-2">
            <table className="text-[10px] border-collapse" style={{ minWidth: `${clientMatrix.length * 36 + 120}px` }}>
              <thead>
                <tr>
                  <th className="sticky left-0 bg-surface z-10 text-left text-[10px] font-semibold text-text-secondary pb-1 pr-3 min-w-[112px]" />
                  {clientMatrix.map((d, i) => (
                    <th key={i} className="text-center px-0.5 pb-1 cursor-pointer" onClick={() => setSelectedClient(d._raw)} title={d.nombre}>
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="w-2 h-2 rounded-full inline-block flex-shrink-0" style={{ backgroundColor: riskColor(d.riskLevel) }} />
                        <span className="text-text-muted font-normal" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', fontSize: '9px', lineHeight: 1.1 }}>
                          {d.nombre}
                        </span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ALL_FLAGS.map((flag, fi) => (
                  <tr key={fi} className={fi % 2 === 0 ? 'bg-bg/50' : ''}>
                    <td className="sticky left-0 bg-surface z-10 text-[10px] font-medium text-text-secondary py-2 pr-3 whitespace-nowrap">
                      <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 align-middle`} style={{ backgroundColor: ACTIVATION_FLAGS.has(flag) ? C.warning : C.danger }} />
                      {FLAG_SHORT[flag]}
                    </td>
                    {clientMatrix.map((d, ci) => (
                      <td key={ci} className="text-center py-1.5 px-0.5 cursor-pointer" onClick={() => setSelectedClient(d._raw)} title={`${d.nombre}: ${flag} ${d.flagsActive[fi] ? '✓' : '—'}`}>
                        <span
                          className="inline-block w-4 h-4 rounded-sm"
                          style={{
                            backgroundColor: d.flagsActive[fi]
                              ? (ACTIVATION_FLAGS.has(flag) ? '#FEF3C7' : '#FEE2E2')
                              : '#F1F5F9',
                            border: d.flagsActive[fi]
                              ? `1.5px solid ${ACTIVATION_FLAGS.has(flag) ? C.warning : C.danger}`
                              : '1.5px solid #E2E8F0',
                          }}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartCard>
      </div>

      {/* ══ 7: ACCIÓN ══ */}
      <SectionHeader title="Playbook de Acción" subtitle="¿Qué equipo atiende a cada cliente? Basado en el tipo de riesgo detectado. Click en nombre para ver ficha." />

      {/* [10] Playbook 2×2 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        {[
          {
            key: 'both', icon: '🚨',
            title: 'CS + Soporte · Crítico',
            desc:  'Fricción técnica Y relacional — intervención conjunta urgente',
            borderCls: 'border-danger/30', bgCls: 'bg-danger-light',
            titleCls:  'text-danger',
            chipBorder: 'border-danger/30', chipText: 'text-danger',
          },
          {
            key: 'techOnly', icon: '🔧',
            title: 'Soporte Técnico',
            desc:  'Solo fricción de activación — quieren quedarse, necesitan ayuda técnica',
            borderCls: 'border-warning/30', bgCls: 'bg-warning-light',
            titleCls:  'text-amber-800',
            chipBorder: 'border-warning/40', chipText: 'text-amber-800',
          },
          {
            key: 'csOnly', icon: '🤝',
            title: 'Customer Success',
            desc:  'Solo fricción relacional — check-ins semanales, construir hábito',
            borderCls: 'border-brand/20', bgCls: 'bg-brand-light',
            titleCls:  'text-brand',
            chipBorder: 'border-brand/30', chipText: 'text-brand',
          },
          {
            key: 'safe', icon: '✅',
            title: 'Monitorear',
            desc:  'Sin fricción detectada — onboarding estándar + check-in a 30 días',
            borderCls: 'border-success/20', bgCls: 'bg-success-light',
            titleCls:  'text-success',
            chipBorder: 'border-success/30', chipText: 'text-success',
          },
        ].map(q => (
          <div key={q.key} className={`border-2 ${q.borderCls} rounded-xl p-4 ${q.bgCls}`}>
            <div className="flex items-start gap-2 mb-3">
              <span className="text-xl leading-none mt-0.5">{q.icon}</span>
              <div>
                <p className={`text-sm font-bold ${q.titleCls}`}>{q.title}</p>
                <p className="text-[10px] text-text-secondary mt-0.5">{q.desc}</p>
              </div>
              <span className="ml-auto text-xs font-bold text-text-muted">{playbookQuads[q.key].length}</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {playbookQuads[q.key].map((d, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedClient(d._raw)}
                  className={`text-[11px] px-2.5 py-1 rounded-full border ${q.chipBorder} bg-surface ${q.chipText} font-medium hover:opacity-80 transition-opacity`}
                >
                  {d.nombre}
                </button>
              ))}
              {playbookQuads[q.key].length === 0 && (
                <span className="text-[11px] text-text-muted italic">Sin clientes en esta zona</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Nota de producción */}
      <div className="mb-4 px-4 py-3 bg-bg border border-border rounded-lg">
        <p className="text-[11px] text-text-muted leading-relaxed">
          <span className="font-semibold text-text-secondary">Nota:</span> Este módulo mapea condiciones de entrada desde transcripciones de venta. En producción se enriquecería con datos de uso del producto, tickets de soporte y NPS para evolucionar a predicción real de churn. * Variable derivada con IA.
        </p>
      </div>

      {selectedClient && <ClientDetail client={selectedClient} onClose={() => setSelectedClient(null)} />}
    </div>
  )
}
