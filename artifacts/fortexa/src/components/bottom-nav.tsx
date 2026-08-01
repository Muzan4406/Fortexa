import { Link, useRoute } from 'wouter';
import { Home, ArrowDownCircle, ArrowUpCircle, Users, User } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/dashboard', icon: Home, label: 'Accueil' },
  { href: '/deposit', icon: ArrowDownCircle, label: 'Dépôts' },
  { href: '/withdraw', icon: ArrowUpCircle, label: 'Retraits' },
  { href: '/referrals', icon: Users, label: 'Parrainage' },
  { href: '/profile', icon: User, label: 'Compte' },
];

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 safe-area-pb">
      <div className="max-w-md mx-auto px-2 py-2">
        <div className="flex items-center justify-around">
          {NAV_ITEMS.map((item) => {
            const [isActive] = useRoute(item.href);
            const Icon = item.icon;
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all ${
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                data-testid={`nav-${item.label.toLowerCase()}`}
              >
                <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
                <span className={`text-xs ${isActive ? 'font-semibold' : 'font-medium'}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
