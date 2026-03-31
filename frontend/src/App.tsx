// App.tsx — Root component with routing, theme, and auth wired up.

import { CssBaseline, ThemeProvider } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router';

import { ProtectedRoute } from '@components/protected-route';
import { PublicRoute } from '@components/public-route';
import { AuthProvider } from '@context/auth-context';
import { AccountsPage } from '@pages/accounts';
import { DashboardPage } from '@pages/dashboard';
import { HouseholdsPage } from '@pages/households';
import { LoginPage } from '@pages/login';
import { RegisterPage } from '@pages/register';
import { SummaryPage } from '@pages/summary';
import { TransactionsPage } from '@pages/transactions';
import theme from '@serve/theme';

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route
                path="/login"
                element={
                  <PublicRoute>
                    <LoginPage />
                  </PublicRoute>
                }
              />
              <Route
                path="/register"
                element={
                  <PublicRoute>
                    <RegisterPage />
                  </PublicRoute>
                }
              />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <DashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/households"
                element={
                  <ProtectedRoute>
                    <HouseholdsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/accounts"
                element={
                  <ProtectedRoute>
                    <AccountsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/summary"
                element={
                  <ProtectedRoute>
                    <SummaryPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/transactions"
                element={
                  <ProtectedRoute>
                    <TransactionsPage />
                  </ProtectedRoute>
                }
              />
              {/* Catch-all: redirect unknown paths to the dashboard. */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}