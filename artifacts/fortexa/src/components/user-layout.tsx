import { ReactNode } from 'react';
import { AppSidebar } from './app-sidebar';
import { SidebarProvider } from '@/lib/sidebar-context';

interface UserLayoutProps {
  children: ReactNode;
}

/**
 * Wraps user-facing pages with the SidebarProvider and the slide-out drawer.
 * Pages manage their own layout/padding — this component only provides
 * the sidebar context and renders the drawer overlay.
 */
export function UserLayout({ children }: UserLayoutProps) {
  return (
    <SidebarProvider>
      <AppSidebar />
      {children}
    </SidebarProvider>
  );
}
