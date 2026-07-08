import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';

/**
 * Card de plano da landing futurista.
 * Destaque = borda/glow ciano + tag "MAIS POPULAR".
 *
 * Props:
 *  - name, description, price (number | null), priceNote ('/mês' | '/ano')
 *  - popular (bool), features (string[])
 *  - cta (label), ctaTo (rota interna → Link), ctaHref (URL externa → <a>)
 *  - subtitle (linha extra sob o preço, ex: limites de usuários/ativos)
 */
export default function PlanCard({
  name,
  description,
  price,
  priceNote = '/mês',
  popular = false,
  features = [],
  cta = 'Começar agora',
  ctaTo,
  ctaHref,
  subtitle,
  style,
  ...props
}) {
  const [hover, setHover] = useState(false);

  const buttonEl = (
    <span
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: 40,
        borderRadius: 'var(--radius-md)',
        fontFamily: 'var(--font-display)',
        fontWeight: 700,
        fontSize: 14,
        background: popular ? 'var(--landing-cyan)' : 'var(--landing-cyan-soft)',
        color: popular ? 'var(--landing-bg)' : 'var(--landing-cyan)',
        outline: popular ? 'none' : '1px solid var(--landing-line)',
        boxShadow: hover && popular ? 'var(--landing-glow)' : 'none',
        transition: 'box-shadow 200ms ease, filter 200ms ease',
        filter: hover ? 'brightness(1.1)' : 'none',
        cursor: 'pointer',
      }}
    >
      {cta}
    </span>
  );

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--landing-bg-2)',
        borderRadius: 'var(--radius-2xl)',
        padding: 28,
        border: popular ? '1px solid var(--landing-cyan)' : '1px solid var(--landing-line)',
        boxShadow: popular ? 'var(--landing-glow)' : 'none',
        fontFamily: 'var(--font-sans)',
        color: 'var(--landing-steam)',
        ...style,
      }}
      {...props}
    >
      {popular && (
        <div
          style={{
            position: 'absolute',
            top: -12,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'var(--landing-cyan)',
            color: 'var(--landing-bg)',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.1em',
            padding: '4px 14px',
            borderRadius: 9999,
            fontFamily: 'var(--font-display)',
            whiteSpace: 'nowrap',
          }}
        >
          MAIS POPULAR
        </div>
      )}

      {/* Name + description */}
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, marginBottom: 4 }}>
        {name}
      </div>
      <div style={{ fontSize: 14, color: 'hsl(200 30% 96% / 0.6)', marginBottom: 16 }}>
        {description}
      </div>

      {/* Price */}
      <div style={{ marginBottom: 20 }}>
        {price != null ? (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4 }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 700 }}>
              R$ {price.toLocaleString('pt-BR')}
            </span>
            <span style={{ fontSize: 14, color: 'hsl(200 30% 96% / 0.6)', marginBottom: 4 }}>
              {priceNote}
            </span>
          </div>
        ) : (
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700 }}>
            Sob consulta
          </span>
        )}
        {subtitle && (
          <p style={{ fontSize: 13, color: 'hsl(200 30% 96% / 0.5)', margin: '6px 0 0' }}>
            {subtitle}
          </p>
        )}
      </div>

      {/* Features */}
      <ul
        style={{
          listStyle: 'none',
          margin: '0 0 28px',
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          flex: 1,
        }}
      >
        {features.map((f) => (
          <li
            key={f}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8,
              fontSize: 14,
              color: 'hsl(200 30% 96% / 0.75)',
            }}
          >
            <Check
              style={{ flexShrink: 0, marginTop: 2, color: 'var(--landing-cyan)', width: 16, height: 16 }}
              strokeWidth={2.5}
            />
            {f}
          </li>
        ))}
      </ul>

      {/* CTA — preserva Link interno ou <a> externo */}
      {ctaTo ? (
        <Link to={ctaTo}>{buttonEl}</Link>
      ) : ctaHref ? (
        <a href={ctaHref}>{buttonEl}</a>
      ) : (
        buttonEl
      )}
    </div>
  );
}