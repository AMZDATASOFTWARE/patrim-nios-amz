import { ArrowRight } from 'lucide-react';
import FluidBackground from '../FluidBackground';
import { display, dim } from '../landingTheme';

export default function FinalCtaSection() {
  return (
    <section style={{ position: 'relative', overflow: 'hidden', padding: '84px 0', borderTop: '1px solid var(--landing-line)', textAlign: 'center' }}>
      <FluidBackground density={40} style={{ position: 'absolute', inset: 0 }} />
      <div className="max-w-2xl mx-auto px-4" style={{ position: 'relative' }}>
        <h2 style={{ ...display, fontSize: 'clamp(28px, 4.5vw, 40px)', fontWeight: 700, margin: '0 0 16px', color: 'var(--landing-steam)' }}>
          Amanhã cedo, o primeiro Diário do Patrimônio já estará na sua tela
        </h2>
        <p style={{ fontSize: 18, color: dim, margin: '0 0 32px' }}>
          Ative sua equipe de IA hoje. Configure em minutos, sem cartão de crédito.
        </p>
        <a href="/Dashboard">
          <button style={{ height: 52, padding: '0 40px', borderRadius: 10, background: 'var(--landing-cyan)', border: 'none', color: 'var(--landing-bg)', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17, cursor: 'pointer', boxShadow: 'var(--landing-glow)', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            Ativar minha equipe de IA <ArrowRight style={{ width: 18, height: 18 }} />
          </button>
        </a>
      </div>
    </section>
  );
}
