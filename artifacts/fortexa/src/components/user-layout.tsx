import { ReactNode } from 'react';

interface UserLayoutProps {
  children: ReactNode;
}

export function UserLayout({ children }: UserLayoutProps) {
  return <>{children}</>;
}
