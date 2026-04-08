import { useState, useEffect } from 'react';
import { useWorkspace } from '@/lib/WorkspaceContext';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { AlertTriangle, X } from 'lucide-react';
import moment from 'moment';

export default function PaymentReminderBanner() {
  const { workspace, user } = useWorkspace();
  const [dismissed, setDismissed] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const status = workspace?.plan_status;
  const trialEnds = workspace?.trial_ends_at;
  const planExpires = workspace?.plan_expires_at;

  const trialDaysLeft = trialEnds ? moment(trialEnds).diff(moment(), 'days') : null;
  const showTrialWarning = status === 'trial' && trialDaysLeft !== null && trialDaysLeft <= 5 && trialDaysLeft >= 0;

  const planDaysOverdue = planExpires ? moment().diff(moment(planExpires), 'days') : null;
  const showPaymentWarning = status === 'active' && planDaysOverdue !== null && planDaysOverdue > 0 && planDaysOverdue <= 7;

  const isUrgent = showPaymentWarning || trialDaysLeft <= 2;

  useEffect(() => {
    if (!user?.email || emailSent || !workspace) return;
    if (showTrialWarning && trialDaysLeft <= 3) {
      setEmailSent(true);
      base44.integrations.Core.SendEmail({
        to: user.email,
        subject: `⏱️ Seu trial encerra em ${trialDaysLeft === 0 ? 'hoje' : `${trialDaysLeft} dia(s)`} — PatrimônioApp`,
        body: `Olá!\n\nSeu período de avaliação gratuita do PatrimônioApp encerra ${trialDaysLeft === 0 ? 'hoje' : `em ${trialDaysLeft} dia(s)`}.\n\nPara continuar usando o sistema sem interrupção, escolha um plano:\n👉 Acesse: ${window.location.origin}/Billing\n\nDúvidas? Responda este e-mail.\n\nAtenciosamente,\nEquipe PatrimônioApp`,
      });
    }
    if (showPaymentWarning && planDaysOverdue >= 3) {
      setEmailSent(true);
      base44.integrations.Core.SendEmail({
        to: user.email,
        subject: `⚠️ Pagamento atrasado há ${planDaysOverdue} dia(s) — PatrimônioApp`,
        body: `Olá!\n\nIdentificamos que o pagamento da sua assinatura está em atraso há ${planDaysOverdue} dia(s).\n\nSua conta será suspensa caso o pagamento não seja regularizado em breve.\n\n👉 Regularize agora: ${window.location.origin}/Billing\n\nAtenciosamente,\nEquipe PatrimônioApp`,
      });
    }
  }, [showTrialWarning, showPaymentWarning, user?.email, emailSent, workspace]);

  if (!workspace || dismissed || (!showTrialWarning && !showPaymentWarning)) return null;

  return (
    <div className={`flex items-center gap-3 px-4 py-2.5 text-sm ${isUrgent ? 'bg-red-600 text-white' : 'bg-amber-500 text-white'}`}>
      <AlertTriangle className="h-4 w-4 flex-shrink-0" />
      <span className="flex-1">
        {showTrialWarning && (
          <>
            Seu período de avaliação {trialDaysLeft === 0 ? 'encerra hoje' : `encerra em ${trialDaysLeft} dia(s)`}.{' '}
          </>
        )}
        {showPaymentWarning && (
          <>
            Pagamento atrasado há {planDaysOverdue} dia(s) — acesso será suspenso em breve.{' '}
          </>
        )}
        <Link to="/Billing" className="font-bold underline hover:no-underline">
          Regularizar agora →
        </Link>
      </span>
      <button onClick={() => setDismissed(true)} className="flex-shrink-0 hover:opacity-70 transition-opacity">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}