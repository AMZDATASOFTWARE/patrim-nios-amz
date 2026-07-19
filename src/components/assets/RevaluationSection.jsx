import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useWorkspaceEntity } from '@/lib/useWorkspaceData';
import { Button } from '@/components/ui/button';
import { Scale, TrendingUp, TrendingDown, Plus } from 'lucide-react';
import { formatCurrency } from '@/lib/depreciation';
import moment from 'moment';

/** Histórico de reavaliações do ativo (somente leitura) — criação fica em /Revaluations. */
export default function RevaluationSection({ assetId, canManage }) {
  const RevaluationEntity = useWorkspaceEntity('AssetRevaluation');
  const [revaluations, setRevaluations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    RevaluationEntity.filterAll({ asset_id: assetId }, '-revaluation_date').then((data) => {
      setRevaluations(data);
      setLoading(false);
    });
  }, [assetId]);

  if (loading) return null;

  return (
    <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-card-foreground">Reavaliações</h2>
          <p className="text-sm text-muted-foreground">Histórico de novas avaliações de valor</p>
        </div>
        {canManage && (
          <Link to="/Revaluations">
            <Button variant="outline" size="sm" className="gap-2"><Plus className="h-4 w-4" /> Nova</Button>
          </Link>
        )}
      </div>

      {revaluations.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground">
          <Scale className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">Nenhuma reavaliação registrada</p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {revaluations.map((r) => {
            const isGain = (r.gain_amount || 0) > 0;
            return (
              <div key={r.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm text-card-foreground">
                    {formatCurrency(r.previous_value)} → {formatCurrency(r.appraised_value)}
                  </p>
                  <p className="text-xs text-muted-foreground">{moment(r.revaluation_date).format('DD/MM/YYYY')}</p>
                </div>
                <span className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border shrink-0 ${
                  isGain ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-red-100 text-red-700 border-red-200'
                }`}>
                  {isGain ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {formatCurrency(isGain ? r.gain_amount : r.loss_amount)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
