import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PLANS } from '@/lib/plans';
import {
  Building2, Check, ArrowRight, Package, TrendingDown, QrCode,
  Map, FileText, Users, Shield, Clock, Zap, Smartphone, BarChart3, Star
} from 'lucide-react';
import AppFooter from '@/components/AppFooter';
import FluidBackground from '@/components/landing/FluidBackground';
import SectionTag from '@/components/landing/SectionTag';
import FeatureCard from '@/components/landing/FeatureCard';
import PlanCard from '@/components/landing/PlanCard';

const features = [
  { icon: Package, title: 'Cadastro Completo de Ativos', desc: 'Registre todos os bens da empresa com fotos, documentos, localização e histórico.' },
  { icon: TrendingDown, title: 'Depreciação Automática', desc: 'Cálculo automático pelo método linear. Relatórios contábeis prontos para o contador.' },
  { icon: QrCode, title: 'Etiquetas com QR Code', desc: 'Gere etiquetas profissionais. Escaneie para ver detalhes e registrar localização.' },
  { icon: Map, title: 'Mapa de Localização', desc: 'Rastreie onde cada ativo está em tempo real com histórico de movimentações.' },
  { icon: FileText, title: 'Relatórios PDF e CSV', desc: 'Exporte relatórios completos para auditoria, contabilidade e gestão interna.' },
  { icon: Users, title: 'Multi-usuário', desc: 'Gerencie equipes com perfis de acesso diferenciados por departamento.' },
];

const testimonials = [
  { name: 'Carlos Mendes', role: 'Diretor Financeiro', company: 'TechSolutions', text: 'Reduzi em 80% o tempo gasto no controle patrimonial. O sistema é intuitivo e completo.' },
  { name: 'Ana Paula Lima', role: 'Contadora', company: 'Construtora ABC', text: 'Os relatórios de depreciação são exatamente o que meu cliente precisa para a contabilidade.' },
  { name: 'Roberto Silva', role: 'Gestor de TI', company: 'Indústria Norte', text: 'Conseguimos mapear todos os 500+ ativos da empresa em menos de uma semana.' },
];

const stats = [
  { value: '+500', label: 'Empresas ativas' },
  { value: '+50k', label: 'Ativos cadastrados' },
  { value: '14 dias', label: 'Trial gratuito' },
  { value: '99.9%', label: 'Uptime garantido' },
];

const display = { fontFamily: 'var(--font-display)' };
const dim = 'hsl(200 30% 96% / 0.65)';

