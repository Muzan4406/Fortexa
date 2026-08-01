import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { AuthProvider } from '@/lib/auth-context';
import { ProtectedRoute } from '@/components/protected-route';

import LoginPage from '@/pages/login';
import RegisterPage from '@/pages/register';
import DashboardPage from '@/pages/dashboard';
import DepositPage from '@/pages/deposit';
import WithdrawPage from '@/pages/withdraw';
import TransactionsPage from '@/pages/transactions';
import ReferralsPage from '@/pages/referrals';
import ProfilePage from '@/pages/profile';
import NotFound from '@/pages/not-found';

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

      {/* User routes */}
      <Route path="/dashboard">
        <ProtectedRoute><DashboardPage /></ProtectedRoute>
      </Route>
      <Route path="/deposit">
        <ProtectedRoute><DepositPage /></ProtectedRoute>
      </Route>
      <Route path="/withdraw">
        <ProtectedRoute><WithdrawPage /></ProtectedRoute>
      </Route>
      <Route path="/transactions">
        <ProtectedRoute><TransactionsPage /></ProtectedRoute>
      </Route>
      <Route path="/referrals">
        <ProtectedRoute><ReferralsPage /></ProtectedRoute>
      </Route>
      <Route path="/profile">
        <ProtectedRoute><ProfilePage /></ProtectedRoute>
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
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
