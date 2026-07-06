import { COMPANY } from '@/lib/company';

// Rodapé institucional reutilizável (estilo banda escura, centralizado).
// Fonte de dados em src/lib/company.js — usado no app inteiro e nas páginas públicas.
export default function AppFooter({ className = '' }) {
  return (
    <footer className={`w-full bg-slate-900 border-t border-slate-800 px-4 py-6 text-center ${className}`}>
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
