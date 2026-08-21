import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { AuthProvider } from '@/lib/auth-context';
import { ProtectedRoute } from '@/components/protected-route';
import { UserLayout } from '@/components/user-layout';

import LoginPage from '@/pages/login';
import RegisterPage from '@/pages/register';
import DashboardPage from '@/pages/dashboard';
import DepositPage from '@/pages/deposit';
import WithdrawPage from '@/pages/withdraw';
import TransactionsPage from '@/pages/transactions';
import ReferralsPage from '@/pages/referrals';
import ProfilePage from '@/pages/profile';
import NotificationsPage from '@/pages/notifications';
import SupportPage from '@/pages/support';
import AboutPage from '@/pages/about';
import NotFound from '@/pages/not-found';
import { PWAInstallBanner } from '@/components/pwa-install-banner';

import AdminDashboard from '@/pages/admin/index';
import AdminUsersPage from '@/pages/admin/users';
import AdminDepositsPage from '@/pages/admin/deposits';
import AdminWithdrawalsPage from '@/pages/admin/withdrawals';
import AdminSettingsPage from '@/pages/admin/settings';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

function Router() {
  return (
    <Switch>
      {/* Public routes */}
      <Route path="/login" component={LoginPage} />
      <Route path="/register" component={RegisterPage} />

      {/* User routes — wrapped in UserLayout to provide the sidebar context */}
      <Route path="/dashboard">
        <ProtectedRoute><UserLayout><DashboardPage /></UserLayout></ProtectedRoute>
      </Route>
      <Route path="/deposit">
        <ProtectedRoute><UserLayout><DepositPage /></UserLayout></ProtectedRoute>
      </Route>
      <Route path="/withdraw">
        <ProtectedRoute><UserLayout><WithdrawPage /></UserLayout></ProtectedRoute>
      </Route>
      <Route path="/transactions">
        <ProtectedRoute><UserLayout><TransactionsPage /></UserLayout></ProtectedRoute>
      </Route>
      <Route path="/referrals">
        <ProtectedRoute><UserLayout><ReferralsPage /></UserLayout></ProtectedRoute>
      </Route>
      <Route path="/profile">
        <ProtectedRoute><UserLayout><ProfilePage /></UserLayout></ProtectedRoute>
      </Route>
      <Route path="/notifications">
        <ProtectedRoute><UserLayout><NotificationsPage /></UserLayout></ProtectedRoute>
      </Route>
      <Route path="/support">
        <ProtectedRoute><UserLayout><SupportPage /></UserLayout></ProtectedRoute>
      </Route>
      <Route path="/about">
        <ProtectedRoute><UserLayout><AboutPage /></UserLayout></ProtectedRoute>
      </Route>

      {/* Admin routes */}
      <Route path="/admin">
        <ProtectedRoute requireAdmin><AdminDashboard /></ProtectedRoute>
      </Route>
      <Route path="/admin/users">
        <ProtectedRoute requireAdmin><AdminUsersPage /></ProtectedRoute>
      </Route>
      <Route path="/admin/deposits">
        <ProtectedRoute requireAdmin><AdminDepositsPage /></ProtectedRoute>
      </Route>
      <Route path="/admin/withdrawals">
        <ProtectedRoute requireAdmin><AdminWithdrawalsPage /></ProtectedRoute>
      </Route>
      <Route path="/admin/settings">
        <ProtectedRoute requireAdmin><AdminSettingsPage /></ProtectedRoute>
      </Route>

      {/* Root redirect */}
      <Route path="/">
        {() => { window.location.replace('login'); return null; }}
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
            <Router />
          </WouterRouter>
          <Toaster />
          <PWAInstallBanner />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
