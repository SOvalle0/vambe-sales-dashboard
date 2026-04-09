import { useState, useMemo, useRef, useEffect } from 'react'
import { Check, Plus } from 'lucide-react'
import ClientDetail from '../components/ClientDetail'
import Filters from '../components/Filters'
import useFilteredClients from '../hooks/useFilteredClients'

const fmt = (n) => {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`
  return `$${n}`
}

const fmtDate = (d) => {
  if (!d) return '—'
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y.slice(2)}`
}

function RiskDot({ score }) {
  const color = score === 0 ? 'bg-green-500' : score <= 2 ? 'bg-yellow-500' : 'bg-red-500'
  return <span className={`inline-block w-2 h-2 rounded-full ${color}`} />
}

function PriorityBadge({ score, terciles }) {
  const color = score >= terciles[1] ? 'text-success' : score >= terciles[0] ? 'text-warning' : 'text-text-muted'
  return <span className={`font-bold ${color}`}>{score.toFixed(1)}</span>
}

const ALL_COLUMNS = [
  { key: 'nombre',                 label: 'Nombre',          default: true },
  { key: 'fecha_reunion',          label: 'Fecha',           default: true },
  { key: 'industria',              label: 'Industria',       default: true },
  { key: 'tipo_empresa',           label: 'Tipo empresa',    default: false },
  { key: 'vendedor',               label: 'Vendedor',        default: true },
  { key: 'canal_descubrimiento',   label: 'Canal',           default: false },
  { key: 'urgencia',               label: 'Urgencia',        default: false },
  { key: 'sentimiento',            label: 'Sentimiento',     default: false },
  { key: 'plan_sugerido',          label: 'Plan / ACV',      default: true },
  { key: 'deal_priority_score',    label: 'Priority',        default: true },
  { key: 'retention_risk_score',   label: 'Risk',            default: true },
  { key: 'pmf_signal',             label: 'PMF Signal',      default: false },
  { key: 'conversion_probability', label: 'Conv. Prob.',     default: false },
  { key: 'estimated_close_days',   label: 'Días al cierre',  default: false },
  { key: 'closed',                 label: 'Estado',          default: true },
]

function ColumnPickerTh({ visibleKeys, onToggle }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <th ref={ref} className="relative w-10 pr-3 py-3 text-center">
      <button
        onClick={() => setOpen(!open)}
        title="Agregar o quitar columnas"
        className="w-6 h-6 rounded-full bg-brand flex items-center justify-center text-white hover:bg-brand-hover transition-colors mx-auto"
      >
        <Plus size={12} strokeWidth={2.5} />
      </button>
      {open && (
        <div className="absolute top-full right-0 mt-1 bg-surface border border-border rounded-lg shadow-lg z-50 w-52 py-1 text-left">
          <p className="px-3 py-2 text-xs font-medium text-text-muted border-b border-border mb-1">Columnas visibles</p>
          {ALL_COLUMNS.map(col => {
            const active = visibleKeys.includes(col.key)
            return (
              <button
                key={col.key}
                onClick={() => onToggle(col.key)}
                className="w-full text-left px-3 py-2 text-sm flex items-center justify-between hover:bg-hover transition-colors"
              >
                <span className={active ? 'text-text font-medium' : 'text-text-secondary'}>{col.label}</span>
                {active && <Check size={13} className="text-brand" />}
              </button>
            )
          })}
        </div>
      )}
    </th>
  )
}

