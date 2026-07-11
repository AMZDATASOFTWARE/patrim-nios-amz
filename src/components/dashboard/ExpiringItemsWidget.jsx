import { Link } from 'react-router-dom';
import { CalendarClock, ShieldAlert, AlertTriangle } from 'lucide-react';
import moment from 'moment';

const TYPE_STYLE = {
  warranty: { bg: 'bg-yellow-50', icon: 'text-yellow-500' },
  review: { bg: 'bg-yellow-50', icon: 'text-yellow-500' },
  ipva: { bg: 'bg-orange-50', icon: 'text-orange-500' },
  contract: { bg: 'bg-purple-50', icon: 'text-purple-500' },
};

// Lista unificada de vencimentos próximos (garantia/revisão/IPVA de Asset +
// fim de vigência de Contract) — substitui a antiga seção "Lembretes e
// Alertas" de MaintenanceAlerts.jsx, agora cobrindo também IPVA e contratos.
export default function ExpiringItemsWidget({ items = [] }) {
  if (items.length === 0) return null;

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center gap-2">
        <div className="h-7 w-7 rounded-lg bg-yellow-100 flex items-center justify-center">
          <CalendarClock className="h-4 w-4 text-yellow-600" />
        </div>
        <h3 className="font-semibold text-card-foreground">Vencimentos Próximos</h3>
        <span className="ml-auto text-xs font-bold bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
          {items.length}
        </span>
      </div>
      <div className="divide-y divide-border max-h-[360px] overflow-y-auto">
        {items.slice(0, 12).map((item, i) => {
          const isOverdue = item.days < 0;
          const isUrgent = item.days >= 0 && item.days <= 7;
          const style = TYPE_STYLE[item.type] || TYPE_STYLE.warranty;
          const to = item.type === 'contract' ? '/Contracts' : `/AssetDetail?id=${item.id}`;
          return (
            <Link key={i} to={to} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/40 transition-colors">
              <div className={`h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isOverdue ? 'bg-red-50' : style.bg}`}>
                {isOverdue ? (
                  <ShieldAlert className="h-4 w-4 text-red-500" />
                ) : (
                  <AlertTriangle className={`h-4 w-4 ${style.icon}`} />
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
