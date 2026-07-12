import { Link } from 'react-router-dom';
import { Package, MapPin } from 'lucide-react';
import { formatCurrency, calculateCurrentValue, calculateDepreciationPercentage, getUsefulLifeFromRate } from '@/lib/depreciation';
import AssetStatusBadge from './AssetStatusBadge';
import { Progress } from '@/components/ui/progress';

const categoryColors = {
  'Imóveis': 'border-l-blue-500',
  'Veículos': 'border-l-amber-500',
  'Equipamentos': 'border-l-emerald-500',
  'Investimentos': 'border-l-purple-500',
  'Intangíveis': 'border-l-pink-500',
};

export default function AssetCard({ asset }) {
  const usefulLife = asset.useful_life_years || getUsefulLifeFromRate(asset.depreciation_rate);
  const currentValue = calculateCurrentValue(
    asset.purchase_date, asset.acquisition_value, asset.residual_value || 0, usefulLife
  );
  const depPct = calculateDepreciationPercentage(
    asset.purchase_date, asset.acquisition_value, asset.residual_value || 0, usefulLife
  );

  return (
    <Link
      to={`/AssetDetail?id=${asset.id}`}
      className={`block bg-card rounded-xl border border-border shadow-sm hover:shadow-md transition-all border-l-4 ${categoryColors[asset.category] || 'border-l-gray-300'}`}
    >
      <div className="p-3 sm:p-5">
        <div className="flex items-start gap-3 sm:gap-4">
          {asset.photo_url ? (
            <img src={asset.photo_url} alt={asset.name} className="h-12 w-12 sm:h-16 sm:w-16 rounded-lg object-cover flex-shrink-0" />
          ) : (
            <div className="h-12 w-12 sm:h-16 sm:w-16 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
              <Package className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-sm sm:text-base font-semibold text-card-foreground truncate">{asset.name}</h3>
              <AssetStatusBadge status={asset.status} />
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">{asset.category}</p>
            {asset.location && (
              <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" />
                {asset.location}
              </div>
            )}
          </div>
        </div>

        <div className="mt-3 sm:mt-4 grid grid-cols-2 gap-3 sm:gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Valor de Aquisição</p>
            <p className="text-sm sm:text-base font-semibold text-card-foreground">{formatCurrency(asset.acquisition_value)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Valor Atual</p>
            <p className="text-sm sm:text-base font-semibold text-primary">{formatCurrency(currentValue)}</p>
          </div>
        </div>

        <div className="mt-2.5 sm:mt-3">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Depreciação</span>
            <span>{depPct.toFixed(1)}%</span>
          </div>
          <Progress value={depPct} className="h-1.5" />
        </div>
      </div>
    </Link>
  );
}