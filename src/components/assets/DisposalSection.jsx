import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useWorkspaceEntity } from '@/lib/useWorkspaceData';
import { Button } from '@/components/ui/button';
import { PackageX, Plus } from 'lucide-react';
import { formatCurrency } from '@/lib/depreciation';
import moment from 'moment';

const TYPE_META = {
  baixa: { label: 'Baixa', badge: 'bg-slate-100 text-slate-600 border-slate-200' },
  alienacao: { label: 'Alienação', badge: 'bg-blue-100 text-blue-700 border-blue-200' },
};

/** Histórico de baixa/alienação do ativo (somente leitura) — criação fica em /Disposals. */
export default function DisposalSection({ assetId, canManage }) {
  const DisposalEntity = useWorkspaceEntity('AssetDisposal');
  const [disposals, setDisposals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    DisposalEntity.filterAll({ asset_id: assetId }, '-disposal_date').then((data) => {
      setDisposals(data);
      setLoading(false);
    });
  }, [assetId]);

  if (loading || disposals.length === 0) return null;

  return (
    <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-card-foreground">Baixa / Alienação</h2>
          <p className="text-sm text-muted-foreground">Registro de saída deste ativo</p>
        </div>
        {canManage && (
          <Link to="/Disposals">
            <Button variant="outline" size="sm" className="gap-2"><Plus className="h-4 w-4" /> Ver todas</Button>
          </Link>
        )}
      </div>

      <div className="divide-y divide-border">
        {disposals.map((d) => {
          const meta = TYPE_META[d.disposal_type] || TYPE_META.baixa;
          return (
            <div key={d.id} className="flex items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full border shrink-0 ${meta.badge}`}>{meta.label}</span>
                  <p className="text-xs text-muted-foreground">{moment(d.disposal_date).format('DD/MM/YYYY')}</p>
                </div>
                {d.disposal_type === 'alienacao' && (
                  <p className="text-sm text-card-foreground mt-1">{d.buyer_name || '—'} • {formatCurrency(d.sale_value)}</p>
                )}
                {d.disposal_type === 'baixa' && d.reason && (
                  <p className="text-sm text-card-foreground mt-1">{d.reason}</p>
                )}
              </div>
              <PackageX className="h-4 w-4 text-muted-foreground shrink-0" />
            </div>
          );
        })}
      </div>
    </div>
  );
}
