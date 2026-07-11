import { Link } from 'react-router-dom';
import { Wrench, ArrowRight } from 'lucide-react';

// Lembretes de garantia/revisão/IPVA/contrato saíram para
// src/components/dashboard/ExpiringItemsWidget.jsx (agora cobrindo também
// IPVA e contratos). Este componente ficou só com a lista "Em Manutenção".
export default function MaintenanceAlerts({ assets }) {
  const inMaintenance = assets.filter(a => a.status === 'Em Manutenção');

  if (inMaintenance.length === 0) return null;

  return (
    <div className="space-y-4">
      {/* In Maintenance */}
      {inMaintenance.length > 0 && (
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-orange-100 flex items-center justify-center">
              <Wrench className="h-4 w-4 text-orange-600" />
            </div>
            <h3 className="font-semibold text-card-foreground">Em Manutenção</h3>
            <span className="ml-auto text-xs font-bold bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">{inMaintenance.length}</span>
          </div>
          <div className="divide-y divide-border">
            {inMaintenance.slice(0, 4).map(a => (
              <Link key={a.id} to={`/AssetDetail?id=${a.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/40 transition-colors">
                <div className="h-8 w-8 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0">
                  <Wrench className="h-4 w-4 text-orange-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{a.name}</p>
                  <p className="text-xs text-muted-foreground">{a.category}{a.location ? ` · ${a.location}` : ''}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              </Link>
            ))}
            {inMaintenance.length > 4 && (
              <Link to="/Assets" className="flex items-center justify-center px-5 py-2.5 text-xs text-primary hover:bg-muted/40 transition-colors font-medium">
                Ver mais {inMaintenance.length - 4} ativos em manutenção
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}