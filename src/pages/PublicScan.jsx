import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { formatCurrency, calculateCurrentValue, getUsefulLifeFromRate } from '@/lib/depreciation';
import { MapPin, Package, CheckCircle, AlertCircle, Loader2, QrCode, Clock } from 'lucide-react';

export default function PublicScan() {
  const urlParams = new URLSearchParams(window.location.search);
  const assetId = urlParams.get('id');
  const workspaceId = urlParams.get('wid');
  const [asset, setAsset] = useState(null);
  const [loading, setLoading] = useState(true);
  const [locStatus, setLocStatus] = useState('idle');
  const [address, setAddress] = useState('');
  const [scanTime, setScanTime] = useState('');

  useEffect(() => {
    setScanTime(new Date().toLocaleString('pt-BR', { dateStyle: 'full', timeStyle: 'medium' }));
    if (!assetId) { setLoading(false); return; }
    base44.entities.Asset.filter({ id: assetId })
      .then(data => {
        if (data && data.length > 0) setAsset(data[0]);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [assetId]);

  // Auto-registra localização assim que o ativo é carregado
  useEffect(() => {
    if (asset && locStatus === 'idle') {
      registerLocation();
    }
  }, [asset]);

  const registerLocation = () => {
    if (!navigator.geolocation) {
      setLocStatus('denied');
      return;
    }
    setLocStatus('loading');

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const now = new Date();

        let addr = '';
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=pt-BR`
          );
          const json = await res.json();
          addr = json.display_name || '';
          setAddress(addr);
        } catch {}

        const deviceInfo = navigator.userAgent.substring(0, 200);
        const wsId = asset?.workspace_id || workspaceId || '';

        await base44.entities.LocationHistory.create({
          workspace_id: wsId,
          asset_id: assetId,
          asset_name: asset?.name || '',
          latitude: lat,
          longitude: lng,
          address: addr,
          source: 'QR Scan',
          scanned_by: 'Anônimo',
          scanned_at: now.toISOString(),
          device_info: deviceInfo,
        });

        setLocStatus('success');
      },
      () => setLocStatus('denied'),
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const usefulLife = asset ? (asset.useful_life_years || getUsefulLifeFromRate(asset.depreciation_rate)) : 0;
  const currentValue = asset ? calculateCurrentValue(
    asset.purchase_date, asset.acquisition_value, asset.residual_value || 0, usefulLife
  ) : 0;

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-blue-900 flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin" />
    </div>
  );

  if (!assetId || !asset) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-blue-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 text-center max-w-sm w-full shadow-2xl">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-800">Ativo não encontrado</h2>
        <p className="text-slate-500 mt-2 text-sm">O QR Code escaneado não corresponde a nenhum ativo cadastrado.</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-blue-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 to-blue-500 p-6 text-white">
          <div className="flex items-center gap-2 mb-4">
            <QrCode className="h-4 w-4 opacity-70" />
            <span className="text-xs opacity-70 font-medium uppercase tracking-wider">Patrimônio Escaneado</span>
          </div>
          <div className="flex items-center gap-4">
            {asset.photo_url
              ? <img src={asset.photo_url} alt="" className="h-16 w-16 rounded-xl object-cover border-2 border-white/40 flex-shrink-0" />
              : <div className="h-16 w-16 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                  <Package className="h-8 w-8" />
                </div>
            }
            <div>
              <h1 className="text-xl font-bold leading-tight">{asset.name}</h1>
              <p className="text-blue-200 text-sm mt-0.5">{asset.category}</p>
              {asset.status && (
                <span className="inline-block mt-1 px-2 py-0.5 bg-white/20 rounded-full text-xs font-medium">{asset.status}</span>
              )}
            </div>
          </div>
        </div>

        {/* Scan time banner */}
        <div className="bg-slate-50 border-b border-slate-100 px-5 py-2.5 flex items-center gap-2">
          <Clock className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
          <span className="text-xs text-slate-500">{scanTime}</span>
        </div>

        {/* Asset Info */}
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 rounded-xl p-3 text-center">
              <p className="text-xs text-slate-500 mb-1">Valor Contábil</p>
              <p className="text-base font-bold text-blue-700">{formatCurrency(currentValue)}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 text-center">
              <p className="text-xs text-slate-500 mb-1">Categoria</p>
              <p className="text-sm font-semibold text-slate-700">{asset.category}</p>
            </div>
          </div>

          {asset.location && (
            <div className="flex items-start gap-2 text-sm text-slate-600 bg-slate-50 rounded-xl p-3">
              <MapPin className="h-4 w-4 mt-0.5 text-slate-400 flex-shrink-0" />
              <span>{asset.location}</span>
            </div>
          )}

          {asset.serial_number && (
            <div className="flex items-start gap-2 text-sm text-slate-600 bg-slate-50 rounded-xl p-3">
              <span className="text-slate-400 font-mono text-xs">S/N</span>
              <span>{asset.serial_number}</span>
            </div>
          )}
        </div>

        {/* Location Registration */}
        <div className="px-5 pb-6">
          <div className="h-px bg-slate-100 mb-4" />

          {locStatus === 'idle' && (
            <div className="flex flex-col items-center justify-center gap-3 py-4 text-slate-600">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <p className="font-medium text-sm">Registrando localização...</p>
            </div>
          )}

          {locStatus === 'loading' && (
            <div className="flex flex-col items-center justify-center gap-3 py-4 text-slate-600">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <div className="text-center">
                <p className="font-medium text-sm">Obtendo localização...</p>
                <p className="text-xs text-slate-400 mt-1">Permita o acesso à localização quando solicitado</p>
              </div>
            </div>
          )}

          {locStatus === 'success' && (
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-center space-y-1">
              <CheckCircle className="h-9 w-9 text-emerald-500 mx-auto mb-2" />
              <p className="font-bold text-emerald-700">Presença registrada!</p>
              <p className="text-xs text-emerald-600">{scanTime}</p>
              {address && (
                <p className="text-xs text-emerald-500 mt-2 line-clamp-3">{address}</p>
              )}
            </div>
          )}

          {locStatus === 'denied' && (
            <div className="space-y-3">
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-center">
                <AlertCircle className="h-7 w-7 text-amber-500 mx-auto mb-2" />
                <p className="font-medium text-amber-700 text-sm">Permissão de localização negada</p>
                <p className="text-xs text-amber-600 mt-1">Libere o acesso à localização nas configurações do navegador e tente novamente.</p>
              </div>
              <button
                onClick={() => setLocStatus('idle')}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2.5 rounded-xl text-sm transition-colors"
              >
                Tentar novamente
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}