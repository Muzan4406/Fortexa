import { ReactNode } from 'react';
import { BottomNav } from './bottom-nav';
import { AppSidebar } from './app-sidebar';
import { SidebarProvider } from '@/lib/sidebar-context';

interface UserLayoutProps {
  children: ReactNode;
}

export function UserLayout({ children }: UserLayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen bg-background pb-20">
        <AppSidebar />
        <div className="max-w-md mx-auto">
          {children}
        </div>
        <BottomNav />
      </div>
    </SidebarProvider>
  );
}
