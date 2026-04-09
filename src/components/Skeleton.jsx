/**
 * Skeleton — shimmer placeholders para estados de carga.
 * Uso: <Skeleton className="h-8 w-32" /> o <SkeletonCard />
 */
export function Skeleton({ className = '' }) {
  return <div className={`skeleton ${className}`} />
}

export function SkeletonKPICard() {
  return (
    <div className="bg-surface border border-border rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <Skeleton className="h-3.5 w-3.5 rounded-full" />
        <Skeleton className="h-3 w-24" />
      </div>
      <Skeleton className="h-9 w-20 mb-2" />
      <Skeleton className="h-3 w-32" />
    </div>
  )
}

export function SkeletonChartCard() {
  return (
    <div className="bg-surface border border-border rounded-2xl p-5" style={{ borderTop: '3px solid #E2E8F0' }}>
      <Skeleton className="h-4 w-40 mb-1.5" />
      <Skeleton className="h-3 w-60 mb-5" />
      <Skeleton className="h-48 w-full" />
    </div>
  )
}

export function SkeletonRow() {
  return (
    <tr className="border-b border-slate-100">
      {[180, 80, 100, 80, 100, 60, 50].map((w, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className="h-4" style={{ width: w }} />
        </td>
      ))}
    </tr>
  )
}
