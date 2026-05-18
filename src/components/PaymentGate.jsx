import { useWorkspace } from '@/lib/WorkspaceContext';
import { useAuth } from '@/lib/AuthContext';
import { Link } from 'react-router-dom';
import { ShieldAlert, CreditCard, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import moment from 'moment';

export default function PaymentGate({ children }) {
  const { workspace, loading } = useWorkspace();
  const { user } = useAuth();

  if (loading) return null;
  if (!workspace) return children;
  // Super admin nunca é bloqueado
  if (user?.role === 'admin') return children;

  const status = workspace.plan_status;
  const trialEnds = workspace.trial_ends_at;
  const planExpires = workspace.plan_expires_at;

  // Check suspension
  const isSuspended = status === 'suspended' || status === 'cancelled';

  // Check trial expired
  const trialExpired = status === 'trial' && trialEnds && moment(trialEnds).isBefore(moment());

  // Check plan payment overdue (expired > 7 days)
  const paymentOverdue = status === 'active' && planExpires && moment(planExpires).add(7, 'days').isBefore(moment());

  if (isSuspended || trialExpired || paymentOverdue) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
          <div className="bg-red-600 p-8 text-white text-center">
            <ShieldAlert className="h-14 w-14 mx-auto mb-3 opacity-90" />
            <h1 className="text-2xl font-bold">Acesso Suspenso</h1>
            <p className="text-red-200 mt-2 text-sm">
              {trialExpired
                ? 'Seu período de teste encerrou.'
                : paymentOverdue
                ? 'Pagamento em atraso detectado.'
                : 'Sua conta foi suspensa por falta de pagamento.'}
            </p>
          </div>
          <div className="p-8 space-y-5 text-center">
            <p className="text-slate-600 text-sm leading-relaxed">
              Para reativar o acesso, escolha um plano e realize o pagamento. Seus dados estão preservados e serão restaurados imediatamente após a confirmação.
            </p>
            <div className="flex flex-col gap-3">
              <Link to="/Billing">
                <Button className="w-full gap-2">
                  <CreditCard className="h-4 w-4" />
                  Regularizar pagamento
                </Button>
              </Link>
              <a
                href="mailto:contato@seusistema.com.br?subject=Ajuda com minha conta"
                className="flex items-center justify-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
              >
                <Mail className="h-4 w-4" />
                Falar com suporte
              </a>
            </div>
            <p className="text-xs text-slate-400">
              {trialExpired
                ? `Trial encerrado em ${moment(trialEnds).format('DD/MM/YYYY')}`
                : `Último pagamento esperado em ${moment(planExpires).format('DD/MM/YYYY')}`}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return children;
}