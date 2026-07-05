import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { MapPin, Package, AlertCircle, QrCode, Clock } from 'lucide-react';

export default function PublicScan() {
  const urlParams = new URLSearchParams(window.location.search);
  const assetId = urlParams.get('id');

  const [asset, setAsset] = useState(null);
  const [loading, setLoading] = useState(true);
  const [locStatus, setLocStatus] = useState('idle'); // idle | loading | success | denied | error
  const [address, setAddress] = useState('');
  const [scanTime] = useState(() =>
    new Date().toLocaleString('pt-BR', { dateStyle: 'full', timeStyle: 'medium' })
  );
  const registeredRef = useRef(false);

  // Carrega o ativo — via função pública (não exige login, não expõe o registro completo)
  useEffect(() => {
    if (!assetId) { setLoading(false); return; }

    base44.functions.invoke('getPublicAssetInfo', { assetId })
      .then(res => {
        if (res?.data?.ok) setAsset(res.data.asset);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [assetId]);

  // Registra localização assim que o ativo carregar (apenas uma vez)
  useEffect(() => {
    if (!loading && assetId && !registeredRef.current) {
      registeredRef.current = true;
      registerLocation();
    }
  }, [loading, assetId]);

  const sendScan = async ({ latitude, longitude, address: addr } = {}) => {
    const deviceInfo = navigator.userAgent.substring(0, 200);
    try {
      await base44.functions.invoke('registerPublicScan', {
        assetId,
        ...(latitude !== undefined && longitude !== undefined ? { latitude, longitude } : {}),
        address: addr || '',
        deviceInfo,
      });
      return true;
    } catch {
      return false;
    }
  };

  const registerLocation = () => {
    // Sem geolocalização disponível: ainda registra o scan (o IP é capturado no servidor).
    if (!navigator.geolocation) {
      setLocStatus('loading');
      sendScan().then((ok) => setLocStatus(ok ? 'success' : 'error'));
      return;
    }
    setLocStatus('loading');

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        // Geocodificação reversa (melhor esforço)
        let addr = '';
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=pt-BR`,
            { headers: { 'Accept-Language': 'pt-BR' } }
          );
          const json = await res.json();
          addr = json.display_name || '';
          setAddress(addr);
        } catch {}

        const ok = await sendScan({ latitude: lat, longitude: lng, address: addr });
        setLocStatus(ok ? 'success' : 'error');
      },
      async () => {
        // Permissão de localização negada: registra o scan mesmo assim, só com IP.
        const ok = await sendScan();
        setLocStatus(ok ? 'success' : 'denied');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  // Loading
  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-blue-900 flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin" />
    </div>
  );

  // Ativo não encontrado
  if (!assetId || !asset) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-blue-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 text-center max-w-sm w-full shadow-2xl">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-800">Ativo não encontrado</h2>
        <p className="text-slate-500 mt-2 text-sm">
          O QR Code escaneado não corresponde a nenhum ativo cadastrado.
        </p>
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

        {/* Scan time */}
        <div className="bg-slate-50 border-b border-slate-100 px-5 py-2.5 flex items-center gap-2">
          <Clock className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
          <span className="text-xs text-slate-500">{scanTime}</span>
        </div>

        {/* Asset Info */}
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 rounded-xl p-3 text-center">
              <p className="text-xs text-slate-500 mb-1">Categoria</p>
              <p className="text-sm font-semibold text-slate-700">{asset.category}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 text-center">
              <p className="text-xs text-slate-500 mb-1">Patrimônio</p>
              <p className="text-sm font-semibold text-slate-700">{asset.plaqueta || '—'}</p>
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

          <p className="text-[11px] text-slate-400 leading-relaxed pt-1">
            Ao permitir o acesso à localização, você ajuda a registrar por onde este patrimônio
            passou. Para fins de segurança, o horário e o endereço de rede (IP) do acesso também
            são registrados.
          </p>
        </div>

        <div className="pb-6" />
      </div>
    </div>
  );
}