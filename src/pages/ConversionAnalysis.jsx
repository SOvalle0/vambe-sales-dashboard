import { useState, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Cell, LabelList, ComposedChart, Line,
  ReferenceLine, LineChart, Legend,
} from 'recharts'
import { Target, TrendingUp, DollarSign, Clock } from 'lucide-react'
import KPICard from '../components/KPICard'
import ChartCard from '../components/ChartCard'
import Filters from '../components/Filters'
import useFilteredClients from '../hooks/useFilteredClients'
import AccionesRecomendadas from '../components/AccionesRecomendadas'
import { fmt } from '../lib/format'
import { LollipopBar, TBox } from '../lib/charts'

// ── Constants ────────────────────────────────────────────────────
const C = {
  brand:   '#2563EB',
  success: '#16A34A',
  danger:  '#DC2626',
  warning: '#D97706',
  muted:   '#94A3B8',
  soft:    '#F1F5F9',
}

function wrColor(pct) {
  if (pct >= 70) return C.success
  if (pct >= 50) return C.warning
  return C.danger
}

function SectionDivider({ title }) {
  return (
    <div className="flex items-center gap-4 my-8">
      <div className="h-px flex-1" style={{ background: 'linear-gradient(to right, transparent, #E2E8F0)' }} />
      <span className="text-[10px] font-bold text-text-muted uppercase tracking-[0.25em] whitespace-nowrap px-1">{title}</span>
      <div className="h-px flex-1" style={{ background: 'linear-gradient(to left, transparent, #E2E8F0)' }} />
    </div>
  )
}

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

  // ── Tendencia mensual ──────────────────────────────────────
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
    if (monthlyData.length < 2) return ""
    const last3 = monthlyData.slice(-3)
    const first3 = monthlyData.slice(0, 3)
    const avgLast = Math.round(last3.reduce((s, m) => s + m.winRate, 0) / last3.length)
    const avgFirst = Math.round(first3.reduce((s, m) => s + m.winRate, 0) / first3.length)
    const diff = avgLast - avgFirst
    if (diff > 0) return `Win rate mejora ${diff}pp en los últimos meses (${avgFirst}% → ${avgLast}%). La tendencia positiva sugiere que los ajustes en el pitch están funcionando.`
    return `Win rate estable o con ligera caída (${avgFirst}% → ${avgLast}%). Analizar calidad de leads por canal.`
  }, [monthlyData])

  // ── Win rate por vendedor ──────────────────────────────────
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
    if (byVendedor.length < 2) return ""
    const best = byVendedor[0], worst = byVendedor[byVendedor.length - 1]
    return `Brecha de ${best.winRate - worst.winRate}pp entre el mejor y peor desempeño. Oportunidad de coaching directo.`
  }, [byVendedor])

  // ── Caso de uso ───────────────────────────────────────────
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

  // ── Urgencia × win rate ───────────────────────────────────
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

  // ── Sentimiento × win rate ────────────────────────────────
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

  // ── Deal Complexity ───────────────────────────────────────
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

  // ── Días al cierre ────────────────────────────────────────
  const diasCierre = useMemo(() => {
    const won = clients.filter(c => c.closed === 1 && c.estimated_close_days != null)
    const lost = clients.filter(c => c.closed === 0 && c.estimated_close_days != null)
    const buckets = [
      { label: '0–15d', min: 0, max: 15 },
      { label: '16–30d', min: 16, max: 30 },
      { label: '31–45d', min: 31, max: 45 },
      { label: '46d+', min: 46, max: Infinity },
    ]
    return {
      avgWon: won.length ? Math.round(won.reduce((s, c) => s + c.estimated_close_days, 0) / won.length) : 0,
      avgLost: lost.length ? Math.round(lost.reduce((s, c) => s + c.estimated_close_days, 0) / lost.length) : 0,
      dist: buckets.map(b => ({
        label: b.label,
        won: won.filter(c => c.estimated_close_days >= b.min && c.estimated_close_days <= b.max).length,
        lost: lost.filter(c => c.estimated_close_days >= b.min && c.estimated_close_days <= b.max).length,
      })),
    }
  }, [clients])

  // ── Feature valorada ──────────────────────────────────────
  const FEATURE_SHORT = {
    'Automatización de respuestas': 'Automatización',
    'Personalización del tono de marca': 'Personalización',
    'Integración con sistemas existentes': 'Integración',
    'Escalabilidad en picos de demanda': 'Escalabilidad',
    'Clasificación inteligente de consultas': 'Clasificación IA',
    'Respuestas en tiempo real': 'Tiempo real',
  }
  const byFeature = useMemo(() => {
    const g = {}
    clients.forEach(c => {
      const k = c.feature_valorada || 'Sin dato'
      const short = FEATURE_SHORT[k] || (k.length > 14 ? k.slice(0, 14) + '…' : k)
      if (!g[k]) g[k] = { name: k, short, won: 0, total: 0 }
      g[k].total++
      if (c.closed === 1) g[k].won++
    })
    return Object.values(g)
      .map(v => ({ ...v, winRate: Math.round(v.won / v.total * 100) }))
      .sort((a, b) => b.winRate - a.winRate)
  }, [clients])

  // ── Objeciones ───────────────────────────────────────────
  const objeciones = useMemo(() => {
    const sinObj = clients.filter(c => !c.objeciones?.length || c.objeciones.every(o => o === 'Ninguna'))
    const conObj = clients.filter(c => c.objeciones?.some(o => o && o !== 'Ninguna'))
    const wr = arr => arr.length ? Math.round(arr.filter(c => c.closed === 1).length / arr.length * 100) : 0
    return {
      bars: [
        { name: 'Sin objeción', winRate: wr(sinObj), n: sinObj.length },
        { name: 'Con objeción', winRate: wr(conObj), n: conObj.length },
      ],
      wrSin: wr(sinObj), wrCon: wr(conObj)
    }
  }, [clients])

  const acciones = useMemo(() => {
    const bestVendedor = byVendedor[0]
    const worstVendedor = byVendedor[byVendedor.length - 1]
    const bestFeature = byFeature[0]
    const altaUrgencia = byUrgencia.find(u => u.name === 'Alta')
    const entusiasta = bySentimiento.find(s => s.name === 'Entusiasta')
    const interesado = bySentimiento.find(s => s.name === 'Interesado')
    const sinObj = objeciones.wrSin
    const conObj = objeciones.wrCon
    return [
      {
        prioridad: 'ALTA', tema: 'Equipo', icon: '🏆', titulo: 'Replicar el playbook del mejor vendedor',
        texto: bestVendedor && worstVendedor
          ? `${bestVendedor.name} cierra al ${bestVendedor.winRate}% vs ${worstVendedor.name} al ${worstVendedor.winRate}%. Brecha de ${bestVendedor.winRate - worstVendedor.winRate}pp. Documentar el proceso del top performer.`
          : 'Analizar brecha entre vendedores para transferir mejores prácticas.',
      },
      {
        prioridad: 'ALTA', tema: 'Demo', icon: '⚡', titulo: `Priorizar demo de "${bestFeature?.short || 'la feature top'}"`,
        texto: bestFeature
          ? `La feature "${bestFeature.name}" tiene el mayor win rate (${bestFeature.winRate}%). Incorporarla como apertura estándar en todas las demos.`
          : 'Identificar la feature con mayor tasa de conversión y centrar el pitch en ella.',
      },
      {
        prioridad: 'ALTA', tema: 'Objeciones', icon: '🛡️', titulo: sinObj > conObj ? 'Las objeciones reducen el cierre — manejarlas proactivamente' : 'Las objeciones son señal de interés — capitalizar',
        texto: `Deals sin objeción cierran al ${sinObj}% vs con objeción al ${conObj}%. ${sinObj > conObj ? 'Entrenar al equipo en manejo temprano de objeciones para no llegar al cierre con resistencia.' : 'El prospecto que objeta está evaluando seriamente. Preparar respuestas sólidas para cada tipo.'}`,
      },
      {
        prioridad: 'MEDIA', tema: 'Leads', icon: '🎯', titulo: 'Recalibrar la calificación por urgencia y sentimiento',
        texto: altaUrgencia && entusiasta
          ? `Alta urgencia cierra al ${altaUrgencia.winRate}% — no siempre el mejor predictor. Sentimiento "Entusiasta" cierra al ${entusiasta.winRate}%. Combinar ambas señales para priorizar pipeline.`
          : 'Usar urgencia y sentimiento como señales combinadas de calificación.',
      },
      {
        prioridad: 'MEDIA', tema: 'Ciclo', icon: '⏱️', titulo: `Cerrar en menos de ${diasCierre.avgWon} días — el umbral de los Won`,
        texto: `Los deals que cierran lo hacen en promedio en ${diasCierre.avgWon} días. Los perdidos se extienden ${diasCierre.avgLost} días. Implementar un límite de seguimiento activo a los ${diasCierre.avgWon + 5} días.`,
      },
      {
        prioridad: 'BAJA', tema: 'Proceso', icon: '📋', titulo: 'Documentar casos de uso con mayor tasa de conversión',
        texto: byCasoUso[0]
          ? `El caso "${byCasoUso[0].name}" lidera con ${byCasoUso[0].winRate}% win rate. Crear materiales específicos para posicionar mejor este caso en el discurso comercial.`
          : 'Mapear qué casos de uso generan más conversiones para afinar el pitch.',
      },
    ]
  }, [byVendedor, byFeature, byUrgencia, bySentimiento, objeciones, diasCierre, byCasoUso])

  return (
    <div className="animate-in fade-in duration-500">
      <div className="page-title-wrap"><h1 className="text-2xl font-bold mb-1 text-text">Conversion Intelligence</h1></div>
      <p className="text-sm text-text-secondary mb-6">¿Por qué cerramos lo que cerramos? Análisis de efectividad y ciclo de venta.</p>

      <Filters searchQuery={searchQuery} onSearch={setSearchQuery} onClearAll={clearAll} filters={filters} onFilter={setFilter} totalFiltered={clients.length} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KPICard icon={Target}     title="Win Rate Global" rawValue={kpis.winRate} value={`${kpis.winRate}%`} subtitle={`${kpis.won} de ${kpis.total} leads`} />
        <KPICard icon={TrendingUp} title="ACV Promedio"   rawValue={kpis.avgACV}  value={fmt(kpis.avgACV)}   subtitle="Deals ganados" />
        <KPICard icon={Clock}      title="Ciclo de Venta"  rawValue={kpis.avgDays} value={`${kpis.avgDays}d`}  subtitle="Días promedio al cierre" />
        <KPICard icon={DollarSign} title="Total Won"       rawValue={kpis.won}     value={kpis.won}           subtitle="Contratos ejecutados" />
      </div>

      <SectionDivider title="Evolución y Tendencias" />

      <ChartCard
        title="Win Rate & Volumen"
        subtitle="Efectividad de cierre por mes"
        accentColor={C.brand}
        isAI
        insight={monthlyInsight}
        methodology="Barras: Total de leads reunidos. Línea: % de esos leads que terminaron en Won."
      >
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={monthlyData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
              <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
              <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} unit="%" />
              <Tooltip />
              <Bar yAxisId="left" dataKey="total" fill={C.soft} radius={[4, 4, 0, 0]} name="Leads" />
              <Line yAxisId="right" type="monotone" dataKey="winRate" stroke={C.brand} strokeWidth={3} dot={{ r: 5, fill: C.brand, strokeWidth: 2, stroke: 'white' }} name="Win Rate %" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <SectionDivider title="Rendimiento del Equipo" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <ChartCard
          title="Vendedores → Win Rate"
          subtitle="Efectividad por ejecutivo"
          accentColor={C.success}
          insight={vendedorInsight}
          methodology="Porcentaje de Deals Won sobre el total de leads asignados a cada vendedor."
        >
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byVendedor} layout="vertical" margin={{ left: 20, right: 40 }}>
                <XAxis type="number" domain={[0, 100]} hide />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={80} />
                <Bar dataKey="winRate" shape={<LollipopBar r={7} />}>
                  {byVendedor.map((d, i) => <Cell key={i} fill={wrColor(d.winRate)} />)}
                  <LabelList dataKey="winRate" position="right" formatter={v => `${v}%`} style={{ fontSize: 11, fontWeight: 700 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard
          title="Caso de Uso → Conversión"
          subtitle="Segmentos con mejor encaje"
          accentColor={C.warning}
          insight={(() => {
            if (!byCasoUso.length) return ''
            const best = byCasoUso[0]
            const worst = byCasoUso[byCasoUso.length - 1]
            if (byCasoUso.length < 2) return `"${best.name}" es el único caso de uso con ${best.winRate}% win rate.`
            return `"${best.name}" lidera con ${best.winRate}% de conversión. "${worst.name}" es el más débil (${worst.winRate}%). Concentrar el pitch en el caso ganador.`
          })()}
          methodology="Clasificación del dolor principal detectado en la primera reunión."
        >
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byCasoUso} layout="vertical" margin={{ left: 40, right: 40 }}>
                <XAxis type="number" domain={[0, 100]} hide />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} />
                <Bar dataKey="winRate" radius={[0, 4, 4, 0]}>
                  {byCasoUso.map((d, i) => <Cell key={i} fill={wrColor(d.winRate)} />)}
                  <LabelList dataKey="winRate" position="right" formatter={v => `${v}%`} style={{ fontSize: 11, fontWeight: 700 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      <SectionDivider title="Psicología del Cierre" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <ChartCard
          title="Urgencia × Win Rate"
          accentColor={C.danger}
          insight={(() => {
            if (byUrgencia.length < 2) return ''
            const alta = byUrgencia.find(u => u.name === 'Alta')
            const baja = byUrgencia.find(u => u.name === 'Baja')
            if (!alta || !baja) return ''
            if (alta.winRate > baja.winRate)
              return `Urgencia alta convierte mejor: ${alta.winRate}% vs ${baja.winRate}%. El apuro genuino del lead acelera la decisión.`
            return `Urgencia alta no predice cierre (${alta.winRate}%). El lead urgente puede estar comparando precios — calificar mejor antes de invertir tiempo.`
          })()}
          methodology="Evaluación de timing declarada por el lead."
        >
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={byUrgencia} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis hide domain={[0, 100]} />
                <Tooltip />
                <Line type="monotone" dataKey="winRate" stroke={C.danger} strokeWidth={3} dot={{ r: 6, fill: C.danger, strokeWidth: 2, stroke: 'white' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard
          title="Sentimiento × Win Rate"
          accentColor={C.brand}
          insight={(() => {
            if (bySentimiento.length < 2) return ''
            const best = bySentimiento[0]
            const worst = bySentimiento[bySentimiento.length - 1]
            return `Sentimiento "${best.name}" cierra al ${best.winRate}% vs "${worst.name}" al ${worst.winRate}%. Brecha de ${best.winRate - worst.winRate}pp — el estado emocional es una señal de calificación válida.`
          })()}
          methodology="Clasificación emocional de la reunión (IA)."
        >
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bySentimiento} layout="vertical">
                <XAxis type="number" domain={[0, 100]} hide />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
                <Bar dataKey="winRate" radius={[0, 4, 4, 0]}>
                  {bySentimiento.map((d, i) => <Cell key={i} fill={wrColor(d.winRate)} />)}
                  <LabelList dataKey="winRate" position="right" formatter={v => `${v}%`} style={{ fontSize: 10, fontWeight: 700 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard
          title="Objeciones"
          accentColor={C.muted}
          insight={(() => {
            const { wrSin, wrCon } = objeciones
            const diff = wrSin - wrCon
            if (diff > 0)
              return `Sin objeción cierra ${diff}pp más (${wrSin}% vs ${wrCon}%). El silencio del lead es una señal positiva — no forzar conversación cuando no hay resistencia.`
            return `Los leads que objetan cierran igual o mejor (${wrCon}% vs ${wrSin}%). Las objeciones son señal de evaluación activa — entrenar al equipo para capitalizarlas.`
          })()}
          methodology="Impacto de la resistencia en el win rate."
        >
          <div className="space-y-6 pt-4">
            {objeciones.bars.map((b, i) => (
              <div key={i}>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="font-medium text-text-secondary">{b.name}</span>
                  <span className="font-bold" style={{ color: wrColor(b.winRate) }}>{b.winRate}% WR</span>
                </div>
                <div className="h-4 bg-bg rounded-full overflow-hidden border border-border">
                  <div className="h-full transition-all duration-1000" style={{ width: `${b.winRate}%`, backgroundColor: wrColor(b.winRate) }} />
                </div>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      <SectionDivider title="Ciclo de Vida" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <ChartCard
          title="Complejidad vs Conversión"
          accentColor="#64748B"
          insight={(() => {
            if (byDealComplexity.length < 2) return ''
            const low  = byDealComplexity[0]
            const high = byDealComplexity[byDealComplexity.length - 1]
            const diff = low.winRate - high.winRate
            if (diff > 10)
              return `A mayor complejidad, menos conversión: Nivel ${low.level} cierra al ${low.winRate}% vs Nivel ${high.level} al ${high.winRate}% (-${diff}pp). Deals complejos necesitan Sales Engineering o descuento de cierre.`
            return `La complejidad técnica no destruye conversión (Nivel ${low.level}: ${low.winRate}% vs Nivel ${high.level}: ${high.winRate}%). El equipo maneja bien deals técnicos.`
          })()}
          methodology="Correlación entre dificultad técnica y probabilidad de cierre."
        >
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={byDealComplexity}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} axisLine={false} tickLine={false} unit="%" />
                <Tooltip />
                <Line type="stepAfter" dataKey="winRate" stroke="#64748B" strokeWidth={3} dot={{ r: 5, fill: '#64748B', strokeWidth: 2, stroke: 'white' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard
          title="Distribución Días al Cierre"
          accentColor={C.success}
          insight={(() => {
            const { avgWon, avgLost } = diasCierre
            if (!avgWon && !avgLost) return ''
            const diff = avgLost - avgWon
            if (diff > 5)
              return `Won cierra en ${avgWon}d en promedio, Lost en ${avgLost}d (+${diff}d). Los deals que se prolongan más allá de ${avgWon + 10}d tienen probabilidad decreciente de cerrarse — implementar límite de seguimiento activo.`
            return `Ciclo de venta similar entre Won (${avgWon}d) y Lost (${avgLost}d). El tiempo invertido no predice cierre; calificar por señales de urgencia y sentimiento.`
          })()}
          methodology="Ciclo de venta Won vs Lost."
        >
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={diasCierre.dist}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="label" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip />
                <Legend iconType="circle" />
                <Bar dataKey="won" name="Ganados" fill={C.success} radius={[4, 4, 0, 0]} />
                <Bar dataKey="lost" name="Perdidos" fill={C.soft} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      <AccionesRecomendadas acciones={acciones} />
    </div>
  )
}
