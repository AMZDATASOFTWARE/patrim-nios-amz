import { cn } from '@/lib/utils';

// Severidade → cor do tile (ponto + borda-esquerda), mesmo vocabulário do
// BriefingCard.jsx, agora com um toque de fundo por severidade para dar textura.
const SEVERITY = {
  ok: { dot: 'bg-emerald-500', bar: 'border-l-emerald-400/60', tint: '' },
  info: { dot: 'bg-primary', bar: 'border-l-primary/50', tint: '' },
  warn: { dot: 'bg-amber-500', bar: 'border-l-amber-400/70', tint: 'bg-amber-500/[0.04]' },
  alert: { dot: 'bg-destructive', bar: 'border-l-destructive/70', tint: 'bg-destructive/[0.05]' },
};

// 3 tamanhos por importância. 'lg' é usado por seções sozinhas numa aba (mais
// espaço pra respirar); 'sm' é reservado para casos bem enxutos.
const SIZE = {
  lg: { pad: 'p-6', headerIcon: 'h-9 w-9', headerIconSvg: 'h-5 w-5', title: 'text-base', value: 'text-2xl', grid: 'grid-cols-2 sm:grid-cols-4', tile: 'px-3 py-3' },
  md: { pad: 'p-6', headerIcon: 'h-9 w-9', headerIconSvg: 'h-5 w-5', title: 'text-base', value: 'text-xl', grid: 'grid-cols-2 sm:grid-cols-3', tile: 'px-3 py-2.5' },
  sm: { pad: 'p-4', headerIcon: 'h-7 w-7', headerIconSvg: 'h-4 w-4', title: 'text-sm', value: 'text-base', grid: 'grid-cols-2 sm:grid-cols-3', tile: 'px-2.5 py-2' },
};

export default function KpiSectionCard({ title, subtitle, icon: Icon, kpis = [], className, size = 'md' }) {
  const s = SIZE[size] || SIZE.md;

  return (
    <div className={cn('rounded-xl border border-border bg-card shadow-sm', s.pad, className)}>
      <div className="mb-4 flex items-center gap-3">
        {Icon && (
          <div className={cn('flex flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary', s.headerIcon)}>
            <Icon className={s.headerIconSvg} />
          </div>
        )}
        <div className="min-w-0">
          <h3 className={cn('font-semibold text-card-foreground', s.title)}>{title}</h3>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      <div className={cn('grid gap-3', s.grid)}>
        {kpis.map((kpi, i) => {
          const sv = SEVERITY[kpi.severity] || SEVERITY.info;
          return (
            <div
              key={i}
              className={cn('rounded-lg border-l-2 transition-colors hover:bg-muted/40', s.tile, sv.bar, sv.tint)}
            >
              <div className="flex items-center gap-1.5">
                <span className={cn('h-1.5 w-1.5 flex-shrink-0 rounded-full', sv.dot)} aria-hidden="true" />
                <p className="truncate text-xs text-muted-foreground" title={kpi.label}>{kpi.label}</p>
              </div>
              <p className={cn('mt-1 truncate font-bold tracking-tight text-card-foreground', s.value)} title={kpi.formatted}>
                {kpi.formatted}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
