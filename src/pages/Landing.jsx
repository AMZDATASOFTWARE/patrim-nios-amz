import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { SoundProvider } from '@/lib/SoundContext';
import { Building2, Shield, Clock, Zap } from 'lucide-react';
import AppFooter from '@/components/AppFooter';
import FluidBackground from '@/components/landing/FluidBackground';
import { display, dim } from '@/components/landing/landingTheme';

import HeroSection from '@/components/landing/sections/HeroSection';
import FactsStrip from '@/components/landing/sections/FactsStrip';
import AiTeamSection from '@/components/landing/sections/AiTeamSection';
import FeaturePillarsSection from '@/components/landing/sections/FeaturePillarsSection';
import ComparisonSection from '@/components/landing/sections/ComparisonSection';
import PricingSection from '@/components/landing/sections/PricingSection';
import FaqSection from '@/components/landing/sections/FaqSection';
import FinalCtaSection from '@/components/landing/sections/FinalCtaSection';

const navDim = 'hsl(200 30% 96% / 0.65)';

export default function Landing() {
  return (
    <SoundProvider forceDark>
      <LandingInner />
    </SoundProvider>
  );
}

function LandingInner() {
  return (
    <div style={{ position: 'relative', minHeight: '100vh', background: 'var(--landing-bg)', overflow: 'hidden' }}>
      <FluidBackground density={60} style={{ position: 'fixed', inset: 0 }} />

      {/* Nav */}
      <nav
        style={{
          position: 'sticky', top: 0, zIndex: 50,
          background: 'hsl(218 65% 5% / 0.85)', backdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--landing-line)',
        }}
      >
        <div className="max-w-6xl mx-auto px-4" style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                height: 32, width: 32, borderRadius: 8,
                background: 'var(--landing-cyan-soft)', border: '1px solid var(--landing-line)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--landing-cyan)',
              }}
            >
              <Building2 style={{ width: 16, height: 16 }} />
            </div>
            <span style={{ ...display, fontWeight: 700, fontSize: 18, color: 'var(--landing-steam)' }}>Patrimônios AMZ</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <a href="#ia" className="nav-link hidden sm:inline" style={{ color: navDim, font: '500 14px var(--font-sans)', textDecoration: 'none' }}>IA</a>
            <a href="#funcionalidades" className="nav-link hidden sm:inline" style={{ color: navDim, font: '500 14px var(--font-sans)', textDecoration: 'none' }}>Funcionalidades</a>
            <a href="#comparativo" className="nav-link hidden md:inline" style={{ color: navDim, font: '500 14px var(--font-sans)', textDecoration: 'none' }}>Comparativo</a>
            <a href="#precos" className="nav-link hidden sm:inline" style={{ color: navDim, font: '500 14px var(--font-sans)', textDecoration: 'none' }}>Preços</a>
            <button onClick={() => base44.auth.redirectToLogin('/Dashboard')} style={{ height: 36, padding: '0 16px', borderRadius: 10, background: 'transparent', border: '1px solid var(--landing-line)', color: 'var(--landing-steam)', font: '500 14px var(--font-sans)', cursor: 'pointer' }}>Entrar</button>
            <a href="/Dashboard">
              <button style={{ height: 36, padding: '0 16px', borderRadius: 10, background: 'var(--landing-cyan)', border: 'none', color: 'var(--landing-bg)', font: '700 14px var(--font-display)', cursor: 'pointer' }}>Começar grátis</button>
            </a>
          </div>
        </div>
      </nav>

      <div style={{ position: 'relative', zIndex: 1 }}>
        <HeroSection />
        <FactsStrip />
        <AiTeamSection />
        <FeaturePillarsSection />
        <ComparisonSection />
        <PricingSection />
        <FaqSection />

        {/* Security / trust band */}
        <section style={{ padding: '56px 0', borderTop: '1px solid var(--landing-line)', background: 'var(--landing-bg-2)' }}>
          <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-center gap-8 text-center sm:text-left">
            {[
              { icon: Shield, title: 'Dados isolados por empresa', desc: 'LGPD + auditorias sem achados críticos' },
              { icon: Clock, title: 'Suporte em português', desc: 'Resposta em até 1 dia útil' },
              { icon: Zap, title: 'Sem contrato de fidelidade', desc: 'Pagamento Stripe, cancele quando quiser' },
            ].map((item, i) => (
              <div key={item.title} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {i > 0 && <div className="hidden sm:block" style={{ width: 1, height: 40, background: 'var(--landing-line)' }} />}
                <item.icon style={{ width: 28, height: 28, color: 'var(--landing-cyan)', flexShrink: 0 }} />
                <div>
                  <p style={{ fontWeight: 700, color: 'var(--landing-steam)', fontSize: 14, margin: 0 }}>{item.title}</p>
                  <p style={{ fontSize: 13, color: dim, margin: '2px 0 0' }}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <FinalCtaSection />

        {/* Footer */}
        <footer style={{ borderTop: '1px solid var(--landing-line)', padding: '40px 0', background: 'var(--landing-bg-2)' }}>
          <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ height: 28, width: 28, borderRadius: 8, background: 'var(--landing-cyan-soft)', border: '1px solid var(--landing-line)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--landing-cyan)' }}>
                <Building2 style={{ width: 14, height: 14 }} />
              </div>
              <span style={{ ...display, fontWeight: 700, color: 'var(--landing-steam)' }}>Patrimônios AMZ</span>
            </div>
            <p style={{ fontSize: 13, color: dim, margin: 0 }}>© {new Date().getFullYear()} Patrimônios AMZ · Todos os direitos reservados</p>
            <div style={{ display: 'flex', gap: 18, fontSize: 13, flexWrap: 'wrap', justifyContent: 'center' }}>
              <a href="#funcionalidades" style={{ color: dim, textDecoration: 'none' }}>Funcionalidades</a>
              <a href="#precos" style={{ color: dim, textDecoration: 'none' }}>Preços</a>
              <Link to="/termos" style={{ color: dim, textDecoration: 'none' }}>Termos</Link>
              <Link to="/privacidade" style={{ color: dim, textDecoration: 'none' }}>Privacidade</Link>
              <a href="mailto:ceo@amzdatasoftware.com" style={{ color: dim, textDecoration: 'none' }}>Contato</a>
            </div>
          </div>
          <AppFooter variant="onDark" className="mt-8 pt-6" />
        </footer>
      </div>
    </div>
  );
}
