import { Link } from 'react-router-dom';
import { Package } from 'lucide-react';
import { formatCurrency, calculateCurrentValue, getUsefulLifeFromRate } from '@/lib/depreciation';
import AssetStatusBadge from './AssetStatusBadge';

// Linha minimalista da visualização em lista da tela Ativos.
export default function AssetListItem({ asset }) {
  const usefulLife = asset.useful_life_years || getUsefulLifeFromRate(asset.depreciation_rate);
  const currentValue = calculateCurrentValue(
    asset.purchase_date, asset.acquisition_value, asset.residual_value || 0, usefulLife
  );

  return (
    <Link
      to={`/AssetDetail?id=${asset.id}`}
      className="flex items-center gap-3 px-3 sm:px-4 py-2.5 bg-card border border-border rounded-lg hover:border-primary/40 hover:shadow-sm transition-all"
    >
      {asset.photo_url ? (
        <img src={asset.photo_url} alt={asset.name} className="h-9 w-9 rounded-md object-cover flex-shrink-0" />
      ) : (
        <div className="h-9 w-9 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
          <Package className="h-4 w-4 text-muted-foreground" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-card-foreground truncate">{asset.name}</p>
        <p className="text-xs text-muted-foreground truncate">
          {asset.plaqueta ? `${asset.plaqueta} · ` : ''}{asset.category}
        </p>
      </div>
      <p className="hidden sm:block text-sm font-semibold text-primary flex-shrink-0">
        {formatCurrency(currentValue)}
      </p>
      <AssetStatusBadge status={asset.status} />
    </Link>
  );
}