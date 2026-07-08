import { useState } from 'react';
import { User, Clock, ChevronDown, ChevronRight, Code2 } from 'lucide-react';
import moment from 'moment';
import { AUDIT_ACTION_PAST, AUDIT_ENTITY_LABELS } from '@/lib/audit';

const ACTION_STYLES = {
  created: 'bg-emerald-500/15 text-emerald-500 dark:text-emerald-400 border-emerald-500/20',
  updated: 'bg-blue-500/15 text-blue-500 dark:text-blue-400 border-blue-500/20',
  deleted: 'bg-red-500/15 text-red-500 dark:text-red-400 border-red-500/20',
};

export default function AuditLogEntry({ log }) {
  const [expanded, setExpanded] = useState(false);
  const actionLabel = AUDIT_ACTION_PAST[log.action] || log.action;
  const entityLabel = AUDIT_ENTITY_LABELS[log.entity_type] || log.entity_type;
  const changedFields = log.changed_fields || [];
  const hasDetails = changedFields.length > 0 || log.old_data || log.new_data;

  const heading = log.summary || `${entityLabel} ${actionLabel}`;

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden transition-colors hover:border-primary/30">
      {/* Header row */}
      <div
        className="flex items-start gap-3 p-4 cursor-pointer"
        onClick={() => hasDetails && setExpanded(!expanded)}
      >
        {hasDetails && (
          <span className="mt-0.5 text-muted-foreground shrink-0">
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </span>
        )}
        {!hasDetails && <span className="w-4 shrink-0" />}

        <div className="flex-1 min-w-0">
          {/* Pills + heading */}
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${ACTION_STYLES[log.action] || ACTION_STYLES.updated}`}>
              {actionLabel}
            </span>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
              {entityLabel}
            </span>
          </div>

          <p className="text-sm text-foreground font-medium">
            {heading}
            {changedFields.length > 0 && (
              <span className="text-muted-foreground font-normal">
                {' '}— campos: {changedFields.join(', ')}
              </span>
            )}
          </p>

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {log.actor_name || log.actor_email || 'Sistema'}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {moment(log.created_date).format('DD/MM/YYYY [às] HH:mm:ss')}
            </span>
            {changedFields.length > 0 && (
              <span className="text-primary font-medium">
                {changedFields.length} campo(s) alterado(s)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && hasDetails && (
        <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
          {/* Changed fields pills */}
          {changedFields.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Campos Alterados
              </p>
              <div className="flex flex-wrap gap-1.5">
                {changedFields.map((field) => (
                  <span
                    key={field}
                    className="text-xs font-medium px-2 py-1 rounded-md bg-secondary text-secondary-foreground border border-border"
                  >
                    {field}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* JSON blocks */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {log.old_data && (
              <JsonBlock title="Dados Anteriores" data={log.old_data} />
            )}
            {log.new_data && (
              <JsonBlock title="Dados Novos" data={log.new_data} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function JsonBlock({ title, data }) {
  let parsed = data;
  try {
    parsed = typeof data === 'string' ? JSON.parse(data) : data;
  } catch (_) {
    // keep raw string
  }

  return (
    <div className="rounded-lg border border-border bg-muted/50 overflow-hidden">
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-border bg-muted">
        <Code2 className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {title}
        </span>
      </div>
      <pre className="p-3 text-xs overflow-x-auto font-mono text-foreground/80 leading-relaxed max-h-64">
        {typeof parsed === 'string' ? parsed : JSON.stringify(parsed, null, 2)}
      </pre>
    </div>
  );
}