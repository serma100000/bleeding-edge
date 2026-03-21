import { useLocation } from 'react-router-dom';
import { Sun, Moon, Bell } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const BREADCRUMB_MAP: Record<string, string> = {
  dashboard: 'Dashboard',
  analysis: 'New Analysis',
  clocks: 'Clock Comparison',
  proofs: 'ZK Proofs',
  knowledge: 'Knowledge Graph',
  trajectory: 'Trajectory',
  interventions: 'Interventions',
  settings: 'Settings',
};

export default function Header() {
  const location = useLocation();
  const [darkMode, setDarkMode] = useState(true);

  const segments = location.pathname.split('/').filter(Boolean);
  const breadcrumbs = segments.map((seg) => BREADCRUMB_MAP[seg] ?? seg);

  const toggleTheme = () => {
    setDarkMode((prev) => {
      const next = !prev;
      document.documentElement.classList.toggle('dark', next);
      return next;
    });
  };

  return (
    <header className="flex h-16 items-center justify-between border-b border-surface-4 bg-surface-1 px-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm">
        <span className="text-gray-500">CHRONOS</span>
        {breadcrumbs.map((crumb, i) => (
          <span key={i} className="flex items-center gap-2">
            <span className="text-gray-600">/</span>
            <span className={cn(i === breadcrumbs.length - 1 ? 'text-gray-100' : 'text-gray-400')}>
              {crumb}
            </span>
          </span>
        ))}
      </nav>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={toggleTheme}
          className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-surface-3 hover:text-gray-200"
          aria-label="Toggle theme"
        >
          {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
        <button
          className="relative rounded-lg p-2 text-gray-400 transition-colors hover:bg-surface-3 hover:text-gray-200"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-chronos-accent-500" />
        </button>
      </div>
    </header>
  );
}
