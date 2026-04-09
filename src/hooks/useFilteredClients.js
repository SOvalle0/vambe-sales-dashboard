import { useState, useMemo } from 'react'
import clients from '../data/clients'

const EMPTY = {
  vendedor: [], closed: [], industria: [], plan_sugerido: [], urgencia: [],
  sentimiento: [], pmf_signal: [], tipo_empresa: [], pain_point_principal: [],
  canal_descubrimiento: [], patron_demanda: [],
}

export default function useFilteredClients() {
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState(EMPTY)

  // value='' limpia el filtro completo; value='algo' hace toggle
  const setFilter = (key, value) => {
    if (!value) {
      setFilters(prev => ({ ...prev, [key]: [] }))
      return
    }
    setFilters(prev => {
      const cur = prev[key] || []
      return { ...prev, [key]: cur.includes(value) ? cur.filter(v => v !== value) : [...cur, value] }
    })
  }

  const clearAll = () => { setSearchQuery(''); setFilters(EMPTY) }

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    return clients.filter(c => {
      if (q) {
        const haystack = [c.nombre, c.industria, c.vendedor, c.plan_sugerido, c.tipo_empresa, c.canal_descubrimiento]
          .filter(Boolean).join(' ').toLowerCase()
        if (!haystack.includes(q)) return false
      }
      if (filters.vendedor.length          && !filters.vendedor.includes(c.vendedor))                          return false
      if (filters.closed.length            && !filters.closed.includes(String(c.closed)))                      return false
      if (filters.industria.length         && !filters.industria.includes(c.industria))                        return false
      if (filters.plan_sugerido.length     && !filters.plan_sugerido.includes(c.plan_sugerido || 'Sin dato'))  return false
      if (filters.urgencia.length          && !filters.urgencia.includes(c.urgencia))                          return false
      if (filters.sentimiento.length       && !filters.sentimiento.includes(c.sentimiento))                    return false
      if (filters.pmf_signal.length        && !filters.pmf_signal.includes(c.pmf_signal))                     return false
      if (filters.tipo_empresa.length      && !filters.tipo_empresa.includes(c.tipo_empresa))                  return false
      if (filters.pain_point_principal.length && !filters.pain_point_principal.includes(c.pain_point_principal)) return false
      if (filters.canal_descubrimiento.length && !filters.canal_descubrimiento.includes(c.canal_descubrimiento)) return false
      if (filters.patron_demanda.length    && !filters.patron_demanda.includes(c.patron_demanda))              return false
      return true
    })
  }, [searchQuery, filters])

  return { filtered, searchQuery, setSearchQuery, filters, setFilter, clearAll }
}
