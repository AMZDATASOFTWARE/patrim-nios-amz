import {
  Calculator, Landmark, FileSpreadsheet,
  Smartphone, Radio, MapPin,
  ClipboardCheck, PenLine, ScrollText,
  Wrench, Bell, LayoutDashboard,
} from 'lucide-react';
import SectionTag from '../SectionTag';
import { display, dim } from '../landingTheme';

const PILLARS = [
  {
    tag: 'Fiscal & Contábil',
    title: 'Precisão que se paga',
    desc: 'A parte chata da contabilidade do imobilizado, automatizada.',
    items: [
      { icon: Calculator, title: 'Depreciação em 2 livros', desc: 'Societária e fiscal calculadas em paralelo, com demonstrativo de diferença.' },
      { icon: Landmark, title: 'Créditos CIAP + PIS/COFINS', desc: 'Apropriação de 1/48 automática e idempotente, sem controle manual em planilha.' },
      { icon: FileSpreadsheet, title: 'Exportação contábil', desc: 'Regras de conta débito/crédito por categoria; CSV pronto para qualquer ERP.' },
    ],
  },
  {
    tag: 'Operação de Campo',
    title: 'Inventário sem hardware caro',
    desc: 'Qualquer smartphone vira um coletor — sem equipamento proprietário.',
    items: [
      { icon: Smartphone, title: 'Inventário pela câmera', desc: 'Leia QR e código de barras pelo celular. Fila offline sincroniza ao reconectar.' },
      { icon: Radio, title: 'Etiquetas QR e RFID', desc: 'Etiquetas profissionais + leitores RFID comuns (modo teclado), sem coletor dedicado.' },
      { icon: MapPin, title: 'Mapa e histórico', desc: 'Onde cada ativo está agora e por onde passou, com registro de cada movimentação.' },
    ],
  },
  {
    tag: 'Controle & Custódia',
    title: 'Rastreável e à prova de auditoria',
    desc: 'Cada ativo tem dono, cada movimentação tem prova.',
    items: [
      { icon: ClipboardCheck, title: 'Transferência com aceite', desc: 'Cadeia de custódia formal: o responsável aceita por e-mail ou link antes de assumir.' },
      { icon: PenLine, title: 'Termo assinado', desc: 'Termo de responsabilidade com assinatura eletrônica, hash SHA-256 e PDF.' },
      { icon: ScrollText, title: 'Trilha de auditoria', desc: 'Registro à prova de falsificação de quem fez o quê, quando — com isolamento por empresa.' },
    ],
  },
  {
    tag: 'Operação sem sustos',
    title: 'Nada vence sem você saber',
    desc: 'Manutenção, contratos e o painel que resume tudo.',
    items: [
      { icon: Wrench, title: 'Manutenção (CMMS leve)', desc: 'Registre técnico, peças e checklist. Preventiva e corretiva no mesmo lugar.' },
      { icon: Bell, title: 'Alertas automáticos', desc: 'E-mails em T-30/15/7/1 para garantia, revisão, IPVA e vencimento de contrato.' },
      { icon: LayoutDashboard, title: 'Dashboard inteligente', desc: '5 abas, ~40 KPIs, sparklines de 12 meses e faixa de urgência no topo.' },
    ],
  },
];

export default function FeaturePillarsSection() {
  return (
    <section id="funcionalidades" style={{ padding: '84px 0', borderTop: '1px solid var(--landing-line)' }}>
      <div className="max-w-6xl mx-auto px-4">
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <SectionTag style={{ marginBottom: 20 }}>Visão 360</SectionTag>
          <h2 style={{ ...display, fontSize: 'clamp(26px, 4vw, 36px)', fontWeight: 700, margin: '0 0 12px', color: 'var(--landing-steam)' }}>
            As ferramentas que sua equipe de IA opera por você
          </h2>
          <p style={{ fontSize: 18, color: dim, maxWidth: 560, margin: '0 auto' }}>
            Um sistema completo por baixo da IA — do chão de fábrica ao fechamento contábil.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
          {PILLARS.map((p) => (
            <div key={p.tag}>
              <div style={{ marginBottom: 20 }}>
                <p style={{ ...display, fontSize: 12, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--landing-cyan)', margin: '0 0 4px' }}>{p.tag}</p>
                <h3 style={{ ...display, fontSize: 'clamp(20px, 3vw, 26px)', fontWeight: 700, color: 'var(--landing-steam)', margin: '0 0 4px' }}>{p.title}</h3>
                <p style={{ fontSize: 15, color: dim, margin: 0 }}>{p.desc}</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                {p.items.map((it) => (
                  <div
                    key={it.title}
                    style={{
                      background: 'var(--landing-bg-2)', border: '1px solid var(--landing-line)',
                      borderRadius: 'var(--radius-2xl)', padding: 22, fontFamily: 'var(--font-sans)',
                    }}
                  >
                    <div
                      style={{
                        width: 40, height: 40, borderRadius: 'var(--radius-md)', marginBottom: 12,
                        background: 'var(--landing-cyan-soft)', border: '1px solid var(--landing-line)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--landing-cyan)',
                      }}
                    >
                      <it.icon style={{ width: 20, height: 20 }} />
                    </div>
                    <h4 style={{ ...display, fontWeight: 700, fontSize: 15, color: 'var(--landing-steam)', margin: '0 0 6px' }}>{it.title}</h4>
                    <p style={{ fontSize: 13, color: dim, lineHeight: 1.6, margin: 0 }}>{it.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
