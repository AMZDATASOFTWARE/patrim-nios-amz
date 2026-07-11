import { cn } from '@/lib/utils';

// Mesmo padrão visual de severidade usado em src/components/briefings/BriefingCard.jsx,
// generalizado para qualquer seção de KPIs do Dashboard.
const SEVERITY_DOT = {
  ok: 'bg-emerald-500',
  info: 'bg-primary',
  warn: 'bg-amber-500',
  alert: 'bg-destructive',
};

export default function KpiSectionCard({ title, icon: Icon, kpis = [], className }) {
  return (
    <div className={cn('bg-card rounded-xl border border-border p-6 shadow-sm', className)}>
      <div className="flex items-center gap-2 mb-4">
        {Icon && (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <Icon className="h-4 w-4 text-primary" />
          </div>
        )}
        <h3 className="text-lg font-semibold text-card-foreground">{title}</h3>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {kpis.map((kpi, i) => (
          <div key={i} className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span
                className={cn('h-1.5 w-1.5 flex-shrink-0 rounded-full', SEVERITY_DOT[kpi.severity] || 'bg-primary')}
                aria-hidden="true"
              />
              <p className="truncate text-xs text-muted-foreground" title={kpi.label}>{kpi.label}</p>
            </div>
            <p className="mt-0.5 truncate text-base font-semibold text-card-foreground" title={kpi.formatted}>
              {kpi.formatted}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
