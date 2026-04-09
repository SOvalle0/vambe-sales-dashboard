import { useState, useMemo, useRef, useEffect } from 'react'
import { Check, Plus, Users, ChevronRight } from 'lucide-react'
import ClientDetail from '../components/ClientDetail'
import Filters from '../components/Filters'
import useFilteredClients from '../hooks/useFilteredClients'
import { SkeletonRow } from '../components/Skeleton'

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

function RiskBar({ score }) {
  const pct = Math.round((score / 4) * 100)
  const color = score === 0 ? '#16A34A' : score <= 2 ? '#F59E0B' : '#DC2626'
  const bgColor = score === 0 ? '#F0FDF4' : score <= 2 ? '#FFFBEB' : '#FEF2F2'
  return (
    <span className="flex items-center gap-1.5">
      <span className="text-xs font-semibold tabular-nums w-3 shrink-0" style={{ color }}>{score}</span>
      <span className="w-14 h-1.5 rounded-full shrink-0" style={{ background: bgColor }}>
        <span
          className="block h-full rounded-full"
          style={{ width: `${pct}%`, background: color }}
        />
      </span>
    </span>
  )
}

function PriorityBadge({ score, terciles }) {
  const color = score >= terciles[1] ? 'text-green-600' : score >= terciles[0] ? 'text-amber-600' : 'text-slate-400'
  return <span className={`font-bold tabular-nums ${color}`}>{score.toFixed(1)}</span>
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
    <th ref={ref} className="relative w-12 pr-4 py-4 text-center">
      <button
        onClick={() => setOpen(!open)}
        className="w-7 h-7 rounded-full bg-brand/10 text-brand flex items-center justify-center hover:bg-brand hover:text-white transition-all duration-200 mx-auto"
      >
        <Plus size={14} strokeWidth={2.5} />
      </button>
      {open && (
        <div className="absolute top-full right-0 mt-2 bg-surface border border-border rounded-xl shadow-xl z-50 w-56 py-2 overflow-hidden animate-in fade-in slide-in-from-top-2">
          <p className="px-4 py-2 text-[10px] font-bold text-text-muted uppercase tracking-wider border-b border-border/50 mb-1">Columnas Visibles</p>
          <div className="max-h-64 overflow-y-auto">
            {ALL_COLUMNS.map(col => {
              const active = visibleKeys.includes(col.key)
              return (
                <button
                  key={col.key}
                  onClick={() => onToggle(col.key)}
                  className="w-full text-left px-4 py-2.5 text-sm flex items-center justify-between hover:bg-hover transition-colors group"
                >
                  <span className={active ? 'text-text font-semibold' : 'text-text-secondary group-hover:text-text'}>{col.label}</span>
                  {active && <Check size={14} className="text-brand" />}
                </button>
              )
            })}
          </div>
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
  const [loaded, setLoaded] = useState(false)
  useEffect(() => { const t = setTimeout(() => setLoaded(true), 300); return () => clearTimeout(t) }, [])

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

  const SortHeader = ({ label, field }) => {
    const active = sortKey === field
    return (
      <th
        onClick={() => handleSort(field)}
        className={`px-4 py-4 text-left text-[11px] font-bold uppercase tracking-wider cursor-pointer select-none whitespace-nowrap transition-colors ${active ? 'text-brand' : 'text-text-secondary hover:text-text'}`}
      >
        <div className="flex items-center gap-1.5">
          {label}
          {active && (
            <span
              className="sort-icon text-brand"
              style={{ transform: sortAsc ? 'rotate(0deg)' : 'rotate(180deg)', display: 'inline-block', transition: 'transform 0.2s ease' }}
            >↑</span>
          )}
        </div>
      </th>
    )
  }

  const cols = ALL_COLUMNS.filter(c => visibleCols.includes(c.key))

  const renderCell = (client, key) => {
    switch (key) {
      case 'nombre':
        return (
          <td key={key} className="px-4 py-4">
            <div className="text-sm font-semibold text-text leading-tight group-hover:text-brand transition-colors">{client.nombre}</div>
            <div className="text-[10px] text-text-muted font-medium mt-0.5">{client.industria}</div>
          </td>
        )
      case 'fecha_reunion':
        return <td key={key} className="px-4 py-4 text-[13px] text-text-secondary whitespace-nowrap tabular-nums">{fmtDate(client.fecha_reunion)}</td>
      case 'vendedor':
        return <td key={key} className="px-4 py-4 text-[13px] font-medium text-text-secondary">{client.vendedor}</td>
      case 'plan_sugerido':
        return (
          <td key={key} className="px-4 py-4">
            <div className="text-[13px] font-semibold text-text">{client.plan_sugerido || '—'}</div>
            <div className="text-[11px] text-text-muted font-medium tabular-nums">{fmt(client.acv_estimado || 0)}/año</div>
          </td>
        )
      case 'deal_priority_score':
        return <td key={key} className="px-4 py-4 text-sm"><PriorityBadge score={client.deal_priority_score || 0} terciles={terciles} /></td>
      case 'retention_risk_score':
        return (
          <td key={key} className="px-4 py-4 text-sm min-w-[90px]">
            <RiskBar score={client.retention_risk_score} />
          </td>
        )
      case 'closed':
        return (
          <td key={key} className="px-4 py-4">
            <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${client.closed === 1 ? 'bg-green-50 text-green-700 border border-green-100 badge-won' : 'bg-red-50 text-red-700 border border-red-100'}`}>
              {client.closed === 1 && <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />}
              {client.closed === 1 ? 'Won' : 'Lost'}
            </span>
          </td>
        )
      default:
        return <td key={key} className="px-4 py-4 text-[13px] text-text-secondary">{client[key] ?? '—'}</td>
    }
  }

  return (
    <div className="animate-in fade-in duration-700">
      <div className="mb-6">
        <div className="page-title-wrap">
          <h1 className="text-3xl font-extrabold tracking-tight text-text">Explorador de Clientes</h1>
        </div>
        <p className="text-sm text-text-secondary mt-1 font-medium">Historial completo y métricas de desempeño individual.</p>
      </div>

      <div className="mb-8">
        <Filters 
          searchQuery={searchQuery} 
          onSearch={setSearchQuery} 
          onClearAll={clearAll} 
          filters={filters} 
          onFilter={setFilter} 
          totalFiltered={clients.length} 
        />
      </div>

      <div className="bg-surface border border-border rounded-2xl shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50/50" style={{ borderBottom: '2px solid rgba(37,99,235,0.12)' }}>
                {cols.map(col => (
                  <SortHeader key={col.key} label={col.label} field={col.key} />
                ))}
                <ColumnPickerTh visibleKeys={visibleCols} onToggle={toggleCol} />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!loaded && Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)}
              {loaded && sorted.map((client, i) => (
                <tr
                  key={i}
                  onClick={() => setSelectedClient(client)}
                  className="group hover:bg-brand/[0.02] cursor-pointer transition-all duration-150"
                >
                  {cols.map(col => renderCell(client, col.key))}
                  <td className="pr-4 py-4 text-right">
                    <div className="w-6 h-6 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-brand group-hover:text-white transition-all duration-300 ml-auto">
                      <ChevronRight size={14} />
                    </div>
                  </td>
                </tr>
              ))}
              {loaded && sorted.length === 0 && (
                <tr>
                  <td colSpan={cols.length + 1} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-14 h-14 rounded-2xl bg-brand-light flex items-center justify-center mb-1">
                        <Users size={26} className="text-brand opacity-60" />
                      </div>
                      <p className="text-base font-semibold text-text">Sin clientes que coincidan</p>
                      <p className="text-xs text-text-muted max-w-[220px] leading-relaxed">Ningún registro coincide con los filtros activos. Intenta con criterios más amplios.</p>
                      <button
                        onClick={clearAll}
                        className="mt-1 text-xs font-medium text-brand hover:text-brand-hover border border-brand/30 hover:border-brand/60 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        Limpiar todos los filtros
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedClient && <ClientDetail client={selectedClient} onClose={() => setSelectedClient(null)} />}
    </div>
  )
}
