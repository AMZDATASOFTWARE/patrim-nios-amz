import { React } from 'react';

/** Pill de seção da landing futurista — borda holográfica + texto ciano uppercase. */
export default function SectionTag({ children, style, ...props }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        border: '1px solid var(--landing-line)',
        background: 'var(--landing-cyan-soft)',
        color: 'var(--landing-cyan)',
        borderRadius: 9999,
        padding: '6px 16px',
        fontFamily: 'var(--font-display)',
        fontSize: 12,
        fontWeight: 500,
        letterSpacing: '0.2em',
        textTransform: 'uppercase',
        ...style,
      }}
      {...props}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: 9999,
          background: 'var(--landing-cyan)',
          boxShadow: '0 0 8px var(--landing-cyan)',
        }}
      />
      {children}
    </span>
  );
}