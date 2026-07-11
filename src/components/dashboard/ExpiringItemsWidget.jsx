import { Link } from 'react-router-dom';
import { CalendarClock, ShieldAlert, AlertTriangle } from 'lucide-react';
import moment from 'moment';
import { cn } from '@/lib/utils';

const TYPE_STYLE = {
  warranty: { bg: 'bg-yellow-50', icon: 'text-yellow-500' },
  review: { bg: 'bg-yellow-50', icon: 'text-yellow-500' },
  ipva: { bg: 'bg-orange-50', icon: 'text-orange-500' },
  contract: { bg: 'bg-purple-50', icon: 'text-purple-500' },
};

// Lista unificada de vencimentos próximos (garantia/revisão/IPVA de Asset +
// fim de vigência de Contract) — substitui a antiga seção "Lembretes e
// Alertas" de MaintenanceAlerts.jsx, agora cobrindo também IPVA e contratos.
// `compact` (bool): linhas mais baixas e menos itens visíveis, pra caber sem
// rolar junto com outros cards na mesma aba.
export default function ExpiringItemsWidget({ items = [], compact = false }) {
  if (items.length === 0) return null;
  const limit = compact ? 6 : 12;

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
      <div className={cn('border-b border-border flex items-center gap-2', compact ? 'px-4 py-2.5' : 'px-5 py-4')}>
        <div className="h-7 w-7 rounded-lg bg-yellow-100 flex items-center justify-center flex-shrink-0">
          <CalendarClock className="h-4 w-4 text-yellow-600" />
        </div>
        <h3 className="font-semibold text-card-foreground text-sm">Vencimentos Próximos</h3>
        <span className="ml-auto text-xs font-bold bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
          {items.length}
        </span>
      </div>
      <div className={cn('divide-y divide-border overflow-y-auto', compact ? 'max-h-[220px]' : 'max-h-[360px]')}>
        {items.slice(0, limit).map((item, i) => {
          const isOverdue = item.days < 0;
          const isUrgent = item.days >= 0 && item.days <= 7;
          const style = TYPE_STYLE[item.type] || TYPE_STYLE.warranty;
          const to = item.type === 'contract' ? '/Contracts' : `/AssetDetail?id=${item.id}`;
          return (
            <Link
              key={i}
              to={to}
              className={cn('flex items-center gap-3 hover:bg-muted/40 transition-colors', compact ? 'px-4 py-2' : 'px-5 py-3')}
            >
              <div className={cn('rounded-lg flex items-center justify-center flex-shrink-0', compact ? 'h-7 w-7' : 'h-8 w-8', isOverdue ? 'bg-red-50' : style.bg)}>
                {isOverdue ? (
                  <ShieldAlert className="h-3.5 w-3.5 text-red-500" />
                ) : (
                  <AlertTriangle className={cn('h-3.5 w-3.5', style.icon)} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.name}</p>
                <p className="text-xs text-muted-foreground">{item.label} · {moment(item.date).format('DD/MM/YYYY')}</p>
              </div>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                isOverdue ? 'bg-red-100 text-red-700' :
                isUrgent ? 'bg-orange-100 text-orange-700' :
                'bg-yellow-100 text-yellow-700'
              }`}>
                {isOverdue ? `${Math.abs(item.days)}d atraso` : item.days === 0 ? 'Hoje' : `${item.days}d`}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
