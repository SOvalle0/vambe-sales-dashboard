import { Users, TrendingUp, DollarSign, Repeat, AlertTriangle, Target, BarChart2, Sprout } from 'lucide-react'
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import KPICard from '../components/KPICard'
import ChartCard from '../components/ChartCard'
import Filters from '../components/Filters'
import useFilteredClients from '../hooks/useFilteredClients'
import AccionesRecomendadas from '../components/AccionesRecomendadas'

function countBy(arr, key) {
  const counts = {}
  arr.forEach(item => {
    const val = item[key] || 'Sin dato'
    counts[val] = (counts[val] || 0) + 1
  })
  return Object.entries(counts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
}

import { fmt } from '../lib/format'

const CURRENCY_NAMES = new Set(['Valor', 'ACV', 'Revenue', 'MRR', 'Won', 'Lost'])
const COUNT_NAMES = new Set(['Leads', 'Cerrados', 'Perdidos', 'Clientes', 'Reuniones'])

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  const row = payload[0]?.payload
  return (
    <div className="bg-surface border border-border rounded-lg px-3 py-2 shadow-md text-sm">
      <p className="font-medium text-text">{label}</p>
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

// ChartCard importado desde components/ChartCard.jsx

// --- Motores lógicos de insight ---

function insightVendedor(data) {
  if (data.length < 2) return null
  const rates = data.map(v => ({ name: v.name, rate: v.total > 0 ? (v.closed / v.total) * 100 : 0, total: v.total }))
  const sorted = [...rates].sort((a, b) => b.rate - a.rate)
  const best = sorted[0]
  const worst = sorted[sorted.length - 1]
  const gap = best.rate - worst.rate

  if (gap < 10) {
    return "Rendimiento parejo entre vendedores; la tracción final depende del volumen asignado."
  }
  const highVolLowConv = rates.find(v => v.total === Math.max(...rates.map(r => r.total)) && v.rate === Math.min(...rates.map(r => r.rate)))
  if (highVolLowConv) {
    return `${highVolLowConv.name} opera el mayor flujo comercial (${highVolLowConv.total} deals), pero tiene el menor Win Rate (${Math.round(highVolLowConv.rate)}%). Riesgo de cuello de botella.`
  }
  return `${best.name} domina el cierre (${Math.round(best.rate)}% Win Rate). Analizar sus calls para replicar metodología en el resto del equipo.`
}

function insightPipelinePlan(data) {
  const totalWon = data.reduce((s, d) => s + d.won, 0)
  const totalLost = data.reduce((s, d) => s + d.lost, 0)
  const totalAll = totalWon + totalLost
  if (!totalAll) return null

  const worstLoss = [...data].sort((a, b) => b.lost - a.lost)[0]
  if (worstLoss && worstLoss.lost > worstLoss.won && worstLoss.lost > 0) {
    return `${worstLoss.name} pierde más de lo que gana (${fmt(worstLoss.lost)} perdidos vs ${fmt(worstLoss.won)} ganados). Revisar si el pitch está calibrado para ese segmento.`
  }

  const corporate = data.find(d => d.name === 'Corporate')
  const corporatePct = corporate ? Math.round((corporate.won / totalWon) * 100) : 0
  if (corporatePct > 50) {
    return `Revenue ganado concentrado en Corporate (${corporatePct}%). Alta dependencia de cuentas grandes — asegurar asistencia ejecutiva.`
  }
  return `Revenue diversificado entre planes. Sin dependencia crítica de un solo segmento.`
}

function insightPainPoint(data) {
  const total = data.reduce((s, d) => s + d.value, 0)
  const top = data[0]
  if (!top) return null
  const pct = Math.round((top.value / total) * 100)
  if (pct > 40) {
    return `"${top.name}" es el trigger evidente que atrae demanda comercial (${pct}%). Ajustar marketing para explotarlo activamente.`
  }
  return `Mercado divergente: los prospectos manifiestan dolores heterogéneos sin que uno centralice la razón universal de búsqueda.`
}

function insightCasoUso(data) {
  const total = data.reduce((s, d) => s + d.value, 0)
  const top = data[0]
  if (!top) return null
  const pct = Math.round((top.value / total) * 100)
  if (pct > 45) {
    return `"${top.name}" señala consolidación temprana del Product/Market Fit (${pct}% de la demanda).`
  }
  return `Tracción repartida entre múltiples utilidades. El producto corre el riesgo de parecer disperso — foco en casos de uso core.`
}

function insightTimeline(data) {
  if (data.length < 2) return null
  const last = data[data.length - 1]
  const prev = data[data.length - 2]
  const diff = last.value - prev.value
  if (diff > 0) {
    return `Rally de demanda: +${diff} leads en el último mes registrado. Lead Velocity Rate positivo.`
  }
  if (diff < 0) {
    return `Contracción de Lead Velocity de ${diff} leads. El flujo superior del embudo requiere inyección.`
  }
  return `Flujo estable de leads entre los últimos períodos.`
}

function insightTipoEmpresa(data) {
  const total = data.reduce((s, d) => s + d.value, 0)
  const smb = data.filter(d => ['Startup', 'SMB'].includes(d.name)).reduce((s, d) => s + d.value, 0)
  const pctSmb = Math.round((smb / total) * 100)
  if (pctSmb > 60) {
    return `Atracción pesada en Startups/SMB (${pctSmb}%). Mapear contra el revenue ganado real para no falsear expectativas.`
  }
  return `Alta densidad de grandes cuentas. Incrementa ticket promedio pero dilatará los ciclos de venta naturalmente.`
}

// --- Componente principal ---

export default function Overview() {
  const { filtered: clients, searchQuery, setSearchQuery, clearAll, filters, setFilter } = useFilteredClients()

  const total = clients.length
  const won = clients.filter(c => c.closed === 1)
  const closed = won.length
  const winRate = total > 0 ? Math.round((closed / total) * 100) : 0

  // KPIs Fila 1
  const revenueGanado = won.reduce((sum, c) => sum + (c.acv_estimado || 0), 0)
  const mrrGanado = won.reduce((sum, c) => sum + ((c.acv_estimado || 0) / 12), 0)
  const lost = clients.filter(c => c.closed !== 1)
  const revenuePerdido = lost.reduce((sum, c) => sum + (c.acv_estimado || 0), 0)

  // KPIs Fila 2
  const avgRiskWon = won.length > 0
    ? (won.reduce((sum, c) => sum + (c.retention_risk_score || 0), 0) / won.length).toFixed(1)
    : '0'
  const riskColor = avgRiskWon < 1 ? 'text-success' : avgRiskWon < 3 ? 'text-warning' : 'text-danger'
  const pmfFuerte = total > 0
    ? Math.round((clients.filter(c => c.pmf_signal === 'Fuerte').length / total) * 100)
    : 0
  const expansionPct = closed > 0
    ? Math.round((won.filter(c => c.potencial_expansion).length / closed) * 100)
    : 0

  // Chart data
  const byVendor = (() => {
    const groups = {}
    clients.forEach(item => {
      const val = item.vendedor || 'Sin dato'
      if (!groups[val]) groups[val] = { total: 0, closed: 0 }
      groups[val].total++
      if (item.closed === 1) groups[val].closed++
    })
    return Object.entries(groups)
      .map(([name, { total, closed }]) => ({
        name, total, closed, lost: total - closed,
        rate: Math.round((closed / total) * 100),
      }))
      .sort((a, b) => b.total - a.total)
  })()

  const byPlan = (() => {
    const groups = {}
    clients.forEach(c => {
      const plan = c.plan_sugerido || 'Sin dato'
      if (!groups[plan]) groups[plan] = { name: plan, won: 0, lost: 0, total: 0 }
      const acv = c.acv_estimado || 0
      if (c.closed === 1) groups[plan].won += acv
      else groups[plan].lost += acv
      groups[plan].total += acv
    })
    return Object.values(groups)
      .map(g => ({ ...g, won: Math.round(g.won), lost: Math.round(g.lost), total: Math.round(g.total) }))
      .sort((a, b) => b.total - a.total)
  })()

  const byPainPoint = countBy(clients, 'pain_point_principal')
  const byCasoUso = countBy(clients, 'caso_uso')
  const byTipoEmpresa = countBy(clients, 'tipo_empresa')

  const byMonth = (() => {
    const counts = {}
    clients.forEach(c => {
      const month = c.fecha_reunion?.slice(0, 7)
      if (month) counts[month] = (counts[month] || 0) + 1
    })
    const sorted = Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => a.name.localeCompare(b.name))
    // Acumulativo
    let acc = 0
    return sorted.map(d => {
      acc += d.value
      return { name: d.name, value: d.value, acumulado: acc }
    })
  })()

  return (
    <div>
      <div className="page-title-wrap mb-6"><h1 className="text-2xl font-bold text-text">Overview</h1></div>

      <Filters searchQuery={searchQuery} onSearch={setSearchQuery} onClearAll={clearAll} filters={filters} onFilter={setFilter} totalFiltered={total} />

      {/* KPIs Fila 1 */}
      <div className="grid grid-cols-2 gap-4 mb-4 sm:grid-cols-4">
        <KPICard icon={Users} title="Total Leads" rawValue={total} formatFn={n => n.toString()} subtitle="Reuniones evaluadas" />
        <KPICard icon={TrendingUp} title="Win Rate" rawValue={winRate} formatFn={n => `${n}%`} subtitle={`${closed} de ${total}`} />
        <KPICard icon={DollarSign} title="Revenue Ganado" rawValue={revenueGanado} formatFn={fmt} subtitle="ACV de deals cerrados" valueClassName="text-success" />
        <KPICard icon={Repeat} title="MRR Ganado" rawValue={Math.round(mrrGanado)} formatFn={fmt} subtitle="Revenue mensualizado" />
      </div>

      {/* KPIs Fila 2 */}
      <div className="grid grid-cols-2 gap-4 mb-6 sm:grid-cols-4">
        <KPICard icon={AlertTriangle} title="Risk Promedio" value={avgRiskWon} subtitle="Solo clientes ganados" valueClassName={riskColor} />
        <KPICard icon={Target} title="% PMF Fuerte" rawValue={pmfFuerte} formatFn={n => `${n}%`} subtitle="Signal de Product-Market Fit" />
        <KPICard icon={BarChart2} title="Revenue Perdido" rawValue={revenuePerdido} formatFn={fmt} subtitle={`${lost.length} deals no cerrados`} valueClassName="text-text-secondary" />
        <KPICard icon={Sprout} title="Potencial Expansión" rawValue={expansionPct} formatFn={n => `${n}%`} subtitle="Ganados con trayectoria de crecimiento" />
      </div>

      {/* Fila 1: Vendedor + Pipeline por Plan */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard
          title="Cierre por Vendedor"
          subtitle="Won (azul) vs Lost (gris) — horizontal stacked"
          accentColor="#2563EB"
          insight={insightVendedor(byVendor)}
          methodology="Tabulación de estados Won vs Lost agrupados por la variable vendedor. El vendedor proviene del CSV original, sin intervención de IA."
        >
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={byVendor} layout="vertical" barSize={28}>
              <XAxis type="number" tick={{ fontSize: 12, fill: '#64748B' }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: '#64748B' }} width={80} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="closed" fill="#2563EB" name="Cerrados" stackId="stack" />
              <Bar dataKey="lost" fill="#E2E8F0" name="Perdidos" stackId="stack" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Valor por Plan"
          subtitle="ACV Won (azul) vs Lost (gris) por plan sugerido"
          accentColor="#16A34A"
          isAI
          insight={insightPipelinePlan(byPlan)}
          methodology="Suma de USD acv_estimado* agrupada por plan_sugerido* y segmentada por estado. Permite ver cuánto revenue se captura vs se pierde en cada tier de precio."
        >
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={byPlan} barSize={48}>
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748B' }} />
              <YAxis tick={{ fontSize: 12, fill: '#64748B' }} tickFormatter={v => fmt(v)} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="won" fill="#2563EB" name="Won" stackId="stack" />
              <Bar dataKey="lost" fill="#E2E8F0" name="Lost" stackId="stack" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Fila 2: Pain Points + Caso de Uso */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        <ChartCard
          title="Pain Points Principales"
          subtitle="Problemas que motivan la búsqueda"
          isAI
          insight={insightPainPoint(byPainPoint)}
          methodology="Frecuencia absoluta de etiquetas de pain_point_principal*, ordenadas de mayor a menor. Extraído por IA (Gemini) desde la transcripción."
        >
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={byPainPoint} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 12, fill: '#64748B' }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: '#64748B' }} width={220} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" fill="#0EA5E9" name="Clientes" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Caso de Uso"
          subtitle="¿Para qué quieren usar Vambe?"
          isAI
          insight={insightCasoUso(byCasoUso)}
          methodology="Conteo cuantitativo simple de caso_uso* para comparar la intencionalidad final de la demanda. Extraído por IA desde la transcripción."
        >
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={byCasoUso} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 12, fill: '#64748B' }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }} width={170} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" fill="#F59E0B" name="Clientes" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Fila 3: Timeline + Tipo de Empresa */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        <ChartCard
          title="Timeline de Crecimiento"
          subtitle="Leads acumulados por mes"
          insight={insightTimeline(byMonth)}
          methodology="Gráfica de área totalizando leads de entrada indexados temporalmente por mes (fecha_reunion). Las fechas provienen del CSV original."
        >
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={byMonth}>
              <defs>
                <linearGradient id="colorAcc" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563EB" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }} />
              <YAxis tick={{ fontSize: 12, fill: '#64748B' }} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="acumulado" stroke="#2563EB" fill="url(#colorAcc)" name="Leads" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Tipo de Empresa"
          subtitle="Perfil corporativo de los prospectos"
          isAI
          insight={insightTipoEmpresa(byTipoEmpresa)}
          methodology="Frecuencias derivadas de tipo_empresa*. Clasificado por IA según lo que describe el prospecto en la transcripción."
        >
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={byTipoEmpresa} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 12, fill: '#64748B' }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: '#64748B' }} width={150} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" fill="#16A34A" name="Clientes" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <p className="text-[11px] text-text-muted mt-4">* Categoría derivada del análisis de IA sobre las transcripciones de reuniones de venta.</p>

      <AccionesRecomendadas acciones={[
        {
          prioridad: 'ALTA', tema: 'Pipeline', icon: '📈', titulo: `Win Rate en ${winRate}% — ${winRate >= 60 ? 'mantener momentum' : 'hay margen de mejora'}`,
          texto: winRate >= 60
            ? `${closed} de ${total} leads cerrados. El equipo está rindiendo bien. Foco en aumentar volumen de leads calificados.`
            : `${total - closed} deals perdidos. Revisar las etapas donde se pierde traction: calificación, demo y seguimiento.`,
        },
        {
          prioridad: 'ALTA', tema: 'Revenue', icon: '💰', titulo: 'Recuperar el revenue en pipeline perdido',
          texto: `Se perdieron ${fmt(revenuePerdido)} en deals que no cerraron. Identificar los top 3 lost con mayor ACV y hacer un follow-up con nueva propuesta de valor.`,
        },
        {
          prioridad: 'MEDIA', tema: 'Retención', icon: '🛡️', titulo: `Risk promedio de ${avgRiskWon} — ${parseFloat(avgRiskWon) < 2 ? 'base de clientes sana' : 'atención requerida'}`,
          texto: parseFloat(avgRiskWon) < 2
            ? 'Los clientes ganados tienen bajo riesgo de churn. Momento ideal para solicitar referidos y casos de éxito.'
            : `Risk promedio ${avgRiskWon}/5. Revisar clientes con score 3+ en Onboarding Risk y activar playbook de retención.`,
        },
        {
          prioridad: 'MEDIA', tema: 'PMF', icon: '🎯', titulo: `${pmfFuerte}% con PMF Signal fuerte`,
          texto: pmfFuerte >= 50
            ? 'Más de la mitad del pipeline tiene señal fuerte de product-market fit. Usar estos casos como testimonios de venta.'
            : 'Menos del 50% con PMF fuerte. Revisar si el ICP está bien definido y si la demo comunica el valor correcto.',
        },
        {
          prioridad: 'BAJA', tema: 'Expansión', icon: '🚀', titulo: `${expansionPct}% de clientes con potencial de expansión`,
          texto: expansionPct > 0
            ? `${expansionPct}% de los clientes ganados tienen señal de expansión. Definir un playbook de upsell para activarlo a los 60 días post-cierre.`
            : 'Sin señales de expansión detectadas aún. Incorporar preguntas de expansión en la demo para identificar oportunidades futuras.',
        },
        {
          prioridad: 'BAJA', tema: 'Proceso', icon: '⚙️', titulo: 'Estandarizar el proceso de calificación',
          texto: `Con ${total} leads analizados hay suficiente data para construir un scoring model. Priorizar leads por: industria top + sentimiento entusiasta + urgencia alta.`,
        },
      ]} />
    </div>
  )
}
