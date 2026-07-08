import { useState } from 'react';

/** Card de funcionalidade da landing futurista — painel escuro com borda holográfica; glow ciano no hover. */
export default function FeatureCard({ icon: Icon, title, children, style, ...props }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: 'var(--landing-bg-2)',
        borderRadius: 'var(--radius-2xl)',
        padding: 24,
        border: hover ? '1px solid var(--landing-cyan)' : '1px solid var(--landing-line)',
        boxShadow: hover ? 'var(--landing-glow)' : 'none',
        transition: 'border-color 200ms ease, box-shadow 200ms ease',
        fontFamily: 'var(--font-sans)',
        color: 'var(--landing-steam)',
        ...style,
      }}
      {...props}
    >
      {Icon && (
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 'var(--radius-md)',
            background: 'var(--landing-cyan-soft)',
            border: '1px solid var(--landing-line)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--landing-cyan)',
            marginBottom: 16,
          }}
        >
          <Icon style={{ width: 20, height: 20 }} />
        </div>
      )}
      <h3
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: 18,
          marginBottom: 8,
        }}
      >
        {title}
      </h3>
      <p style={{ fontSize: 14, color: 'hsl(200 30% 96% / 0.6)', lineHeight: 1.6, margin: 0 }}>
        {children}
      </p>
    </div>
  );
}