import { useState, useRef, useEffect } from 'react'
import { Search, X, SlidersHorizontal, Check, Plus, ChevronDown } from 'lucide-react'
import allClients from '../data/clients'

function uniqueValues(key) {
  return [...new Set(allClients.map(c => c[key]).filter(Boolean))].sort()
}

const ALL_FILTERS = [
  { key: 'vendedor',             label: 'Vendedor',    options: () => uniqueValues('vendedor').map(v => ({ value: v, label: v })) },
  { key: 'closed',               label: 'Estado',      options: () => [{ value: '1', label: 'Won' }, { value: '0', label: 'Lost' }] },
  { key: 'industria',            label: 'Industria',   options: () => uniqueValues('industria').map(v => ({ value: v, label: v })) },
  { key: 'tipo_empresa',         label: 'Tipo',        options: () => uniqueValues('tipo_empresa').map(v => ({ value: v, label: v })) },
  { key: 'plan_sugerido',        label: 'Plan',        options: () => [
    { value: 'Standard', label: 'Standard' },
    { value: 'Advanced', label: 'Advanced' },
    { value: 'Corporate', label: 'Corporate' },
    { value: 'Sin dato', label: 'Sin dato' },
  ]},
  { key: 'urgencia',             label: 'Urgencia',    options: () => uniqueValues('urgencia').map(v => ({ value: v, label: v })) },
  { key: 'sentimiento',          label: 'Sentimiento', options: () => uniqueValues('sentimiento').map(v => ({ value: v, label: v })) },
  { key: 'canal_descubrimiento', label: 'Canal',       options: () => uniqueValues('canal_descubrimiento').map(v => ({ value: v, label: v })) },
  { key: 'pain_point_principal', label: 'Pain Point',  options: () => uniqueValues('pain_point_principal').map(v => ({ value: v, label: v })) },
  { key: 'patron_demanda',       label: 'Demanda',     options: () => uniqueValues('patron_demanda').map(v => ({ value: v, label: v })) },
  { key: 'pmf_signal',           label: 'PMF Signal',  options: () => [
    { value: 'Fuerte', label: 'Fuerte' },
    { value: 'Moderada', label: 'Moderada' },
    { value: 'Débil', label: 'Débil' },
  ]},
]

const DEFAULT_VISIBLE = ['vendedor', 'closed', 'industria', 'plan_sugerido', 'urgencia']
const MAX_VISIBLE = 5

function useClickOutside(ref, onClose) {
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [ref, onClose])
}

