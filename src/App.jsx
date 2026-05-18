import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { useState } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { WorkspaceProvider, useWorkspace } from '@/lib/WorkspaceContext';
import WorkspaceSetup from '@/pages/WorkspaceSetup';
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
import UsersManagement from '@/pages/UsersManagement.jsx';
import Settings from '@/pages/Settings';
import CompanyProfile from '@/pages/CompanyProfile';
import Plans from '@/pages/Plans';
import Billing from '@/pages/Billing';
import AdminPayments from '@/pages/AdminPayments';
import SuperAdmin from '@/pages/SuperAdmin';
import Landing from '@/pages/Landing';
import InvitedUserOnboarding from '@/components/InvitedUserOnboarding';

const WorkspaceGate = ({ children }) => {
  const { workspace, loading, init } = useWorkspace();
  if (loading) return (
    <div className="fixed inset-0 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
    </div>
  );
  // Usuário convidado: ainda não tem workspace_id salvo, mas pode existir um
  // O InvitedUserOnboarding tenta associar e chama init() ao terminar
  if (!workspace) {
    // Verifica se é um novo usuário que precisa criar workspace ou um convidado
    return <WorkspaceSetupOrInvited />;
  }
  return children;
};

const WorkspaceSetupOrInvited = () => {
  const [triedOnboarding, setTriedOnboarding] = useState(false);
  const { init } = useWorkspace();

  const handleOnboardingDone = async () => {
    // Reinicia o contexto para pegar o workspace recém-associado
    await init?.();
    setTriedOnboarding(true);
  };

  // Primeiro tenta resolver como convidado (InvitedUserOnboarding)
  // Se não achar workspace, cai no WorkspaceSetup (criação)
  if (!triedOnboarding) {
    return <InvitedUserOnboarding onDone={handleOnboardingDone} />;
  }
  return <WorkspaceSetup />;
};

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

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
      <WorkspaceGate>
    <Routes>
      <Route path="/" element={<Navigate to="/Dashboard" replace />} />
      <Route path="/scan" element={<PublicScan />} />
      <Route path="/landing" element={<Landing />} />
      <Route path="/Plans" element={<Plans />} />
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
        <Route path="/UsersManagement" element={<UsersManagement />} />
        <Route path="/Settings" element={<Settings />} />
        <Route path="/CompanyProfile" element={<CompanyProfile />} />
        <Route path="/Billing" element={<Billing />} />
        <Route path="/AdminPayments" element={<AdminPayments />} />
        <Route path="/SuperAdmin" element={<SuperAdmin />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
      </WorkspaceGate>
    </WorkspaceProvider>
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