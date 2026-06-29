import { Home, Users, User, History } from 'lucide-react';
import { View, UserRole } from '../types.js';

interface BottomNavProps {
  active: View;
  onChange: (view: View) => void;
  role: UserRole;
}

export default function BottomNav({ active, onChange, role }: BottomNavProps) {
  const items: { key: View; label: string; icon: typeof Home }[] = [
    { key: 'home', label: 'Главная', icon: Home },
    ...(role === 'admin' ? [{ key: 'workers' as View, label: 'Работники', icon: Users }] : []),
    { key: 'history', label: 'История', icon: History },
    { key: 'profile', label: 'Профиль', icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 glass border-t border-slate-200/80 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-40 safe-area-pb">
      <div className="max-w-7xl mx-auto flex justify-around items-center h-16">
        {items.map((item) => {
          const isActive = active === item.key;
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              onClick={() => onChange(item.key)}
              className={`relative flex flex-col items-center justify-center flex-1 h-full transition-all duration-200 ${
                isActive ? 'text-softius-dark' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-0.5 bg-softius-gradient rounded-full" />
              )}
              <Icon
                size={22}
                strokeWidth={isActive ? 2.5 : 2}
                className={`transition-transform duration-200 ${isActive ? 'scale-110' : ''}`}
              />
              <span className={`text-[11px] mt-1 font-medium ${isActive ? 'text-softius-dark' : ''}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
