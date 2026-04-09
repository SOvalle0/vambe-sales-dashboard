import { useState } from 'react'
import { DollarSign, Star, BarChart2, Clock } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ScatterChart, Scatter, ZAxis, Cell, CartesianGrid, Legend,
  ReferenceLine,
} from 'recharts'
import KPICard from '../components/KPICard'
import Filters from '../components/Filters'
import useFilteredClients from '../hooks/useFilteredClients'

const fmt = (n) => {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`
  return `$${n}`
}

const CURRENCY_NAMES = new Set(['Valor', 'ACV', 'Won', 'Lost'])

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  const row = payload[0]?.payload
  return (
    <div className="bg-surface border border-border rounded-lg px-3 py-2 shadow-md text-sm">
      <p className="font-medium text-text">{label || row?.nombre || row?.name}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-text-secondary">
          {p.name}: {typeof p.value === 'number' && CURRENCY_NAMES.has(p.name)
            ? fmt(p.value) : p.value}
        </p>
      ))}
      {row?.rate !== undefined && (
        <p className="text-brand font-medium">Win Rate: {row.rate}%</p>
      )}
    </div>
  )
}

const ScatterTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  if (!d) return null
  return (
    <div className="bg-surface border border-border rounded-lg px-3 py-2 shadow-md text-sm max-w-[220px]">
      <p className="font-medium text-text">{d.nombre}</p>
      <p className="text-text-secondary">Readiness: {d.buyer_readiness}/4</p>
      <p className="text-text-secondary">Int. Complexity: {d.integration_complexity}/3</p>
      <p className="text-text-secondary">ACV: {fmt(d.acv_estimado || 0)}</p>
      <p className={d.closed === 1 ? 'text-success font-medium' : 'text-danger font-medium'}>
        {d.closed === 1 ? 'Won' : 'Lost'}
      </p>
    </div>
  )
}

function ChartCard({ title, subtitle, isAI, insight, methodology, children }) {
  const [showMethod, setShowMethod] = useState(false)
  const [showInsight, setShowInsight] = useState(true)
  return (
    <div className="bg-surface border border-border rounded-xl p-5 shadow-sm">
      <div className="flex items-baseline gap-1 mb-1">
        <h2 className="text-lg font-semibold text-text">{title}</h2>
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

// --- Motores de insight ---

function insightScatter(clients) {
  const quickWins = clients.filter(c => c.buyer_readiness >= 2 && c.integration_complexity <= 1)
  const pushHard = clients.filter(c => c.buyer_readiness >= 2 && c.integration_complexity >= 2)
  if (quickWins.length > pushHard.length) {
    return `Sweet spot: ${quickWins.length} leads listos y fáciles de cerrar (Quick Wins). Asegurar esos cierres primero.`
  }
  if (pushHard.length > 0) {
    return `${pushHard.length} deals atractivos (Push Hard) pero retenidos en complejidad técnica. Involucrar Sales Engineering inmediatamente.`
  }
  return 'Distribución equilibrada entre cuadrantes. Priorizar por ACV para maximizar revenue.'
}

function insightVendorPipeline(data) {
  const highLoss = data.find(v => v.total > 0 && (v.lost / v.total) > 0.7)
  if (highLoss) {
    return `Alta fuga de capital detectada en ${highLoss.name}: >70% del valor es Lost. Analizar objeciones y ajustar pitch.`
  }
  return 'Tensión controlada: los equipos rotan la base y liberan capital proyectado constantemente.'
}

function insightCloseDays(data) {
  const totalCount = data.reduce((s, d) => s + d.value, 0)
  const fastBuckets = data.filter(d => {
    const start = parseInt(d.name)
    return start < 20
  })
  const fastPct = totalCount > 0 ? Math.round((fastBuckets.reduce((s, d) => s + d.value, 0) / totalCount) * 100) : 0
  if (fastPct > 60) {
    return `Ciclo comercial rápido: ${fastPct}% de deals cierra en menos de 20 días. Eliminar fricciones contractuales para acelerar aún más.`
  }
  return 'Maduración Enterprise: ciclos largos que necesitan secuencias agresivas de nurturing para evitar olvido post-demo.'
}

function insightPriorityResult(data) {
  const alta = data.find(d => d.name === 'Alta')
  const baja = data.find(d => d.name === 'Baja')
  if (alta && baja) {
    const altaRate = alta.total > 0 ? Math.round((alta.won / alta.total) * 100) : 0
    const bajaRate = baja.total > 0 ? Math.round((baja.won / baja.total) * 100) : 0
    if (altaRate > bajaRate + 10) {
      return `El Priority Score predice exitosamente: Alta prioridad cierra ${altaRate}% vs ${bajaRate}% en Baja. Instruir al equipo a accionar sobre top scores.`
    }
    if (bajaRate >= altaRate) {
      return 'Anomalía: deals de baja prioridad cierran igual o más. Recalibrar parámetros del score.'
    }
  }
  return 'Correlación moderada entre Priority Score y resultado. Usar como guía complementaria, no única.'
}

// --- Componente principal ---

export default function PipelineIntelligence() {
  const { filtered: clients, searchQuery, setSearchQuery, clearAll, filters, setFilter } = useFilteredClients()
  // KPIs
  const flujoTotal = clients.reduce((s, c) => s + (c.acv_estimado || 0), 0)
  const scores = clients.map(c => c.deal_priority_score || 0).sort((a, b) => a - b)
  const p75 = scores[Math.floor(scores.length * 0.75)] || 0
  const dealsAltaPrioridad = clients.filter(c => (c.deal_priority_score || 0) >= p75).length
  const acvProm = clients.length > 0 ? Math.round(flujoTotal / clients.length) : 0
  const avgCloseDays = clients.length > 0
    ? Math.round(clients.reduce((s, c) => s + (c.estimated_close_days || 0), 0) / clients.length)
    : 0

  // Scatter data
  const scatterData = clients.map(c => ({
    nombre: c.nombre,
    buyer_readiness: c.buyer_readiness ?? 0,
    integration_complexity: c.integration_complexity ?? 0,
    acv_estimado: c.acv_estimado ?? 0,
    closed: c.closed,
  }))

  // Vendor pipeline stacked
  const byVendorPipeline = (() => {
    const groups = {}
    clients.forEach(c => {
      const v = c.vendedor || 'Sin dato'
      if (!groups[v]) groups[v] = { name: v, won: 0, lost: 0, total: 0 }
      const acv = c.acv_estimado || 0
      if (c.closed === 1) groups[v].won += acv
      else groups[v].lost += acv
      groups[v].total += acv
    })
    return Object.values(groups).sort((a, b) => b.total - a.total).map(v => ({
      ...v, won: Math.round(v.won), lost: Math.round(v.lost),
      rate: v.total > 0 ? Math.round((v.won / v.total) * 100) : 0,
    }))
  })()

  // Close days histogram
  const closeDaysHist = (() => {
    const buckets = { '7-15': 0, '16-25': 0, '26-35': 0, '36-45': 0, '46-60': 0, '61-90': 0 }
    clients.forEach(c => {
      const d = c.estimated_close_days || 30
      if (d <= 15) buckets['7-15']++
      else if (d <= 25) buckets['16-25']++
      else if (d <= 35) buckets['26-35']++
      else if (d <= 45) buckets['36-45']++
      else if (d <= 60) buckets['46-60']++
      else buckets['61-90']++
    })
    return Object.entries(buckets).map(([name, value]) => ({ name, value }))
  })()

  // Priority × Result (terciles)
  const priorityResult = (() => {
    if (scores.length === 0) return []
    const t1 = scores[Math.floor(scores.length * 0.33)]
    const t2 = scores[Math.floor(scores.length * 0.66)]
    const buckets = { Baja: { won: 0, lost: 0, total: 0 }, Media: { won: 0, lost: 0, total: 0 }, Alta: { won: 0, lost: 0, total: 0 } }
    clients.forEach(c => {
      const s = c.deal_priority_score || 0
      const bucket = s >= t2 ? 'Alta' : s >= t1 ? 'Media' : 'Baja'
      buckets[bucket].total++
      if (c.closed === 1) buckets[bucket].won++
      else buckets[bucket].lost++
    })
    return ['Baja', 'Media', 'Alta'].map(name => {
      const b = buckets[name]
      return {
        name, ...b,
        wonPct: b.total > 0 ? Math.round((b.won / b.total) * 100) : 0,
        lostPct: b.total > 0 ? Math.round((b.lost / b.total) * 100) : 0,
      }
    })
  })()

  return (
    <div>
      <h1 className="text-2xl font-bold text-text mb-1">Inteligencia Comercial</h1>
      <p className="text-sm text-text-secondary mb-6">¿A quién persigo primero? — Priorización operativa diaria</p>

      <Filters searchQuery={searchQuery} onSearch={setSearchQuery} onClearAll={clearAll} filters={filters} onFilter={setFilter} totalFiltered={clients.length} />

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 mb-6 sm:grid-cols-4">
        <KPICard icon={DollarSign} title="Flujo Total" value={fmt(flujoTotal)} subtitle="Oportunidades evaluadas (Won + Lost)" />
        <KPICard icon={Star} title="Alta Prioridad" value={dealsAltaPrioridad} subtitle={`Score ≥ ${p75.toFixed(1)} (P75)`} />
        <KPICard icon={BarChart2} title="ACV Promedio" value={fmt(acvProm)} subtitle="Tamaño promedio del deal" />
        <KPICard icon={Clock} title="Días Prom. al Cierre" value={`~${avgCloseDays}d`} subtitle="Estimado por perfil" />
      </div>

      {/* Fila 1: Scatter + Vendor Pipeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard
          title="Readiness vs Complexity"
          subtitle="Cuadrantes de priorización — tamaño = ACV"
          isAI
          insight={insightScatter(clients)}
          methodology="Gráfico de dispersión: buyer_readiness* (Y) vs integration_complexity* (X). Cuadrantes: Superior-Izq = Quick Wins, Superior-Der = Push Hard, Inferior-Izq = Nurture, Inferior-Der = Deprioritize."
        >
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis type="number" dataKey="integration_complexity" name="Complexity" domain={[0, 3]}
                tick={{ fontSize: 12, fill: '#64748B' }} label={{ value: 'Integration Complexity →', position: 'bottom', fontSize: 11, fill: '#94A3B8' }} />
              <YAxis type="number" dataKey="buyer_readiness" name="Readiness" domain={[0, 4]}
                tick={{ fontSize: 12, fill: '#64748B' }} label={{ value: '← Buyer Readiness', angle: -90, position: 'insideLeft', fontSize: 11, fill: '#94A3B8' }} />
              <ZAxis type="number" dataKey="acv_estimado" range={[40, 400]} />
              <ReferenceLine x={1.5} stroke="#E2E8F0" strokeDasharray="3 3" />
              <ReferenceLine y={2} stroke="#E2E8F0" strokeDasharray="3 3" />
              <Tooltip content={<ScatterTooltip />} />
              <Scatter data={scatterData}>
                {scatterData.map((d, i) => (
                  <Cell key={i} fill={d.closed === 1 ? '#2563EB' : '#DC2626'} fillOpacity={0.7} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-2 text-[11px] text-text-muted justify-center">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-brand inline-block" /> Won</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-danger inline-block" /> Lost</span>
            <span>↖ Quick Wins</span>
            <span>↗ Push Hard</span>
            <span>↙ Nurture</span>
            <span>↘ Deprioritize</span>
          </div>
        </ChartCard>

        <ChartCard
          title="Valor por Vendedor"
          subtitle="ACV acumulado Won (azul) vs Lost (gris)"
          insight={insightVendorPipeline(byVendorPipeline)}
          methodology="Agrupación de sum(acv_estimado) fraccionada por estado para cada vendedor."
        >
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={byVendorPipeline} layout="vertical" barSize={28}>
              <XAxis type="number" tick={{ fontSize: 12, fill: '#64748B' }} tickFormatter={v => fmt(v)} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: '#64748B' }} width={80} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="won" fill="#2563EB" name="Won" stackId="stack" />
              <Bar dataKey="lost" fill="#E2E8F0" name="Lost" stackId="stack" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Fila 2: Días al Cierre + Priority × Resultado */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        <ChartCard
          title="Distribución de Días al Cierre"
          subtitle="Frecuencia por rango de días estimados"
          isAI
          insight={insightCloseDays(closeDaysHist)}
          methodology="Conteo de frecuencias en rangos de estimated_close_days*. Fórmula: 30 - (readiness × 5) + (complexity × 10), clamped 7-90. Es estimación basada en perfil — requiere calibración con datos reales de CRM."
        >
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={closeDaysHist} barSize={40}>
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }} />
              <YAxis tick={{ fontSize: 12, fill: '#64748B' }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" fill="#0EA5E9" name="Deals" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Priority Score × Resultado"
          subtitle="Win Rate por tercil de prioridad (Baja / Media / Alta)"
          isAI
          insight={insightPriorityResult(priorityResult)}
          methodology="Agrupamiento por terciles dinámicos de deal_priority_score*. Se usa percentiles del dataset (no rangos fijos) porque la distribución tiende a concentrarse en valores bajos."
        >
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={priorityResult} barSize={40}>
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748B' }} />
              <YAxis tick={{ fontSize: 12, fill: '#64748B' }} domain={[0, 100]} tickFormatter={v => `${v}%`} />
              <Tooltip content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null
                const d = payload[0]?.payload
                return (
                  <div className="bg-surface border border-border rounded-lg px-3 py-2 shadow-md text-sm">
                    <p className="font-medium text-text">Prioridad {label}</p>
                    <p className="text-success">Won: {d?.won} ({d?.wonPct}%)</p>
                    <p className="text-danger">Lost: {d?.lost} ({d?.lostPct}%)</p>
                    <p className="text-text-secondary">Total: {d?.total}</p>
                  </div>
                )
              }} />
              <Bar dataKey="wonPct" fill="#2563EB" name="% Won" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <p className="text-[11px] text-text-muted mt-4">* Variable derivada del análisis de IA y/o heurísticas de negocio sobre los datos categorizados.</p>
    </div>
  )
}
