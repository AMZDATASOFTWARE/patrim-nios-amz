import { Link } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';

// Faixa de chips de urgência logo abaixo do cabeçalho (padrão F: urgente no topo).
// Recebe itens já derivados no Dashboard a partir dos KPIs existentes — zero
// queries novas. Só entram itens com count > 0; se nada urgente, mostra "Tudo em dia".
const TONE = {
  alert: 'bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/15',
  warn: 'bg-amber-500/10 text-amber-600 border-amber-500/20 hover:bg-amber-500/15',
};

export default function AttentionStrip({ items = [] }) {
  const active = items.filter((i) => i.count > 0);

  if (active.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2.5 text-sm font-medium text-emerald-600">
        <CheckCircle2 className="h-4 w-4" />
        Tudo em dia — nenhuma pendência urgente no momento.
      </div>
    );
  }

  return (
    <div className="flex flex-nowrap gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible">
      {active.map((item, i) => {
        const Icon = item.icon;
        return (
          <Link
            key={i}
            to={item.to}
            className={`inline-flex flex-shrink-0 items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${TONE[item.tone] || TONE.warn}`}
          >
            {Icon && <Icon className="h-4 w-4" />}
            <span className="font-bold">{item.count}</span>
            <span className="whitespace-nowrap">{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
