import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Zap, Star, Crown, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PLANS } from '@/lib/plans';

const planIcons = {
  starter: Zap,
  professional: Star,
  enterprise: Crown,
};

const planColors = {
  starter: {
    badge: 'bg-blue-100 text-blue-700',
    icon: 'bg-blue-600',
    border: 'border-blue-200',
    button: 'bg-blue-600 hover:bg-blue-700 text-white',
    check: 'text-blue-600',
  },
  professional: {
    badge: 'bg-purple-100 text-purple-700',
    icon: 'bg-purple-600',
    border: 'border-purple-400 ring-2 ring-purple-400',
    button: 'bg-purple-600 hover:bg-purple-700 text-white',
    check: 'text-purple-600',
  },
  enterprise: {
    badge: 'bg-amber-100 text-amber-700',
    icon: 'bg-amber-500',
    border: 'border-amber-200',
    button: 'bg-amber-500 hover:bg-amber-600 text-white',
    check: 'text-amber-500',
  },
};

export default function Plans() {
  const [annual, setAnnual] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
      {/* Back */}
      <div className="absolute top-6 left-6">
        <Link to="/Dashboard" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm">
          <ArrowLeft className="h-4 w-4" /> Voltar ao sistema
        </Link>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-20">
        {/* Header */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 bg-blue-500/20 text-blue-300 text-xs font-semibold px-4 py-1.5 rounded-full mb-6 border border-blue-500/30">
            <Star className="h-3.5 w-3.5" /> Escolha o plano ideal para sua empresa
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-4 leading-tight">
            Gestão de Patrimônio<br />
            <span className="text-blue-400">sem complicação</span>
          </h1>
          <p className="text-slate-400 text-lg max-w-xl mx-auto">
            Controle seus ativos com depreciação automática, etiquetas QR e relatórios contábeis — em qualquer tamanho de empresa.
          </p>

          {/* Annual toggle */}
          <div className="flex items-center justify-center gap-3 mt-8">
            <span className={`text-sm font-medium ${!annual ? 'text-white' : 'text-slate-400'}`}>Mensal</span>
            <button
              onClick={() => setAnnual(!annual)}
              className={`relative w-12 h-6 rounded-full transition-colors ${annual ? 'bg-blue-600' : 'bg-slate-600'}`}
            >
              <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${annual ? 'translate-x-6' : ''}`} />
            </button>
            <span className={`text-sm font-medium ${annual ? 'text-white' : 'text-slate-400'}`}>
              Anual <span className="text-green-400 font-bold">−2 meses grátis</span>
            </span>
          </div>
        </div>

        {/* Plans grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {Object.values(PLANS).map((plan) => {
            const Icon = planIcons[plan.id];
            const colors = planColors[plan.id];
            const price = annual ? plan.priceAnnual : plan.price;
            const priceLabel = annual ? '/ano' : '/mês';

            return (
              <div
                key={plan.id}
                className={`relative bg-slate-800/60 backdrop-blur rounded-2xl border p-7 flex flex-col ${colors.border} ${plan.popular ? 'md:-mt-4 md:mb-4' : ''}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="bg-purple-600 text-white text-xs font-bold px-4 py-1 rounded-full shadow-lg">MAIS POPULAR</span>
                  </div>
                )}

                {/* Icon + Name */}
                <div className="flex items-center gap-3 mb-4">
                  <div className={`h-10 w-10 rounded-xl ${colors.icon} flex items-center justify-center`}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-lg">{plan.name}</h3>
                    <p className="text-slate-400 text-xs">{plan.description}</p>
                  </div>
                </div>

                {/* Price */}
                <div className="mb-6">
                  {price ? (
                    <div className="flex items-end gap-1">
                      <span className="text-3xl font-extrabold text-white">
                        R$ {price.toLocaleString('pt-BR')}
                      </span>
                      <span className="text-slate-400 text-sm mb-1">{priceLabel}</span>
                    </div>
                  ) : (
                    <div className="text-2xl font-extrabold text-white">Sob consulta</div>
                  )}
                  <p className="text-slate-400 text-xs mt-1">
                    {plan.maxUsers === Infinity ? 'Usuários ilimitados' : `Até ${plan.maxUsers} usuários`}
                    {' · '}
                    {plan.maxAssets === Infinity ? 'Ativos ilimitados' : `Até ${plan.maxAssets.toLocaleString('pt-BR')} ativos`}
                  </p>
                </div>

                {/* Features */}
                <ul className="space-y-2.5 mb-8 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-slate-300">
                      <Check className={`h-4 w-4 mt-0.5 flex-shrink-0 ${colors.check}`} />
                      {f}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                {plan.id === 'enterprise' ? (
                  <a
                    href="mailto:contato@seusistema.com.br?subject=Interesse no plano Enterprise"
                    className={`block text-center py-2.5 px-4 rounded-xl font-semibold text-sm transition-all ${colors.button}`}
                  >
                    Falar com consultor
                  </a>
                ) : (
                  <Link
                    to="/Billing"
                    className={`block text-center py-2.5 px-4 rounded-xl font-semibold text-sm transition-all ${colors.button}`}
                  >
                    Começar agora
                  </Link>
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom trust */}
        <div className="mt-16 text-center">
          <p className="text-slate-500 text-sm">✓ Cancele a qualquer momento &nbsp;·&nbsp; ✓ Dados sempre seus &nbsp;·&nbsp; ✓ Suporte em português</p>
        </div>
      </div>
    </div>
  );
}