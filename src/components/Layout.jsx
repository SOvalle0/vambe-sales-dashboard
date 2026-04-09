import { BarChart3, Users, TrendingUp, Briefcase, ShieldAlert } from 'lucide-react'

const NAV_ITEMS = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'conversion', label: 'Intel. Comercial', icon: Briefcase },
  { id: 'clients', label: 'Clientes', icon: Users },
  { id: 'growth', label: 'Growth Analysis', icon: TrendingUp },
  { id: 'retention', label: 'Onboarding Risk', icon: ShieldAlert },
]

export default function Layout({ activeView, onViewChange, children }) {
  return (
    <div className="flex h-screen">
      <aside className="w-60 bg-surface border-r border-border flex flex-col">
        <div className="p-5 border-b border-border">
          <h1 className="text-lg font-bold text-text">Vambe</h1>
          <p className="text-xs text-text-muted">Sales Intelligence</p>
        </div>
        <nav className="flex-1 p-3">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => onViewChange(id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors mb-1
                ${activeView === id
                  ? 'bg-brand-light text-brand font-semibold'
                  : 'text-text-secondary hover:bg-hover'
                }`}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </nav>
      </aside>
      <main className="flex-1 overflow-y-auto p-6 bg-bg">
        {children}
      </main>
    </div>
  )
}
