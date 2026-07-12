import {
  Package, Truck, Wrench, Calculator, Users, ShieldCheck, MessageCircle, Check,
} from 'lucide-react';
import SectionTag from '../SectionTag';
import DiarioMockup from '../DiarioMockup';
import WhatsAppMockup from '../WhatsAppMockup';
import { display, dim, bright } from '../landingTheme';

const SUPERVISORS = [
  { icon: Package, name: 'Ativos & Documentação', desc: 'Cobertura de fotos e documentos, bens sem plaqueta, itens parados.' },
  { icon: Truck, name: 'Operação de Campo', desc: 'Transferências, inventários em aberto, precisão da última conferência.' },
  { icon: Wrench, name: 'Manutenção & Contratos', desc: 'Garantias e contratos vencendo, preventiva × corretiva.' },
  { icon: Calculator, name: 'Fiscal & Contábil', desc: 'Depreciação nos dois livros, CIAP a apropriar, crédito de PIS/COFINS.' },
  { icon: Users, name: 'Cadastros & Estrutura', desc: 'Fornecedores, colaboradores, filiais e centros de custo.' },
  { icon: ShieldCheck, name: 'Governança', desc: 'Trilha de auditoria, acessos e conformidade do workspace.' },
];

const DEMO_DIARIO = {
  agent: 'Supervisor de Manutenção & Contratos',
  headline: '4 alertas exigem ação nos próximos 15 dias.',
  summary:
    'A garantia de 2 equipamentos expira este mês e o contrato de locação vence dia 15. A relação preventiva × corretiva melhorou 12% no trimestre.',
  kpis: [
    { label: 'Garantias vencendo', value: '2 itens', severity: 'warn' },
    { label: 'Contrato vence', value: 'em 4 dias', severity: 'alert' },
    { label: 'Preventiva', value: '68%', severity: 'ok' },
  ],
};

export default function AiTeamSection() {
  return (
    <section id="ia" style={{ padding: '84px 0', borderTop: '1px solid var(--landing-line)' }}>
      <div className="max-w-6xl mx-auto px-4">
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <SectionTag style={{ marginBottom: 20 }}>O ecossistema de IA</SectionTag>
          <h2 style={{ ...display, fontSize: 'clamp(26px, 4vw, 36px)', fontWeight: 700, margin: '0 0 12px', color: 'var(--landing-steam)' }}>
            Conheça sua nova equipe: 6 supervisores que reportam, 1 assistente que executa
          </h2>
          <p style={{ fontSize: 18, color: dim, maxWidth: 620, margin: '0 auto' }}>
            Nenhum outro sistema de patrimônio no Brasil coloca a IA para trabalhar sozinha pela sua operação.
          </p>
        </div>

        {/* Grid dos 6 supervisores */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5" style={{ marginBottom: 56 }}>
          {SUPERVISORS.map((s) => (
            <div
              key={s.name}
              style={{
                background: 'var(--landing-bg-2)', border: '1px solid var(--landing-line)',
                borderRadius: 'var(--radius-2xl)', padding: 22, fontFamily: 'var(--font-sans)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                <div
                  style={{
                    width: 40, height: 40, borderRadius: 'var(--radius-md)', flexShrink: 0,
                    background: 'var(--landing-cyan-soft)', border: '1px solid var(--landing-line)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--landing-cyan)',
                  }}
                >
                  <s.icon style={{ width: 20, height: 20 }} />
                </div>
                <p style={{ ...display, fontWeight: 700, fontSize: 15, color: 'var(--landing-steam)', margin: 0 }}>{s.name}</p>
              </div>
              <p style={{ fontSize: 13, color: dim, lineHeight: 1.6, margin: 0 }}>{s.desc}</p>
            </div>
          ))}
        </div>

        {/* Demo do Diário */}
        <div id="diario" style={{ scrollMarginTop: 80, marginBottom: 64 }}>
          <div className="flex flex-col lg:flex-row items-center gap-10">
            <div className="flex-1">
              <h3 style={{ ...display, fontSize: 'clamp(22px, 3vw, 30px)', fontWeight: 700, margin: '0 0 14px', color: 'var(--landing-steam)' }}>
                Todo dia, uma edição nova do seu patrimônio
              </h3>
              <p style={{ fontSize: 16, color: dim, lineHeight: 1.6, marginBottom: 20 }}>
                Cada supervisor abre o dia com uma manchete, uma análise investigativa e os KPIs que importam.
                Você não abre planilha atrás de problema — o problema chega até você, priorizado.
              </p>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {['Gerado automaticamente, sem você pedir', 'Isolado por empresa — cada workspace vê só os seus números', 'Publicado no app todos os dias'].map((item) => (
                  <li key={item} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, color: bright }}>
                    <Check style={{ flexShrink: 0, color: 'var(--landing-cyan)', width: 18, height: 18 }} strokeWidth={2.5} /> {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex-1 w-full" style={{ maxWidth: 520 }}>
              <DiarioMockup {...DEMO_DIARIO} />
            </div>
          </div>
        </div>

        {/* Assistente / WhatsApp */}
        <div className="flex flex-col-reverse lg:flex-row items-center gap-10">
          <div className="flex-1 w-full flex justify-center">
            <WhatsAppMockup />
          </div>
          <div className="flex-1">
            <SectionTag style={{ marginBottom: 16 }}>
              <MessageCircle style={{ width: 14, height: 14 }} /> Assistente Patrimonial
            </SectionTag>
            <h3 style={{ ...display, fontSize: 'clamp(22px, 3vw, 30px)', fontWeight: 700, margin: '0 0 14px', color: 'var(--landing-steam)' }}>
              Um assistente que não só responde — ele executa
            </h3>
            <p style={{ fontSize: 16, color: dim, lineHeight: 1.6, marginBottom: 20 }}>
              Converse no chat do sistema ou direto no WhatsApp. Peça em português: cadastrar um ativo, consultar contratos que vencem,
              agendar uma manutenção. Ele faz — respeitando os limites do seu plano e as permissões de cada usuário.
            </p>
            <p style={{ fontSize: 14, color: 'var(--landing-cyan)', margin: 0, fontWeight: 600 }}>
              Incluído do Starter ao Enterprise, sem cobrança extra por mensagem.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
