import { useState, useMemo } from 'react'
import { Lightbulb, ChevronDown } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Cell, LabelList, ComposedChart, Line,
  ReferenceLine, LineChart, Legend,
} from 'recharts'
import Filters from '../components/Filters'
import useFilteredClients from '../hooks/useFilteredClients'

// ── Constants ────────────────────────────────────────────────────
const C = {
  brand:   '#2563EB',
  success: '#16A34A',
  danger:  '#DC2626',
  warning: '#D97706',
  muted:   '#94A3B8',
  soft:    '#E2E8F0',
}

const fmt = (n) => {
  if (n == null) return '—'
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1000) return `$${(n / 1000).toFixed(0)}k`
  return `$${n}`
}

function wrColor(pct) {
  if (pct >= 70) return C.success
  if (pct >= 50) return C.warning
  return C.danger
}

// ── Helpers ──────────────────────────────────────────────────────
function LollipopBar({ x, y, width, height, fill }) {
  const cy = y + height / 2
  return (
    <g>
      <line x1={x} y1={cy} x2={x + width} y2={cy} stroke={fill} strokeWidth={2.5} strokeLinecap="round" />
      <circle cx={x + width} cy={cy} r={7} fill={fill} stroke="white" strokeWidth={2} />
    </g>
  )
}

function TBox({ lines }) {
  return (
    <div className="bg-surface border border-border rounded-lg px-3 py-2 shadow-md text-sm">
      {lines.map((l, i) => (
        <p key={i} className={i === 0 ? 'font-medium text-text' : 'text-text-secondary text-xs mt-0.5'}>{l}</p>
      ))}
    </div>
  )
}

// ── ChartCard ────────────────────────────────────────────────────
function ChartCard({ title, subtitle, insight, methodology, children }) {
  const [open, setOpen] = useState(false)
  const [showMethod, setShowMethod] = useState(false)
  return (
    <div className="bg-surface border border-border rounded-xl p-5 shadow-sm">
      <h2 className="text-base font-semibold text-text mb-0.5">{title}</h2>
      {subtitle && <p className="text-xs text-text-muted mb-4">{subtitle}</p>}
      {children}
      {insight && (
        <button onClick={() => setOpen(!open)} className="mt-3 w-full text-left px-3 py-2 bg-brand-light rounded-lg">
          <div className="flex items-center gap-2">
            <Lightbulb size={13} className="text-brand shrink-0" />
            <span className="text-xs font-medium text-brand flex-1 leading-snug">{insight.title}</span>
            <ChevronDown size={13} className={`text-brand transition-transform ${open ? 'rotate-180' : ''}`} />
          </div>
          {open && <p className="text-xs text-text-secondary leading-relaxed mt-2 pl-[21px]">{insight.detail}</p>}
        </button>
      )}
      {methodology && (
        <>
          <button onClick={() => setShowMethod(!showMethod)} className="mt-2 text-[11px] text-text-muted hover:text-text-secondary">
            {showMethod ? '▾ Ocultar metodología' : '▸ ¿Cómo se calcula?'}
          </button>
          {showMethod && <p className="mt-1 text-[11px] text-text-muted leading-relaxed border-l-2 border-border pl-3">{methodology}</p>}
        </>
      )}
    </div>
  )
}

function SectionDivider({ title }) {
  return (
    <div className="flex items-center gap-3 my-6">
      <div className="h-px bg-border flex-1" />
      <span className="text-[11px] font-semibold text-text-muted uppercase tracking-widest whitespace-nowrap">{title}</span>
      <div className="h-px bg-border flex-1" />
    </div>
  )
}

