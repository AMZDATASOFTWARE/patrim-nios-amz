import { useState, useEffect } from 'react';
import { useWorkspaceEntity } from '@/lib/useWorkspaceData';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { QrCode, Download, Printer, Package, Search } from 'lucide-react';
import { formatCurrency, calculateCurrentValue, getUsefulLifeFromRate } from '@/lib/depreciation';
import AssetStatusBadge from '@/components/assets/AssetStatusBadge';

function LabelCard({ asset, appUrl }) {
  const scanUrl = `${appUrl}/scan?id=${asset.id}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(scanUrl)}&bgcolor=ffffff&color=1e293b&margin=4`;
  const usefulLife = asset.useful_life_years || getUsefulLifeFromRate(asset.depreciation_rate);
  const currentValue = calculateCurrentValue(asset.purchase_date, asset.acquisition_value, asset.residual_value || 0, usefulLife);

  const handlePrint = () => {
    const w = window.open('', '_blank');
    w.document.write(`<!DOCTYPE html><html><head><title>Etiqueta - ${asset.name}</title><style>
      body{font-family:sans-serif;margin:0;display:flex;justify-content:center;padding:20px}
      .label{border:2px solid #1e293b;border-radius:8px;padding:16px;width:300px;display:flex;gap:12px;align-items:flex-start}
      .info{flex:1} .name{font-size:13px;font-weight:700;color:#1e293b;margin-bottom:4px}
      .cat{font-size:10px;color:#64748b;margin-bottom:6px} .row{font-size:10px;color:#475569;margin-bottom:2px}
      .id{font-size:8px;color:#94a3b8;margin-top:8px;font-family:monospace}
      img{width:96px;height:96px;flex-shrink:0;border:1px solid #e2e8f0;border-radius:8px}
      @media print { body { margin: 0; padding: 10px; } }
    </style></head><body>
      <div class="label">
        <img src="${qrUrl}" crossorigin="anonymous" />
        <div class="info">
          <div class="name">${asset.name}</div>
          <div class="cat">${asset.category}</div>
          ${asset.location ? `<div class="row">📍 ${asset.location}</div>` : ''}
          <div class="row">💰 ${formatCurrency(currentValue)}</div>
          ${asset.status ? `<div class="row">${asset.status === 'Ativo' ? '🟢' : '🟡'} ${asset.status}</div>` : ''}
          <div class="id">${asset.id?.slice(0, 16)}...</div>
        </div>
      </div>
      <script>window.onload = function() { setTimeout(function(){ window.print(); }, 500); };<\/script>
    </body></html>`);
    w.document.close();
  };

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
      {/* Preview */}
      <div id={`label-${asset.id}`} className="p-4 border-b border-border">
        <div className="flex gap-3 items-start">
          <img src={qrUrl} alt="QR Code" className="w-24 h-24 rounded-lg border border-border flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-bold text-card-foreground text-sm leading-tight truncate">{asset.name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{asset.category}</p>
            <div className="mt-2 space-y-1">
              {asset.location && <p className="text-xs text-muted-foreground truncate">📍 {asset.location}</p>}
              <p className="text-xs text-muted-foreground">💰 {formatCurrency(currentValue)}</p>
              {asset.status && <p className="text-xs text-muted-foreground">{asset.status === 'Ativo' ? '🟢' : '🟡'} {asset.status}</p>}
            </div>
            <p className="text-xs text-muted-foreground/50 mt-2 font-mono truncate">{asset.id?.slice(0, 16)}...</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="p-3 flex items-center justify-between gap-2">
        <div className="text-xs text-muted-foreground truncate flex-1">{asset.name}</div>
        <div className="flex gap-2">
          <a
            href={qrUrl}
            download={`qr-${asset.name}.png`}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-muted hover:bg-muted/80 transition-colors"
          >
            <Download className="h-3 w-3" /> QR
          </a>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Printer className="h-3 w-3" /> Imprimir
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AssetLabel() {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Todas');
  const appUrl = window.location.origin;

  const AssetEntity = useWorkspaceEntity('Asset');

  useEffect(() => {
    AssetEntity.list('-created_date', 200).then(d => { setAssets(d); setLoading(false); });
  }, []);

  const filtered = assets.filter(a => {
    const matchSearch = !search || a.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === 'Todas' || a.category === categoryFilter;
    return matchSearch && matchCat;
  });

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Etiquetas & QR Codes</h1>
        <p className="text-muted-foreground mt-1">Gere e imprima etiquetas com QR Code para seus ativos. O scan registra a localização em tempo real.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar ativo..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            {['Todas','Imóveis','Veículos','Equipamentos','Investimentos','Intangíveis'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map(asset => (
          <LabelCard key={asset.id} asset={asset} appUrl={appUrl} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <QrCode className="h-10 w-10 mx-auto mb-2 opacity-50" />
          <p>Nenhum ativo encontrado</p>
        </div>
      )}
    </div>
  );
}