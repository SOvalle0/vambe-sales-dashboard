import { useEffect, useRef, useState } from 'react'

/**
 * Hook de count-up con easing easeOutQuart.
 * Solo se activa si rawValue es un número.
 */
function useCountUp(rawValue, duration = 900) {
  const [display, setDisplay] = useState(0)
  const frame = useRef(null)

  useEffect(() => {
    if (typeof rawValue !== 'number') return
    const start = performance.now()
    const animate = (now) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const ease = 1 - Math.pow(1 - progress, 4) // easeOutQuart
      setDisplay(Math.round(rawValue * ease))
      if (progress < 1) {
        frame.current = requestAnimationFrame(animate)
      }
    }
    frame.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frame.current)
  }, [rawValue, duration])

  return display
}

/**
 * KPICard — tarjeta de métrica.
 *
 * Props:
 *   • title       — etiqueta de la métrica
 *   • value       — valor a mostrar (string o número formateado)
 *   • rawValue    — (opcional) número sin formato → activa count-up
 *   • formatFn    — (opcional) función de formato aplicada al contador
 *   • subtitle    — texto secundario
 *   • icon        — componente de lucide-react
 *   • valueClassName — clases extra para el número
 */
export default function KPICard({
  title,
  value,
  rawValue,
  formatFn,
  subtitle,
  icon: Icon,
  valueClassName,
}) {
  const counted = useCountUp(rawValue)
  const displayValue =
    typeof rawValue === 'number'
      ? formatFn ? formatFn(counted) : counted.toLocaleString()
      : value

  return (
    <div
      className="
        bg-surface border border-border rounded-2xl p-5 group
        transition-all duration-200 ease-out hover:-translate-y-0.5
      "
      style={{ boxShadow: '0 1px 3px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04)' }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow =
          '0 8px 24px rgba(15,23,42,0.09), 0 2px 6px rgba(15,23,42,0.05), 0 0 0 1px rgba(37,99,235,0.08)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow =
          '0 1px 3px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04)'
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        {Icon && (
          <Icon
            size={15}
            className="text-text-muted group-hover:text-brand transition-colors duration-200"
          />
        )}
        <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">
          {title}
        </span>
      </div>
      <p
        className={`kpi-value text-3xl font-bold ${valueClassName || 'text-text'}`}
        style={{ fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}
      >
        {displayValue}
      </p>
      {subtitle && (
        <p className="text-xs text-text-muted mt-1.5">{subtitle}</p>
      )}
    </div>
  )
}
