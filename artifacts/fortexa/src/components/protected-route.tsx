import { ReactNode, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/lib/auth-context';
import { useGetDashboard, getGetDashboardQueryKey } from '@workspace/api-client-react';
import MaintenancePage from '@/pages/maintenance';

interface ProtectedRouteProps {
  children: ReactNode;
  requireAdmin?: boolean;
}

export function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { user, isLoading, token } = useAuth();
  const { data: dashboard, isLoading: settingsLoading } = useGetDashboard({ query: { enabled: !!token, queryKey: getGetDashboardQueryKey() } });
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !token) {
      setLocation('/login');
    }
    
    if (!isLoading && user && requireAdmin && user.role !== 'admin') {
      setLocation('/dashboard');
    }
  }, [user, isLoading, token, requireAdmin, setLocation]);

  if (isLoading || (token && settingsLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!user || (requireAdmin && user.role !== 'admin')) {
    return null;
  }

  if (!requireAdmin && dashboard?.settings?.maintenanceMode) {
    return <MaintenancePage message={dashboard.settings.maintenanceMessage} />;
  }

  return <>{children}</>;
}
