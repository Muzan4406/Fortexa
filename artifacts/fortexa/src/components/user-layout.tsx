import { ReactNode } from 'react';
import { BottomNav } from './bottom-nav';

interface UserLayoutProps {
  children: ReactNode;
}

export function UserLayout({ children }: UserLayoutProps) {
  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-md mx-auto">
        {children}
      </div>
      <BottomNav />
    </div>
  );
}
