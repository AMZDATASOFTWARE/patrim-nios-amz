import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { SoundProvider } from '@/lib/SoundContext';
import { PLANS } from '@/lib/plans';
import AppFooter from '@/components/AppFooter';
import FluidBackground from '@/components/landing/FluidBackground';
import SectionTag from '@/components/landing/SectionTag';
import PlanCard from '@/components/landing/PlanCard';

export default function Plans() {
  return (
    <SoundProvider forceDark>
      <PlansInner />
    </SoundProvider>
  );
}

function PlansInner() {
  const [annual, setAnnual] = useState(false);

  return (
    <div style={{ position: 'relative', minHeight: '100vh', background: 'var(--landing-bg)', overflow: 'hidden' }}>
      <FluidBackground density={50} style={{ position: 'fixed', inset: 0 }} />

      {/* Back */}
      <div style={{ position: 'absolute', top: 24, left: 24, zIndex: 10 }}>
        <Link
          to="/Dashboard"
          className="flex items-center gap-2 transition-colors text-sm"
          style={{ color: 'hsl(200 30% 96% / 0.65)' }}
        >
          <ArrowLeft className="h-4 w-4" /> Voltar ao sistema
        </Link>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-20" style={{ position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <div className="text-center mb-14">
          <SectionTag style={{ marginBottom: 24 }}>
            <Sparkles style={{ width: 14, height: 14 }} /> Planos
          </SectionTag>
          <h1
            className="text-4xl sm:text-5xl font-extrabold mb-4 leading-tight"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--landing-steam)' }}
          >
            Gestão de Patrimônio
            <br />
            <span style={{ color: 'var(--landing-cyan)' }}>sem complicação</span>
          </h1>
          <p
            className="text-lg max-w-xl mx-auto"
            style={{ color: 'hsl(200 30% 96% / 0.6)' }}
          >
            Controle seus ativos com depreciação automática, etiquetas QR e relatórios
            contábeis — em qualquer tamanho de empresa.
          </p>

          {/* Annual toggle */}
          <div className="flex items-center justify-center gap-3 mt-8">
            <span
              className="text-sm font-medium transition-colors"
              style={{ color: !annual ? 'var(--landing-steam)' : 'hsl(200 30% 96% / 0.4)' }}
            >
              Mensal
            </span>
            <button
              onClick={() => setAnnual(!annual)}
              className="relative w-12 h-6 rounded-full transition-colors"
              style={{
                background: annual ? 'var(--landing-cyan)' : 'hsl(200 30% 96% / 0.15)',
                border: '1px solid var(--landing-line)',
              }}
            >
              <div
                className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform"
                style={{ transform: annual ? 'translateX(24px)' : 'translateX(0)' }}
              />
            </button>
            <span
              className="text-sm font-medium transition-colors"
              style={{ color: annual ? 'var(--landing-steam)' : 'hsl(200 30% 96% / 0.4)' }}
            >
              Anual{' '}
              <span style={{ color: 'hsl(160 84% 55%)', fontWeight: 700 }}>−2 meses grátis</span>
            </span>
          </div>
        </div>

        {/* Plans grid */}
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
                ctaTo={plan.id === 'enterprise' ? undefined : '/Billing'}
                ctaHref={
                  plan.id === 'enterprise'
                    ? 'mailto:ceo@amzdatasoftware.com?subject=Interesse no plano Enterprise'
                    : undefined
                }
                style={plan.popular ? { marginTop: 0 } : undefined}
              />
            );
          })}
        </div>

        {/* Bottom trust */}
        <div className="mt-16 text-center" style={{ color: 'hsl(200 30% 96% / 0.4)' }}>
          <p className="text-sm">
            ✓ Cancele a qualquer momento &nbsp;·&nbsp; ✓ Dados sempre seus &nbsp;·&nbsp; ✓ Suporte em português
          </p>
        </div>
      </div>

      <AppFooter className="bg-transparent border-slate-700/50" />
    </div>
  );
}