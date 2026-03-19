import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Link } from 'react-router-dom';
import { formatCurrency, calculateCurrentValue, getUsefulLifeFromRate } from '@/lib/depreciation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { MapPin, History } from 'lucide-react';

// Fix leaflet default icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const createColoredIcon = (color = '#3b82f6') => L.divIcon({
  html: `<div style="background:${color};width:28px;height:28px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  popupAnchor: [0, -28],
  className: '',
});

const historyIcon = L.divIcon({
  html: `<div style="background:#94a3b8;width:14px;height:14px;border-radius:50%;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.3)"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
  className: '',
});

const catColors = {
  'Imóveis': '#3b82f6', 'Veículos': '#f59e0b', 'Equipamentos': '#10b981',
  'Investimentos': '#8b5cf6', 'Intangíveis': '#ec4899',
};

function FitBounds({ positions }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length > 0) {
      try { map.fitBounds(positions, { padding: [50, 50] }); } catch {}
    }
  }, [positions, map]);
  return null;
}

export default function AssetMap() {
  const [assets, setAssets] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAsset, setSelectedAsset] = useState('all');
  const [showHistory, setShowHistory] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.Asset.list('-created_date', 200),
      base44.entities.LocationHistory.list('-created_date', 500),
    ]).then(([a, l]) => { setAssets(a); setLocations(l); setLoading(false); });
  }, []);

  // Build latest position per asset
  const latestByAsset = {};
  locations.forEach(l => {
    if (!latestByAsset[l.asset_id] || new Date(l.created_date) > new Date(latestByAsset[l.asset_id].created_date)) {
      latestByAsset[l.asset_id] = l;
    }
  });

  const filteredLocations = selectedAsset === 'all'
    ? locations
    : locations.filter(l => l.asset_id === selectedAsset);

  const filteredLatest = selectedAsset === 'all'
    ? Object.values(latestByAsset)
    : (latestByAsset[selectedAsset] ? [latestByAsset[selectedAsset]] : []);

  // History per selected asset for polyline
  const historyForSelected = selectedAsset !== 'all'
    ? locations.filter(l => l.asset_id === selectedAsset).sort((a, b) => new Date(a.created_date) - new Date(b.created_date))
    : [];

  const allPositions = filteredLatest.map(l => [l.latitude, l.longitude]);
  const defaultCenter = allPositions.length > 0 ? allPositions[0] : [-15.793889, -47.882778];

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Mapa de Ativos</h1>
          <p className="text-muted-foreground mt-1">{filteredLatest.length} ativo(s) com localização</p>
        </div>
        <div className="flex gap-3">
          <Select value={selectedAsset} onValueChange={setSelectedAsset}>
            <SelectTrigger className="w-56"><SelectValue placeholder="Filtrar ativo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os ativos</SelectItem>
              {assets.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${showHistory ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-muted-foreground border-border'}`}
          >
            <History className="h-4 w-4" /> Histórico
          </button>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm" style={{ height: '60vh', minHeight: 400 }}>
        <MapContainer center={defaultCenter} zoom={5} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {allPositions.length > 0 && <FitBounds positions={allPositions} />}

          {/* History trail */}
          {showHistory && historyForSelected.length > 1 && (
            <Polyline
              positions={historyForSelected.map(l => [l.latitude, l.longitude])}
              color="#94a3b8"
              weight={2}
              dashArray="6,6"
            />
          )}

          {/* History markers */}
          {showHistory && selectedAsset !== 'all' && historyForSelected.slice(0, -1).map((loc, i) => (
            <Marker key={`h-${loc.id}-${i}`} position={[loc.latitude, loc.longitude]} icon={historyIcon}>
              <Popup>
                <div className="text-sm">
                  <p className="font-medium text-gray-700">{loc.asset_name}</p>
                  <p className="text-gray-500">{new Date(loc.created_date).toLocaleString('pt-BR')}</p>
                  {loc.address && <p className="text-gray-500">{loc.address}</p>}
                  <p className="text-xs text-gray-400">via {loc.source}</p>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Current positions */}
          {filteredLatest.map(loc => {
            const asset = assets.find(a => a.id === loc.asset_id);
            const color = catColors[asset?.category] || '#3b82f6';
            const usefulLife = asset ? (asset.useful_life_years || getUsefulLifeFromRate(asset.depreciation_rate)) : 0;
            const currentValue = asset ? calculateCurrentValue(asset.purchase_date, asset.acquisition_value, asset.residual_value || 0, usefulLife) : 0;
            return (
              <Marker key={loc.id} position={[loc.latitude, loc.longitude]} icon={createColoredIcon(color)}>
                <Popup>
                  <div className="min-w-[180px]">
                    <p className="font-semibold text-gray-800">{loc.asset_name || asset?.name}</p>
                    <p className="text-xs text-gray-500 mt-1">{asset?.category}</p>
                    {currentValue > 0 && <p className="text-sm font-medium text-blue-600 mt-1">{formatCurrency(currentValue)}</p>}
                    {loc.address && <p className="text-xs text-gray-500 mt-1">{loc.address}</p>}
                    <p className="text-xs text-gray-400">Atualizado: {new Date(loc.created_date).toLocaleString('pt-BR')}</p>
                    {asset && (
                      <a href={`/AssetDetail?id=${asset.id}`} className="inline-block mt-2 text-xs text-blue-600 hover:underline">Ver detalhes →</a>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {Object.entries(catColors).map(([cat, color]) => (
          <div key={cat} className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="h-3 w-3 rounded-full" style={{ background: color }} />
            {cat}
          </div>
        ))}
      </div>

      {filteredLatest.length === 0 && (
        <div className="bg-card rounded-xl border border-border p-8 text-center text-muted-foreground">
          <MapPin className="h-10 w-10 mx-auto mb-2 opacity-50" />
          <p>Nenhum ativo com localização registrada.</p>
          <p className="text-sm mt-1">Escaneie o QR Code de um ativo para registrar sua posição.</p>
        </div>
      )}
    </div>
  );
}