function MultiSelect({ filter, selected, onToggle, onClear }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useClickOutside(ref, () => setOpen(false))

  const options = filter.options()
  const hasValue = selected.length > 0

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`h-8 pl-3 pr-2 border rounded-lg text-xs flex items-center gap-1.5 transition-colors outline-none
          ${hasValue
            ? 'border-brand text-brand font-medium bg-brand-light'
            : 'border-border text-text-secondary bg-bg hover:border-brand/50'
          }`}
      >
        <span>{filter.label}</span>
        {hasValue && (
          <span className="bg-brand text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
            {selected.length}
          </span>
        )}
        <ChevronDown size={11} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 bg-surface border border-border rounded-lg shadow-lg z-50 min-w-[170px] py-1">
          {options.map(o => {
            const checked = selected.includes(o.value)
            return (
              <button
                key={o.value}
                onClick={() => onToggle(filter.key, o.value)}
                className="w-full text-left px-3 py-2 text-sm flex items-center gap-2.5 hover:bg-hover transition-colors"
              >
                <span className={`w-3.5 h-3.5 border rounded flex-shrink-0 flex items-center justify-center transition-colors
                  ${checked ? 'bg-brand border-brand' : 'border-border'}`}>
                  {checked && <Check size={9} className="text-white" strokeWidth={3} />}
                </span>
                <span className={checked ? 'text-text font-medium' : 'text-text-secondary'}>{o.label}</span>
              </button>
            )
          })}
          {hasValue && (
            <div className="border-t border-border mt-1 pt-1">
              <button
                onClick={() => { onClear(filter.key); setOpen(false) }}
                className="w-full text-left px-3 py-1.5 text-xs text-danger hover:bg-danger-light transition-colors"
              >
                Limpiar filtro
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function FilterSelector({ visibleKeys, onToggle }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useClickOutside(ref, () => setOpen(false))

  const atMax = visibleKeys.length >= MAX_VISIBLE

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="h-9 px-3 border border-dashed border-border rounded-lg text-sm text-text-muted hover:border-brand hover:text-brand transition-colors flex items-center gap-1.5"
      >
        <SlidersHorizontal size={14} />
        Filtros
      </button>
      {open && (
        <div className="absolute top-full right-0 mt-1 bg-surface border border-border rounded-lg shadow-lg z-50 w-52 py-1">
          <div className="px-3 py-2 border-b border-border mb-1">
            <p className="text-xs font-medium text-text">Filtros visibles</p>
            <p className="text-[11px] text-text-muted">Máx {MAX_VISIBLE} a la vez</p>
          </div>
          {ALL_FILTERS.map(f => {
            const active = visibleKeys.includes(f.key)
            const disabled = !active && atMax
            return (
              <button
                key={f.key}
                onClick={() => { if (!disabled) onToggle(f.key) }}
                disabled={disabled}
                className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between transition-colors
                  ${disabled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-hover cursor-pointer'}
                  ${active ? 'text-brand font-medium' : 'text-text-secondary'}`}
              >
                {f.label}
                {active ? <Check size={13} className="text-brand" /> : <Plus size={13} className="text-text-muted" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function Filters({ searchQuery, onSearch, filters, onFilter, onClearAll, totalFiltered }) {
  const [visibleKeys, setVisibleKeys] = useState(DEFAULT_VISIBLE)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const searchRef = useRef(null)
  useClickOutside(searchRef, () => setShowSuggestions(false))

  const toggleKey = (key) => {
    setVisibleKeys(prev => {
      if (prev.includes(key)) { onFilter(key, ''); return prev.filter(k => k !== key) }
      if (prev.length >= MAX_VISIBLE) return prev
      return [...prev, key]
    })
  }

  const suggestions = searchQuery.length > 1
    ? allClients.filter(c =>
        [c.nombre, c.industria, c.vendedor, c.plan_sugerido, c.tipo_empresa, c.canal_descubrimiento]
          .filter(Boolean).join(' ').toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 8)
    : []

  const visibleFilters = ALL_FILTERS.filter(f => visibleKeys.includes(f.key))

  // Chips: un chip por cada valor activo en cualquier filtro
  const activeChips = ALL_FILTERS.flatMap(f =>
    (filters[f.key] || []).map(v => ({
      id: `${f.key}:${v}`,
      label: `${f.label}: ${v === '1' ? 'Won' : v === '0' ? 'Lost' : v}`,
      onRemove: () => onFilter(f.key, v),
    }))
  )

  const hasSearch = searchQuery.trim().length > 0
  const activeCount = (hasSearch ? 1 : 0) + activeChips.length

  return (
    <div className="bg-surface border border-border rounded-xl p-4 mb-6 shadow-sm">
      <div className="flex items-center gap-3">
        {/* Buscador */}
        <div ref={searchRef} className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Buscar por nombre, industria, vendedor, canal..."
            value={searchQuery}
            onChange={e => { onSearch(e.target.value); setShowSuggestions(true) }}
            onFocus={() => { if (searchQuery) setShowSuggestions(true) }}
            className="w-full h-9 pl-9 pr-8 border border-border rounded-lg text-sm focus:border-brand focus:ring-2 focus:ring-brand-soft outline-none"
          />
          {searchQuery && (
            <button onClick={() => { onSearch(''); setShowSuggestions(false) }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text">
              <X size={14} />
            </button>
          )}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-0 w-full mt-1 bg-surface border border-border rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
              {suggestions.map(c => (
                <button
                  key={c.nombre}
                  onClick={() => { onSearch(c.nombre); setShowSuggestions(false) }}
                  className="w-full text-left px-3 py-2 text-sm flex items-center justify-between hover:bg-hover transition-colors"
                >
                  <span className="text-text font-medium">{c.nombre}</span>
                  <span className="text-xs text-text-muted">{c.industria} · {c.vendedor}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <FilterSelector visibleKeys={visibleKeys} onToggle={toggleKey} />

        <span className="text-xs text-text-muted whitespace-nowrap">
          {totalFiltered} de {allClients.length}
          {activeCount > 0 && <span className="ml-1 text-brand">· {activeCount} activo{activeCount > 1 ? 's' : ''}</span>}
        </span>

        {activeCount > 0 && (
          <button
            onClick={() => { onClearAll(); setVisibleKeys(DEFAULT_VISIBLE) }}
            className="h-9 px-3 text-sm text-danger hover:bg-danger-light rounded-lg transition-colors whitespace-nowrap flex items-center gap-1"
          >
            <X size={13} />
            Limpiar
          </button>
        )}
      </div>

      {/* Multi-select dropdowns */}
      {visibleFilters.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {visibleFilters.map(f => (
            <MultiSelect
              key={f.key}
              filter={f}
              selected={filters[f.key] || []}
              onToggle={onFilter}
              onClear={onFilter}
            />
          ))}
        </div>
      )}

      {/* Chips de valores activos */}
      {(hasSearch || activeChips.length > 0) && (
        <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-border">
          {hasSearch && (
            <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-brand-light text-brand">
              "{searchQuery}"
              <button onClick={() => onSearch('')}><X size={11} /></button>
            </span>
          )}
          {activeChips.map(chip => (
            <span key={chip.id} className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-brand-light text-brand">
              {chip.label}
              <button onClick={chip.onRemove}><X size={11} /></button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
