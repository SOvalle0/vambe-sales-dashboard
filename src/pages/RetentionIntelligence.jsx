import { useState, useMemo } from 'react'
import { Users, AlertTriangle, DollarSign, Flame } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Cell, LabelList,
} from 'recharts'
import KPICard from '../components/KPICard'
import ChartCard from '../components/ChartCard'
import ClientDetail from '../components/ClientDetail'
import useFilteredClients from '../hooks/useFilteredClients'
import Filters from '../components/Filters'
import AccionesRecomendadas from '../components/AccionesRecomendadas'

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
    <div className="bg-surface border border-border rounded-lg px-3 py-2 text-sm" style={{ boxShadow: '0 4px 16px rgba(37,99,235,0.10), 0 1px 4px rgba(15,23,42,0.06)' }}>
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

  const waterfallData = useMemo(() => [
    { label: 'MRR Total',  base: 0,                                               value: healthBar.total.mrr,    fill: C.neutral },
    { label: 'Crítico',    base: 0,                                               value: healthBar.critical.mrr, fill: C.danger  },
    { label: 'En Riesgo',  base: healthBar.critical.mrr,                          value: healthBar.warning.mrr,  fill: C.warning },
    { label: 'Safe',       base: healthBar.critical.mrr + healthBar.warning.mrr,  value: healthBar.safe.mrr,     fill: C.safe    },
  ], [healthBar])

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

  const vendorRisk = useMemo(() => {
    return ['Toro', 'Puma', 'Zorro', 'Boa', 'Tiburón'].map(v => {
      const g = wonClients.filter(c => c.vendedor === v)
      if (!g.length) return null
      const avgRisk = parseFloat((g.reduce((s, c) => s + c.retention_risk_score, 0) / g.length).toFixed(1))
      return { vendedor: v, avgRisk, count: g.length, color: riskColorByValue(avgRisk) }
    }).filter(Boolean).sort((a, b) => b.avgRisk - a.avgRisk)
  }, [wonClients])

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

  const playbookQuads = useMemo(() => ({
    both:     baseData.filter(d => d.activacion > 0 && d.permanencia > 0),
    techOnly: baseData.filter(d => d.activacion > 0 && d.permanencia === 0),
    csOnly:   baseData.filter(d => d.activacion === 0 && d.permanencia > 0),
    safe:     baseData.filter(d => d.activacion === 0 && d.permanencia === 0),
  }), [baseData])

  return (
    <div className="animate-in fade-in duration-500">
      <div className="page-title-wrap"><h1 className="text-2xl font-bold mb-1 text-text">Onboarding Risk</h1></div>
      <p className="text-sm text-text-secondary mb-6">
        Condiciones de entrada de clientes activos — ¿qué necesita cada uno para activarse?
      </p>

      <Filters searchQuery={searchQuery} onSearch={setSearchQuery} onClearAll={clearAll} filters={filters} onFilter={setFilter} totalFiltered={clients.length} />

      <div className="grid grid-cols-2 gap-4 mb-8 sm:grid-cols-4">
        <KPICard icon={Users}         title="Clientes Activos"    rawValue={wonClients.length}      value={wonClients.length}      subtitle="Deals cerrados (Won)" />
        <KPICard icon={AlertTriangle} title="Riesgo Crítico"      rawValue={criticalClients.length} value={criticalClients.length} subtitle="Múltiples tipos de flag" />
        <KPICard icon={DollarSign}    title="MRR Expuesto"        rawValue={mrrExposed}             value={fmt(mrrExposed)}        subtitle="Revenue en riesgo crítico" />
        <KPICard icon={Flame}         title="Motivación Reactiva" rawValue={reactiveCount}          value={reactiveCount}          subtitle="Compraron por urgencia" />
      </div>

      <SectionHeader title="Detalle por Cliente" subtitle="Ordenados por nivel de riesgo" />
      <div className="bg-surface border border-border rounded-xl shadow-sm mb-8 overflow-hidden">
        <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-bg shadow-sm">
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">Nombre</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">Plan</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-text-secondary uppercase">MRR</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-text-secondary uppercase">Nivel</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">Flags activos</th>
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
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <SectionHeader title="Estado de la cartera" subtitle="Distribución de salud financiera" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <ChartCard
          title="Portfolio Health"
          subtitle="Proporción de clientes y MRR por nivel de riesgo"
          accentColor="#16A34A"
          insight={insightHealthBar(healthBar)}
          methodology="Clasificación basada en la concurrencia de flags de riesgo."
        >
          <div className="space-y-6 py-1">
            {[
              {
                label: 'Clientes', total: healthBar.total.count,
                segs: [
                  { label: 'Safe',      pct: healthBar.safe.cPct,     v: healthBar.safe.count,     color: C.safe    },
                  { label: 'En Riesgo', pct: healthBar.warning.cPct,  v: healthBar.warning.count,  color: C.warning },
                  { label: 'Crítico',   pct: healthBar.critical.cPct, v: healthBar.critical.count, color: C.danger  },
                ],
              },
              {
                label: 'MRR', total: fmt(healthBar.total.mrr),
                segs: [
                  { label: 'Safe',      pct: healthBar.safe.mPct,     v: fmt(healthBar.safe.mrr),     color: C.safe    },
                  { label: 'En Riesgo', pct: healthBar.warning.mPct,  v: fmt(healthBar.warning.mrr),  color: C.warning },
                  { label: 'Crítico',   pct: healthBar.critical.mPct, v: fmt(healthBar.critical.mrr), color: C.danger  },
                ],
              },
            ].map(row => (
              <div key={row.label}>
                {/* Label + total */}
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-semibold text-text-secondary uppercase tracking-wide">{row.label}</span>
                  <span className="text-xs font-bold text-text tabular-nums">{row.total}</span>
                </div>

                {/* Barra limpia — solo % dentro */}
                <div className="flex gap-0.5 h-7 rounded-md overflow-hidden bg-slate-100">
                  {row.segs.map((s, i) => s.pct > 0 && (
                    <div
                      key={i}
                      className="flex items-center justify-center transition-all duration-700"
                      style={{ width: `${s.pct}%`, backgroundColor: s.color }}
                    >
                      {s.pct > 11 && (
                        <span className="text-white text-[10px] font-bold">{s.pct}%</span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Stats por segmento debajo */}
                <div className="flex gap-4 mt-2">
                  {row.segs.map((s, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                      <span className="text-[11px] text-text-secondary">{s.label}</span>
                      <span className="text-[11px] font-bold text-text tabular-nums">{s.v}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard
          title="Frecuencia de Flags"
          subtitle="Tipos de fricción más comunes en el onboarding"
          accentColor="#DC2626"
          isAI
          insight="Los flags de activación técnica dominan el volumen, mientras que los relacionales amenazan la permanencia."
          methodology="Frecuencia absoluta de flags en la cartera Won."
        >
          <div className="h-[210px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={flagsFreq} layout="vertical" margin={{ right: 40 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="flag" tick={{ fontSize: 11 }} width={110} />
                <Tooltip />
                <Bar dataKey="pct" radius={[0, 4, 4, 0]}>
                  {flagsFreq.map((d, i) => <Cell key={i} fill={d.type === 'activacion' ? C.warning : C.danger} />)}
                  <LabelList dataKey="pct" position="right" formatter={v => `${v}%`} style={{ fontSize: 11 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      <SectionHeader title="Análisis Profundo" subtitle="Origen y patrones de riesgo" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <ChartCard
          title="Canal → Risk Score"
          subtitle="Promedio de riesgo por fuente de adquisición"
          accentColor="#F59E0B"
          insight="Ciertos canales atraen leads con mayor complejidad de implementación."
          methodology="Promedio de retention_risk_score por canal."
        >
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={canalRisk} layout="vertical" margin={{ right: 40 }}>
                <XAxis type="number" domain={[0, 4]} hide />
                <YAxis type="category" dataKey="canal" tick={{ fontSize: 11 }} width={100} />
                <Bar dataKey="avgRisk" radius={[0, 4, 4, 0]}>
                  {canalRisk.map((d, i) => <Cell key={i} fill={riskColorByValue(d.avgRisk)} />)}
                  <LabelList dataKey="avgRisk" position="right" style={{ fontSize: 11 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard
          title="Vendedor → Perfil de Riesgo"
          subtitle="Riesgo promedio de los cierres por ejecutivo"
          accentColor="#64748B"
          methodology="Señal de alineación entre ventas y CS."
        >
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={vendorRisk} layout="vertical" margin={{ right: 40 }}>
                <XAxis type="number" domain={[0, 4]} hide />
                <YAxis type="category" dataKey="vendedor" tick={{ fontSize: 12 }} width={80} />
                <Bar dataKey="avgRisk" shape={<LollipopBar />}>
                  {vendorRisk.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      <SectionHeader title="Playbook de Acción" subtitle="Asignación de recursos por tipo de riesgo" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { key: 'both', icon: '🚨', title: 'Crisis / VIP', c: '#DC2626', bg: 'bg-red-50' },
          { key: 'techOnly', icon: '🔧', title: 'Tech Support', c: '#F59E0B', bg: 'bg-amber-50' },
          { key: 'csOnly', icon: '🤝', title: 'CS High Touch', c: '#2563EB', bg: 'bg-blue-50' },
          { key: 'safe', icon: '✅', title: 'Standard', c: '#16A34A', bg: 'bg-green-50' }
        ].map(q => (
          <div key={q.key} className="rounded-xl p-5 border border-border bg-surface shadow-sm transition-all hover:shadow-md">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: q.c }} />
                <h3 className="font-bold text-sm text-text">{q.title}</h3>
              </div>
              <span className="text-xl font-bold tabular-nums" style={{ color: q.c }}>{playbookQuads[q.key].length}</span>
            </div>
            <div className="text-lg mb-3">{q.icon}</div>
            <div className="flex flex-wrap gap-1.5">
              {playbookQuads[q.key].slice(0, 5).map((d, i) => (
                <button key={i} onClick={() => setSelectedClient(d._raw)} className="text-[10px] px-2 py-0.5 rounded-full border border-border hover:bg-bg transition-colors">
                  {d.nombre.split(' ')[0]}
                </button>
              ))}
              {playbookQuads[q.key].length > 5 && <span className="text-[10px] text-text-muted">+{playbookQuads[q.key].length - 5} más</span>}
            </div>
          </div>
        ))}
      </div>

      {selectedClient && <ClientDetail client={selectedClient} onClose={() => setSelectedClient(null)} />}

      <AccionesRecomendadas acciones={[
        {
          prioridad: 'ALTA', tema: 'Riesgo crítico', icon: '🚨', titulo: `Activar protocolo de retención — ${playbookQuads.both.length} clientes en crisis`,
          texto: playbookQuads.both.length > 0
            ? `${playbookQuads.both.map(d => d.nombre.split(' ')[0]).slice(0,3).join(', ')}${playbookQuads.both.length > 3 ? ` y ${playbookQuads.both.length - 3} más` : ''} tienen riesgo de churn alto. Asignar CS dedicado esta semana.`
            : 'Sin clientes en estado crítico. Mantener monitoreo semanal para detectar señales tempranas.',
        },
        {
          prioridad: 'ALTA', tema: 'Onboarding', icon: '⚡', titulo: 'Acelerar activación en los primeros 30 días',
          texto: `${playbookQuads.techOnly.length} clientes necesitan soporte técnico de onboarding. El tiempo de activación es el predictor #1 de retención a 6 meses.`,
        },
        {
          prioridad: 'MEDIA', tema: 'CS', icon: '🤝', titulo: `${playbookQuads.csOnly.length} clientes requieren alto contacto de CS`,
          texto: playbookQuads.csOnly.length > 0
            ? `Estos clientes tienen señales de necesidad de acompañamiento pero bajo riesgo técnico. Programar check-ins quincenales para detectar fricción temprana.`
            : 'Base de clientes sana en el frente de CS. Aprovechar para solicitar casos de éxito y testimonios.',
        },
        {
          prioridad: 'MEDIA', tema: 'Expansión', icon: '📈', titulo: `${playbookQuads.safe.length} clientes en estado safe — oportunidad de upsell`,
          texto: `Los clientes con riesgo bajo son el mejor momento para introducir expansión de plan. Definir un trigger de upsell a los 60 días post-activación.`,
        },
        {
          prioridad: 'BAJA', tema: 'Proceso', icon: '📋', titulo: 'Documentar los flags de riesgo más frecuentes',
          texto: `Identificar los patrones de riesgo que se repiten e incorporarlos al proceso de calificación pre-venta para evitar onboardings complicados desde el inicio.`,
        },
        {
          prioridad: 'BAJA', tema: 'Data', icon: '📊', titulo: 'Cerrar brechas de información en el onboarding',
          texto: `Algunos clientes no tienen datos completos de activación. Agregar campos de seguimiento en el CRM para mejorar la precisión del scoring de riesgo.`,
        },
      ]} />
    </div>
  )
}
