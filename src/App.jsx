import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { WorkspaceProvider, useWorkspace } from '@/lib/WorkspaceContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import PaymentGate from '@/components/PaymentGate';

import AppLayout from '@/components/layout/AppLayout';
import Dashboard from '@/pages/Dashboard';
import Assets from '@/pages/Assets';
import Inventory from '@/pages/Inventory';
import Maintenance from '@/pages/Maintenance';
import Contracts from '@/pages/Contracts';
import AssetForm from '@/pages/AssetForm';
import AssetDetail from '@/pages/AssetDetail';
import Depreciation from '@/pages/Depreciation';
import Reports from '@/pages/Reports';
import AssetMap from '@/pages/AssetMap';
import AssetLabel from '@/pages/AssetLabel';
import PublicScan from '@/pages/PublicScan';
import PrivacyPolicy from '@/pages/PrivacyPolicy';
import TermsOfService from '@/pages/TermsOfService';
import Suppliers from '@/pages/Suppliers';
import UsersManagement from '@/pages/UsersManagement';
import Settings from '@/pages/Settings';
import CompanyProfile from '@/pages/CompanyProfile';
import Collaborators from '@/pages/Collaborators';
import Notifications from '@/pages/Notifications';
import AuditTrail from '@/pages/AuditTrail';
import Landing from '@/pages/Landing';
import ImportExport from '@/pages/ImportExport';
import WorkspaceSetup from '@/pages/WorkspaceSetup';
import Billing from '@/pages/Billing';
import Plans from '@/pages/Plans';
import SuperAdmin from '@/pages/SuperAdmin';
import AssistantChat from '@/pages/AssistantChat';
import AiBriefings from '@/pages/AiBriefings';
import AdminCredits from '@/pages/AdminCredits';
import Transfers from '@/pages/Transfers';
import AcceptTransfer from '@/pages/AcceptTransfer';
import CiapCredits from '@/pages/CiapCredits';
import AccountingExport from '@/pages/AccountingExport';
import Branches from '@/pages/Branches';
import Help from '@/pages/Help';
import Revaluations from '@/pages/Revaluations';
import Disposals from '@/pages/Disposals';
import Loans from '@/pages/Loans';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Rotas públicas — sem autenticação necessária (devem vir ANTES de qualquer verificação de auth)
  if (PUBLIC_PATHS.includes(window.location.pathname)) {
    return (
      <Routes>
        <Route path="/scan" element={<PublicScan />} />
        <Route path="/aceitar-transferencia" element={<AcceptTransfer />} />
        <Route path="/landing" element={<Landing />} />
        <Route path="/privacidade" element={<PrivacyPolicy />} />
        <Route path="/termos" element={<TermsOfService />} />
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
      <WorkspaceRoutes />
    </WorkspaceProvider>
  );
};

// Decides between: loading spinner, first-time workspace setup, or the real app routes.
const WorkspaceRoutes = () => {
  const { loading, needsSetup } = useWorkspace();

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (needsSetup) {
    return (
      <Routes>
        <Route path="*" element={<WorkspaceSetup />} />
      </Routes>
    );
  }

  return (
    <PaymentGate>
      <Routes>
        <Route path="/" element={<Navigate to="/Dashboard" replace />} />
        <Route path="/Plans" element={<Plans />} />
        <Route element={<AppLayout />}>
          <Route path="/Dashboard" element={<Dashboard />} />
          <Route path="/AiBriefings" element={<AiBriefings />} />
          <Route path="/Assets" element={<Assets />} />
          <Route path="/Inventory" element={<Inventory />} />
          <Route path="/Transfers" element={<Transfers />} />
          <Route path="/Maintenance" element={<Maintenance />} />
          <Route path="/Contracts" element={<Contracts />} />
          <Route path="/CiapCredits" element={<CiapCredits />} />
          <Route path="/AssetForm" element={<AssetForm />} />
          <Route path="/AssetDetail" element={<AssetDetail />} />
          <Route path="/Depreciation" element={<Depreciation />} />
          <Route path="/Reports" element={<Reports />} />
          <Route path="/AccountingExport" element={<AccountingExport />} />
          <Route path="/AssetMap" element={<AssetMap />} />
          <Route path="/AssetLabel" element={<AssetLabel />} />
          <Route path="/Suppliers" element={<Suppliers />} />
          <Route path="/Collaborators" element={<Collaborators />} />
          <Route path="/Notifications" element={<Notifications />} />
          <Route path="/AuditTrail" element={<AuditTrail />} />
          <Route path="/UsersManagement" element={<UsersManagement />} />
          <Route path="/Settings" element={<Settings />} />
          <Route path="/CompanyProfile" element={<CompanyProfile />} />
          <Route path="/Branches" element={<Branches />} />
          <Route path="/ImportExport" element={<ImportExport />} />
          <Route path="/Billing" element={<Billing />} />
          <Route path="/SuperAdmin" element={<SuperAdmin />} />
          <Route path="/Assistant" element={<AssistantChat />} />
          <Route path="/AdminCredits" element={<AdminCredits />} />
          <Route path="/Help" element={<Help />} />
          <Route path="/Revaluations" element={<Revaluations />} />
          <Route path="/Disposals" element={<Disposals />} />
          <Route path="/Loans" element={<Loans />} />
        </Route>
        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </PaymentGate>
  );
};

// Rotas totalmente públicas — renderizam sem AuthProvider (sem exigir login).
const PUBLIC_PATHS = ['/scan', '/aceitar-transferencia', '/landing', '/privacidade', '/termos'];

function App() {
  if (PUBLIC_PATHS.includes(window.location.pathname)) {
    return (
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <Routes>
            <Route path="/scan" element={<PublicScan />} />
            <Route path="/aceitar-transferencia" element={<AcceptTransfer />} />
            <Route path="/landing" element={<Landing />} />
            <Route path="/privacidade" element={<PrivacyPolicy />} />
            <Route path="/termos" element={<TermsOfService />} />
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