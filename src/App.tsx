import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@/components/layout/ThemeProvider';
import { AppProvider } from '@/contexts/AppContext';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { Suspense, lazy, useEffect } from 'react';
import { ScrollToTop } from '@/components/ScrollToTop';
import { TrendingUp, Sparkles } from 'lucide-react';

// Core pages (loaded immediately)
import Dashboard from './pages/Index';
import ExpenseForm from './pages/ExpenseForm';
import GroupDetail from './pages/GroupDetail';
import Groups from './pages/Groups';
import Login from './pages/Login';
import Signup from './pages/Signup';
import NotFound from './pages/NotFound';
import AllExpenses from './pages/AllExpenses';
import { PushManager } from './services/PushManager';

// Lazy loaded pages (loaded on demand)
const Profile = lazy(() => import('./pages/Profile'));
const Settings = lazy(() => import('./pages/Settings'));
const ExpenseDetail = lazy(() => import('./pages/ExpenseDetail'));
const UserProfile = lazy(() => import('./pages/UserProfile'));
const Reports = lazy(() => import('./pages/Reports'));
const Notifications = lazy(() => import('./pages/Notifications'));
const Friends = lazy(() => import('./pages/Friends'));
const Purchases = lazy(() => import('./pages/Purchases'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));

const queryClient = new QueryClient();

// Beautiful branded loading component
const PageLoader = () => (
  <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
    {/* Logo */}
    <div className="flex items-center gap-3 mb-8">
      <div className="w-12 h-12 relative flex items-center justify-center rounded-2xl bg-gradient-to-br from-green-400 via-emerald-500 to-teal-600 shadow-xl shadow-emerald-500/40 animate-pulse">
        <TrendingUp className="h-7 w-7 text-white" strokeWidth={2.5} />
        <Sparkles className="h-4 w-4 text-yellow-300 absolute -top-1 -right-1 drop-shadow-lg" />
      </div>
      <span
        className="text-4xl"
        style={{
          fontFamily: "'Cookie', cursive",
          background: 'linear-gradient(135deg, #059669 0%, #0d9488 50%, #0891b2 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}
      >
        Wisely Spent
      </span>
    </div>

    {/* Animated loading dots */}
    <div className="flex items-center gap-2">
      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '0ms' }}></div>
      <div className="w-2 h-2 rounded-full bg-teal-500 animate-bounce" style={{ animationDelay: '150ms' }}></div>
      <div className="w-2 h-2 rounded-full bg-cyan-500 animate-bounce" style={{ animationDelay: '300ms' }}></div>
    </div>

    {/* Loading text */}
    <p className="mt-4 text-sm text-muted-foreground">Loading your finances...</p>
  </div>
);

// Protected route component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, status } = useAuth();

  if (status === "loading") {
    return <PageLoader />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="light">
      <AuthProvider>
        <AppProvider>
          <TooltipProvider>
            <PushInitializer />
            <Toaster />
            <BrowserRouter>
              <ScrollToTop />
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  {/* Authentication Routes */}
                  <Route path="/login" element={<Login />} />
                  <Route path="/signup" element={<Signup />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />

                  {/* Protected Routes */}
                  <Route path="/" element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  } />
                  <Route path="/expenses/new" element={
                    <ProtectedRoute>
                      <ExpenseForm />
                    </ProtectedRoute>
                  } />
                  <Route path="/expenses/:expenseId/edit" element={
                    <ProtectedRoute>
                      <ExpenseForm />
                    </ProtectedRoute>
                  } />
                  <Route path="/expenses" element={
                    <ProtectedRoute>
                      <AllExpenses mode="shared" />
                    </ProtectedRoute>
                  } />
                  <Route path="/personal-expenses" element={
                    <ProtectedRoute>
                      <AllExpenses mode="personal" />
                    </ProtectedRoute>
                  } />
                  <Route path="/expenses/:expenseId" element={
                    <ProtectedRoute>
                      <ExpenseDetail />
                    </ProtectedRoute>
                  } />
                  <Route path="/groups" element={
                    <ProtectedRoute>
                      <Groups />
                    </ProtectedRoute>
                  } />
                  <Route path="/groups/:groupId" element={
                    <ProtectedRoute>
                      <GroupDetail />
                    </ProtectedRoute>
                  } />
                  <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                  <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                  <Route path="/users/:userId" element={<ProtectedRoute><UserProfile /></ProtectedRoute>} />
                  <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
                  <Route path="/friends" element={<ProtectedRoute><Friends /></ProtectedRoute>} />
                  <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
                  <Route path="/purchases" element={<ProtectedRoute><Purchases /></ProtectedRoute>} />

                  {/* Not Found Route */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </TooltipProvider>
        </AppProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

const PushInitializer = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (user?.preferences?.pushNotifications) {
      PushManager.register();
    }
  }, [user]);

  return null;
};

export default App;
// Force rebuild