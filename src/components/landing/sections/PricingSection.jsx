import { useState } from 'react';
import { Zap } from 'lucide-react';
import { PLANS } from '@/lib/plans';
import { COMPANY } from '@/lib/company';
import SectionTag from '../SectionTag';
import PlanCard from '../PlanCard';
import FinanceFlowSVG from '../svg/FinanceFlowSVG';
import { display, dim, dimmer } from '../landingTheme';

/**
 * Seção de planos da landing. Mantém a MESMA lógica de pagamento da página /Plans:
 * PLANS (preços/limites) + toggle anual + PlanCard. Correção: CTA de entrada usa
 * ctaHref (navegação completa) porque a landing roda num router público que não
 * conhece as rotas internas — ctaTo (Link SPA) não casaria e o clique morreria.
 */
export default function PricingSection() {
  const [annual, setAnnual] = useState(false);
  const enterpriseMail = `mailto:${COMPANY?.email || 'ceo@amzdatasoftware.com'}?subject=Interesse no plano Enterprise`;

  return (
    <section id="precos" style={{ padding: '84px 0', borderTop: '1px solid var(--landing-line)' }}>
      <div className="max-w-6xl mx-auto px-4">
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <SectionTag style={{ marginBottom: 20 }}>
            <Zap style={{ width: 14, height: 14 }} /> Planos
          </SectionTag>
          <h2 style={{ ...display, fontSize: 'clamp(26px, 4vw, 36px)', fontWeight: 700, margin: '0 0 12px', color: 'var(--landing-steam)' }}>
            Preço público, conta simples: a partir de R$ 97/mês
          </h2>
          <p style={{ fontSize: 18, color: dim, margin: 0 }}>
            IA inclusa em todos os planos. Comece grátis por 14 dias, sem cartão.
          </p>
        </div>

        <FinanceFlowSVG />

        {/* Annual toggle */}
        <div className="flex items-center justify-center gap-3 mb-14">
          <span className="text-sm font-medium transition-colors" style={{ color: !annual ? 'var(--landing-steam)' : dimmer }}>Mensal</span>
          <button
            onClick={() => setAnnual(!annual)}
            className="relative w-12 h-6 rounded-full transition-colors"
            style={{ background: annual ? 'var(--landing-cyan)' : 'hsl(200 30% 96% / 0.15)', border: '1px solid var(--landing-line)' }}
            aria-label="Alternar cobrança anual"
          >
            <div className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform" style={{ transform: annual ? 'translateX(24px)' : 'translateX(0)' }} />
          </button>
          <span className="text-sm font-medium transition-colors" style={{ color: annual ? 'var(--landing-steam)' : dimmer }}>
            Anual <span style={{ color: 'hsl(160 84% 55%)', fontWeight: 700 }}>−2 meses grátis</span>
          </span>
        </div>

        {/* Plans grid — mesma lógica de pagamento da página /Plans */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {Object.values(PLANS).map((plan) => {
            const price = annual ? plan.priceAnnual : plan.price;
            const priceNote = annual ? '/ano' : '/mês';
            const subtitle =
              (plan.maxUsers === Infinity ? 'Usuários ilimitados' : `Até ${plan.maxUsers} usuários`) +
              ' · ' +
              (plan.maxAssets === Infinity ? 'Ativos ilimitados' : `Até ${plan.maxAssets.toLocaleString('pt-BR')} ativos`);
            return (
              <PlanCard
                key={plan.id}
                name={plan.name}
                description={plan.description}
                price={price}
                priceNote={priceNote}
                popular={plan.popular}
                features={plan.features}
                subtitle={subtitle}
                cta={plan.id === 'enterprise' ? 'Falar com consultor' : 'Começar agora'}
                ctaHref={plan.id === 'enterprise' ? enterpriseMail : '/Billing'}
              />
            );
          })}
        </div>

        <p style={{ textAlign: 'center', fontSize: 14, color: dimmer, marginTop: 32 }}>
          ✓ Cancele a qualquer momento &nbsp;·&nbsp; ✓ Dados sempre seus (exportação CSV) &nbsp;·&nbsp; ✓ Suporte em português
        </p>
      </div>
    </section>
  );
}
