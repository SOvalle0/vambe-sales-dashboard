import { BarChart3, Users, TrendingUp, Briefcase, ShieldAlert } from 'lucide-react'

const NAV_ITEMS = [
  { id: 'overview',    label: 'Overview',        icon: BarChart3   },
  { id: 'conversion',  label: 'Intel. Comercial', icon: Briefcase   },
  { id: 'clients',     label: 'Clientes',         icon: Users       },
  { id: 'growth',      label: 'Growth Analysis',  icon: TrendingUp  },
  { id: 'retention',   label: 'Onboarding Risk',  icon: ShieldAlert },
]

export default function Layout({ activeView, onViewChange, children }) {
  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside
        className="w-60 flex flex-col"
        style={{
          background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
          borderRight: '1px solid #E2E8F0',
          boxShadow: 'inset -1px 0 0 #CBD5E1, 2px 0 12px rgba(15,23,42,0.04)',
        }}
      >
        {/* Logo */}
        <div className="px-5 pt-5 pb-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold"
              style={{ background: 'linear-gradient(135deg, #2563EB, #1D4ED8)' }}
            >
              V
            </div>
            <div>
              <h1 className="text-sm font-bold text-text leading-none">Vambe</h1>
              <p className="text-[10px] text-text-muted mt-0.5 tracking-wide uppercase">
                Sales Intelligence
              </p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
            const isActive = activeView === id
            return (
              <button
                key={id}
                onClick={() => onViewChange(id)}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                  transition-all duration-150 text-left relative
                  ${isActive
                    ? 'bg-brand-light text-brand font-semibold'
                    : 'text-text-secondary hover:bg-hover hover:text-text'
                  }
                `}
                style={isActive ? { boxShadow: '0 1px 4px rgba(37,99,235,0.12)' } : {}}
              >
                {/* Dot activo */}
                {isActive && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-brand" />
                )}
                <Icon
                  size={17}
                  className={isActive ? 'text-brand' : 'text-text-muted'}
                />
                {label}
              </button>
            )
          })}
        </nav>

        {/* Footer label */}
        <div className="px-5 py-4 border-t border-border">
          <p className="text-[10px] text-text-muted leading-relaxed">
            Datos de 60 reuniones · Gemini AI
          </p>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto bg-bg">
        <div className="tab-content p-6" key={activeView}>
          {children}
        </div>
      </main>
    </div>
  )
}
