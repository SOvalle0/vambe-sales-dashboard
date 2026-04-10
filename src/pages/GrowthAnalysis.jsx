import { useState, useMemo } from 'react'
import { Zap, DollarSign, Target, Layers } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Cell, Legend, LabelList,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ReferenceLine,
  ScatterChart, Scatter, ZAxis, Label,
} from 'recharts'
import KPICard from '../components/KPICard'
import ChartCard from '../components/ChartCard'
import Filters from '../components/Filters'
import useFilteredClients from '../hooks/useFilteredClients'
import AccionesRecomendadas from '../components/AccionesRecomendadas'

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

const IND_COLORS = [
  '#2563EB', '#16A34A', '#DC2626', '#F59E0B', '#8B5CF6',
  '#0EA5E9', '#EC4899', '#14B8A6', '#F97316', '#6366F1',
]
const indColorMap = {}
let indColorIdx = 0
function getIndColor(name) {
  if (!indColorMap[name]) indColorMap[name] = IND_COLORS[indColorIdx++ % IND_COLORS.length]
  return indColorMap[name]
}

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
    <div className="bg-surface border border-border rounded-lg px-3 py-2 text-sm" style={{ boxShadow: '0 4px 16px rgba(37,99,235,0.10), 0 1px 4px rgba(15,23,42,0.06)' }}>
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

function SectionHeader({ title, subtitle }) {
  return (
    <div className="mt-8 mb-4">
      <h2 className="text-lg font-bold text-text">{title}</h2>
      {subtitle && <p className="text-xs text-text-muted">{subtitle}</p>}
    </div>
  )
}

function insightICPHeatmap(heatmap) {
  if (!heatmap.matrix.length) return ''
  const validCells = []
  heatmap.matrix.forEach((row, ri) => {
    row.forEach((cell, ci) => {
      if (cell.winRate !== null && cell.n >= 2) {
        validCells.push({ tipo: heatmap.tipos[ri], ind: heatmap.industrias[ci], wr: cell.winRate, n: cell.n })
      }
    })
  })
  if (!validCells.length) return 'Datos insuficientes para validar celdas ICP.'
  const best = validCells.sort((a, b) => b.wr - a.wr)[0]
  const worst = validCells.filter(c => c.wr < 40).sort((a, b) => a.wr - b.wr)[0]
  
  let msg = `Sweet Spot detectado: ${best.tipo} en ${best.ind} (${best.wr}% win rate).`
  if (worst) msg += ` Fricción crítica en ${worst.tipo}/${worst.ind} (${worst.wr}%).`
  return msg
}