export default function ClientsExplorer() {
  const { filtered: clients, searchQuery, setSearchQuery, clearAll, filters, setFilter } = useFilteredClients()
  const [selectedClient, setSelectedClient] = useState(null)
  const [sortKey, setSortKey] = useState(null)
  const [sortAsc, setSortAsc] = useState(true)
  const [visibleCols, setVisibleCols] = useState(() => ALL_COLUMNS.filter(c => c.default).map(c => c.key))

  const toggleCol = (key) => setVisibleCols(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])

  const handleSort = (key) => {
    if (sortKey === key) setSortAsc(!sortAsc)
    else { setSortKey(key); setSortAsc(true) }
  }

  const sorted = useMemo(() => {
    if (!sortKey) return clients
    return [...clients].sort((a, b) => {
      const va = a[sortKey] ?? ''
      const vb = b[sortKey] ?? ''
      if (typeof va === 'number') return sortAsc ? va - vb : vb - va
      return sortAsc ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va))
    })
  }, [clients, sortKey, sortAsc])

  const terciles = useMemo(() => {
    const scores = clients.map(c => c.deal_priority_score || 0).sort((a, b) => a - b)
    if (scores.length === 0) return [3, 6]
    return [scores[Math.floor(scores.length * 0.33)], scores[Math.floor(scores.length * 0.66)]]
  }, [clients])

  const SortHeader = ({ label, field }) => (
    <th
      onClick={() => handleSort(field)}
      className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider cursor-pointer hover:text-brand select-none whitespace-nowrap"
    >
      {label} {sortKey === field ? (sortAsc ? '↑' : '↓') : ''}
    </th>
  )

  const cols = ALL_COLUMNS.filter(c => visibleCols.includes(c.key))

  const renderCell = (client, key) => {
    switch (key) {
      case 'nombre':
        return (
          <td key={key} className="px-4 py-3">
            <div className="text-sm font-medium text-brand leading-tight">{client.nombre}</div>
            <div className="text-xs text-text-muted mt-0.5">{client.industria}</div>
          </td>
        )
      case 'fecha_reunion':
        return <td key={key} className="px-4 py-3 text-sm text-text-secondary whitespace-nowrap">{fmtDate(client.fecha_reunion)}</td>
      case 'industria':
        return <td key={key} className="px-4 py-3 text-sm text-text-secondary">{client.industria}</td>
      case 'tipo_empresa':
        return <td key={key} className="px-4 py-3 text-sm text-text-secondary">{client.tipo_empresa || '—'}</td>
      case 'vendedor':
        return <td key={key} className="px-4 py-3 text-sm text-text-secondary">{client.vendedor}</td>
      case 'canal_descubrimiento':
        return <td key={key} className="px-4 py-3 text-sm text-text-secondary">{client.canal_descubrimiento || '—'}</td>
      case 'urgencia':
        return <td key={key} className="px-4 py-3 text-sm text-text-secondary">{client.urgencia}</td>
      case 'sentimiento':
        return <td key={key} className="px-4 py-3 text-sm text-text-secondary">{client.sentimiento || '—'}</td>
      case 'plan_sugerido':
        return (
          <td key={key} className="px-4 py-3 text-sm">
            <span className="text-text">{client.plan_sugerido || '—'}</span>
            <span className="text-text-muted text-xs ml-1">{fmt(client.acv_estimado || 0)}/año</span>
          </td>
        )
      case 'deal_priority_score':
        return <td key={key} className="px-4 py-3 text-sm"><PriorityBadge score={client.deal_priority_score || 0} terciles={terciles} /></td>
      case 'retention_risk_score':
        return (
          <td key={key} className="px-4 py-3 text-sm">
            <span className="flex items-center gap-1.5">
              <RiskDot score={client.retention_risk_score} />
              {client.retention_risk_score}
            </span>
          </td>
        )
      case 'pmf_signal':
        return <td key={key} className="px-4 py-3 text-sm text-text-secondary">{client.pmf_signal || '—'}</td>
      case 'conversion_probability':
        return <td key={key} className="px-4 py-3 text-sm text-text-secondary">{client.conversion_probability != null ? `${Math.round(client.conversion_probability * 100)}%` : '—'}</td>
      case 'estimated_close_days':
        return <td key={key} className="px-4 py-3 text-sm text-text-secondary">{client.estimated_close_days != null ? `${client.estimated_close_days}d` : '—'}</td>
      case 'closed':
        return (
          <td key={key} className="px-4 py-3">
            <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${client.closed === 1 ? 'bg-success-light text-success' : 'bg-danger-light text-danger'}`}>
              {client.closed === 1 ? 'Won' : 'Lost'}
            </span>
          </td>
        )
      default:
        return <td key={key} className="px-4 py-3 text-sm text-text-secondary">{client[key] ?? '—'}</td>
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-text mb-6">Explorador de Clientes</h1>

      <Filters searchQuery={searchQuery} onSearch={setSearchQuery} onClearAll={clearAll} filters={filters} onFilter={setFilter} totalFiltered={clients.length} />

      <div className="bg-surface border border-border rounded-xl shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-bg sticky top-0 z-10">
              <tr>
                {cols.map(col => (
                  <SortHeader key={col.key} label={col.label} field={col.key} />
                ))}
                <ColumnPickerTh visibleKeys={visibleCols} onToggle={toggleCol} />
              </tr>
            </thead>
            <tbody>
              {sorted.map((client, i) => (
                <tr
                  key={i}
                  onClick={() => setSelectedClient(client)}
                  className="group border-b border-slate-100 hover:bg-hover cursor-pointer transition-colors"
                >
                  {cols.map(col => renderCell(client, col.key))}
                  <td className="pr-3 py-3 text-text-muted group-hover:text-brand transition-colors text-lg leading-none text-center">›</td>
                </tr>
              ))}
              {sorted.length === 0 && (
                <tr><td colSpan={cols.length + 1} className="px-4 py-8 text-center text-text-muted">Sin resultados</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedClient && <ClientDetail client={selectedClient} onClose={() => setSelectedClient(null)} />}
    </div>
  )
}
