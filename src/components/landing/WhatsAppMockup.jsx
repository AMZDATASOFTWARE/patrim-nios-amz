import { Bot } from 'lucide-react';
import { display, dim, dimmer } from './landingTheme';

const MESSAGES = [
  { from: 'user', text: 'Quais contratos vencem este mês?' },
  { from: 'assistant', text: '2 contratos vencem em breve: Locação da impressora (dia 15) e Seguro da frota (dia 28). Quer que eu detalhe algum?' },
  { from: 'user', text: 'Depois vejo. Cadastra um notebook Dell pra filial Belém, R$ 4.500, categoria Informática.' },
  { from: 'assistant', text: 'Cadastrado ✅ Notebook Dell · R$ 4.500,00 · Informática · Filial Belém. Já está no seu inventário e entra no cálculo de depreciação deste mês.' },
];

/** Mockup estático de conversa com o Assistente Patrimonial no WhatsApp (dados ilustrativos). */
export default function WhatsAppMockup({ style, ...props }) {
  return (
    <div
      style={{
        background: 'var(--landing-bg-2)',
        border: '1px solid var(--landing-line)',
        borderRadius: 'var(--radius-2xl)',
        padding: 0,
        overflow: 'hidden',
        maxWidth: 380,
        width: '100%',
        fontFamily: 'var(--font-sans)',
        ...style,
      }}
      {...props}
    >
      {/* Chat header */}
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 16px', borderBottom: '1px solid var(--landing-line)',
          background: 'hsl(222 55% 11%)',
        }}
      >
        <div
          style={{
            width: 32, height: 32, borderRadius: 9999,
            background: 'var(--landing-cyan-soft)', border: '1px solid var(--landing-line)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--landing-cyan)',
          }}
        >
          <Bot style={{ width: 16, height: 16 }} />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ ...display, fontWeight: 700, fontSize: 14, color: 'var(--landing-steam)', margin: 0 }}>Assistente Patrimonial</p>
          <p style={{ fontSize: 11, color: dimmer, margin: 0 }}>online agora</p>
        </div>
        <span
          style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
            color: 'hsl(160 84% 55%)', border: '1px solid hsl(160 84% 55% / 0.35)',
            background: 'hsl(160 84% 55% / 0.1)', borderRadius: 9999, padding: '3px 10px',
          }}
        >
          WHATSAPP
        </span>
      </div>

      {/* Messages */}
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {MESSAGES.map((m, i) => (
          <div
            key={i}
            style={{
              alignSelf: m.from === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '85%',
              padding: '9px 12px',
              fontSize: 13,
              lineHeight: 1.5,
              color: m.from === 'user' ? 'var(--landing-steam)' : dim,
              background: m.from === 'user' ? 'var(--landing-cyan-soft)' : 'hsl(222 55% 13%)',
              border: '1px solid var(--landing-line)',
              borderRadius: m.from === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
            }}
          >
            {m.text}
          </div>
        ))}
        <p style={{ fontSize: 10, color: dimmer, fontStyle: 'italic', textAlign: 'center', margin: '4px 0 0' }}>
          conversa ilustrativa
        </p>
      </div>
    </div>
  );
}
