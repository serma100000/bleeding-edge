import { cn } from '@/lib/utils';

interface Tab {
  id: string;
  label: string;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
}

export default function Tabs({ tabs, activeTab, onTabChange, className }: TabsProps) {
  return (
    <div className={cn('border-b border-surface-4', className)}>
      <nav className="-mb-px flex gap-1" role="tablist">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                'relative px-4 py-2.5 text-sm font-medium transition-colors duration-200',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chronos-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-0 rounded-t-md',
                isActive
                  ? 'text-chronos-primary-400'
                  : 'text-gray-500 hover:text-gray-300',
              )}
            >
              {tab.label}
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-chronos-primary-500" />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
