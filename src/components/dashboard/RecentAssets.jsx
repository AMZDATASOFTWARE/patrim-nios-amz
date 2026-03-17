import { Link } from 'react-router-dom';
import { formatCurrency, calculateCurrentValue, getUsefulLifeFromRate } from '@/lib/depreciation';
import { ArrowRight, Package } from 'lucide-react';

const categoryColors = {
  'Imóveis': 'bg-blue-100 text-blue-700',
  'Veículos': 'bg-amber-100 text-amber-700',
  'Equipamentos': 'bg-emerald-100 text-emerald-700',
  'Investimentos': 'bg-purple-100 text-purple-700',
  'Intangíveis': 'bg-pink-100 text-pink-700',
};

export default function RecentAssets({ assets }) {
  return (
    <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-card-foreground">Ativos Recentes</h3>
        <Link 
          to="/Assets" 
          className="text-sm font-medium text-primary hover:text-primary/80 flex items-center gap-1"
        >
          Ver todos <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      
      <div className="space-y-3">
        {assets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Package className="h-12 w-12 mb-2 opacity-50" />
            <p>Nenhum ativo cadastrado</p>
          </div>
        ) : (
          assets.slice(0, 5).map((asset) => {
            const usefulLife = asset.useful_life_years || getUsefulLifeFromRate(asset.depreciation_rate);
            const currentValue = calculateCurrentValue(
              asset.purchase_date,
              asset.acquisition_value,
              asset.residual_value || 0,
              usefulLife
            );
            
            return (
              <Link
                key={asset.id}
                to={`/AssetDetail?id=${asset.id}`}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {asset.photo_url ? (
                    <img 
                      src={asset.photo_url} 
                      alt={asset.name}
                      className="h-10 w-10 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                      <Package className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-card-foreground">{asset.name}</p>
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${categoryColors[asset.category] || 'bg-gray-100 text-gray-700'}`}>
                      {asset.category}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-card-foreground">{formatCurrency(currentValue)}</p>
                  <p className="text-xs text-muted-foreground">Valor Atual</p>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}