import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { WorkspaceProvider, useWorkspace } from '@/lib/WorkspaceContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

import AppLayout from '@/components/layout/AppLayout';
import Dashboard from '@/pages/Dashboard';
import Assets from '@/pages/Assets';
import AssetForm from '@/pages/AssetForm';
import AssetDetail from '@/pages/AssetDetail';
import Depreciation from '@/pages/Depreciation';
import Reports from '@/pages/Reports';
import AssetMap from '@/pages/AssetMap';
import AssetLabel from '@/pages/AssetLabel';
import PublicScan from '@/pages/PublicScan';
import Suppliers from '@/pages/Suppliers';
import UsersManagement from '@/pages/UsersManagement';
import Settings from '@/pages/Settings';
import CompanyProfile from '@/pages/CompanyProfile';
import Collaborators from '@/pages/Collaborators';
import Landing from '@/pages/Landing';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Rota pública — sem autenticação necessária (deve vir ANTES de qualquer verificação de auth)
  if (window.location.pathname === '/scan') {
    return (
      <Routes>
        <Route path="/scan" element={<PublicScan />} />
      </Routes>
    );
  }

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <WorkspaceProvider>
      <Routes>
        <Route path="/" element={<Navigate to="/Dashboard" replace />} />
        <Route path="/landing" element={<Landing />} />
        <Route element={<AppLayout />}>
          <Route path="/Dashboard" element={<Dashboard />} />
          <Route path="/Assets" element={<Assets />} />
          <Route path="/AssetForm" element={<AssetForm />} />
          <Route path="/AssetDetail" element={<AssetDetail />} />
          <Route path="/Depreciation" element={<Depreciation />} />
          <Route path="/Reports" element={<Reports />} />
          <Route path="/AssetMap" element={<AssetMap />} />
          <Route path="/AssetLabel" element={<AssetLabel />} />
          <Route path="/Suppliers" element={<Suppliers />} />
          <Route path="/Collaborators" element={<Collaborators />} />
          <Route path="/UsersManagement" element={<UsersManagement />} />
          <Route path="/Settings" element={<Settings />} />
          <Route path="/CompanyProfile" element={<CompanyProfile />} />
        </Route>
        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </WorkspaceProvider>
  );
};

function App() {
  // Rota /scan é completamente pública — renderiza sem AuthProvider
  if (window.location.pathname === '/scan') {
    return (
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <Routes>
            <Route path="/scan" element={<PublicScan />} />
          </Routes>
        </Router>
        <Toaster />
      </QueryClientProvider>
    );
  }

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