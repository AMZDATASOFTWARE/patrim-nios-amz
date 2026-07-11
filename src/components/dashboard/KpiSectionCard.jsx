import { cn } from '@/lib/utils';

// Severidade → cor do tile (ponto + borda-esquerda), mesmo vocabulário do
// BriefingCard.jsx, agora com um toque de fundo por severidade para dar textura.
const SEVERITY = {
  ok: { dot: 'bg-emerald-500', bar: 'border-l-emerald-400/60', tint: '' },
  info: { dot: 'bg-primary', bar: 'border-l-primary/50', tint: '' },
  warn: { dot: 'bg-amber-500', bar: 'border-l-amber-400/70', tint: 'bg-amber-500/[0.04]' },
  alert: { dot: 'bg-destructive', bar: 'border-l-destructive/70', tint: 'bg-destructive/[0.05]' },
};

export default function KpiSectionCard({ title, subtitle, icon: Icon, kpis = [], className }) {
  return (
    <div className={cn('rounded-xl border border-border bg-card p-6 shadow-sm', className)}>
      <div className="mb-5 flex items-center gap-3">
        {Icon && (
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-4.5 w-4.5" />
          </div>
        )}
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-card-foreground">{title}</h3>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {kpis.map((kpi, i) => {
          const s = SEVERITY[kpi.severity] || SEVERITY.info;
          return (
            <div
              key={i}
              className={cn('rounded-lg border-l-2 px-3 py-2.5 transition-colors hover:bg-muted/40', s.bar, s.tint)}
            >
              <div className="flex items-center gap-1.5">
                <span className={cn('h-1.5 w-1.5 flex-shrink-0 rounded-full', s.dot)} aria-hidden="true" />
                <p className="truncate text-xs text-muted-foreground" title={kpi.label}>{kpi.label}</p>
              </div>
              <p className="mt-1 truncate text-xl font-bold tracking-tight text-card-foreground" title={kpi.formatted}>
                {kpi.formatted}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
