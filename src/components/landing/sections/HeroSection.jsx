import { Clock, ArrowRight, Sparkles } from 'lucide-react';
import SectionTag from '../SectionTag';
import DiarioMockup from '../DiarioMockup';
import { display, dim, dimmer } from '../landingTheme';

const HERO_DIARIO = {
  agent: 'Supervisor Fiscal & Contábil',
  headline: 'Você tem R$ 12.400 em créditos de CIAP para apropriar este mês.',
  summary:
    'A apropriação de 1/48 já está calculada para 8 ativos. A depreciação fiscal e a societária divergem em 3 itens — revise antes do fechamento.',
  kpis: [
    { label: 'CIAP a apropriar', value: 'R$ 12.400', severity: 'info' },
    { label: 'Divergência fiscal', value: '3 ativos', severity: 'warn' },
    { label: 'Fechamento', value: 'em 6 dias', severity: 'ok' },
  ],
};

export default function HeroSection() {
  return (
    <section style={{ position: 'relative', padding: '84px 0 72px', textAlign: 'center' }}>
      <div className="max-w-5xl mx-auto px-4" style={{ position: 'relative', zIndex: 1 }}>
        <SectionTag style={{ marginBottom: 24 }}>
          <Sparkles style={{ width: 14, height: 14 }} /> IA inclusa em todos os planos
        </SectionTag>

        <h1 style={{ ...display, fontSize: 'clamp(34px, 5.5vw, 58px)', fontWeight: 700, lineHeight: 1.1, margin: '0 0 24px', color: 'var(--landing-steam)' }}>
          Contrate uma equipe de <span style={{ color: 'var(--landing-cyan)' }}>IA</span><br />
          para cuidar do seu patrimônio
        </h1>

        <p style={{ fontSize: 18, color: dim, maxWidth: 760, margin: '0 auto 16px', lineHeight: 1.6 }}>
          6 supervisores de IA publicam todos os dias o <strong style={{ color: 'var(--landing-steam)' }}>Diário do Patrimônio</strong> — manchete,
          análise e KPIs de cada área — e um assistente executa pelo chat e pelo WhatsApp: cadastra ativos, agenda manutenções, consulta contratos.
        </p>
        <p style={{ fontSize: 16, color: dim, maxWidth: 720, margin: '0 auto 36px', lineHeight: 1.6 }}>
          Enquanto isso, o sistema calcula a depreciação em dois livros, apropria créditos de CIAP automaticamente e avisa antes de garantias,
          contratos e IPVA vencerem. A partir de <strong style={{ color: 'var(--landing-steam)' }}>R$ 97/mês</strong>.
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'center' }}>
          <a href="/Dashboard">
            <button style={{ height: 52, padding: '0 28px', borderRadius: 10, background: 'var(--landing-cyan)', border: 'none', color: 'var(--landing-bg)', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, cursor: 'pointer', boxShadow: 'var(--landing-glow)', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              Ativar minha equipe de IA <ArrowRight style={{ width: 18, height: 18 }} />
            </button>
          </a>
          <a href="#diario">
            <button style={{ height: 52, padding: '0 28px', borderRadius: 10, background: 'transparent', border: '1px solid var(--landing-line)', color: 'var(--landing-steam)', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16, cursor: 'pointer' }}>
              Ver um Diário do Patrimônio de exemplo
            </button>
          </a>
        </div>

        <p style={{ fontSize: 14, color: dimmer, marginTop: 18, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Clock style={{ width: 14, height: 14 }} /> 14 dias grátis · sem cartão de crédito · cancele quando quiser
        </p>

        {/* Demo do Diário */}
        <div style={{ maxWidth: 560, margin: '48px auto 0' }}>
          <DiarioMockup {...HERO_DIARIO} />
        </div>
      </div>
    </section>
  );
}
