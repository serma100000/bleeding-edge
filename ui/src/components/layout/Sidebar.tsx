import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Upload,
  Clock,
  ShieldCheck,
  Network,
  TrendingUp,
  Heart,
  Settings,
  ChevronLeft,
  ChevronRight,
  Dna,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/analysis', label: 'New Analysis', icon: Upload },
  { to: '/clocks', label: 'Clock Comparison', icon: Clock },
  { to: '/proofs', label: 'ZK Proofs', icon: ShieldCheck },
  { to: '/knowledge', label: 'Knowledge Graph', icon: Network },
  { to: '/trajectory', label: 'Trajectory', icon: TrendingUp },
  { to: '/interventions', label: 'Interventions', icon: Heart },
  { to: '/settings', label: 'Settings', icon: Settings },
] as const;

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        'flex flex-col border-r border-surface-4 bg-surface-1 transition-all duration-300',
        collapsed ? 'w-16' : 'w-60',
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-surface-4 px-4">
        <Dna className="h-7 w-7 shrink-0 text-chronos-primary-400" />
        {!collapsed && (
          <span className="font-display text-lg font-bold tracking-tight text-gray-100">
            CHRONOS
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 p-2">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-chronos-primary-500/10 text-chronos-primary-400'
                  : 'text-gray-400 hover:bg-surface-3 hover:text-gray-200',
                collapsed && 'justify-center px-0',
              )
            }
            title={collapsed ? label : undefined}
          >
            <Icon className="h-5 w-5 shrink-0" />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="flex h-12 items-center justify-center border-t border-surface-4 text-gray-500 transition-colors hover:text-gray-300"
      >
        {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </button>
    </aside>
  );
}
