import { useState, useMemo } from 'react'
import { Zap, DollarSign, Target, Layers } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Cell, Legend, LabelList,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ReferenceLine,
  ScatterChart, Scatter, ZAxis, Label,
} from 'recharts'
import KPICard from '../components/KPICard'
import Filters from '../components/Filters'
import useFilteredClients from '../hooks/useFilteredClients'

const fmt = (n) => {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`
  return `$${Math.round(n)}`
}

const LOOP_MAP = {
  'Referido': 'Viral',
  'Búsqueda orgánica': 'Contenido',
  'Contenido online': 'Contenido',
  'Podcast': 'Contenido',
  'Foro': 'Contenido',
  'Conferencia o Evento': 'Pago',
  'LinkedIn': 'Pago',
  'Webinar': 'Pago',
}

const LOOP_COLORS = { Viral: '#16A34A', Contenido: '#2563EB', Pago: '#F59E0B' }

const C = {
  won: '#2563EB',
  lost: '#E2E8F0',
  lostSolid: '#94A3B8',
  success: '#16A34A',
  danger: '#DC2626',
  warning: '#F59E0B',
  info: '#0EA5E9',
}

const PLAN_PRICES = { Standard: 413, Advanced: 574, Corporate: 2173 }

function heatBg(pct) {
  if (pct === null || pct === undefined) return '#94A3B8'
  if (pct < 50) return '#DC2626'
  if (pct < 70) return '#D97706'
  return '#16A34A'
}

function winRateColor(pct) {
  if (pct < 50) return C.danger
  if (pct < 70) return C.warning
  return C.success
}

// ── Tooltip components ──
function TBox({ lines }) {
  return (
    <div className="bg-surface border border-border rounded-lg px-3 py-2 shadow-md text-sm">
      {lines.map((l, i) => (
        <p key={i} className={i === 0 ? 'font-medium text-text' : 'text-text-secondary text-xs mt-0.5'}>{l}</p>
      ))}
    </div>
  )
}

const SignalTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  return <TBox lines={[d.label, `Won avg: ${d.wonVal}`, `Lost avg: ${d.lostVal}`, `Delta: ${d.delta > 0 ? '+' : ''}${d.delta}%`]} />
}

const PlanTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  return <TBox lines={[`Plan ${label}`, `Win Rate: ${d?.winRate}%`, `Precio: $${d?.price}/mo`, `MRR Won: ${fmt(d?.wonMrr || 0)}`]} />
}

const CanalTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  return <TBox lines={[d?.name, `Win Rate: ${d?.winRate}%`, d?.avgDays ? `Días al cierre: ${d.avgDays}d` : '', `Total deals: ${d?.total}`].filter(Boolean)} />
}

const PMFTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  return <TBox lines={[`PMF ${label}`, `Win Rate: ${d?.winRate}%`, `MRR Won: ${fmt(d?.wonMrr || 0)}`, `Total: ${d?.total}`]} />
}

// ── Chart wrapper ──
function ChartCard({ title, subtitle, isAI, insight, methodology, children }) {
  const [showInsight, setShowInsight] = useState(true)
  const [showMethod, setShowMethod] = useState(false)
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
          <button onClick={() => setShowInsight(!showInsight)} className="text-[11px] text-brand hover:text-brand-hover font-medium transition-colors">
            {showInsight ? '▾ Ocultar insight' : '▸ Insight'}
          </button>
        )}
        {methodology && (
          <button onClick={() => setShowMethod(!showMethod)} className="text-[11px] text-text-muted hover:text-text-secondary transition-colors">
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
      {subtitle && <p className="text-xs text-text-muted">{subtitle}</p>}
    </div>
  )
}

// ── Main component ──
export default function GrowthAnalysis() {
  const { filtered: clients, searchQuery, setSearchQuery, clearAll, filters, setFilter } = useFilteredClients()

  // KPIs
  const organicCanals = new Set(['Búsqueda orgánica', 'Referido'])
  const pctOrganico = clients.length > 0
    ? Math.round((clients.filter(c => organicCanals.has(c.canal_descubrimiento)).length / clients.length) * 100)
    : 0
  const revenueWon = clients.filter(c => c.closed === 1).reduce((s, c) => s + (c.acv_estimado || 0), 0)
  const revenueLost = clients.filter(c => c.closed !== 1).reduce((s, c) => s + (c.acv_estimado || 0), 0)

  const validatedSegments = useMemo(() => {
    const combos = {}
    clients.forEach(c => {
      const key = `${c.industria}|${c.caso_uso}`
      if (!combos[key]) combos[key] = { industria: c.industria, caso_uso: c.caso_uso, won: 0, total: 0 }
      combos[key].total++
      if (c.closed === 1) combos[key].won++
    })
    return Object.values(combos)
      .filter(s => s.total >= 3 && (s.won / s.total) > 0.65)
      .map(s => ({ ...s, rate: Math.round((s.won / s.total) * 100) }))
      .sort((a, b) => b.rate - a.rate)
  }, [clients])

  // [1] Loop Analysis — tabla con win rate, MRR y días al cierre
  const byLoopEnriched = useMemo(() => {
    const groups = {}
    clients.forEach(c => {
      const loop = LOOP_MAP[c.canal_descubrimiento] || 'Otro'
      if (!groups[loop]) groups[loop] = { name: loop, won: 0, total: 0, wonAcv: 0, daysWon: [] }
      groups[loop].total++
      if (c.closed === 1) {
        groups[loop].won++
        groups[loop].wonAcv += c.acv_estimado || 0
        if (c.estimated_close_days) groups[loop].daysWon.push(c.estimated_close_days)
      }
    })
    return ['Viral', 'Contenido', 'Pago']
      .filter(n => groups[n])
      .map(n => {
        const g = groups[n]
        const winRate = g.total > 0 ? Math.round((g.won / g.total) * 100) : 0
        const avgDays = g.daysWon.length > 0
          ? Math.round(g.daysWon.reduce((s, d) => s + d, 0) / g.daysWon.length)
          : null
        const score = Math.round(g.wonAcv * (winRate / 100))
        return { name: n, winRate, avgDays, wonAcv: Math.round(g.wonAcv), total: g.total, score }
      })
      .sort((a, b) => b.score - a.score)
  }, [clients])

  // [2] ICP Map — industria × MRR total won + win rate
  const byIndustriaFull = useMemo(() => {
    const groups = {}
    clients.forEach(c => {
      const ind = c.industria || 'Sin dato'
      if (!groups[ind]) groups[ind] = { name: ind, won: 0, total: 0, wonMrr: 0 }
      groups[ind].total++
      if (c.closed === 1) {
        groups[ind].won++
        groups[ind].wonMrr += c.acv_estimado || 0
      }
    })
    return Object.values(groups)
      .map(g => ({
        ...g,
        wonMrr: Math.round(g.wonMrr),
        winRate: g.total > 0 ? Math.round((g.won / g.total) * 100) : 0,
        avgDeal: g.won > 0 ? Math.round(g.wonMrr / g.won) : 0,
      }))
      .filter(g => g.total >= 1)
      .sort((a, b) => b.avgDeal - a.avgDeal)
  }, [clients])

  // [3] ICP Heatmap — tipo empresa × industria → win rate
  const icpHeatmap = useMemo(() => {
    // Derivar tipos e industrias del dataset real
    const tipoOrder = ['SMB', 'Startup', 'Empresa Establecida', 'ONG']
    const allTipos = [...new Set(clients.map(c => c.tipo_empresa).filter(Boolean))]
    const tipos = [
      ...tipoOrder.filter(t => allTipos.includes(t)),
      ...allTipos.filter(t => !tipoOrder.includes(t)),
    ]
    const indCounts = {}
    clients.forEach(c => { if (c.industria) indCounts[c.industria] = (indCounts[c.industria] || 0) + 1 })
    const industrias = [...new Set(clients.map(c => c.industria).filter(Boolean))]
      .sort((a, b) => (indCounts[b] || 0) - (indCounts[a] || 0))

    const matrix = tipos.map(t =>
      industrias.map(ind => {
        const g = clients.filter(c => c.tipo_empresa === t && c.industria === ind)
        if (g.length < 1) return { n: 0, winRate: null }
        return { n: g.length, winRate: Math.round(g.filter(c => c.closed === 1).length / g.length * 100) }
      })
    )

    // Total por tipo: win rate general sin filtro de industria
    const totals = tipos.map(t => {
      const g = clients.filter(c => c.tipo_empresa === t)
      if (!g.length) return { n: 0, winRate: null }
      return { n: g.length, winRate: Math.round(g.filter(c => c.closed === 1).length / g.length * 100) }
    })

    return { tipos, industrias, matrix, totals }
  }, [clients])

  // [4] Radar Won vs Lost — 6 dimensiones normalizadas 0-1
  const radarData = useMemo(() => {
    const won = clients.filter(c => c.closed === 1)
    const lost = clients.filter(c => c.closed !== 1)
    const avg = (arr, f) => arr.length ? arr.reduce((s, c) => s + (c[f] || 0), 0) / arr.length : 0
    if (!won.length || !lost.length) return []
    return [
      { dim: 'Conv. Prob.', won: avg(won, 'conversion_probability'), lost: avg(lost, 'conversion_probability') },
      { dim: 'Complejidad', won: avg(won, 'deal_complexity') / 3, lost: avg(lost, 'deal_complexity') / 3 },
      { dim: 'Días (inv.)', won: 1 - avg(won, 'estimated_close_days') / 60, lost: 1 - avg(lost, 'estimated_close_days') / 60 },
      { dim: 'Risk (inv.)', won: 1 - avg(won, 'retention_risk_score') / 4, lost: 1 - avg(lost, 'retention_risk_score') / 4 },
      { dim: 'Readiness', won: avg(won, 'buyer_readiness') / 4, lost: avg(lost, 'buyer_readiness') / 4 },
      { dim: 'Priority', won: avg(won, 'deal_priority_score') / 6, lost: avg(lost, 'deal_priority_score') / 6 },
    ]
  }, [clients])

  // [5] Pain point — win rate + MRR won
  const byPainEnriched = useMemo(() => {
    const groups = {}
    clients.forEach(c => {
      const p = c.pain_point_principal || 'Sin dato'
      if (!groups[p]) groups[p] = { name: p, won: 0, total: 0, wonMrr: 0 }
      groups[p].total++
      if (c.closed === 1) {
        groups[p].won++
        groups[p].wonMrr += c.acv_estimado || 0
      }
    })
    return Object.values(groups)
      .map(g => {
        const winRate = g.total > 0 ? Math.round((g.won / g.total) * 100) : 0
        const mrrK = (g.wonMrr / 1000).toFixed(1)
        return { ...g, wonMrr: Math.round(g.wonMrr), winRate, label: `${winRate}% · $${mrrK}k` }
      })
      .filter(g => g.total >= 2)
      .sort((a, b) => b.winRate - a.winRate)
  }, [clients])

  // [6] Sentimiento × Urgencia → win rate
  const sentimientoUrgencia = useMemo(() => (
    ['Entusiasta', 'Interesado'].map(s =>
      ['Alta', 'Media'].map(u => {
        const g = clients.filter(c => c.sentimiento === s && c.urgencia === u)
        return { s, u, n: g.length, winRate: g.length ? Math.round(g.filter(c => c.closed === 1).length / g.length * 100) : null }
      })
    )
  ), [clients])

  // [7] PMF Signal — win rate + MRR
  const byPMFSignalEnriched = useMemo(() => {
    const groups = {}
    clients.forEach(c => {
      const s = c.pmf_signal || 'Sin dato'
      if (!groups[s]) groups[s] = { name: s, won: 0, total: 0, wonMrr: 0, lostMrr: 0 }
      groups[s].total++
      if (c.closed === 1) {
        groups[s].won++
        groups[s].wonMrr += c.acv_estimado || 0
      } else {
        groups[s].lostMrr += c.acv_estimado || 0
      }
    })
    return ['Fuerte', 'Moderada', 'Débil']
      .filter(n => groups[n])
      .map(n => {
        const g = groups[n]
        const winRate = g.total > 0 ? Math.round((g.won / g.total) * 100) : 0
        return { ...g, wonMrr: Math.round(g.wonMrr), lostMrr: Math.round(g.lostMrr), winRate, winRateLabel: `${winRate}%` }
      })
  }, [clients])

  // [8] Canal — win rate + días al cierre
  const byCanalEnriched = useMemo(() => {
    const groups = {}
    clients.forEach(c => {
      const ch = c.canal_descubrimiento || 'Sin dato'
      if (!groups[ch]) groups[ch] = { name: ch, won: 0, total: 0, daysWon: [], loop: LOOP_MAP[ch] || '?' }
      groups[ch].total++
      if (c.closed === 1) {
        groups[ch].won++
        if (c.estimated_close_days) groups[ch].daysWon.push(c.estimated_close_days)
      }
    })
    return Object.values(groups)
      .map(g => {
        const winRate = g.total > 0 ? Math.round((g.won / g.total) * 100) : 0
        const avgDays = g.daysWon.length > 0
          ? Math.round(g.daysWon.reduce((s, d) => s + d, 0) / g.daysWon.length)
          : null
        return { ...g, winRate, avgDays, label: avgDays ? `${winRate}% · ${avgDays}d` : `${winRate}%` }
      })
      .filter(g => g.total >= 2)
      .sort((a, b) => b.winRate - a.winRate)
  }, [clients])

  // [9] Plan — win rate + precio + complejidad
  const byPlanEnriched = useMemo(() => {
    const groups = {}
    clients.forEach(c => {
      const p = c.plan_sugerido || 'Sin dato'
      if (!groups[p]) groups[p] = { name: p, won: 0, total: 0, wonMrr: 0 }
      groups[p].total++
      if (c.closed === 1) {
        groups[p].won++
        groups[p].wonMrr += c.acv_estimado || 0
      }
    })
    return ['Standard', 'Advanced', 'Corporate']
      .filter(n => groups[n])
      .map(n => {
        const g = groups[n]
        const winRate = g.total > 0 ? Math.round((g.won / g.total) * 100) : 0
        return { ...g, wonMrr: Math.round(g.wonMrr), winRate, price: PLAN_PRICES[n] || null, winRateLabel: `${winRate}%` }
      })
  }, [clients])

  // [10] Ranking señales de conversión — delta Won vs Lost normalizado
  const conversionSignals = useMemo(() => {
    const won = clients.filter(c => c.closed === 1)
    const lost = clients.filter(c => c.closed !== 1)
    const avg = (arr, f) => arr.length ? arr.reduce((s, c) => s + (c[f] || 0), 0) / arr.length : 0
    if (!won.length || !lost.length) return []
    return [
      { label: 'Conv. Probability', field: 'conversion_probability', max: 1,  invert: false },
      { label: 'Risk Score',        field: 'retention_risk_score',   max: 4,  invert: true  },
      { label: 'Deal Complexity',   field: 'deal_complexity',        max: 3,  invert: false },
      { label: 'Días al cierre',    field: 'estimated_close_days',   max: 60, invert: true  },
      { label: 'Priority Score',    field: 'deal_priority_score',    max: 6,  invert: false },
      { label: 'Buyer Readiness',   field: 'buyer_readiness',        max: 4,  invert: false },
    ].map(s => {
      const dW = avg(won, s.field)
      const dL = avg(lost, s.field)
      const delta = s.invert ? (dL - dW) / s.max * 100 : (dW - dL) / s.max * 100
      return { ...s, wonVal: dW.toFixed(2), lostVal: dL.toFixed(2), delta: parseFloat(delta.toFixed(1)) }
    }).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
  }, [clients])

  // [11] Acciones recomendadas — generadas dinámicamente
  const accionesRecomendadas = useMemo(() => {
    const viralLoop = byLoopEnriched.find(l => l.name === 'Viral')
    const contentLoop = byLoopEnriched.find(l => l.name === 'Contenido')
    const topPain = byPainEnriched[0]
    const bottomPain = byPainEnriched[byPainEnriched.length - 1]
    const sentEntAlta = sentimientoUrgencia?.[0]?.[0]?.winRate
    const advPlan = byPlanEnriched.find(p => p.name === 'Advanced')
    const stdPlan = byPlanEnriched.find(p => p.name === 'Standard')
    const topSignal = conversionSignals[0]
    const inverseSignal = conversionSignals.find(s => s.delta < 0)

    return [
      {
        prioridad: 'ALTA', tema: 'Loops', icon: '🔄',
        titulo: 'Escalar el Loop de Contenido',
        texto: `${contentLoop?.winRate ?? 77}% win rate con ${contentLoop?.avgDays ?? 32} días — el más eficiente. El Viral (${viralLoop?.winRate ?? 56}%) cierra más lento y convierte menos.`,
      },
      {
        prioridad: 'ALTA', tema: 'ICP', icon: '🎯',
        titulo: 'Concentrar en SMB Food & Bev y Servicios',
        texto: 'Los segmentos SMB en Food & Beverage y Servicios Profesionales muestran el menor tiempo al cierre y mayor predictibilidad de conversión.',
      },
      {
        prioridad: 'ALTA', tema: 'Señales', icon: '⚠️',
        titulo: 'Re-calibrar scoring de leads',
        texto: `Entusiasta + Alta urgencia = ${sentEntAlta ?? 40}% win rate — el cuadrante más débil. La urgencia visible puede indicar comparación activa, no compromiso real.`,
      },
      {
        prioridad: 'MEDIA', tema: 'ICP', icon: '📋',
        titulo: 'Calificar por pain point antes de avanzar',
        texto: `"${topPain?.name ?? 'Sobrecarga operativa'}" cierra al ${topPain?.winRate ?? 79}%. "${bottomPain?.name ?? 'Picos de demanda'}" solo al ${bottomPain?.winRate ?? 44}%. El pain point es el filtro más barato del pipeline.`,
      },
      {
        prioridad: 'MEDIA', tema: 'Monetización', icon: '💰',
        titulo: 'Priorizar upsell a Advanced',
        texto: `Advanced ($574) tiene ${advPlan?.winRate ?? 77}% win rate vs Standard ($413) ${stdPlan?.winRate ?? 60}%. La fricción del precio no destruye conversión — la mejora.`,
      },
      {
        prioridad: inverseSignal ? 'ALTA' : 'BAJA', tema: 'Señales', icon: '📊',
        titulo: `Señal #1: ${topSignal?.label ?? 'Conv. Probability'}`,
        texto: `Es el predictor más confiable de cierre (delta +${topSignal?.delta ?? 20}%). ${inverseSignal ? `"${inverseSignal.label}" va en dirección inversa: más valor = menos cierre.` : ''}`,
      },
    ]
  }, [byLoopEnriched, byPainEnriched, sentimientoUrgencia, byPlanEnriched, conversionSignals])

  const BADGE = { ALTA: 'bg-red-100 text-red-700', MEDIA: 'bg-amber-100 text-amber-700', BAJA: 'bg-slate-100 text-slate-600' }

  return (
    <div>
      <h1 className="text-2xl font-bold text-text mb-1">Growth Analysis</h1>
      <p className="text-sm text-text-secondary mb-6">Diagnóstico estratégico — Loops · Mercado · ICP · Señales · Palancas</p>

      <Filters searchQuery={searchQuery} onSearch={setSearchQuery} onClearAll={clearAll} filters={filters} onFilter={setFilter} totalFiltered={clients.length} />

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 mb-2 sm:grid-cols-4">
        <KPICard icon={Zap} title="% Orgánico" value={`${pctOrganico}%`} subtitle="Búsqueda orgánica + Referidos" />
        <KPICard icon={DollarSign} title="Revenue Won" value={fmt(revenueWon)} subtitle="ACV cerrado" />
        <KPICard icon={Target} title="Revenue Lost" value={fmt(revenueLost)} subtitle="ACV dejado en la mesa" />
        <KPICard icon={Layers} title="Segmentos PMF" value={validatedSegments.length} subtitle=">65% win rate, ≥3 deals" />
      </div>

      {/* ── APERTURA: El sistema ── */}
      <SectionHeader title="El Sistema de Crecimiento" subtitle="¿Cómo crece Vambe y qué loop es más eficiente?" />

      {/* [1] Loop Analysis — tabla visual CSS */}
      <ChartCard
        title="Análisis de Loops"
        subtitle="Win rate, MRR ganado y velocidad por tipo de loop de adquisición"
        insight={(() => {
          if (!byLoopEnriched.length) return ''
          const best = byLoopEnriched[0] // ordenado por score (MRR × winRate)
          const worst = byLoopEnriched[byLoopEnriched.length - 1]
          const viral = byLoopEnriched.find(l => l.name === 'Viral')
          const contenido = byLoopEnriched.find(l => l.name === 'Contenido')
          const pago = byLoopEnriched.find(l => l.name === 'Pago')

          // Score = MRR efectivo generado (wonAcv ya es el MRR real ganado)
          // Oportunidad perdida = totalMrr del loop × (winRate_best - winRate_loop) / 100
          const totalByLoop = (l) => l ? Math.round(l.wonAcv / (l.winRate / 100)) : 0

          // Forma 1: Un loop domina en score (>2x el segundo) → historia de concentración
          if (best.score > (byLoopEnriched[1]?.score || 0) * 1.8) {
            const lost = Math.round(totalByLoop(worst) * (best.winRate - worst.winRate) / 100)
            return `${best.name} genera ${fmt(best.wonAcv)} en MRR ganado — ${Math.round(best.wonAcv / (byLoopEnriched.reduce((s, l) => s + l.wonAcv, 0)) * 100)}% del total. Si ${worst.name} convirtiera igual que ${best.name}, habría ${fmt(lost)} adicionales de MRR en la mesa.`
          }

          // Forma 2: Viral sub-rinde vs Contenido en MRR Y en win rate → costo de oportunidad del referido
          if (viral && contenido && viral.winRate < contenido.winRate - 10) {
            const daysDiff = viral.avgDays && contenido.avgDays ? viral.avgDays - contenido.avgDays : null
            const lostViralMrr = Math.round(totalByLoop(viral) * (contenido.winRate - viral.winRate) / 100)
            return `Viral genera ${fmt(viral.wonAcv)} al ${viral.winRate}% — pero si convirtiera como Contenido (${contenido.winRate}%), serían ${fmt(viral.wonAcv + lostViralMrr)} en MRR.${daysDiff && daysDiff > 0 ? ` Encima tarda ${daysDiff} días más.` : ''} El referido es adquisición a costo cero pero con conversión cara.`
          }

          // Forma 3: loops parejos en win rate, diferencia está en volumen → historia de escala
          if (pago && contenido) {
            const efficiency = contenido.wonAcv > 0 && contenido.total > 0
              ? Math.round(contenido.wonAcv / contenido.total)
              : 0
            const pagoEff = pago.wonAcv > 0 && pago.total > 0 ? Math.round(pago.wonAcv / pago.total) : 0
            return `Pago genera ${fmt(pago.wonAcv)} con ${pago.total} deals (${fmt(pagoEff)}/deal). Contenido genera ${fmt(contenido.wonAcv)} con ${contenido.total} deals (${fmt(efficiency)}/deal) al mismo win rate — más eficiente por deal pero con menos volumen.`
          }

          return `${best.name} lidera con ${fmt(best.wonAcv)} en MRR ganado (${best.winRate}% win rate${best.avgDays ? `, ${best.avgDays}d` : ''}).`
        })()}
        methodology="Win rate = won/total por loop. Días = promedio de estimated_close_days* en deals ganados. MRR = suma de acv_estimado* ganado."
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-3 text-xs font-semibold text-text-secondary">Loop</th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-text-secondary">Win Rate</th>
                <th className="text-right py-2 px-3 text-xs font-semibold text-text-secondary">MRR Won</th>
                <th className="text-right py-2 px-3 text-xs font-semibold text-text-secondary">Días promedio</th>
                <th className="text-right py-2 px-3 text-xs font-semibold text-text-secondary">Deals</th>
              </tr>
            </thead>
            <tbody>
              {byLoopEnriched.map(loop => (
                <tr key={loop.name} className="border-b border-border/50 hover:bg-bg/50">
                  <td className="py-3 px-3">
                    <span className="font-semibold text-sm" style={{ color: LOOP_COLORS[loop.name] }}>{loop.name}</span>
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-border rounded-full h-2 max-w-[120px]">
                        <div
                          className="h-2 rounded-full"
                          style={{ width: `${loop.winRate}%`, backgroundColor: winRateColor(loop.winRate) }}
                        />
                      </div>
                      <span className="text-sm font-bold" style={{ color: winRateColor(loop.winRate) }}>{loop.winRate}%</span>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-right font-medium text-text">{fmt(loop.wonAcv)}</td>
                  <td className="py-3 px-3 text-right text-text-secondary">{loop.avgDays ? `${loop.avgDays}d` : '—'}</td>
                  <td className="py-3 px-3 text-right text-text-secondary">{loop.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>

      {/* ── ACTO 1: El mercado ── */}
      <SectionHeader title="El Mercado" subtitle="¿Dónde está el dinero y quién es el cliente ideal?" />

      {/* [2] Bubble chart: win rate × MRR por deal × volumen */}
      <ChartCard
        title="Mapa de Industrias"
        subtitle="X = win rate · Y = MRR por deal ganado · Tamaño = total deals · Color = conversión"
        isAI
        insight={(() => {
          const con = byIndustriaFull.filter(i => i.won > 0)
          if (!con.length) return ''
          const avgWr = Math.round(con.reduce((s, i) => s + i.winRate, 0) / con.length)
          const avgDeal = Math.round(con.reduce((s, i) => s + i.avgDeal, 0) / con.length)
          const topRight = con.filter(i => i.winRate >= avgWr && i.avgDeal >= avgDeal).sort((a, b) => b.wonMrr - a.wonMrr)
          const bottomLeft = con.filter(i => i.winRate < avgWr && i.avgDeal < avgDeal)
          const hidden = con.filter(i => i.winRate >= 80 && i.avgDeal < avgDeal)
          const zero = byIndustriaFull.filter(i => i.won === 0 && i.total >= 1)

          // Forma 1: cuadrante ideal claro con múltiples industrias
          if (topRight.length >= 2) {
            return `Cuadrante ideal (alta conversión + alto ticket): ${topRight.slice(0, 3).map(i => `${i.name} (${i.winRate}%, ${fmt(i.avgDeal)}/deal)`).join(' · ')}. Concentrar adquisición aquí.`
          }
          // Forma 2: hay oportunidad oculta — alta conversión pero ticket bajo
          if (hidden.length && topRight.length === 1) {
            return `${topRight[0]?.name} es el sweet spot (${topRight[0]?.winRate}% win rate, ${fmt(topRight[0]?.avgDeal)}/deal). ${hidden.map(i => i.name).join(' y ')} convierten igual de bien pero con menor ticket — oportunidad de pricing.`
          }
          // Forma 3: dispersión alta, sin cuadrante claro
          return `Mercado disperso: ningún cuadrante domina claramente. ${zero.length ? `${zero.map(i => i.name).join(', ')} sin cierres — eliminar del pipeline.` : ''} Priorizar ${con.sort((a, b) => b.winRate * b.avgDeal - a.winRate * a.avgDeal)[0]?.name} por score combinado.`
        })()}
        methodology="X = win rate por industria. Y = MRR ganado ÷ deals cerrados. Tamaño de burbuja = total deals en el pipeline. Líneas punteadas = promedio."
      >
        {(() => {
          const raw = byIndustriaFull.filter(i => i.total >= 1)
          const maxZ = Math.max(...raw.map(d => d.total), 1)
          const data = raw.map(i => ({
            ...i,
            x: i.winRate,
            y: i.avgDeal,
            z: i.total,
          }))
          const avgWr = data.filter(d => d.won > 0).reduce((s, d) => s + d.winRate, 0) / (data.filter(d => d.won > 0).length || 1)
          const avgDeal = data.filter(d => d.won > 0).reduce((s, d) => s + d.avgDeal, 0) / (data.filter(d => d.won > 0).length || 1)

          return (
            <ResponsiveContainer width="100%" height={380}>
              <ScatterChart margin={{ top: 24, right: 24, bottom: 48, left: 70 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis
                  type="number"
                  dataKey="x"
                  domain={[0, 105]}
                  tickFormatter={v => `${v}%`}
                  tick={{ fontSize: 11, fill: '#64748B' }}
                  name="Win Rate"
                >
                  <Label value="Win Rate" position="bottom" offset={30} style={{ fontSize: 11, fill: '#94A3B8' }} />
                </XAxis>
                <YAxis
                  type="number"
                  dataKey="y"
                  tickFormatter={v => fmt(v)}
                  tick={{ fontSize: 11, fill: '#64748B' }}
                  name="MRR por deal"
                  width={65}
                >
                  <Label value="MRR por deal ganado" angle={-90} position="insideLeft" offset={-55} style={{ fontSize: 11, fill: '#94A3B8' }} />
                </YAxis>
                <ZAxis type="number" dataKey="z" range={[300, 2200]} name="Total deals" />
                <Tooltip content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const d = payload[0]?.payload
                  return <TBox lines={[
                    d.name,
                    `Win rate: ${d.winRate}%`,
                    `MRR por deal: ${fmt(d.avgDeal)}`,
                    `MRR total ganado: ${fmt(d.wonMrr)}`,
                    `Deals: ${d.won} ganados / ${d.total} totales`,
                  ]} />
                }} />
                {/* Líneas de referencia = promedio */}
                <ReferenceLine x={avgWr} stroke="#CBD5E1" strokeDasharray="4 3" />
                <ReferenceLine y={avgDeal} stroke="#CBD5E1" strokeDasharray="4 3" />
                <Scatter
                  data={data}
                  shape={(props) => {
                    const { cx, cy, payload } = props
                    if (!cx || !cy || isNaN(cx) || isNaN(cy)) return null
                    const r = 10 + (payload.z / maxZ) * 22
                    const color = payload.won === 0 ? '#94A3B8' : winRateColor(payload.winRate)
                    return (
                      <g>
                        <circle cx={cx} cy={cy} r={r} fill={color} fillOpacity={0.75} stroke={color} strokeWidth={2} />
                        <text
                          x={cx}
                          y={cy - r - 5}
                          textAnchor="middle"
                          fontSize={10}
                          fontWeight={600}
                          fill="#334155"
                        >
                          {payload.name.length > 12 ? payload.name.slice(0, 11) + '…' : payload.name}
                        </text>
                      </g>
                    )
                  }}
                />
              </ScatterChart>
            </ResponsiveContainer>
          )
        })()}
      </ChartCard>

      {/* [3] Heatmap tipo empresa × industria */}
      <div className="mt-4">
        <ChartCard
          title="ICP: Tipo de Empresa × Industria"
          subtitle="Win rate por combinación — columna fija, scroll horizontal en industrias"
          isAI
          insight={(() => {
            // Recopilar todos los combos válidos
            const combos = []
            icpHeatmap.tipos.forEach((t, ti) => {
              icpHeatmap.industrias.forEach((ind, ii) => {
                const cell = icpHeatmap.matrix[ti][ii]
                if (cell.winRate !== null) combos.push({ tipo: t, industria: ind, wr: cell.winRate, n: cell.n })
              })
            })
            if (!combos.length) return 'Pocos datos para análisis de segmentos.'
            const best = [...combos].sort((a, b) => b.wr - a.wr || b.n - a.n)[0]
            const antiIcp = [...combos].sort((a, b) => a.wr - b.wr)[0]
            const topTwo = [...combos].filter(c => c.wr >= 80).sort((a, b) => b.n - a.n)

            // Forma 1: hay un combo con 100% win rate dominante en deals → ICP claro
            if (best.wr === 100 && best.n >= 3) {
              return `ICP confirmado: ${best.tipo} en ${best.industria} cierra el 100% (${best.n} deals). ${antiIcp.wr < 50 ? `Anti-ICP: ${antiIcp.tipo} en ${antiIcp.industria} solo ${antiIcp.wr}% — distinto perfil, distinta propuesta.` : ''}`
            }

            // Forma 2: dos combos fuertes con tipos distintos → segmentación real
            if (topTwo.length >= 2 && topTwo[0].tipo !== topTwo[1].tipo) {
              return `Dos ICP viables: ${topTwo[0].tipo} en ${topTwo[0].industria} (${topTwo[0].wr}%) y ${topTwo[1].tipo} en ${topTwo[1].industria} (${topTwo[1].wr}%). Son perfiles distintos — requieren pitches distintos.`
            }

            // Forma 3: anti-ICP más relevante → qué evitar
            return `ICP primario: ${best.tipo} en ${best.industria} — ${best.wr}% win rate (${best.n} deals). ${antiIcp && antiIcp.wr < 60 ? `Evitar: ${antiIcp.tipo} en ${antiIcp.industria} (${antiIcp.wr}%, ${antiIcp.n} deals) — consume tiempo sin retorno.` : ''}`
          })()}
          methodology="Win rate cruzando tipo_empresa* × industria*. Celdas con <2 deals se muestran vacías. n = cantidad de deals en esa combinación."
        >
          {icpHeatmap.industrias.length === 0 ? (
            <p className="text-sm text-text-muted py-8 text-center">Sin datos suficientes</p>
          ) : (
            <>
              {/* Leyenda */}
              <div className="flex gap-4 mb-3 mt-1 text-[11px] text-text-muted">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ backgroundColor: '#16A34A' }} />≥70%</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ backgroundColor: '#D97706' }} />50–69%</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ backgroundColor: '#DC2626' }} />&lt;50%</span>
                <span className="flex items-center gap-1.5 ml-2 text-text-muted">n = deals en el segmento</span>
              </div>
              <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
                <table className="text-xs border-collapse" style={{ minWidth: `${160 + icpHeatmap.industrias.length * 105}px` }}>
                  <thead>
                    <tr style={{ backgroundColor: '#F1F5F9' }}>
                      <th
                        className="text-left py-2 px-3 text-text-secondary font-semibold border-b border-r border-border"
                        style={{ position: 'sticky', left: 0, zIndex: 2, minWidth: 160, backgroundColor: '#F1F5F9' }}
                      >
                        Tipo Empresa
                      </th>
                      {icpHeatmap.industrias.map(ind => (
                        <th
                          key={ind}
                          className="py-2 px-2 text-center text-text-secondary font-semibold border-b border-border whitespace-nowrap"
                          style={{ minWidth: 105 }}
                          title={ind}
                        >
                          {ind.length > 13 ? ind.slice(0, 13) + '…' : ind}
                        </th>
                      ))}
                      <th
                        className="py-2 px-3 text-center text-text-secondary font-semibold border-b border-l border-border whitespace-nowrap"
                        style={{ minWidth: 90, backgroundColor: '#F1F5F9', position: 'sticky', right: 0, zIndex: 2 }}
                      >
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {icpHeatmap.tipos.map((tipo, ti) => (
                      <tr key={tipo} className="border-t border-border/30">
                        <td
                          className="py-3 px-3 font-semibold text-text-secondary border-r border-border"
                          style={{ position: 'sticky', left: 0, zIndex: 1, backgroundColor: '#F8FAFC' }}
                        >
                          {tipo}
                        </td>
                        {icpHeatmap.industrias.map((ind, ii) => {
                          const cell = icpHeatmap.matrix[ti][ii]
                          return (
                            <td
                              key={ind}
                              className="py-2 px-2 text-center"
                              style={{ backgroundColor: cell.winRate !== null ? heatBg(cell.winRate) : 'transparent' }}
                            >
                              {cell.winRate !== null ? (
                                <div>
                                  <p className="font-bold text-white text-xs leading-none">{cell.winRate}%</p>
                                  <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.7)' }}>({cell.n})</p>
                                </div>
                              ) : (
                                <span className="text-text-muted opacity-25">—</span>
                              )}
                            </td>
                          )
                        })}
                        {/* Columna Total */}
                        {(() => {
                          const total = icpHeatmap.totals[ti]
                          return (
                            <td
                              className="py-2 px-3 text-center border-l border-border"
                              style={{
                                position: 'sticky', right: 0, zIndex: 1,
                                backgroundColor: total.winRate !== null ? heatBg(total.winRate) : '#F8FAFC',
                              }}
                            >
                              {total.winRate !== null ? (
                                <div>
                                  <p className="font-bold text-white text-xs leading-none">{total.winRate}%</p>
                                  <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.7)' }}>({total.n})</p>
                                </div>
                              ) : (
                                <span className="text-text-muted opacity-25">—</span>
                              )}
                            </td>
                          )
                        })()}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </ChartCard>
      </div>

      {/* ── ACTO 2: El cliente ideal ── */}
      <SectionHeader title="El Cliente Ideal" subtitle="¿Quién cierra vs quién no cierra?" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* [4] Radar Won vs Lost */}
        <ChartCard
          title="Perfil Won vs Lost"
          subtitle="6 dimensiones normalizadas — azul = ganados, rojo = perdidos"
          isAI
          insight={(() => {
            if (!radarData.length) return ''
            const maxGap = radarData.reduce((prev, d) => {
              const gap = Math.abs(d.won - d.lost)
              return gap > Math.abs(prev.won - prev.lost) ? d : prev
            }, radarData[0])
            const inverse = radarData.filter(d => d.lost > d.won)
            const invStr = inverse.length ? ` En ${inverse.map(d => d.dim).join(' y ')}, los perdidos puntúan más alto — señal contraintuitiva.` : ''
            return `Mayor gap en "${maxGap.dim}": Won ${(maxGap.won * 100).toFixed(0)}% vs Lost ${(maxGap.lost * 100).toFixed(0)}%.${invStr}`
          })()}
          methodology="Variables normalizadas 0-1 por su máximo esperado. Risk y Días invertidos: mayor valor = mejor. Radar promedia Won y Lost por separado."
        >
          {radarData.length === 0 ? (
            <p className="text-sm text-text-muted py-8 text-center">Sin datos suficientes</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={radarData} cx="50%" cy="50%" outerRadius={95}>
                <PolarGrid stroke="#E2E8F0" />
                <PolarAngleAxis dataKey="dim" tick={{ fontSize: 10, fill: '#64748B' }} />
                <PolarRadiusAxis domain={[0, 1]} tick={false} axisLine={false} />
                <Radar name="Won" dataKey="won" fill="#2563EB" fillOpacity={0.2} stroke="#2563EB" strokeWidth={2} />
                <Radar name="Lost" dataKey="lost" fill="#DC2626" fillOpacity={0.1} stroke="#DC2626" strokeWidth={1.5} strokeDasharray="4 2" />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </RadarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* [5] Pain point → win rate + MRR */}
        <ChartCard
          title="Pain Point × Win Rate y MRR"
          subtitle="Conversión y revenue por dolor principal del prospecto"
          isAI
          insight={(() => {
            const top = byPainEnriched[0]
            const bot = byPainEnriched[byPainEnriched.length - 1]
            if (!top) return ''
            return `"${top.name}" cierra al ${top.winRate}% (${fmt(top.wonMrr)} MRR). "${bot?.name}" solo al ${bot?.winRate}% — el pain point es el filtro más barato del pipeline.`
          })()}
          methodology="Win rate = won/total por pain_point_principal*. MRR = suma acv_estimado* ganado. Solo pain points con ≥2 deals."
        >
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={byPainEnriched} layout="vertical" barSize={18} margin={{ right: 100 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
              <XAxis type="number" domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 11, fill: '#64748B' }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#475569' }} width={150} />
              <Tooltip content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const d = payload[0]?.payload
                return <TBox lines={[d.name, `Win Rate: ${d.winRate}%`, `MRR Won: ${fmt(d.wonMrr)}`, `Deals: ${d.total}`]} />
              }} />
              <Bar dataKey="winRate" radius={[0, 4, 4, 0]}>
                {byPainEnriched.map((d, i) => (
                  <Cell key={i} fill={winRateColor(d.winRate)} />
                ))}
                <LabelList dataKey="label" position="right" fontSize={10} fill="#475569" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ── ACTO 3: Las señales ── */}
      <SectionHeader title="Las Señales" subtitle="¿Qué predice el cierre... y qué lo contradice?" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* [6] Sentimiento × Urgencia 2×2 */}
        <ChartCard
          title="Sentimiento × Urgencia"
          subtitle="Win rate por combinación — el cuadrante más caliente no es el mejor"
          isAI
          insight={(() => {
            const entAlta = sentimientoUrgencia?.[0]?.[0]
            const intMedia = sentimientoUrgencia?.[1]?.[1]
            if (!entAlta || !intMedia) return ''
            if (entAlta.winRate !== null && intMedia.winRate !== null && entAlta.winRate < intMedia.winRate) {
              return `Paradoja: Entusiasta + Alta urgencia = ${entAlta.winRate}% win rate — el peor cuadrante. Interesado + Media = ${intMedia.winRate}%. La urgencia visible puede indicar que el lead está comparando activamente.`
            }
            return `Interesado + Media urgencia muestra el mejor win rate (${intMedia.winRate}%). Urgencia alta no garantiza cierre.`
          })()}
          methodology="Cruza sentimiento* y urgencia* del prospecto. Win rate = won/total por celda. Celdas con n=0 se muestran vacías."
        >
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr>
                  <th className="py-2 px-3 text-left text-xs text-text-secondary font-semibold" />
                  {['Alta urgencia', 'Media urgencia'].map(u => (
                    <th key={u} className="py-2 px-3 text-center text-xs text-text-secondary font-semibold">{u}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sentimientoUrgencia.map((row, ri) => (
                  <tr key={ri} className="border-t border-border/30">
                    <td className="py-3 px-3 font-semibold text-text">{['Entusiasta', 'Interesado'][ri]}</td>
                    {row.map((cell, ci) => {
                      const isWorstCase = ri === 0 && ci === 0 && cell.winRate !== null && cell.winRate < 50
                      return (
                        <td
                          key={ci}
                          className="py-3 px-3 text-center rounded-lg"
                          style={{
                            backgroundColor: cell.winRate !== null ? heatBg(cell.winRate) : '#F8FAFC',
                            border: isWorstCase ? '2px solid #DC2626' : '1px solid transparent',
                          }}
                        >
                          {cell.winRate !== null ? (
                            <div>
                              <p className="text-2xl font-bold text-white">{cell.winRate}%</p>
                              <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.75)' }}>{cell.n} deals</p>
                              {isWorstCase && <p className="text-[10px] font-semibold mt-0.5 text-white">⚠️ Trampa</p>}
                            </div>
                          ) : (
                            <span className="text-text-muted opacity-40 text-lg">—</span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartCard>

        {/* [7] PMF Signal → win rate + MRR */}
        <ChartCard
          title="PMF Signal × Win Rate y MRR"
          subtitle="Correlación entre señal de product-market fit y resultado"
          isAI
          insight={(() => {
            const fuerte = byPMFSignalEnriched.find(d => d.name === 'Fuerte')
            const debil = byPMFSignalEnriched.find(d => d.name === 'Débil')
            if (!fuerte) return ''
            const gap = debil ? fuerte.winRate - debil.winRate : null
            if (gap && gap > 15) return `PMF Fuerte cierra ${fuerte.winRate}% vs Débil ${debil.winRate}% — brecha de ${gap}pp. El detector de PMF funciona. Filtrar leads débiles temprano ahorra ciclos de venta.`
            return `PMF Fuerte: ${fuerte.winRate}% win rate y ${fmt(fuerte.wonMrr)} MRR. La señal de fit es el predictor más accionable del pipeline.`
          })()}
          methodology="Agrupado por pmf_signal* (Fuerte/Moderada/Débil). MRR = suma acv_estimado* de deals ganados. Win rate = won/total."
        >
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={byPMFSignalEnriched} barSize={50}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#475569' }} />
              <YAxis tick={{ fontSize: 11, fill: '#64748B' }} tickFormatter={v => fmt(v)} />
              <Tooltip content={<PMFTooltip />} />
              <Bar dataKey="wonMrr" name="MRR Won" radius={[4, 4, 0, 0]}>
                {byPMFSignalEnriched.map((d, i) => (
                  <Cell key={i} fill={winRateColor(d.winRate)} />
                ))}
                <LabelList dataKey="winRateLabel" position="top" fontSize={12} fontWeight={700} fill="#1E293B" />
              </Bar>
              <Bar dataKey="lostMrr" name="MRR Lost" fill={C.lost} radius={[4, 4, 0, 0]} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ── ACTO 4: Las palancas ── */}
      <SectionHeader title="Las Palancas" subtitle="¿Dónde invertir en adquisición y monetización?" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* [8] Canal → win rate + días al cierre */}
        <ChartCard
          title="Canal × Win Rate y Velocidad"
          subtitle="Win rate y días promedio al cierre por canal — ≥2 deals"
          isAI
          insight={(() => {
            const top = byCanalEnriched[0]
            const referido = byCanalEnriched.find(c => c.name === 'Referido')
            if (!top) return ''
            let txt = `${top.name} lidera: ${top.winRate}%${top.avgDays ? ` en ${top.avgDays} días` : ''}.`
            if (referido && referido.winRate < top.winRate) {
              txt += ` Referido (${referido.winRate}%${referido.avgDays ? `, ${referido.avgDays}d` : ''}) rinde menos que el canal orgánico — el loop viral tiene fricción.`
            }
            return txt
          })()}
          methodology="Win rate por canal_descubrimiento. Días = promedio estimated_close_days* de deals ganados. Ordenado desc por win rate."
        >
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={byCanalEnriched} layout="vertical" barSize={18} margin={{ right: 110 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
              <XAxis type="number" domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 11, fill: '#64748B' }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#475569' }} width={150} />
              <Tooltip content={<CanalTooltip />} />
              <Bar dataKey="winRate" radius={[0, 4, 4, 0]}>
                {byCanalEnriched.map((d, i) => (
                  <Cell key={i} fill={winRateColor(d.winRate)} />
                ))}
                <LabelList dataKey="label" position="right" fontSize={10} fill="#475569" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* [9] Plan × win rate + precio */}
        <ChartCard
          title="Plan × Win Rate y Precio"
          subtitle="Conversión por tier — el precio no destruye la conversión"
          isAI
          insight={(() => {
            const adv = byPlanEnriched.find(p => p.name === 'Advanced')
            const std = byPlanEnriched.find(p => p.name === 'Standard')
            const corp = byPlanEnriched.find(p => p.name === 'Corporate')
            if (!adv) return ''
            const lines = []
            if (std && adv.winRate > std.winRate) {
              lines.push(`Advanced ($${adv.price}) tiene ${adv.winRate}% vs Standard ($${std.price}) ${std.winRate}% — pagar más no reduce conversión.`)
            }
            if (corp) lines.push(`Corporate domina en MRR: ${fmt(corp.wonMrr)} ganados.`)
            return lines.join(' ')
          })()}
          methodology="Win rate por plan_sugerido*. Precio por plan en $/mes. MRR = acv_estimado* ganado total por tier."
        >
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={byPlanEnriched} barSize={50}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 12, fill: '#475569' }}
                tickFormatter={name => {
                  const p = byPlanEnriched.find(d => d.name === name)
                  return p?.price ? `${name}\n$${p.price}` : name
                }}
              />
              <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 11, fill: '#64748B' }} />
              <Tooltip content={<PlanTooltip />} />
              <Bar dataKey="winRate" radius={[4, 4, 0, 0]}>
                {byPlanEnriched.map((d, i) => (
                  <Cell key={i} fill={winRateColor(d.winRate)} />
                ))}
                <LabelList dataKey="winRateLabel" position="top" fontSize={13} fontWeight={700} fill="#1E293B" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-2 text-[11px] text-text-muted justify-center">
            {byPlanEnriched.map(p => (
              <span key={p.name}>{p.name}: ${p.price}/mo · {fmt(p.wonMrr)} MRR</span>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* ── SÍNTESIS ── */}
      <SectionHeader title="Ranking de Señales" subtitle="¿Qué predice el cierre con mayor certeza?" />

      {/* [10] Ranking señales de conversión */}
      <ChartCard
        title="Señales de Conversión — Delta Won vs Lost"
        subtitle="Diferencia normalizada entre Won y Lost por variable — verde predice cierre, rojo va en reversa"
        isAI
        insight={(() => {
          if (!conversionSignals.length) return ''
          const top = conversionSignals[0]
          const inverse = conversionSignals.filter(s => s.delta < 0)
          let txt = `Señal #1: "${top.label}" (delta ${top.delta > 0 ? '+' : ''}${top.delta}%).`
          if (inverse.length) {
            txt += ` Señal(es) inversa(s): ${inverse.map(s => `"${s.label}"`).join(', ')} — más valor en el prospecto = menos probabilidad de cierre. Re-calibrar scoring.`
          }
          return txt
        })()}
        methodology="Delta = (avg_won - avg_lost) / max × 100. Campos invertidos (Risk, Días): delta = (avg_lost - avg_won) / max × 100. Verde = favorece Won. Rojo = correlaciona con pérdida."
      >
        {conversionSignals.length === 0 ? (
          <p className="text-sm text-text-muted py-8 text-center">Sin datos suficientes para calcular señales</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={conversionSignals} layout="vertical" barSize={24} margin={{ right: 60, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
              <XAxis type="number" tickFormatter={v => `${v > 0 ? '+' : ''}${v}%`} tick={{ fontSize: 11, fill: '#64748B' }} />
              <YAxis type="category" dataKey="label" tick={{ fontSize: 11, fill: '#475569' }} width={140} />
              <Tooltip content={<SignalTooltip />} />
              <ReferenceLine x={0} stroke="#94A3B8" strokeWidth={1.5} />
              <Bar dataKey="delta" radius={[0, 4, 4, 0]}>
                {conversionSignals.map((d, i) => (
                  <Cell key={i} fill={d.delta >= 0 ? C.success : C.danger} fillOpacity={0.8} />
                ))}
                <LabelList
                  formatter={v => `${v > 0 ? '+' : ''}${v}%`}
                  position="right"
                  fontSize={11}
                  fontWeight={600}
                  fill="#475569"
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      {/* ── ACCIONES RECOMENDADAS ── */}
      <SectionHeader title="Acciones Recomendadas" subtitle="Derivadas de los datos — priorizadas por impacto en win rate" />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {accionesRecomendadas.map((a, i) => (
          <div key={i} className="bg-surface border border-border rounded-xl p-4 hover:shadow-sm transition-shadow">
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${BADGE[a.prioridad]}`}>{a.prioridad}</span>
              <span className="text-xs text-text-muted">{a.tema}</span>
            </div>
            <p className="font-semibold text-text mb-1 text-sm">{a.icon} {a.titulo}</p>
            <p className="text-xs text-text-muted leading-relaxed">{a.texto}</p>
          </div>
        ))}
      </div>

      <p className="text-[11px] text-text-muted mt-6 mb-4">* Variable derivada del análisis de IA y/o heurísticas de negocio.</p>
    </div>
  )
}
