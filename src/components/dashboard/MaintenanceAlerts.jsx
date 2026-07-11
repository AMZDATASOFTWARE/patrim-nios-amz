import { Link } from 'react-router-dom';
import { Wrench, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

// Lembretes de garantia/revisão/IPVA/contrato saíram para
// src/components/dashboard/ExpiringItemsWidget.jsx (agora cobrindo também
// IPVA e contratos). Este componente ficou só com a lista "Em Manutenção".
// `compact` (bool): linhas mais baixas e menos itens visíveis por padrão.
export default function MaintenanceAlerts({ assets, compact = false }) {
  const inMaintenance = assets.filter(a => a.status === 'Em Manutenção');
  const limit = compact ? 2 : 4;

  if (inMaintenance.length === 0) return null;

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
      <div className={cn('border-b border-border flex items-center gap-2', compact ? 'px-4 py-2.5' : 'px-5 py-4')}>
        <div className="h-7 w-7 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
          <Wrench className="h-4 w-4 text-orange-600" />
        </div>
        <h3 className="font-semibold text-card-foreground text-sm">Em Manutenção</h3>
        <span className="ml-auto text-xs font-bold bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">{inMaintenance.length}</span>
      </div>
      <div className="divide-y divide-border">
        {inMaintenance.slice(0, limit).map(a => (
          <Link
            key={a.id}
            to={`/AssetDetail?id=${a.id}`}
            className={cn('flex items-center gap-3 hover:bg-muted/40 transition-colors', compact ? 'px-4 py-2' : 'px-5 py-3')}
          >
            <div className={cn('rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0', compact ? 'h-7 w-7' : 'h-8 w-8')}>
              <Wrench className="h-3.5 w-3.5 text-orange-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{a.name}</p>
              <p className="text-xs text-muted-foreground">{a.category}{a.location ? ` · ${a.location}` : ''}</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </Link>
        ))}
        {inMaintenance.length > limit && (
          <Link to="/Assets" className="flex items-center justify-center px-5 py-2 text-xs text-primary hover:bg-muted/40 transition-colors font-medium">
            Ver mais {inMaintenance.length - limit} ativos em manutenção
          </Link>
        )}
      </div>
    </div>
  );
}
