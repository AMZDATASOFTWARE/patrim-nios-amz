import moment from 'moment';
import { AlertTriangle } from 'lucide-react';

// Severity → dot color for the mini-KPIs (semantic tokens only, theme-aware).
const SEVERITY_DOT = {
  ok: 'bg-emerald-500',
  info: 'bg-primary',
  warn: 'bg-amber-500',
  alert: 'bg-destructive',
};

/**
 * A single "newspaper" panel: domain icon + name, headline in display type,
 * investigative summary as body, up to 3 mini-KPIs, and the per-card timestamp.
 * Empty state (no briefing generated yet) shows a calm placeholder, never an error.
 */
export default function BriefingCard({ domain }) {
  const { label, icon: Icon, briefing } = domain;

  if (!briefing) {
    return (
      <div className="flex flex-col rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Icon className="h-5 w-5" aria-hidden="true" />
          <h3 className="text-sm font-semibold">{label}</h3>
        </div>
        <div className="flex flex-1 items-center justify-center py-8 text-center">
          <p className="text-sm text-muted-foreground">
            O supervisor ainda não publicou a edição de hoje.<br />
            <span className="text-xs">A primeira análise é gerada no próximo ciclo diário.</span>
          </p>
        </div>
      </div>
    );
  }

  let kpis = [];
  try {
    kpis = JSON.parse(briefing.kpis_json || '[]');
  } catch {
    kpis = [];
  }
  const isPartial = briefing.generation_status === 'partial';

  return (
    <div className="flex flex-col rounded-xl border border-border bg-card p-6 shadow-sm">
      {/* Domain masthead */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-muted-foreground">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
          </div>
          <h3 className="text-xs font-semibold uppercase tracking-wide">{label}</h3>
        </div>
        {isPartial && (
          <span title="Análise indisponível hoje — indicadores calculados normalmente">
            <AlertTriangle className="h-4 w-4 text-amber-500" aria-hidden="true" />
          </span>
        )}
      </div>

      {/* Headline */}
      <h2 className="text-lg font-bold leading-snug text-card-foreground">
        {briefing.headline}
      </h2>

      {/* Investigative summary */}
      <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
        {briefing.summary}
      </p>

      {/* Mini KPIs */}
      {kpis.length > 0 && (
        <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border pt-3">
          {kpis.slice(0, 3).map((kpi, i) => (
            <div key={i} className="min-w-0">
              <div className="flex items-center gap-1">
                <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${SEVERITY_DOT[kpi.severity] || 'bg-primary'}`} aria-hidden="true" />
                <p className="truncate text-[11px] text-muted-foreground" title={kpi.label}>{kpi.label}</p>
              </div>
              <p className="truncate text-sm font-semibold text-card-foreground" title={kpi.formatted}>{kpi.formatted}</p>
            </div>
          ))}
        </div>
      )}

      {/* Per-card timestamp */}
      {briefing.computed_at && (
        <p className="mt-3 text-[11px] text-muted-foreground/70">
          Atualizado {moment(briefing.computed_at).format('DD/MM/YYYY [às] HH:mm')}
        </p>
      )}
    </div>
  );
}
