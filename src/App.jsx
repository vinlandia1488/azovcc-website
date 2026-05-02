import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, useNavigate, useLocation } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { getSession, clearSession } from '@/lib/auth';
import { getBackendDb } from '@/lib/backend';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import RawKeyList from './pages/RawKeyList';
// Add page imports here

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Session validation: logout if account no longer exists
    async function validateSession() {
      const session = getSession();
      if (!session || session.username === 'admin') return;

      try {
        const db = getBackendDb();
        const accounts = await db.entities.Account.filter({ username: session.username });
        if (!accounts || accounts.length === 0) {
          clearSession();
          navigate('/');
        }
      } catch (err) {
        console.error('Session validation failed:', err);
      }
    }

    validateSession();
  }, [location.pathname, navigate]);

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // App uses custom auth — render routes normally
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/" element={<Auth />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/data/687832478326487236487236.txt" element={<RawKeyList />} />
      {/* Add your page Route elements here */}
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App