function KPICard({ label, value, sub }) {
  return (
    <div className="bg-surface border border-border rounded-xl p-4 shadow-sm">
      <p className="text-xs text-text-muted mb-1">{label}</p>
      <p className="text-2xl font-bold text-text">{value}</p>
      {sub && <p className="text-xs text-text-muted mt-0.5">{sub}</p>}
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────
export default function ConversionAnalysis() {
  const { filtered: clients, searchQuery, setSearchQuery, clearAll, filters, setFilter } = useFilteredClients()

  // ── KPIs ──────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const won = clients.filter(c => c.closed === 1)
    const winRate = clients.length ? Math.round(won.length / clients.length * 100) : 0
    const avgACV = won.length ? Math.round(won.reduce((s, c) => s + (c.acv_estimado || 0), 0) / won.length) : 0
    const avgDays = won.filter(c => c.estimated_close_days != null).length
      ? Math.round(won.filter(c => c.estimated_close_days != null).reduce((s, c) => s + c.estimated_close_days, 0) / won.filter(c => c.estimated_close_days != null).length)
      : 0
    return { total: clients.length, won: won.length, winRate, avgACV, avgDays }
  }, [clients])

  // ── [1] Tendencia mensual ──────────────────────────────────────
  const monthlyData = useMemo(() => {
    const g = {}
    clients.forEach(c => {
      const m = c.fecha_reunion?.slice(0, 7)
      if (!m) return
      if (!g[m]) g[m] = { month: m, won: 0, lost: 0 }
      if (c.closed === 1) g[m].won++; else g[m].lost++
    })
    return Object.values(g).sort((a, b) => a.month.localeCompare(b.month)).map(m => ({
      ...m,
      label: m.month.slice(5) + '/' + m.month.slice(2, 4),
      total: m.won + m.lost,
      winRate: Math.round(m.won / (m.won + m.lost) * 100),
    }))
  }, [clients])

  const monthlyInsight = useMemo(() => {
    if (monthlyData.length < 2) return null
    const last3 = monthlyData.slice(-3)
    const first3 = monthlyData.slice(0, 3)
    const avgLast = Math.round(last3.reduce((s, m) => s + m.winRate, 0) / last3.length)
    const avgFirst = Math.round(first3.reduce((s, m) => s + m.winRate, 0) / first3.length)
    const bestMonth = [...monthlyData].sort((a, b) => b.winRate - a.winRate)[0]
    const diff = avgLast - avgFirst
    if (Math.abs(diff) >= 10) return {
      title: diff > 0
        ? `Win rate mejora ${diff}pp en los últimos meses (${avgFirst}% → ${avgLast}%)`
        : `Win rate cae ${Math.abs(diff)}pp vs inicio del período (${avgFirst}% → ${avgLast}%)`,
      detail: diff > 0
        ? `El equipo ha mejorado su efectividad de cierre. El mejor mes fue ${bestMonth.label} con ${bestMonth.winRate}% (${bestMonth.won} cerrados de ${bestMonth.total}). La tendencia positiva sugiere que los ajustes en el pitch o la calificación están funcionando.`
        : `La caída de ${Math.abs(diff)}pp puede indicar deterioro en la calidad de leads o saturación del mercado actual. ${bestMonth.label} fue el mejor mes (${bestMonth.winRate}%) — analizar qué fue diferente ese mes (canal, vendedor, industria).`,
    }
    return {
      title: `Win rate estable en torno al ${Math.round(monthlyData.reduce((s, m) => s + m.winRate, 0) / monthlyData.length)}%`,
      detail: `Sin tendencia clara al alza o baja. El mejor mes fue ${bestMonth.label} con ${bestMonth.winRate}% de conversión. Para mejorar, identificar qué hizo diferente ese mes y replicarlo.`,
    }
  }, [monthlyData])

  // ── [2] Win rate por vendedor ──────────────────────────────────
  const byVendedor = useMemo(() => {
    const g = {}
    clients.forEach(c => {
      const v = c.vendedor || 'Sin dato'
      if (!g[v]) g[v] = { name: v, won: 0, total: 0 }
      g[v].total++
      if (c.closed === 1) g[v].won++
    })
    return Object.values(g)
      .map(v => ({ ...v, winRate: Math.round(v.won / v.total * 100) }))
      .sort((a, b) => b.winRate - a.winRate)
  }, [clients])

  const vendedorInsight = useMemo(() => {
    if (byVendedor.length < 2) return null
    const best = byVendedor[0], worst = byVendedor[byVendedor.length - 1]
    const spread = best.winRate - worst.winRate
    const topByVolume = [...byVendedor].sort((a, b) => b.total - a.total)[0]
    if (spread >= 20) return {
      title: `Brecha de ${spread}pp entre ${best.name} (${best.winRate}%) y ${worst.name} (${worst.rate}%)`,
      detail: `${best.name} cierra ${best.won} de ${best.total} leads. ${worst.name} cierra ${worst.won} de ${worst.total}. Una brecha de ${spread}pp justifica un programa formal de mentoring — revisar el pitch de ${worst.name} vs el de ${best.name} en las mismas industrias.`,
    }
    if (topByVolume.name !== best.name) return {
      title: `${topByVolume.name} tiene más volumen pero ${best.name} cierra mejor`,
      detail: `${topByVolume.name} maneja ${topByVolume.total} leads (${topByVolume.winRate}% win rate) vs ${best.name} con ${best.total} leads y ${best.winRate}%. Distribución de leads por calidad de cierre podría mejorar el resultado global del equipo.`,
    }
    return {
      title: `${best.name} lidera con ${best.winRate}% de win rate (${best.total} deals)`,
      detail: `El equipo tiene una conversión relativamente homogénea. ${best.name} lidera con ${best.won}/${best.total}. Foco en aumentar volumen del canal más eficiente de cada vendedor.`,
    }
  }, [byVendedor])

  // ── [3] Caso de uso ───────────────────────────────────────────
  const byCasoUso = useMemo(() => {
    const g = {}
    clients.forEach(c => {
      const k = c.caso_uso || 'Sin dato'
      if (!g[k]) g[k] = { name: k, won: 0, total: 0 }
      g[k].total++
      if (c.closed === 1) g[k].won++
    })
    return Object.values(g)
      .map(v => ({ ...v, winRate: Math.round(v.won / v.total * 100) }))
      .sort((a, b) => b.winRate - a.winRate)
  }, [clients])

  const casoUsoInsight = useMemo(() => {
    if (!byCasoUso.length) return null
    const best = byCasoUso[0], worst = byCasoUso[byCasoUso.length - 1]
    const spread = best.winRate - worst.winRate
    if (spread >= 20) return {
      title: `"${best.name}" cierra ${spread}pp más que "${worst.name}"`,
      detail: `${best.name} convierte ${best.won}/${best.total} (${best.winRate}%). ${worst.name} solo ${worst.winRate}% (${worst.won}/${worst.total}). El pitch y la demo deberían centrarse en ${best.name} como caso ancla. Los leads con otro caso de uso requieren una conversación de reencuadre antes de avanzar.`,
    }
    return {
      title: `"${best.name}" es el caso de uso con mayor conversión (${best.winRate}%)`,
      detail: `De los ${byCasoUso.length} casos de uso identificados, ${best.name} lidera con ${best.won} de ${best.total} cerrados. Usar este caso como entrada en el pitch y migrar la conversación hacia él cuando el lead menciona otro.`,
    }
  }, [byCasoUso])

  // ── [4] Urgencia × win rate ───────────────────────────────────
  const byUrgencia = useMemo(() => {
    const order = ['Alta', 'Media', 'Baja']
    const g = {}
    clients.forEach(c => {
      const k = c.urgencia
      if (!k) return
      if (!g[k]) g[k] = { name: k, won: 0, total: 0 }
      g[k].total++
      if (c.closed === 1) g[k].won++
    })
    return order
      .filter(k => g[k])
      .map(k => ({ ...g[k], winRate: Math.round(g[k].won / g[k].total * 100) }))
  }, [clients])

  const urgenciaInsight = useMemo(() => {
    if (byUrgencia.length < 2) return null
    const alta = byUrgencia.find(u => u.name === 'Alta')
    const media = byUrgencia.find(u => u.name === 'Media')
    const baja = byUrgencia.find(u => u.name === 'Baja')
    if (!alta || !media) return null
    const diff = alta.winRate - media.winRate
    if (diff <= -10) return {
      title: `Urgencia Alta cierra ${Math.abs(diff)}pp menos que Media (${alta.winRate}% vs ${media.winRate}%) — contraintuitivo`,
      detail: `Los leads muy urgentes cierran menos. Posibles causas: expectativas de implementación irreal ("lo necesito para mañana"), están comparando activamente con competidores, o el problema es tan urgente que ya tienen una solución parche. Calificar si la urgencia es real o solo ruido emocional.`,
    }
    if (diff >= 10) return {
      title: `Urgencia Alta convierte ${diff}pp más (${alta.winRate}% vs ${media.winRate}%)`,
      detail: `La urgencia declarada es un predictor válido. ${alta.won} de ${alta.total} leads urgentes cerraron. Priorizar estos deals en el pipeline y comprimir el ciclo de seguimiento para capitalizar la ventana de decisión antes de que la urgencia se enfríe.`,
    }
    return {
      title: `Urgencia no diferencia claramente el resultado (Alta ${alta.winRate}% · Media ${media.winRate}%${baja ? ` · Baja ${baja.winRate}%` : ''})`,
      detail: `La diferencia es menor a 10pp — la urgencia declarada no es el factor determinante. Otros indicadores (sentimiento, pain point, canal) tienen más peso predictivo en este dataset.`,
    }
  }, [byUrgencia])

  // ── [5] Sentimiento × win rate ────────────────────────────────
  const bySentimiento = useMemo(() => {
    const g = {}
    clients.forEach(c => {
      const k = c.sentimiento
      if (!k) return
      if (!g[k]) g[k] = { name: k, won: 0, total: 0 }
      g[k].total++
      if (c.closed === 1) g[k].won++
    })
    return Object.values(g)
      .map(v => ({ ...v, winRate: Math.round(v.won / v.total * 100) }))
      .sort((a, b) => b.winRate - a.winRate)
  }, [clients])

  const sentimientoInsight = useMemo(() => {
    if (bySentimiento.length < 2) return null
    const best = bySentimiento[0], worst = bySentimiento[bySentimiento.length - 1]
    const spread = best.winRate - worst.winRate
    const entusiasta = bySentimiento.find(s => s.name === 'Entusiasta')
    const esceptico = bySentimiento.find(s => s.name === 'Escéptico')
    if (entusiasta && esceptico && entusiasta.winRate - esceptico.winRate >= 20) return {
      title: `Entusiasta cierra ${entusiasta.winRate - esceptico.winRate}pp más que Escéptico (${entusiasta.winRate}% vs ${esceptico.winRate}%)`,
      detail: `El sentimiento del prospecto en la reunión predice el resultado con fuerza. ${entusiasta.won} de ${entusiasta.total} entusiastas cerraron. Enseñar al equipo a identificar señales de entusiasmo real (preguntas de implementación, "¿cómo lo usaríamos?") vs interés superficial.`,
    }
    if (spread >= 20) return {
      title: `"${best.name}" cierra ${spread}pp más que "${worst.name}" (${best.winRate}% vs ${worst.winRate}%)`,
      detail: `El sentimiento de la reunión es un predictor claro. ${best.won}/${best.total} deals con sentimiento ${best.name} cerraron. El rep puede usar esto como señal de go/no-go al finalizar la reunión.`,
    }
    return {
      title: `Sentimiento con impacto moderado (${best.name} ${best.winRate}% vs ${worst.name} ${worst.winRate}%)`,
      detail: `La diferencia de ${spread}pp sugiere que el sentimiento influye pero no determina solo. Combinarlo con urgencia y canal da una señal más robusta de probabilidad de cierre.`,
    }
  }, [bySentimiento])

  // ── [6] Deal Complexity ───────────────────────────────────────
  const byDealComplexity = useMemo(() => {
    const g = {}
    clients.forEach(c => {
      const k = c.deal_complexity
      if (k == null) return
      if (!g[k]) g[k] = { level: k, name: `Nivel ${k}`, won: 0, total: 0 }
      g[k].total++
      if (c.closed === 1) g[k].won++
    })
    return Object.values(g)
      .sort((a, b) => a.level - b.level)
      .map(v => ({ ...v, winRate: v.total > 0 ? Math.round(v.won / v.total * 100) : 0 }))
  }, [clients])

  const complexityInsight = useMemo(() => {
    if (byDealComplexity.length < 2) return null
    const sorted = [...byDealComplexity].sort((a, b) => a.level - b.level)
    const low = sorted[0], high = sorted[sorted.length - 1]
    const trend = high.winRate - low.winRate
    if (trend <= -15) return {
      title: `Mayor complejidad destruye conversión: Nivel ${low.level} (${low.winRate}%) → Nivel ${high.level} (${high.winRate}%)`,
      detail: `A medida que sube la complejidad del deal, el win rate cae ${Math.abs(trend)}pp. Los deals complejos requieren más stakeholders, más tiempo de evaluación y más recursos de CS. Calificar la complejidad al inicio para ajustar expectativas de cierre y precio.`,
    }
    if (trend >= 15) return {
      title: `Deals complejos cierran mejor — señal de alineación con el producto`,
      detail: `Contra-intuitivo: Nivel ${high.level} cierra ${high.winRate}% vs Nivel ${low.level} ${low.winRate}%. Los clientes con casos de uso más complejos tienen más claro qué necesitan y mayor disposición a pagar. No rechazar leads complejos por default.`,
    }
    return {
      title: `La complejidad no determina el resultado (${low.winRate}% → ${high.winRate}%)`,
      detail: `La diferencia entre niveles es menor a 15pp — otros factores pesan más. Mantener el proceso estándar independientemente de la complejidad declarada.`,
    }
  }, [byDealComplexity])

  // ── [7] Integración × Motivación ─────────────────────────────
  const integMotivacion = useMemo(() => [
    { label: 'Sin integr.\nProactivo',   needsInt: false, reactive: false },
    { label: 'Sin integr.\nReactivo',    needsInt: false, reactive: true },
    { label: 'Con integr.\nProactivo',   needsInt: true,  reactive: false },
    { label: 'Con integr.\nReactivo',    needsInt: true,  reactive: true },
  ].map(combo => {
    const g = clients.filter(c => c.necesita_integracion === combo.needsInt && c.risk_motivacion_reactiva === combo.reactive)
    const won = g.filter(c => c.closed === 1).length
    return { ...combo, won, total: g.length, winRate: g.length > 0 ? Math.round(won / g.length * 100) : 0 }
  }), [clients])

  const integInsight = useMemo(() => {
    const best = [...integMotivacion].sort((a, b) => b.winRate - a.winRate)[0]
    const worst = [...integMotivacion].sort((a, b) => a.winRate - b.winRate)[0]
    const integSi = integMotivacion.filter(c => c.needsInt)
    const integNo = integMotivacion.filter(c => !c.needsInt)
    const wrInteg = integSi.reduce((s, c) => s + c.won, 0) / (integSi.reduce((s, c) => s + c.total, 0) || 1)
    const wrNoInteg = integNo.reduce((s, c) => s + c.won, 0) / (integNo.reduce((s, c) => s + c.total, 0) || 1)
    const diff = Math.round((wrInteg - wrNoInteg) * 100)
    if (Math.abs(diff) >= 10) return {
      title: diff > 0
        ? `Pedir integración es señal positiva: +${diff}pp de win rate`
        : `Pedir integración reduce conversión ${Math.abs(diff)}pp`,
      detail: diff > 0
        ? `Los leads que necesitan integración cierran más — están más comprometidos con la implementación. La combinación ganadora es "${best.label.replace('\n', ' + ')}" con ${best.winRate}%.`
        : `La integración técnica añade fricción que destruye conversión. La combinación con menor éxito es "${worst.label.replace('\n', ' + ')}" (${worst.winRate}%). Simplificar el proceso de integración o mejorar el soporte técnico durante el cierre.`,
    }
    return {
      title: `La combinación ganadora es "${best.label.replace('\n', ' + ')}" (${best.winRate}%)`,
      detail: `Motivación proactiva y decisión de integración se combinan de formas distintas. El perfil "${best.label.replace('\n', ' + ')}" lidera con ${best.won} de ${best.total} cerrados.`,
    }
  }, [integMotivacion])

  // ── [8] Días al cierre ────────────────────────────────────────
  const diasCierre = useMemo(() => {
    const won = clients.filter(c => c.closed === 1 && c.estimated_close_days != null)
    const lost = clients.filter(c => c.closed === 0 && c.estimated_close_days != null)
    const avg = arr => arr.length ? Math.round(arr.reduce((s, c) => s + c.estimated_close_days, 0) / arr.length) : 0
    const buckets = [
      { label: '0–15d', min: 0, max: 15 },
      { label: '16–30d', min: 16, max: 30 },
      { label: '31–45d', min: 31, max: 45 },
      { label: '46d+', min: 46, max: Infinity },
    ]
    return {
      avgWon: avg(won), avgLost: avg(lost),
      dist: buckets.map(b => ({
        label: b.label,
        won: won.filter(c => c.estimated_close_days >= b.min && c.estimated_close_days <= b.max).length,
        lost: lost.filter(c => c.estimated_close_days >= b.min && c.estimated_close_days <= b.max).length,
      })),
    }
  }, [clients])

  const diasInsight = useMemo(() => {
    const { avgWon, avgLost } = diasCierre
    const diff = avgLost - avgWon
    if (diff >= 10) return {
      title: `Los deals ganados cierran ${diff}d antes que los perdidos (${avgWon}d vs ${avgLost}d)`,
      detail: `Los deals que terminan en lost se arrastran ${diff} días más en promedio. Esto sugiere que el equipo invierte tiempo extra en deals que ya están muertos. Definir un SLA de seguimiento: si a los ${avgWon + 10}d no hay avance, mover a nurturing y liberar el slot del rep.`,
    }
    if (diff <= -5) return {
      title: `Los deals perdidos cierran más rápido — posible cierre prematuro`,
      detail: `Los lost se resuelven en ${avgLost}d vs ${avgWon}d para los won. Algunos deals se están cerrando como perdidos demasiado rápido, antes de dar tiempo al prospecto a evaluar bien. Revisar el proceso de seguimiento post-reunión.`,
    }
    return {
      title: `Ciclo de venta similar entre won (${avgWon}d) y lost (${avgLost}d)`,
      detail: `El tiempo no diferencia el resultado. El foco debe estar en la calidad del seguimiento, no en la velocidad. Medir acciones de seguimiento (emails, llamadas) en lugar de días.`,
    }
  }, [diasCierre])

  // ── [9] Feature valorada ──────────────────────────────────────
  const byFeature = useMemo(() => {
    const g = {}
    clients.forEach(c => {
      const k = c.feature_valorada || 'Sin dato'
      if (!g[k]) g[k] = { name: k, won: 0, total: 0 }
      g[k].total++
      if (c.closed === 1) g[k].won++
    })
    return Object.values(g)
      .map(v => ({ ...v, winRate: Math.round(v.won / v.total * 100) }))
      .sort((a, b) => b.winRate - a.winRate)
  }, [clients])

  const featureInsight = useMemo(() => {
    if (byFeature.length < 2) return null
    const best = byFeature[0], worst = byFeature[byFeature.length - 1]
    const spread = best.winRate - worst.winRate
    if (spread >= 20) return {
      title: `Demostrar "${best.name}" cierra ${spread}pp más que "${worst.name}"`,
      detail: `${best.won}/${best.total} deals donde se valoró "${best.name}" cerraron (${best.winRate}%). "${worst.name}" solo logró ${worst.winRate}% (${worst.won}/${worst.total}). El playbook de demo debería abrir con "${best.name}" en los primeros 10 minutos para crear el momento Aha antes de mostrar el resto.`,
    }
    return {
      title: `"${best.name}" lidera conversión con ${best.winRate}% (${best.total} deals)`,
      detail: `Esta feature genera el mayor engagement en reuniones de venta. Considerar destacarla en materiales de prospección y en el mensaje de outreach para atraer leads que ya valorarán este diferenciador.`,
    }
  }, [byFeature])

  // ── [10] Objeciones ───────────────────────────────────────────
  const objeciones = useMemo(() => {
    const sinObj = clients.filter(c => !c.objeciones?.length || c.objeciones.every(o => o === 'Ninguna'))
    const conObj = clients.filter(c => c.objeciones?.some(o => o && o !== 'Ninguna'))
    const wr = arr => arr.length ? Math.round(arr.filter(c => c.closed === 1).length / arr.length * 100) : 0
    const types = {}
    clients.forEach(c => {
      (c.objeciones || []).forEach(o => {
        if (!o || o === 'Ninguna') return
        if (!types[o]) types[o] = { name: o, won: 0, total: 0 }
        types[o].total++
        if (c.closed === 1) types[o].won++
      })
    })
    return {
      bars: [
        { name: 'Sin objeción', winRate: wr(sinObj), n: sinObj.length },
        { name: 'Con objeción', winRate: wr(conObj), n: conObj.length },
      ],
      byType: Object.values(types)
        .map(t => ({ ...t, winRate: Math.round(t.won / t.total * 100) }))
        .sort((a, b) => b.total - a.total),
      wrSin: wr(sinObj), wrCon: wr(conObj),
      nSin: sinObj.length, nCon: conObj.length,
    }
  }, [clients])

  const objecionesInsight = useMemo(() => {
    const { wrSin, wrCon, nSin, nCon } = objeciones
    const diff = wrCon - wrSin
    if (diff >= 10) return {
      title: `Tener objeciones aumenta la conversión ${diff}pp (${wrCon}% vs ${wrSin}%)`,
      detail: `Contra-intuitivo: los prospects que objetan cierran más. Objetar es señal de engagement real — el prospect está evaluando en serio. El equipo no debería temer las objeciones sino provocarlas activamente en el proceso de venta.`,
    }
    if (diff <= -10) return {
      title: `Sin objeción cierra ${Math.abs(diff)}pp más (${wrSin}% vs ${wrCon}%)`,
      detail: `Los deals sin objeciones cierran más (${nSin} leads, ${wrSin}%). Cuando aparece una objeción, el win rate cae a ${wrCon}% (${nCon} leads). Mejorar el manejo de objeciones o adelantarlas en el pitch antes de que el prospect las exprese.`,
    }
    return {
      title: `Las objeciones no determinan el resultado (${wrSin}% sin vs ${wrCon}% con)`,
      detail: `La diferencia de ${Math.abs(diff)}pp no es concluyente. Lo que importa no es si hay objeción, sino cómo se maneja. Cruzar con el vendedor para ver quién resuelve objeciones mejor.`,
    }
  }, [objeciones])

  const globalWR = kpis.winRate

  return (
    <div>
      <h1 className="text-2xl font-bold text-text mb-6">Inteligencia Comercial</h1>

      <Filters searchQuery={searchQuery} onSearch={setSearchQuery} onClearAll={clearAll} filters={filters} onFilter={setFilter} totalFiltered={clients.length} />

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4 mb-2">
        <KPICard label="Total leads" value={kpis.total} sub={`${kpis.won} cerrados`} />
        <KPICard label="Win Rate" value={`${kpis.winRate}%`} sub="sobre total de leads" />
        <KPICard label="ACV promedio (won)" value={fmt(kpis.avgACV)} sub="anualizado" />
        <KPICard label="Días promedio al cierre" value={`${kpis.avgDays}d`} sub="solo deals cerrados" />
      </div>

      {/* ── Sección 1: Evolución del Pipeline ── */}
      <SectionDivider title="Evolución del Pipeline" />

      <ChartCard
        title="Tendencia mensual"
        subtitle="Volumen de deals por mes (barras) y win rate % (línea)"
        insight={monthlyInsight}
      >
        <div className="space-y-0">
          {/* Panel superior: barras */}
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={monthlyData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} width={24} />
              <Tooltip content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null
                const d = payload[0]?.payload
                return <TBox lines={[label, `Won: ${d.won}`, `Lost: ${d.lost}`, `Total: ${d.total}`]} />
              }} />
              <Bar dataKey="won" stackId="a" fill={C.brand} name="Won" />
              <Bar dataKey="lost" stackId="a" fill={C.soft} name="Lost" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          {/* Panel inferior: línea win rate */}
          <ResponsiveContainer width="100%" height={100}>
            <LineChart data={monthlyData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="label" tick={false} axisLine={false} tickLine={false} height={4} />
              <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} width={32} />
              <Tooltip content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null
                return <TBox lines={[label, `Win rate: ${payload[0]?.value}%`]} />
              }} />
              <ReferenceLine y={globalWR} stroke={C.muted} strokeDasharray="4 3" />
              <Line type="monotone" dataKey="winRate" stroke={C.danger} strokeWidth={2} dot={{ r: 4, fill: C.danger, strokeWidth: 0 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* ── Sección 2: Rendimiento del Equipo ── */}
      <SectionDivider title="Rendimiento del Equipo" />

      <div className="grid grid-cols-2 gap-4">
        <ChartCard
          title="Win rate por vendedor"
          subtitle="Ordenado por efectividad · tamaño = número de deals"
          insight={vendedorInsight}
        >
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={byVendedor} layout="vertical" margin={{ top: 4, right: 64, left: 8, bottom: 4 }}>
              <XAxis type="number" domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} width={80} />
              <Tooltip content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const d = payload[0]?.payload
                return <TBox lines={[d.name, `Win rate: ${d.winRate}%`, `${d.won} cerrados de ${d.total}`]} />
              }} />
              <Bar dataKey="winRate" shape={<LollipopBar />} isAnimationActive={false}>
                {byVendedor.map((d, i) => <Cell key={i} fill={wrColor(d.winRate)} />)}
                <LabelList dataKey="winRate" position="right" formatter={v => `${v}%`} style={{ fontSize: 11, fill: '#64748B', fontWeight: 600 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Caso de uso × win rate"
          subtitle="¿Qué use case cierra más?"
          insight={casoUsoInsight}
        >
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={byCasoUso} layout="vertical" margin={{ top: 4, right: 64, left: 8, bottom: 4 }}>
              <XAxis type="number" domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} width={110} />
              <Tooltip content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const d = payload[0]?.payload
                return <TBox lines={[d.name, `Win rate: ${d.winRate}%`, `${d.won} cerrados de ${d.total}`]} />
              }} />
              <Bar dataKey="winRate" shape={<LollipopBar />} isAnimationActive={false}>
                {byCasoUso.map((d, i) => <Cell key={i} fill={wrColor(d.winRate)} />)}
                <LabelList dataKey="winRate" position="right" formatter={v => `${v}%`} style={{ fontSize: 11, fill: '#64748B', fontWeight: 600 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ── Sección 3: Perfil del Comprador ── */}
      <SectionDivider title="Perfil del Comprador" />

      <div className="grid grid-cols-2 gap-4">
        <ChartCard
          title="Urgencia × win rate"
          subtitle="¿La urgencia declarada en la reunión predice el cierre? Línea punteada = promedio global"
          insight={urgenciaInsight}
        >
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={byUrgencia} margin={{ top: 16, right: 48, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748B' }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <Tooltip content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const d = payload[0]?.payload
                return <TBox lines={[d.name, `Win rate: ${d.winRate}%`, `${d.won} cerrados de ${d.total}`]} />
              }} />
              <ReferenceLine y={globalWR} stroke={C.muted} strokeDasharray="4 3" label={{ value: `${globalWR}% avg`, position: 'right', fontSize: 10, fill: C.muted }} />
              <Line type="monotone" dataKey="winRate" stroke={C.brand} strokeWidth={2.5} dot={{ r: 7, fill: C.brand, stroke: 'white', strokeWidth: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Sentimiento × win rate"
          subtitle="¿Cómo se fue el prospecto de la reunión?"
          insight={sentimientoInsight}
        >
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={bySentimiento} layout="vertical" margin={{ top: 4, right: 64, left: 8, bottom: 4 }}>
              <XAxis type="number" domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} width={80} />
              <Tooltip content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const d = payload[0]?.payload
                return <TBox lines={[d.name, `Win rate: ${d.winRate}%`, `${d.won} cerrados de ${d.total}`]} />
              }} />
              <Bar dataKey="winRate" shape={<LollipopBar />} isAnimationActive={false}>
                {bySentimiento.map((d, i) => <Cell key={i} fill={wrColor(d.winRate)} />)}
                <LabelList dataKey="winRate" position="right" formatter={v => `${v}%`} style={{ fontSize: 11, fill: '#64748B', fontWeight: 600 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ── Sección 4: Análisis del Deal ── */}
      <SectionDivider title="Análisis del Deal" />

      <ChartCard
        title="Complejidad del deal × win rate"
        subtitle="¿Más complejidad destruye la conversión? Nivel 0 = simple, Nivel 3 = alto stakeholders y requerimientos. Línea punteada = promedio global"
        insight={complexityInsight}
        methodology="Deal Complexity es un score 0-3 asignado por IA evaluando número de stakeholders involucrados, requerimientos técnicos, integraciones necesarias y tiempo de evaluación."
      >
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={byDealComplexity} margin={{ top: 16, right: 40, left: 8, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
            <Tooltip content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const d = payload[0]?.payload
              return <TBox lines={[d.name, `Win rate: ${d.winRate}%`, `${d.won} cerrados de ${d.total}`]} />
            }} />
            <ReferenceLine y={globalWR} stroke={C.muted} strokeDasharray="4 3" label={{ value: `${globalWR}% avg`, position: 'right', fontSize: 10, fill: C.muted }} />
            <Line type="monotone" dataKey="winRate" stroke={C.brand} strokeWidth={2.5} dot={{ r: 6, fill: C.brand, stroke: 'white', strokeWidth: 2 }} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="grid grid-cols-2 gap-4 mt-4">
        <ChartCard
          title="Integración × Motivación"
          subtitle="Combinación de factores de riesgo técnico y de compra"
          insight={integInsight}
          methodology="Necesita integración: extraído por IA de la transcripción. Motivación reactiva: IA evalúa si el prospecto busca solución a un problema urgente (reactivo) o está explorando mejoras (proactivo)."
        >
          <div className="mt-2">
            <div className="grid grid-cols-3 gap-px bg-border rounded-lg overflow-hidden text-sm">
              {/* Header row */}
              <div className="bg-bg px-3 py-2" />
              <div className="bg-bg px-3 py-2 text-xs font-semibold text-text-muted text-center">Proactivo</div>
              <div className="bg-bg px-3 py-2 text-xs font-semibold text-text-muted text-center">Reactivo</div>
              {/* Row: Sin integración */}
              <div className="bg-bg px-3 py-3 text-xs font-medium text-text-secondary flex items-center">Sin integración</div>
              {integMotivacion.filter(d => !d.needsInt).map((d, i) => (
                <div key={i} className="px-3 py-3 text-center" style={{ backgroundColor: d.total === 0 ? '#F8FAFC' : wrColor(d.winRate) + '22' }}>
                  <p className="text-xl font-bold" style={{ color: d.total === 0 ? C.muted : wrColor(d.winRate) }}>
                    {d.total === 0 ? '—' : `${d.winRate}%`}
                  </p>
                  <p className="text-[11px] text-text-muted mt-0.5">{d.total} leads</p>
                </div>
              ))}
              {/* Row: Con integración */}
              <div className="bg-bg px-3 py-3 text-xs font-medium text-text-secondary flex items-center">Con integración</div>
              {integMotivacion.filter(d => d.needsInt).map((d, i) => (
                <div key={i} className="px-3 py-3 text-center" style={{ backgroundColor: d.total === 0 ? '#F8FAFC' : wrColor(d.winRate) + '22' }}>
                  <p className="text-xl font-bold" style={{ color: d.total === 0 ? C.muted : wrColor(d.winRate) }}>
                    {d.total === 0 ? '—' : `${d.winRate}%`}
                  </p>
                  <p className="text-[11px] text-text-muted mt-0.5">{d.total} leads</p>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-text-muted mt-2">Win rate por celda · promedio global {globalWR}%</p>
          </div>
        </ChartCard>

        <ChartCard
          title="Días estimados al cierre — Won vs Lost"
          subtitle="¿Cuánto tiempo tarda cada resultado?"
          insight={diasInsight}
        >
          <div className="flex items-stretch gap-4 mb-5 mt-1">
            <div className="flex-1 bg-success/8 rounded-xl p-4 text-center">
              <p className="text-xs text-text-muted mb-1">Promedio Won</p>
              <p className="text-4xl font-bold text-success">{diasCierre.avgWon}<span className="text-xl font-medium">d</span></p>
            </div>
            <div className="flex-1 bg-danger/8 rounded-xl p-4 text-center">
              <p className="text-xs text-text-muted mb-1">Promedio Lost</p>
              <p className="text-4xl font-bold text-danger">{diasCierre.avgLost}<span className="text-xl font-medium">d</span></p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={diasCierre.dist} margin={{ top: 4, right: 8, left: 8, bottom: 4 }} barCategoryGap="25%">
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} width={20} />
              <Tooltip content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null
                return <TBox lines={[label, `Won: ${payload.find(p=>p.dataKey==='won')?.value||0}`, `Lost: ${payload.find(p=>p.dataKey==='lost')?.value||0}`]} />
              }} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Bar dataKey="won" fill={C.brand} name="Won" radius={[3, 3, 0, 0]} />
              <Bar dataKey="lost" fill={C.soft} name="Lost" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ── Sección 5: Palancas del Cierre ── */}
      <SectionDivider title="Palancas del Cierre" />

      <div className="grid grid-cols-2 gap-4">
        <ChartCard
          title="Feature valorada × win rate"
          subtitle="¿Qué demo cierra más?"
          insight={featureInsight}
          methodology="Feature valorada: extraída por IA de la transcripción. El LLM identifica qué capacidad de Vambe generó más interés durante la reunión."
        >
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={byFeature} margin={{ top: 20, right: 8, left: 8, bottom: 8 }} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="short" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} width={30} />
              <Tooltip content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const d = payload[0]?.payload
                return <TBox lines={[d.name, `Win rate: ${d.winRate}%`, `${d.won} cerrados de ${d.total}`]} />
              }} />
              <Bar dataKey="winRate" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                {byFeature.map((d, i) => <Cell key={i} fill={wrColor(d.winRate)} />)}
                <LabelList dataKey="winRate" position="top" formatter={v => `${v}%`} style={{ fontSize: 12, fontWeight: 700, fill: '#334155' }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Objeciones × resultado"
          subtitle="¿Las objeciones matan el deal o son señal de interés real?"
          insight={objecionesInsight}
        >
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={objeciones.bars} margin={{ top: 8, right: 32, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <Tooltip content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const d = payload[0]?.payload
                return <TBox lines={[d.name, `Win rate: ${d.winRate}%`, `${d.n} leads`]} />
              }} />
              <Bar dataKey="winRate" radius={[4, 4, 0, 0]}>
                {objeciones.bars.map((d, i) => <Cell key={i} fill={wrColor(d.winRate)} />)}
                <LabelList dataKey="winRate" position="top" formatter={v => `${v}%`} style={{ fontSize: 12, fontWeight: 700, fill: '#334155' }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          {objeciones.byType.length > 0 && (
            <div className="mt-3 pt-3 border-t border-border">
              <p className="text-xs font-medium text-text-muted mb-2">Por tipo de objeción</p>
              <div className="space-y-1.5">
                {objeciones.byType.map((t, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="text-text-secondary truncate flex-1">{t.name}</span>
                    <span className="text-text-muted ml-2 shrink-0">{t.total} leads</span>
                    <span className="font-semibold ml-3 shrink-0" style={{ color: wrColor(t.winRate) }}>{t.winRate}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </ChartCard>
      </div>
    </div>
  )
}
