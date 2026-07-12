import { Newspaper } from 'lucide-react';
import { display, dim, dimmer } from './landingTheme';

const SEVERITY_COLORS = {
  ok: 'hsl(160 84% 55%)',
  info: 'var(--landing-cyan)',
  warn: 'hsl(38 92% 55%)',
  alert: 'hsl(0 84% 60%)',
};

/**
 * Mockup estático de um card do "Diário do Patrimônio" (dados ilustrativos).
 * Espelha o padrão visual do BriefingCard real do app, na paleta da landing.
 *
 * Props: agent (nome do supervisor), headline, summary, kpis [{label, value, severity}], compact.
 */
export default function DiarioMockup({ agent, headline, summary, kpis = [], compact = false, style, ...props }) {
  return (
    <div
      style={{
        background: 'var(--landing-bg-2)',
        border: '1px solid var(--landing-line)',
        borderRadius: 'var(--radius-2xl)',
        padding: compact ? 18 : 24,
        textAlign: 'left',
        boxShadow: compact ? 'none' : 'var(--landing-glow)',
        fontFamily: 'var(--font-sans)',
        ...style,
      }}
      {...props}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 28, height: 28, borderRadius: 8,
              background: 'var(--landing-cyan-soft)', border: '1px solid var(--landing-line)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--landing-cyan)',
            }}
          >
            <Newspaper style={{ width: 14, height: 14 }} />
          </div>
          <span style={{ ...display, fontWeight: 700, fontSize: 13, letterSpacing: '0.06em', color: 'var(--landing-steam)' }}>
            DIÁRIO DO PATRIMÔNIO
          </span>
        </div>
        <span style={{ fontSize: 11, color: dimmer }}>edição de hoje</span>
      </div>

      {/* Agent */}
      <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--landing-cyan)', margin: '0 0 6px', letterSpacing: '0.04em' }}>
        {agent}
      </p>

      {/* Headline */}
      <p style={{ ...display, fontWeight: 700, fontSize: compact ? 15 : 19, lineHeight: 1.35, color: 'var(--landing-steam)', margin: '0 0 8px' }}>
        {headline}
      </p>

      {/* Summary */}
      <p style={{ fontSize: 13, color: dim, lineHeight: 1.6, margin: '0 0 14px' }}>{summary}</p>

      {/* KPIs */}
      {kpis.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: compact ? 12 : 18, borderTop: '1px solid var(--landing-line)', paddingTop: 12 }}>
          {kpis.map((k) => (
            <div key={k.label} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span
                style={{
                  width: 7, height: 7, borderRadius: 9999, flexShrink: 0,
                  background: SEVERITY_COLORS[k.severity] || SEVERITY_COLORS.info,
                }}
              />
              <div>
                <p style={{ fontSize: 10, color: dimmer, margin: 0, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{k.label}</p>
                <p style={{ ...display, fontSize: 14, fontWeight: 700, color: 'var(--landing-steam)', margin: 0 }}>{k.value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <p style={{ fontSize: 10, color: dimmer, fontStyle: 'italic', textAlign: 'right', margin: '10px 0 0' }}>
        dados ilustrativos
      </p>
    </div>
  );
}
