import { useState, useRef, useEffect } from 'react'
import { Search, X, SlidersHorizontal, Check, Plus, ChevronDown, Filter } from 'lucide-react'
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
        className={`h-9 pl-4 pr-3 border rounded-full text-xs flex items-center gap-2 transition-all duration-300 outline-none shadow-sm
          ${hasValue
            ? 'border-brand text-brand font-bold bg-brand/5 ring-1 ring-brand/10'
            : 'border-border text-text-secondary bg-surface hover:border-brand/40 hover:bg-slate-50'
          }`}
      >
        <span className="tracking-wide">{filter.label}</span>
        {hasValue && (
          <span className="bg-brand text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none shadow-md animate-in zoom-in-50">
            {selected.length}
          </span>
        )}
        <ChevronDown size={11} className={`transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-2 bg-surface/90 backdrop-blur-md border border-border/60 rounded-xl shadow-xl z-[200] min-w-[200px] py-2 animate-in fade-in slide-in-from-top-2 overflow-hidden">
          <div className="max-h-60 overflow-y-auto px-1">
            {options.map(o => {
              const checked = selected.includes(o.value)
              return (
                <button
                  key={o.value}
                  onClick={() => onToggle(filter.key, o.value)}
                  className="w-full text-left px-3 py-2.5 text-[13px] flex items-center gap-3 hover:bg-brand/5 rounded-lg transition-colors group"
                >
                  <span className={`w-4 h-4 border rounded flex-shrink-0 flex items-center justify-center transition-all duration-200
                    ${checked ? 'bg-brand border-brand shadow-sm scale-110' : 'border-slate-300 group-hover:border-brand'}`}>
                    {checked && <Check size={10} className="text-white" strokeWidth={3} />}
                  </span>
                  <span className={checked ? 'text-text font-semibold' : 'text-text-secondary'}>{o.label}</span>
                </button>
              )
            })}
          </div>
          {hasValue && (
            <div className="border-t border-border/40 mt-2 pt-1 px-1">
              <button
                onClick={() => { onClear(filter.key); setOpen(false) }}
                className="w-full text-center px-3 py-2 text-[11px] font-bold text-danger hover:bg-danger-light rounded-lg transition-colors uppercase tracking-widest"
              >
                Limpiar Filtro
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
        className="h-10 px-4 border border-dashed border-slate-300 rounded-xl text-sm font-semibold text-text-secondary hover:border-brand hover:text-brand hover:bg-brand/5 transition-all duration-300 flex items-center gap-2 group"
      >
        <SlidersHorizontal size={15} className="group-hover:rotate-12 transition-transform" />
        Filtros
      </button>
      {open && (
        <div className="absolute top-full right-0 mt-2 bg-surface/90 backdrop-blur-md border border-border/60 rounded-xl shadow-xl z-[200] w-60 py-2 animate-in fade-in slide-in-from-top-2 overflow-hidden">
          <div className="px-4 py-3 border-b border-border/40 mb-2">
            <p className="text-xs font-bold text-text uppercase tracking-widest">Personalizar</p>
            <p className="text-[10px] text-text-muted mt-0.5">Visibles: {visibleKeys.length} / {MAX_VISIBLE}</p>
          </div>
          <div className="max-h-72 overflow-y-auto px-1">
            {ALL_FILTERS.map(f => {
              const active = visibleKeys.includes(f.key)
              const disabled = !active && atMax
              return (
                <button
                  key={f.key}
                  onClick={() => { if (!disabled) onToggle(f.key) }}
                  disabled={disabled}
                  className={`w-full text-left px-3 py-2.5 text-[13px] flex items-center justify-between transition-all rounded-lg
                    ${disabled ? 'opacity-30 cursor-not-allowed grayscale' : 'hover:bg-brand/5 cursor-pointer'}
                    ${active ? 'text-brand font-bold bg-brand/[0.03]' : 'text-text-secondary'}`}
                >
                  <span className="flex items-center gap-2">
                    {active ? <Check size={14} className="text-brand" /> : <Plus size={14} className="text-slate-400" />}
                    {f.label}
                  </span>
                </button>
              )
            })}
          </div>
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
    <div className="bg-surface/50 backdrop-blur-sm border border-border rounded-2xl p-5 mb-8 shadow-sm relative z-10">
      <div className="flex items-center gap-4">
        {/* Buscador Premium */}
        <div ref={searchRef} className="relative flex-1 min-w-[240px] group">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-brand transition-colors" />
          <input
            type="text"
            placeholder="Analizar por nombre, industria o vendedor..."
            value={searchQuery}
            onChange={e => { onSearch(e.target.value); setShowSuggestions(true) }}
            onFocus={() => { if (searchQuery) setShowSuggestions(true) }}
            className="w-full h-10 pl-11 pr-10 border border-slate-200 bg-surface rounded-xl text-[13px] font-medium placeholder:text-text-muted hover:border-slate-300 focus:border-brand focus:ring-4 focus:ring-brand/5 transition-all outline-none"
          />
          {searchQuery && (
            <button onClick={() => { onSearch(''); setShowSuggestions(false) }} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-danger transition-colors">
              <X size={16} />
            </button>
          )}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-0 w-full mt-2 bg-surface border border-border/60 rounded-xl shadow-2xl z-50 max-h-72 overflow-hidden animate-in fade-in slide-in-from-top-2">
              <div className="py-1 max-h-72 overflow-y-auto">
                {suggestions.map(c => (
                  <button
                    key={c.nombre}
                    onClick={() => { onSearch(c.nombre); setShowSuggestions(false) }}
                    className="w-full text-left px-4 py-3 text-sm flex items-center justify-between hover:bg-brand/[0.03] transition-colors border-b last:border-b-0 border-slate-50"
                  >
                    <div>
                      <span className="text-text font-bold block leading-tight">{c.nombre}</span>
                      <span className="text-[10px] text-text-muted font-bold uppercase tracking-wide">{c.industria}</span>
                    </div>
                    <span className="text-xs font-semibold text-text-secondary bg-slate-100 px-2 py-1 rounded-lg">{c.vendedor}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <FilterSelector visibleKeys={visibleKeys} onToggle={toggleKey} />

        <div className="flex items-center gap-3">
          <div className="h-8 w-px bg-border/60 hidden sm:block" />
          <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider whitespace-nowrap hidden lg:block">
            {totalFiltered} Clientes <span className="opacity-40">/</span> {allClients.length}
          </span>
          {activeCount > 0 && (
            <button
              onClick={() => { onClearAll(); setVisibleKeys(DEFAULT_VISIBLE) }}
              className="h-10 px-4 text-xs font-bold text-danger hover:bg-danger-light border border-danger/10 rounded-xl transition-all whitespace-nowrap flex items-center gap-2 group shadow-sm bg-surface"
            >
              <X size={14} className="group-hover:rotate-90 transition-transform" />
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Dropdown Filters with Animation */}
      {visibleFilters.length > 0 && (
        <div className="flex flex-wrap gap-2.5 mt-5 animate-in fade-in slide-in-from-top-1">
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

      {/* Active Filter Chips */}
      {(hasSearch || activeChips.length > 0) && (
        <div className="flex flex-wrap gap-2 mt-5 pt-4 border-t border-border/50">
          {hasSearch && (
            <span className="inline-flex items-center gap-2 text-[11px] font-bold px-3 py-1.5 rounded-lg bg-brand text-white shadow-sm animate-in zoom-in-95">
              <Search size={10} strokeWidth={3} />
              "{searchQuery}"
              <button 
                onClick={() => onSearch('')}
                className="hover:bg-white/20 p-0.5 rounded transition-colors"
               >
                <X size={12} strokeWidth={3} />
              </button>
            </span>
          )}
          {activeChips.map(chip => (
            <span key={chip.id} className="inline-flex items-center gap-2 text-[11px] font-bold px-3 py-1.5 rounded-lg bg-surface border border-brand/20 text-brand shadow-sm animate-in zoom-in-95 transition-all hover:border-brand/40">
              <Filter size={10} strokeWidth={3} />
              {chip.label}
              <button 
                onClick={chip.onRemove}
                className="hover:bg-brand/10 p-0.5 rounded transition-colors"
               >
                <X size={12} strokeWidth={3} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
