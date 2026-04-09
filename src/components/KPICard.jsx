export default function KPICard({ title, value, subtitle, icon: Icon, valueClassName }) {
  return (
    <div className="bg-surface border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-2 mb-2">
        {Icon && <Icon size={16} className="text-text-secondary" />}
        <span className="text-sm font-medium text-text-secondary">{title}</span>
      </div>
      <p className={`text-3xl font-bold ${valueClassName || 'text-text'}`}>{value}</p>
      {subtitle && <p className="text-xs text-text-muted mt-1">{subtitle}</p>}
    </div>
  )
}
