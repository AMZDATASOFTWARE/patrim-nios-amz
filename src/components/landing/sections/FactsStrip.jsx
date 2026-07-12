import { display, dim } from '../landingTheme';

const FACTS = [
  { value: '6 + 1', label: 'supervisores de IA + assistente' },
  { value: '2 livros', label: 'depreciação societária e fiscal' },
  { value: 'T-30/15/7/1', label: 'alertas automáticos de vencimento' },
  { value: '14 dias', label: 'grátis, sem cartão' },
];

/** Faixa de fatos verificáveis do produto (substitui os números fictícios antigos). */
export default function FactsStrip() {
  return (
    <section style={{ padding: '36px 0', borderTop: '1px solid var(--landing-line)', borderBottom: '1px solid var(--landing-line)', background: 'var(--landing-bg-2)' }}>
      <div className="max-w-5xl mx-auto px-4 grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
        {FACTS.map((f) => (
          <div key={f.label}>
            <p style={{ ...display, fontSize: 'clamp(20px, 3vw, 28px)', fontWeight: 700, color: 'var(--landing-cyan)', margin: 0 }}>{f.value}</p>
            <p style={{ fontSize: 13, color: dim, marginTop: 6, lineHeight: 1.4 }}>{f.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
