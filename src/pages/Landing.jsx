import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PLANS } from '@/lib/plans';
import {
  Building2, Check, ChevronRight, Package, TrendingDown, QrCode,
  Map, FileText, Users, Shield, Star, Zap, Crown, ArrowRight,
  BarChart3, Smartphone, Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import AppFooter from '@/components/AppFooter';

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

const planIcons = { starter: Zap, professional: Star, enterprise: Crown };
const planColors = {
  starter: { bg: 'bg-blue-600', border: 'border-blue-200', badge: 'bg-blue-100 text-blue-700' },
  professional: { bg: 'bg-purple-600', border: 'border-purple-300 ring-2 ring-purple-400', badge: 'bg-purple-100 text-purple-700' },
  enterprise: { bg: 'bg-amber-500', border: 'border-amber-200', badge: 'bg-amber-100 text-amber-700' },
};

export default function Landing() {
  const [annual, setAnnual] = useState(false);

  return (
    <div className="min-h-screen bg-white font-inter">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-blue-700 rounded-lg flex items-center justify-center">
              <Building2 className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-gray-900 text-lg">PatrimônioApp</span>
          </div>
          <div className="flex items-center gap-3">
            <a href="#precos" className="text-sm text-gray-600 hover:text-gray-900 hidden sm:block">Preços</a>
            <a href="#funcionalidades" className="text-sm text-gray-600 hover:text-gray-900 hidden sm:block">Funcionalidades</a>
            <Link to="/Dashboard">
              <Button variant="outline" size="sm">Entrar</Button>
            </Link>
            <Link to="/Dashboard">
              <Button size="sm" className="bg-blue-700 hover:bg-blue-800">Começar grátis</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white py-24 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-blue-500/20 border border-blue-400/30 rounded-full px-4 py-1.5 text-sm text-blue-300 mb-6">
            <Clock className="h-3.5 w-3.5" /> 14 dias grátis, sem cartão de crédito
          </div>
          <h1 className="text-4xl sm:text-6xl font-extrabold leading-tight mb-6">
            Controle o patrimônio da sua empresa de forma
            <span className="text-yellow-400"> profissional</span>
          </h1>
          <p className="text-lg sm:text-xl text-blue-200 mb-10 max-w-2xl mx-auto">
            Sistema completo para gestão de ativos fixos: depreciação automática, QR codes, relatórios contábeis e muito mais.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/Dashboard">
              <Button size="lg" className="bg-yellow-400 hover:bg-yellow-300 text-slate-900 font-bold text-base gap-2 px-8">
                Começar 14 dias grátis <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
            <a href="#funcionalidades">
              <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10 text-base px-8">
                Ver funcionalidades
              </Button>
            </a>
          </div>
          <p className="text-sm text-blue-400 mt-5">✓ Sem cartão &nbsp; ✓ Cancele quando quiser &nbsp; ✓ Suporte incluso</p>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-blue-700 py-10 px-4">
        <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-8 text-center text-white">
          {[
            { value: '+500', label: 'Empresas ativas' },
            { value: '+50k', label: 'Ativos cadastrados' },
            { value: '14 dias', label: 'Trial gratuito' },
            { value: '99.9%', label: 'Uptime garantido' },
          ].map(s => (
            <div key={s.label}>
              <p className="text-3xl font-extrabold">{s.value}</p>
              <p className="text-blue-200 text-sm mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="funcionalidades" className="py-20 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">Tudo que você precisa em um só lugar</h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">Do cadastro ao relatório contábil, sem complicação.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div key={f.title} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="h-12 w-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                  <f.icon className="h-6 w-6 text-blue-700" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mobile highlight */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-5xl mx-auto flex flex-col lg:flex-row items-center gap-12">
          <div className="flex-1">
            <div className="inline-flex items-center gap-2 bg-purple-100 text-purple-700 rounded-full px-3 py-1 text-xs font-semibold mb-4">
              <Smartphone className="h-3.5 w-3.5" /> 100% responsivo
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-5">Funciona no celular, tablet e computador</h2>
            <p className="text-gray-500 text-lg mb-6">Escaneie QR codes com o celular, registre localização de ativos em campo e acesse relatórios de qualquer lugar.</p>
            <ul className="space-y-3">
              {['Escaneie QR Code pelo celular', 'Registre localização GPS automaticamente', 'Acesse relatórios de qualquer dispositivo', 'Interface rápida e intuitiva'].map(item => (
                <li key={item} className="flex items-center gap-2 text-gray-700">
                  <Check className="h-5 w-5 text-green-500 flex-shrink-0" /> {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex-1 flex justify-center">
            <div className="bg-gradient-to-br from-blue-600 to-purple-700 rounded-3xl p-8 text-white text-center shadow-2xl max-w-xs w-full">
              <BarChart3 className="h-16 w-16 mx-auto mb-4 opacity-80" />
              <p className="font-bold text-xl mb-2">Dashboard em tempo real</p>
              <p className="text-blue-200 text-sm">Visualize o valor contábil de todo o seu patrimônio atualizado automaticamente.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-extrabold text-center text-gray-900 mb-12">O que nossos clientes dizem</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <div key={t.name} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <div className="flex mb-3">
                  {[...Array(5)].map((_, i) => <Star key={i} className="h-4 w-4 text-yellow-400 fill-yellow-400" />)}
                </div>
                <p className="text-gray-600 text-sm mb-4 italic">"{t.text}"</p>
                <div>
                  <p className="font-bold text-gray-900 text-sm">{t.name}</p>
                  <p className="text-xs text-gray-500">{t.role} · {t.company}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="precos" className="py-20 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">Planos simples e transparentes</h2>
            <p className="text-gray-500 text-lg mb-6">Comece grátis por 14 dias. Sem surpresas na fatura.</p>
            {/* Toggle */}
            <div className="inline-flex items-center gap-3 bg-gray-100 rounded-full px-2 py-1.5">
              <button
                onClick={() => setAnnual(false)}
                className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${!annual ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}
              >Mensal</button>
              <button
                onClick={() => setAnnual(true)}
                className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${annual ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}
              >Anual <span className="text-green-600 font-bold">-17%</span></button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-start">
            {Object.values(PLANS).map((plan) => {
              const Icon = planIcons[plan.id];
              const colors = planColors[plan.id];
              const price = annual && plan.priceAnnual ? Math.round(plan.priceAnnual / 12) : plan.price;
              return (
                <div key={plan.id} className={`rounded-2xl border-2 ${colors.border} p-7 flex flex-col ${plan.popular ? 'shadow-xl relative' : ''}`}>
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-purple-600 text-white text-xs font-bold px-4 py-1 rounded-full">
                      MAIS POPULAR
                    </div>
                  )}
                  <div className={`h-11 w-11 ${colors.bg} rounded-xl flex items-center justify-center mb-4`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="font-extrabold text-gray-900 text-xl mb-1">{plan.name}</h3>
                  <p className="text-gray-500 text-sm mb-4">{plan.description}</p>
                  <div className="mb-5">
                    {price ? (
                      <>
                        <span className="text-4xl font-extrabold text-gray-900">R$ {price.toLocaleString('pt-BR')}</span>
                        <span className="text-gray-500 text-sm">/mês</span>
                        {annual && plan.priceAnnual && <p className="text-xs text-green-600 mt-1">Cobrado R$ {plan.priceAnnual.toLocaleString('pt-BR')}/ano</p>}
                      </>
                    ) : (
                      <span className="text-2xl font-extrabold text-gray-900">Sob consulta</span>
                    )}
                  </div>
                  <ul className="space-y-2.5 mb-7 flex-1">
                    {plan.features.map(f => (
                      <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                        <Check className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" /> {f}
                      </li>
                    ))}
                  </ul>
                  <Link to="/Dashboard">
                    <Button className={`w-full ${plan.popular ? 'bg-purple-600 hover:bg-purple-700' : plan.id === 'enterprise' ? 'bg-amber-500 hover:bg-amber-600' : 'bg-blue-700 hover:bg-blue-800'} gap-1`}>
                      {plan.id === 'enterprise' ? 'Falar com consultor' : 'Começar grátis'} <ChevronRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Security */}
      <section className="py-14 px-4 bg-gray-50 border-t border-gray-100">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-8 text-center sm:text-left">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-blue-700 flex-shrink-0" />
            <div>
              <p className="font-bold text-gray-900">Dados seguros</p>
              <p className="text-sm text-gray-500">Criptografia e backups automáticos</p>
            </div>
          </div>
          <div className="hidden sm:block h-10 w-px bg-gray-200" />
          <div className="flex items-center gap-3">
            <Clock className="h-8 w-8 text-blue-700 flex-shrink-0" />
            <div>
              <p className="font-bold text-gray-900">Suporte rápido</p>
              <p className="text-sm text-gray-500">Resposta em até 1 dia útil</p>
            </div>
          </div>
          <div className="hidden sm:block h-10 w-px bg-gray-200" />
          <div className="flex items-center gap-3">
            <Zap className="h-8 w-8 text-blue-700 flex-shrink-0" />
            <div>
              <p className="font-bold text-gray-900">Sem contrato</p>
              <p className="text-sm text-gray-500">Cancele quando quiser</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-gradient-to-br from-blue-700 to-blue-900 text-white text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">Pronto para organizar o patrimônio da sua empresa?</h2>
          <p className="text-blue-200 text-lg mb-8">Comece gratuitamente hoje. Configure em minutos, sem cartão de crédito.</p>
          <Link to="/Dashboard">
            <Button size="lg" className="bg-yellow-400 hover:bg-yellow-300 text-slate-900 font-bold text-lg gap-2 px-10">
              Criar conta grátis <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-10 px-4">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 bg-blue-700 rounded-lg flex items-center justify-center">
              <Building2 className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-white">PatrimônioApp</span>
          </div>
          <p className="text-sm">© {new Date().getFullYear()} PatrimônioApp · Todos os direitos reservados</p>
          <div className="flex flex-wrap gap-4 text-sm justify-center">
            <a href="#funcionalidades" className="hover:text-white transition-colors">Funcionalidades</a>
            <a href="#precos" className="hover:text-white transition-colors">Preços</a>
            <Link to="/termos" className="hover:text-white transition-colors">Termos</Link>
            <Link to="/privacidade" className="hover:text-white transition-colors">Privacidade</Link>
            <a href="mailto:ceo@amzdatasoftware.com" className="hover:text-white transition-colors">Contato</a>
          </div>
        </div>
      </footer>

      <AppFooter />
    </div>
  );
}