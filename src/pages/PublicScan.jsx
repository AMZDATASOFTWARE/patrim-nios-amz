import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { formatCurrency, calculateCurrentValue, getUsefulLifeFromRate } from '@/lib/depreciation';
import { MapPin, Package, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PublicScan() {
  const urlParams = new URLSearchParams(window.location.search);
  const assetId = urlParams.get('id');
  const [asset, setAsset] = useState(null);
  const [loading, setLoading] = useState(true);
  const [locStatus, setLocStatus] = useState('idle'); // idle | loading | success | denied | error
  const [position, setPosition] = useState(null);
  const [address, setAddress] = useState('');
  const [scannedBy, setScannedBy] = useState('');

  useEffect(() => {
    if (!assetId) { setLoading(false); return; }
    base44.entities.Asset.filter({ id: assetId }).then(data => {
      if (data.length > 0) setAsset(data[0]);
      setLoading(false);
    });
  }, [assetId]);

  const registerLocation = async () => {
    if (!navigator.geolocation) { setLocStatus('error'); return; }
    setLocStatus('loading');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setPosition({ lat, lng });

        // Reverse geocode using Nominatim (free, no key)
        let addr = '';
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
          const json = await res.json();
          addr = json.display_name || '';
          setAddress(addr);
        } catch {}

        // Save to LocationHistory
        await base44.entities.LocationHistory.create({
          asset_id: assetId,
          asset_name: asset?.name || '',
          latitude: lat,
          longitude: lng,
          address: addr,
          source: 'QR Scan',
          scanned_by: scannedBy || 'Anônimo',
        });

        setLocStatus('success');
      },
      () => setLocStatus('denied'),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const usefulLife = asset ? (asset.useful_life_years || getUsefulLifeFromRate(asset.depreciation_rate)) : 0;
  const currentValue = asset ? calculateCurrentValue(asset.purchase_date, asset.acquisition_value, asset.residual_value || 0, usefulLife) : 0;

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );

  if (!asset) return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl border border-border p-8 text-center max-w-sm w-full shadow-lg">
        <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
        <h2 className="text-xl font-bold">Ativo não encontrado</h2>
        <p className="text-muted-foreground mt-2">O QR Code escaneado não corresponde a nenhum ativo cadastrado.</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-blue-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 to-blue-500 p-6 text-white">
          <div className="flex items-center gap-3 mb-2">
            {asset.photo_url
              ? <img src={asset.photo_url} alt="" className="h-14 w-14 rounded-xl object-cover border-2 border-white/50" />
              : <div className="h-14 w-14 rounded-xl bg-white/20 flex items-center justify-center"><Package className="h-7 w-7" /></div>
            }
            <div>
              <h1 className="text-lg font-bold leading-tight">{asset.name}</h1>
              <p className="text-blue-200 text-sm">{asset.category}</p>
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 rounded-xl p-3 text-center">
              <p className="text-xs text-slate-500">Status</p>
              <p className="text-sm font-semibold mt-1">{asset.status || 'Ativo'}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 text-center">
              <p className="text-xs text-slate-500">Valor Contábil</p>
              <p className="text-sm font-semibold text-blue-700 mt-1">{formatCurrency(currentValue)}</p>
            </div>
          </div>

          {asset.location && (
            <div className="flex items-start gap-2 text-sm text-slate-600">
              <MapPin className="h-4 w-4 mt-0.5 text-slate-400 flex-shrink-0" />
              <span>{asset.location}</span>
            </div>
          )}

          {asset.description && (
            <p className="text-sm text-slate-600 leading-relaxed">{asset.description}</p>
          )}
        </div>

        {/* Location registration */}
        <div className="px-5 pb-6 space-y-3">
          <div className="h-px bg-slate-100" />
          <p className="text-xs text-slate-500 text-center">Ajude a manter o controle registrando sua localização ao escanear</p>

          {locStatus === 'idle' && (
            <>
              <input
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Seu nome (opcional)"
                value={scannedBy}
                onChange={e => setScannedBy(e.target.value)}
              />
              <button
                onClick={registerLocation}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
              >
                <MapPin className="h-4 w-4" /> Registrar minha localização
              </button>
            </>
          )}

          {locStatus === 'loading' && (
            <div className="flex items-center justify-center gap-2 py-3 text-slate-600">
              <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
              <span className="text-sm">Obtendo localização...</span>
            </div>
          )}

          {locStatus === 'success' && (
            <div className="bg-emerald-50 rounded-xl p-4 text-center">
              <CheckCircle className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
              <p className="font-semibold text-emerald-700">Localização registrada!</p>
              {address && <p className="text-xs text-emerald-600 mt-1">{address.slice(0, 80)}...</p>}
            </div>
          )}

          {locStatus === 'denied' && (
            <div className="bg-amber-50 rounded-xl p-4 text-center">
              <AlertCircle className="h-7 w-7 text-amber-500 mx-auto mb-2" />
              <p className="text-sm text-amber-700">Permissão de localização negada. Libere nas configurações do seu navegador.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}