export default function Landing() {
  const [annual, setAnnual] = useState(false);

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
            <span style={{ ...display, fontWeight: 700, fontSize: 18, color: 'var(--landing-steam)' }}>PatrimônioApp</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <a href="#funcionalidades" className="nav-link" style={{ color: dim, font: '500 14px var(--font-sans)', textDecoration: 'none' }}>Funcionalidades</a>
            <a href="#precos" className="nav-link" style={{ color: dim, font: '500 14px var(--font-sans)', textDecoration: 'none' }}>Preços</a>
            <Link to="/Dashboard">
              <button style={{ height: 36, padding: '0 16px', borderRadius: 10, background: 'transparent', border: '1px solid var(--landing-line)', color: 'var(--landing-steam)', font: '500 14px var(--font-sans)', cursor: 'pointer' }}>Entrar</button>
            </Link>
            <Link to="/Dashboard">
              <button style={{ height: 36, padding: '0 16px', borderRadius: 10, background: 'var(--landing-cyan)', border: 'none', color: 'var(--landing-bg)', font: '700 14px var(--font-display)', cursor: 'pointer' }}>Começar grátis</button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ position: 'relative', padding: '96px 0', textAlign: 'center' }}>
        <div className="max-w-4xl mx-auto px-4" style={{ position: 'relative', zIndex: 1 }}>
          <SectionTag style={{ marginBottom: 24 }}>
            <Clock style={{ width: 14, height: 14 }} /> 14 dias grátis, sem cartão
          </SectionTag>
          <h1 style={{ ...display, fontSize: 'clamp(36px, 6vw, 60px)', fontWeight: 700, lineHeight: 1.1, margin: '0 0 24px', color: 'var(--landing-steam)' }}>
            Controle o patrimônio da sua<br />empresa de forma{' '}
            <span style={{ color: 'var(--landing-cyan)' }}>profissional</span>
          </h1>
          <p style={{ fontSize: 18, color: dim, maxWidth: 640, margin: '0 auto 40px', lineHeight: 1.6 }}>
            Sistema completo para gestão de ativos fixos: depreciação automática, QR codes,
            relatórios contábeis e muito mais.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'center' }}>
            <Link to="/Dashboard">
              <button style={{ height: 52, padding: '0 32px', borderRadius: 10, background: 'var(--landing-cyan)', border: 'none', color: 'var(--landing-bg)', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, cursor: 'pointer', boxShadow: 'var(--landing-glow)', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                Começar 14 dias grátis <ArrowRight style={{ width: 18, height: 18 }} />
              </button>
            </Link>
            <a href="#funcionalidades">
              <button style={{ height: 52, padding: '0 32px', borderRadius: 10, background: 'transparent', border: '1px solid var(--landing-line)', color: 'var(--landing-steam)', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16, cursor: 'pointer' }}>
                Ver funcionalidades
              </button>
            </a>
          </div>
          <p style={{ fontSize: 14, color: 'hsl(200 30% 96% / 0.4)', marginTop: 20 }}>
            ✓ Sem cartão &nbsp; ✓ Cancele quando quiser &nbsp; ✓ Suporte incluso
          </p>
        </div>
      </section>

      {/* Stats */}
      <section style={{ padding: '40px 0', borderTop: '1px solid var(--landing-line)', borderBottom: '1px solid var(--landing-line)', background: 'var(--landing-bg-2)' }}>
        <div className="max-w-4xl mx-auto px-4 grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
          {stats.map(s => (
            <div key={s.label}>
              <p style={{ ...display, fontSize: 30, fontWeight: 700, color: 'var(--landing-cyan)', margin: 0 }}>{s.value}</p>
              <p style={{ fontSize: 14, color: dim, marginTop: 4 }}>{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="funcionalidades" style={{ padding: '80px 0' }}>
        <div className="max-w-6xl mx-auto px-4">
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <SectionTag style={{ marginBottom: 20 }}>Funcionalidades</SectionTag>
            <h2 style={{ ...display, fontSize: 36, fontWeight: 700, margin: '0 0 12px', color: 'var(--landing-steam)' }}>Tudo que você precisa em um só lugar</h2>
            <p style={{ fontSize: 18, color: dim, maxWidth: 520, margin: '0 auto' }}>Do cadastro ao relatório contábil, sem complicação.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map(f => (
              <FeatureCard key={f.title} icon={f.icon} title={f.title}>{f.desc}</FeatureCard>
            ))}
          </div>
        </div>
      </section>

      {/* Mobile highlight */}
      <section style={{ padding: '80px 0', borderTop: '1px solid var(--landing-line)' }}>
        <div className="max-w-5xl mx-auto px-4 flex flex-col lg:flex-row items-center gap-12">
          <div className="flex-1">
            <SectionTag style={{ marginBottom: 16 }}>
              <Smartphone style={{ width: 14, height: 14 }} /> 100% responsivo
            </SectionTag>
            <h2 style={{ ...display, fontSize: 36, fontWeight: 700, margin: '0 0 16px', color: 'var(--landing-steam)' }}>Funciona no celular, tablet e computador</h2>
            <p style={{ fontSize: 18, color: dim, marginBottom: 24, lineHeight: 1.6 }}>Escaneie QR codes com o celular, registre localização de ativos em campo e acesse relatórios de qualquer lugar.</p>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {['Escaneie QR Code pelo celular', 'Registre localização GPS automaticamente', 'Acesse relatórios de qualquer dispositivo', 'Interface rápida e intuitiva'].map(item => (
                <li key={item} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, color: 'hsl(200 30% 96% / 0.75)' }}>
                  <Check style={{ flexShrink: 0, color: 'var(--landing-cyan)', width: 18, height: 18 }} strokeWidth={2.5} /> {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex-1 flex justify-center">
            <div
              style={{
                background: 'var(--landing-bg-2)', borderRadius: 'var(--radius-3xl)', padding: 32,
                textAlign: 'center', maxWidth: 320, width: '100%', border: '1px solid var(--landing-line)',
                boxShadow: 'var(--landing-glow)',
              }}
            >
              <BarChart3 style={{ width: 56, height: 56, margin: '0 auto 16px', color: 'var(--landing-cyan)', opacity: 0.8 }} />
              <p style={{ ...display, fontWeight: 700, fontSize: 20, margin: '0 0 8px', color: 'var(--landing-steam)' }}>Dashboard em tempo real</p>
              <p style={{ fontSize: 14, color: dim, margin: 0 }}>Visualize o valor contábil de todo o seu patrimônio atualizado automaticamente.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section style={{ padding: '80px 0', borderTop: '1px solid var(--landing-line)' }}>
        <div className="max-w-5xl mx-auto px-4">
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <SectionTag style={{ marginBottom: 20 }}>Depoimentos</SectionTag>
            <h2 style={{ ...display, fontSize: 36, fontWeight: 700, margin: 0, color: 'var(--landing-steam)' }}>O que nossos clientes dizem</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {testimonials.map(t => (
              <div key={t.name} style={{ background: 'var(--landing-bg-2)', borderRadius: 'var(--radius-2xl)', border: '1px solid var(--landing-line)', padding: 24 }}>
                <div style={{ display: 'flex', gap: 2, marginBottom: 12 }}>
                  {[...Array(5)].map((_, i) => <Star key={i} style={{ width: 16, height: 16, color: 'var(--landing-cyan)', fill: 'var(--landing-cyan)' }} />)}
                </div>
                <p style={{ fontSize: 14, color: 'hsl(200 30% 96% / 0.7)', marginBottom: 16, fontStyle: 'italic', lineHeight: 1.6, margin: '0 0 16px' }}>"{t.text}"</p>
                <div>
                  <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--landing-steam)', margin: 0 }}>{t.name}</p>
                  <p style={{ fontSize: 12, color: dim, margin: '2px 0 0' }}>{t.role} · {t.company}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="precos" style={{ padding: '80px 0', borderTop: '1px solid var(--landing-line)' }}>
        <div className="max-w-6xl mx-auto px-4">
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <SectionTag style={{ marginBottom: 20 }}>
              <Zap style={{ width: 14, height: 14 }} /> Planos
            </SectionTag>
            <h2 style={{ ...display, fontSize: 36, fontWeight: 700, margin: '0 0 12px', color: 'var(--landing-steam)' }}>Planos simples e transparentes</h2>
            <p style={{ fontSize: 18, color: dim, margin: 0 }}>Comece grátis por 14 dias. Sem surpresas na fatura.</p>
          </div>

          {/* Annual toggle */}
          <div className="flex items-center justify-center gap-3 mb-14">
            <span className="text-sm font-medium transition-colors" style={{ color: !annual ? 'var(--landing-steam)' : 'hsl(200 30% 96% / 0.4)' }}>Mensal</span>
            <button
              onClick={() => setAnnual(!annual)}
              className="relative w-12 h-6 rounded-full transition-colors"
              style={{ background: annual ? 'var(--landing-cyan)' : 'hsl(200 30% 96% / 0.15)', border: '1px solid var(--landing-line)' }}
            >
              <div className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform" style={{ transform: annual ? 'translateX(24px)' : 'translateX(0)' }} />
            </button>
            <span className="text-sm font-medium transition-colors" style={{ color: annual ? 'var(--landing-steam)' : 'hsl(200 30% 96% / 0.4)' }}>
              Anual <span style={{ color: 'hsl(160 84% 55%)', fontWeight: 700 }}>−2 meses grátis</span>
            </span>
          </div>

          {/* Plans grid — mesma lógica de pagamento da página /Plans */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            {Object.values(PLANS).map(plan => {
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
                  ctaHref={plan.id === 'enterprise' ? 'mailto:ceo@amzdatasoftware.com?subject=Interesse no plano Enterprise' : undefined}
                />
              );
            })}
          </div>

          <p style={{ textAlign: 'center', fontSize: 14, color: 'hsl(200 30% 96% / 0.4)', marginTop: 32 }}>
            ✓ Cancele a qualquer momento &nbsp;·&nbsp; ✓ Dados sempre seus &nbsp;·&nbsp; ✓ Suporte em português
          </p>
        </div>
      </section>

      {/* Security */}
      <section style={{ padding: '56px 0', borderTop: '1px solid var(--landing-line)', background: 'var(--landing-bg-2)' }}>
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-center gap-8 text-center sm:text-left">
          {[
            { icon: Shield, title: 'Dados seguros', desc: 'Criptografia e backups automáticos' },
            { icon: Clock, title: 'Suporte rápido', desc: 'Resposta em até 1 dia útil' },
            { icon: Zap, title: 'Sem contrato', desc: 'Cancele quando quiser' },
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

      {/* CTA */}
      <section style={{ position: 'relative', overflow: 'hidden', padding: '80px 0', borderTop: '1px solid var(--landing-line)', textAlign: 'center' }}>
        <FluidBackground density={40} style={{ position: 'absolute', inset: 0 }} />
        <div className="max-w-2xl mx-auto px-4" style={{ position: 'relative' }}>
          <h2 style={{ ...display, fontSize: 40, fontWeight: 700, margin: '0 0 16px', color: 'var(--landing-steam)' }}>Pronto para organizar o patrimônio da sua empresa?</h2>
          <p style={{ fontSize: 18, color: dim, margin: '0 0 32px' }}>Comece gratuitamente hoje. Configure em minutos, sem cartão de crédito.</p>
          <Link to="/Dashboard">
            <button style={{ height: 52, padding: '0 40px', borderRadius: 10, background: 'var(--landing-cyan)', border: 'none', color: 'var(--landing-bg)', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17, cursor: 'pointer', boxShadow: 'var(--landing-glow)', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              Criar conta grátis <ArrowRight style={{ width: 18, height: 18 }} />
            </button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--landing-line)', padding: '40px 0', background: 'var(--landing-bg-2)' }}>
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ height: 28, width: 28, borderRadius: 8, background: 'var(--landing-cyan-soft)', border: '1px solid var(--landing-line)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--landing-cyan)' }}>
              <Building2 style={{ width: 14, height: 14 }} />
            </div>
            <span style={{ ...display, fontWeight: 700, color: 'var(--landing-steam)' }}>PatrimônioApp</span>
          </div>
          <p style={{ fontSize: 13, color: dim, margin: 0 }}>© {new Date().getFullYear()} PatrimônioApp · Todos os direitos reservados</p>
          <div style={{ display: 'flex', gap: 18, fontSize: 13 }}>
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
  );
}