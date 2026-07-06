import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useWorkspace } from '@/lib/WorkspaceContext';
import { useWorkspaceEntity } from '@/lib/useWorkspaceData';
import { getPlan, PLANS } from '@/lib/plans';
import { Button } from '@/components/ui/button';
import { Check, Zap, Star, Crown, Users, Package, ArrowUpRight, ShieldCheck } from 'lucide-react';
import moment from 'moment';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const planIcons = { starter: Zap, professional: Star, enterprise: Crown };
const planColors = {
  starter: 'bg-blue-100 text-blue-700 border-blue-200',
  professional: 'bg-purple-100 text-purple-700 border-purple-200',
  enterprise: 'bg-amber-100 text-amber-700 border-amber-200',
};

export default function Billing() {
  const { workspace, refreshWorkspace } = useWorkspace();
  const [assetCount, setAssetCount] = useState(0);
  const [userCount, setUserCount] = useState(0);
  const [upgrading, setUpgrading] = useState(null);
  const [annual, setAnnual] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const AssetEntity = useWorkspaceEntity('Asset');

  useEffect(() => {
    // Contagem leve (só ids) em vez de puxar milhares de registros completos.
    AssetEntity.count().then(setAssetCount);
    // Conta apenas membros do workspace atual
    const memberCount = 1 + (workspace?.member_emails?.length || 0);
    setUserCount(memberCount);
  }, [workspace]);

  // Retorno do Stripe Checkout (?checkout=success|cancelled)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkout = params.get('checkout');
    if (!checkout) return;
    if (checkout === 'success') {
      toast.success('Pagamento confirmado! Seu plano será ativado em instantes.');
      setTimeout(() => refreshWorkspace(), 4000);
    } else if (checkout === 'cancelled') {
      toast.info('Pagamento cancelado. Nenhuma cobrança foi feita.');
    }
    params.delete('checkout');
    window.history.replaceState({}, '', `${window.location.pathname}${params.toString() ? `?${params}` : ''}`);
  }, []);

  const currentPlan = getPlan(workspace?.plan);
  const PlanIcon = planIcons[currentPlan.id] || Zap;

  // Stripe Checkout — preço e intervalo são resolvidos no servidor (whitelist).
  const handleUpgrade = async (planId) => {
    setUpgrading(planId);
    try {
      const res = await base44.functions.invoke('stripeCheckout', {
        plan: planId,
        interval: annual ? 'year' : 'month',
      });
      if (res?.data?.ok && res.data.url) {
        window.location.href = res.data.url;
        return;
      }
      toast.error(res?.data?.error || 'Não foi possível iniciar o pagamento.');
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Não foi possível iniciar o pagamento.');
    }
    setUpgrading(null);
  };

  const handlePortal = async () => {
    setPortalLoading(true);
    try {
      const res = await base44.functions.invoke('stripePortal', {});
      if (res?.data?.ok && res.data.url) {
        window.location.href = res.data.url;
        return;
      }
      toast.error(res?.data?.error || 'Não foi possível abrir o portal de assinatura.');
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Não foi possível abrir o portal de assinatura.');
    }
    setPortalLoading(false);
  };

  const trialDaysLeft = workspace?.trial_ends_at
    ? Math.max(0, moment(workspace.trial_ends_at).diff(moment(), 'days'))
    : null;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Plano & Cobrança</h1>
        <p className="text-muted-foreground mt-1">Gerencie sua assinatura e limites de uso</p>
      </div>

      {/* Current Plan Card */}
      <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${
              currentPlan.id === 'starter' ? 'bg-blue-600' :
              currentPlan.id === 'professional' ? 'bg-purple-600' : 'bg-amber-500'
            }`}>
              <PlanIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-foreground">{currentPlan.name}</h2>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${planColors[currentPlan.id]}`}>
                  {workspace?.plan_status === 'trial' ? 'Trial' : 'Ativo'}
                </span>
              </div>
              <p className="text-muted-foreground text-sm">{currentPlan.description}</p>
            </div>
          </div>
          <div className="text-right">
            {currentPlan.price ? (
              <>
                <p className="text-2xl font-bold text-foreground">R$ {currentPlan.price.toLocaleString('pt-BR')}<span className="text-sm font-normal text-muted-foreground">/mês</span></p>
                {workspace?.plan_expires_at && (
                  <p className="text-xs text-muted-foreground">Renova em {moment(workspace.plan_expires_at).format('DD/MM/YYYY')}</p>
                )}
              </>
            ) : (
              <p className="text-lg font-bold text-foreground">Sob consulta</p>
            )}
          </div>
        </div>

        {trialDaysLeft !== null && (
          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800 flex items-center gap-2">
            ⏱️ Seu período de trial expira em <strong>{trialDaysLeft} dias</strong>. Escolha um plano para continuar.
          </div>
        )}

        {workspace?.stripe_customer_id && (
          <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePortal} disabled={portalLoading}>
              {portalLoading ? 'Abrindo...' : 'Gerenciar assinatura'}
            </Button>
            <p className="text-xs text-muted-foreground">
              Alterar cartão, trocar de plano, baixar faturas ou cancelar — com segurança, via Stripe.
            </p>
          </div>
        )}
      </div>

      {/* Usage */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <UsageCard
          icon={Users}
          label="Usuários"
          current={userCount}
          max={currentPlan.limits.users}
          color="blue"
        />
        <UsageCard
          icon={Package}
          label="Ativos Cadastrados"
          current={assetCount}
          max={currentPlan.limits.assets}
          color="purple"
        />
      </div>

      {/* Plans comparison */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">Mudar Plano</h3>
          <Link to="/Plans" className="flex items-center gap-1 text-sm text-primary hover:underline">
            Ver página de planos <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <span className={`text-sm ${!annual ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>Mensal</span>
          <button
            type="button"
            onClick={() => setAnnual(!annual)}
            aria-label="Alternar cobrança anual"
            className={`relative w-11 h-6 rounded-full transition-colors ${annual ? 'bg-primary' : 'bg-muted'}`}
          >
            <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${annual ? 'translate-x-5' : ''}`} />
          </button>
          <span className={`text-sm ${annual ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
            Anual <span className="text-green-600 font-semibold">−2 meses grátis</span>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Object.values(PLANS).map((plan) => {
            const Icon = planIcons[plan.id];
            const isCurrent = plan.id === workspace?.plan;
            return (
              <div key={plan.id} className={`bg-card rounded-xl border p-5 flex flex-col ${isCurrent ? 'border-primary ring-2 ring-primary' : 'border-border'}`}>
                {isCurrent && (
                  <div className="text-xs text-primary font-bold mb-2 flex items-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5" /> Plano atual
                  </div>
                )}
                <div className="flex items-center gap-2 mb-3">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                  <span className="font-bold text-foreground">{plan.name}</span>
                </div>
                <p className="text-2xl font-bold text-foreground mb-1">
                  {plan.price ? `R$ ${(annual ? plan.priceAnnual : plan.price).toLocaleString('pt-BR')}` : 'Consulte'}
                  {plan.price && <span className="text-sm font-normal text-muted-foreground">{annual ? '/ano' : '/mês'}</span>}
                </p>
                <p className="text-xs text-muted-foreground mb-4">
                  {plan.maxUsers === Infinity ? 'Usuários ilimitados' : `Até ${plan.maxUsers} usuários`}
                  {' · '}
                  {plan.maxAssets === Infinity ? 'Ativos ilimitados' : `Até ${plan.maxAssets.toLocaleString('pt-BR')} ativos`}
                </p>
                <ul className="space-y-1.5 mb-5 flex-1">
                  {plan.features.slice(0, 4).map(f => (
                    <li key={f} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Check className="h-3 w-3 text-green-600 flex-shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
                {isCurrent ? (
                  <Button variant="outline" disabled className="w-full text-sm">Plano atual</Button>
                ) : plan.id === 'enterprise' ? (
                  <a href="mailto:ceo@amzdatasoftware.com?subject=Interesse no plano Enterprise" className="block text-center py-2 px-4 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-semibold transition-colors">
                    Falar com consultor
                  </a>
                ) : (
                  <Button
                    className="w-full text-sm"
                    onClick={() => handleUpgrade(plan.id)}
                    disabled={!!upgrading}
                  >
                    {upgrading === plan.id ? (
                      <span className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Processando...</span>
                    ) : plan.price > (currentPlan.price || 0) ? 'Fazer Upgrade' : 'Mudar Plano'}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-xs text-center text-muted-foreground">
        Dúvidas sobre cobrança? Entre em contato: <a href="mailto:ceo@amzdatasoftware.com" className="underline">ceo@amzdatasoftware.com</a>
      </p>

    </div>
  );
}

function UsageCard({ icon: Icon, label, current, max, color }) {
  const pct = max === Infinity ? 0 : Math.min(100, (current / max) * 100);
  const isNearLimit = pct >= 80;
  const isAtLimit = pct >= 100;

  return (
    <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">{label}</span>
        </div>
        <span className={`text-xs font-bold ${isAtLimit ? 'text-red-600' : isNearLimit ? 'text-amber-600' : 'text-muted-foreground'}`}>
          {current} / {max === Infinity ? '∞' : max}
        </span>
      </div>
      {max !== Infinity && (
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${isAtLimit ? 'bg-red-500' : isNearLimit ? 'bg-amber-500' : `bg-${color}-600`}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
      {isAtLimit && (
        <p className="text-xs text-red-600 mt-1.5 font-medium">Limite atingido — faça upgrade para continuar</p>
      )}
      {isNearLimit && !isAtLimit && (
        <p className="text-xs text-amber-600 mt-1.5">Próximo do limite — considere um upgrade</p>
      )}
    </div>
  );
}