function insightRadar(data) {
  if (!data.length) return ''
  const topDiff = [...data].sort((a, b) => (b.won - b.lost) - (a.won - a.lost))[0]
  return `La mayor brecha de éxito está en "${topDiff.dim}". Los deals ganados sobrepasan a los perdidos significativamente en esta dimensión.`
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
    const rows = Object.values(groups)
      .map(g => ({
        ...g,
        wonMrr: Math.round(g.wonMrr),
        winRate: g.total > 0 ? Math.round((g.won / g.total) * 100) : 0,
        avgDeal: g.won > 0 ? Math.round(g.wonMrr / g.won) : 0,
      }))
      .filter(g => g.total >= 1)
      .sort((a, b) => b.avgDeal - a.avgDeal)
    const avgWinRate = rows.length ? Math.round(rows.reduce((s, r) => s + r.winRate, 0) / rows.length) : 50
    const avgDeal    = rows.length ? Math.round(rows.reduce((s, r) => s + r.avgDeal,  0) / rows.length) : 0
    return { rows, avgWinRate, avgDeal }
  }, [clients])

  // [3] ICP Heatmap — tipo empresa × industria → win rate
  const icpHeatmap = useMemo(() => {
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
        texto: `Entusiasta + Alta urgencia = ${sentEntAlta ?? 40}% win rate — el cuadrante más débil. La urgencia visible puede indicar que el lead está comparando activamente.`,
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
    <div className="animate-in fade-in duration-500">
      <div className="page-title-wrap"><h1 className="text-2xl font-bold mb-1 text-text">Growth Analysis</h1></div>
      <p className="text-sm text-text-secondary mb-6">Diagnóstico estratégico — Loops · Mercado · ICP · Señales · Palancas</p>

      <Filters searchQuery={searchQuery} onSearch={setSearchQuery} onClearAll={clearAll} filters={filters} onFilter={setFilter} totalFiltered={clients.length} />

      <div className="grid grid-cols-2 gap-4 mb-8 sm:grid-cols-4">
        <KPICard icon={Zap} title="% Orgánico" rawValue={pctOrganico} value={`${pctOrganico}%`} subtitle="Búsqueda orgánica + Referidos" />
        <KPICard icon={DollarSign} title="Revenue Won" rawValue={revenueWon} value={fmt(revenueWon)} subtitle="ACV cerrado" />
        <KPICard icon={Target} title="Revenue Lost" rawValue={revenueLost} value={fmt(revenueLost)} subtitle="ACV dejado en la mesa" />
        <KPICard icon={Layers} title="Segmentos PMF" rawValue={validatedSegments.length} value={validatedSegments.length} subtitle=">65% win rate, ≥3 deals" />
      </div>

      <SectionHeader title="El Sistema de Crecimiento" subtitle="¿Cómo crece Vambe y qué loop es más eficiente?" />

      <div className="mb-6">
        <ChartCard
          title="Análisis de Loops"
          subtitle="Win rate, MRR ganado y velocidad por tipo de loop de adquisición"
          accentColor="#2563EB"
          isAI
          insight={(() => {
            if (!byLoopEnriched.length) return ''
            const best = byLoopEnriched[0]
            const contenido = byLoopEnriched.find(l => l.name === 'Contenido')
            return `${best.name} lidera en eficiencia. Contenido genera ${fmt(contenido?.wonAcv || 0)} al ${contenido?.winRate || 0}% de conversión.`
          })()}
          methodology="Win rate = won/total por loop. Días = promedio de estimated_close_days en deals ganados."
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 text-xs font-semibold text-text-secondary">Loop</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-text-secondary">Win Rate</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-text-secondary">MRR Won</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-text-secondary">Días promedio</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-text-secondary">Won / Total</th>
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
                        <div className="flex-1 bg-border rounded-full h-1.5 max-w-[100px]">
                          <div
                            className="h-1.5 rounded-full"
                            style={{ width: `${loop.winRate}%`, backgroundColor: winRateColor(loop.winRate) }}
                          />
                        </div>
                        <span className="text-xs font-bold" style={{ color: winRateColor(loop.winRate) }}>{loop.winRate}%</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right font-medium text-text">{fmt(loop.wonAcv)}</td>
                    <td className="py-3 px-3 text-right text-text-secondary">{loop.avgDays ? `${loop.avgDays}d` : '—'}</td>
                    <td className="py-3 px-3 text-right text-text-secondary">{loop.won} <span className="text-text-muted">/ {loop.total}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartCard>
      </div>

      <SectionHeader title="El Mercado" subtitle="¿Dónde está el dinero y quién es el cliente ideal?" />

      <div className="grid grid-cols-1 gap-6 mb-6">
        <ChartCard
          title="Mapa de Industrias"
          subtitle="X = win rate · Y = MRR por deal ganado · Tamaño = deals ganados"
          accentColor="#16A34A"
          isAI
          insight={(() => {
            const { rows, avgWinRate, avgDeal } = byIndustriaFull
            if (!rows.length) return ''
            const stars     = rows.filter(r => r.winRate >= avgWinRate && r.avgDeal >= avgDeal)
            const easyWins  = rows.filter(r => r.winRate >= avgWinRate && r.avgDeal < avgDeal)
            const highValue = rows.filter(r => r.winRate < avgWinRate  && r.avgDeal >= avgDeal)
            const avoid     = rows.filter(r => r.winRate < avgWinRate  && r.avgDeal < avgDeal)
            const top = [...rows].sort((a, b) => b.wonMrr - a.wonMrr)[0]
            const parts = []
            if (stars.length)
              parts.push(`⭐ Stars: ${stars.map(r => r.name).join(', ')} — alta conversión y alto ticket. Priorizar expansión.`)
            if (highValue.length)
              parts.push(`💎 Alto valor, difícil cierre: ${highValue.map(r => r.name).join(', ')} — vale la pena con un proceso de venta más largo.`)
            if (easyWins.length)
              parts.push(`⚡ Cierre fácil, ticket bajo: ${easyWins.map(r => r.name).join(', ')} — ideal para volumen y cash flow rápido.`)
            if (avoid.length)
              parts.push(`🚫 Deprioritizar: ${avoid.map(r => r.name).join(', ')} — bajo win rate y bajo ticket. Redistribuir esfuerzo.`)
            if (top && stars.every(s => s.name !== top.name))
              parts.push(`💰 Mayor MRR generado: ${top.name} (${fmt(top.wonMrr)} total).`)
            return parts.join(' ') || 'Distribuye esfuerzo hacia las industrias con mayor win rate y ticket promedio.'
          })()}
          methodology="X = win rate por industria. Y = MRR ganado ÷ deals cerrados. Tamaño = total deals."
        >
          <div className="h-[380px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 24, right: 24, bottom: 48, left: 70 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis type="number" dataKey="winRate" domain={[0, 105]} tickFormatter={v => `${v}%`} tick={{ fontSize: 11, fill: '#64748B' }}>
                  <Label value="Win Rate" position="bottom" offset={30} style={{ fontSize: 11, fill: '#94A3B8' }} />
                </XAxis>
                <YAxis type="number" dataKey="avgDeal" tickFormatter={v => fmt(v)} tick={{ fontSize: 11, fill: '#64748B' }} width={65}>
                  <Label value="MRR por deal" angle={-90} position="insideLeft" offset={-55} style={{ fontSize: 11, fill: '#94A3B8' }} />
                </YAxis>
                <ZAxis type="number" dataKey="total" range={[0, 1]} />
                <Tooltip content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const d = payload[0].payload
                  return <TBox lines={[d.name, `Win rate: ${d.winRate}%`, `MRR por deal: ${fmt(d.avgDeal)}`, `Ganados: ${d.won} · Total: ${d.total} deals`]} />
                }} />
                <ReferenceLine x={byIndustriaFull.avgWinRate} stroke="#94A3B8" strokeDasharray="5 3" strokeWidth={1.5}>
                  <Label value={`Avg ${byIndustriaFull.avgWinRate}%`} position="insideTopRight" style={{ fontSize: 10, fill: '#94A3B8' }} />
                </ReferenceLine>
                <ReferenceLine y={byIndustriaFull.avgDeal} stroke="#94A3B8" strokeDasharray="5 3" strokeWidth={1.5}>
                  <Label value={`Avg ${fmt(byIndustriaFull.avgDeal)}`} position="insideTopLeft" style={{ fontSize: 10, fill: '#94A3B8' }} />
                </ReferenceLine>
                <Scatter
                  data={byIndustriaFull.rows}
                  shape={(props) => {
                    const { cx, cy, payload } = props
                    const color = getIndColor(payload.name)
                    const radius = Math.max(10, Math.min(30, payload.won * 4))
                    return (
                      <g>
                        <circle cx={cx} cy={cy} r={radius} fill={color} fillOpacity={0.72} stroke={color} strokeWidth={1.5} strokeOpacity={0.4} />
                        <text x={cx} y={cy - radius - 5} textAnchor="middle" fontSize={10} fontWeight={600} fill="#334155">
                          {payload.name}
                        </text>
                        <text x={cx} y={cy + 4} textAnchor="middle" fontSize={9} fill="white" fontWeight={700}>
                          {payload.won}
                        </text>
                      </g>
                    )
                  }}
                />
              </ScatterChart>
            </ResponsiveContainer>
            {/* Quadrant labels */}
            <div className="absolute pointer-events-none" style={{ inset: '24px 24px 48px 70px' }}>
              <span className="absolute top-2 right-2 text-[10px] font-bold text-green-600 opacity-50">Stars ↗</span>
              <span className="absolute top-2 left-2 text-[10px] font-bold text-blue-500 opacity-50">Alto valor ↖</span>
              <span className="absolute bottom-2 right-2 text-[10px] font-bold text-amber-500 opacity-50">Volumen ↘</span>
              <span className="absolute bottom-2 left-2 text-[10px] font-bold text-slate-400 opacity-50">Evitar ↙</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3 px-1">
            {byIndustriaFull.rows.map(d => (
              <span key={d.name} className="flex items-center gap-1.5 text-[11px] text-text-secondary">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: getIndColor(d.name) }} />
                {d.name}
              </span>
            ))}
          </div>
        </ChartCard>

        <ChartCard
          title="ICP: Tipo de Empresa × Industria"
          subtitle="Win rate por combinación de segmento y sector"
          accentColor="#0EA5E9"
          isAI
          insight={insightICPHeatmap(icpHeatmap)}
          methodology="Heatmap basado en win rate histórico por segmento cruzado."
        >
          <div className="overflow-x-auto pb-2">
            <table className="text-xs border-collapse min-w-[600px] w-full">
              <thead>
                <tr className="bg-bg">
                  <th className="text-left py-2 px-3 border-b border-border">Tipo Empresa</th>
                  {icpHeatmap.industrias.map(ind => (
                    <th key={ind} className="py-2 px-2 text-center border-b border-border">{ind}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {icpHeatmap.tipos.map((tipo, ti) => (
                  <tr key={tipo} className="border-t border-border/30">
                    <td className="py-3 px-3 font-semibold text-text-secondary bg-bg/30">{tipo}</td>
                    {icpHeatmap.industrias.map((ind, ii) => {
                      const cell = icpHeatmap.matrix[ti][ii]
                      return (
                        <td key={ind} className="py-2 px-2 text-center" style={{ backgroundColor: cell.winRate !== null ? heatBg(cell.winRate) : 'transparent' }}>
                          {cell.winRate !== null ? (
                            <span className="font-bold text-white">{cell.winRate}%</span>
                          ) : (
                            <span className="text-text-muted opacity-25">—</span>
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
      </div>

      <SectionHeader title="El Cliente Ideal" subtitle="¿Quién cierra vs quién no cierra?" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <ChartCard
          title="Perfil Won vs Lost"
          subtitle="6 dimensiones clave — Azul = Won, Rojo = Lost"
          accentColor="#F59E0B"
          isAI
          isEmpty={radarData.length === 0}
          insight={insightRadar(radarData)}
          methodology="Valores normalizados de 0 a 1."
        >
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} cx="50%" cy="50%" outerRadius={85}>
                <PolarGrid stroke="#E2E8F0" />
                <PolarAngleAxis dataKey="dim" tick={{ fontSize: 10, fill: '#64748B' }} />
                <PolarRadiusAxis domain={[0, 1]} tick={false} axisLine={false} />
                <Radar name="Won" dataKey="won" fill="#2563EB" fillOpacity={0.2} stroke="#2563EB" strokeWidth={2} />
                <Radar name="Lost" dataKey="lost" fill="#DC2626" fillOpacity={0.1} stroke="#DC2626" strokeWidth={2} strokeDasharray="4 2" />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard
          title="Pain Point × Win Rate"
          subtitle="Conversión según el dolor principal resuelto"
          accentColor="#DC2626"
          isAI
          isEmpty={byPainEnriched.length === 0}
          insight="Los prospectos con dolores operativos cierran más rápido y con mayor tasa que los de optimización pura."
          methodology="Ranking por win rate. Min. 2 deals."
        >
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byPainEnriched} layout="vertical" margin={{ right: 80 }}>
                <XAxis type="number" domain={[0, 100]} hide />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#475569' }} width={120} />
                <Tooltip cursor={{ fill: 'transparent' }} content={<PMFTooltip />} />
                <Bar dataKey="winRate" radius={[0, 4, 4, 0]}>
                  {byPainEnriched.map((d, i) => (
                    <Cell key={i} fill={winRateColor(d.winRate)} fillOpacity={i === 0 ? 1 : 0.55} />
                  ))}
                  <LabelList dataKey="label" position="right" fontSize={11} fill="#64748B" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      <AccionesRecomendadas acciones={accionesRecomendadas} />
    </div>
  )
}
