import { COMPANY } from '@/lib/company';

// Rodapé institucional reutilizável. Fonte de dados em src/lib/company.js.
// Variantes:
//  - "onDark"  (padrão): fundo transparente, texto claro — para páginas de fundo escuro
//    (Landing, Plans, PublicScan).
//  - "band": banda escura própria — usado nas páginas legais (fundo claro).
//  - "sidebar": compacto e theme-aware (tokens do sidebar) — para o rodapé do menu lateral.
export default function AppFooter({ variant = 'onDark', collapsed = false, className = '' }) {
  if (variant === 'sidebar') {
    if (collapsed) return null; // Sidebar recolhida: sem espaço para o bloco.
    return (
      <div className={`px-3 py-3 text-center leading-tight ${className}`}>
        <p className="text-[11px] text-sidebar-foreground/70">
          Desenvolvido por <span className="font-medium text-sidebar-foreground">{COMPANY.developer}</span>
        </p>
        <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-sidebar-primary">
          {COMPANY.legalName}
        </p>
        <p className="mt-0.5 text-[10px] text-sidebar-foreground/50">CNPJ: {COMPANY.cnpj}</p>
        <p className="text-[10px] text-sidebar-foreground/50">
          <a href={`mailto:${COMPANY.email}`} className="hover:text-sidebar-foreground/80">{COMPANY.email}</a>
        </p>
      </div>
    );
  }

  const isBand = variant === 'band';
  const wrap = isBand
    ? 'bg-slate-900 border-t border-slate-800'
    : 'bg-transparent';

  return (
    <footer className={`w-full px-4 py-6 text-center ${wrap} ${className}`}>
      <p className="text-sm text-slate-300">
        Desenvolvido por <span className="font-medium text-slate-100">{COMPANY.developer}</span>
      </p>
      <p className="mt-1.5 text-xs font-semibold uppercase tracking-[0.15em] text-blue-400">
        {COMPANY.legalName}
      </p>
      <p className="mt-1 text-xs text-slate-500">CNPJ: {COMPANY.cnpj}</p>
      <p className="mt-0.5 text-xs text-slate-500">
        <a href={`mailto:${COMPANY.email}`} className="transition-colors hover:text-slate-300">
          {COMPANY.email}
        </a>
        <span className="mx-2 text-slate-700">|</span>
        <a href={`tel:${COMPANY.phoneHref}`} className="transition-colors hover:text-slate-300">
          {COMPANY.phone}
        </a>
      </p>
    </footer>
  );
}
