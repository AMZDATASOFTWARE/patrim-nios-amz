import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { MapPin, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import moment from 'moment';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const latestIcon = L.divIcon({
  html: `<div style="background:#3b82f6;width:20px;height:20px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>`,
  iconSize: [20, 20], iconAnchor: [10, 10], className: '',
});

const oldIcon = L.divIcon({
  html: `<div style="background:#94a3b8;width:12px;height:12px;border-radius:50%;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.2)"></div>`,
  iconSize: [12, 12], iconAnchor: [6, 6], className: '',
});

export default function LocationHistoryMini({ assetId }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    base44.entities.LocationHistory.filter({ asset_id: assetId }, '-created_date', 20).then(d => {
      setHistory(d);
      setLoading(false);
    });
  }, [assetId]);

  if (loading) return null;
  if (history.length === 0) return (
    <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-card-foreground mb-2">Localização</h2>
      <div className="text-center py-6 text-muted-foreground">
        <MapPin className="h-8 w-8 mx-auto mb-2 opacity-40" />
        <p className="text-sm">Nenhuma localização registrada</p>
        <p className="text-xs mt-1">Escaneie o QR Code para registrar</p>
      </div>
    </div>
  );

  const latest3 = history.slice(0, 3);
  const sorted = [...history].sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
  const center = [history[0].latitude, history[0].longitude];
  const polyPoints = sorted.map(l => [l.latitude, l.longitude]);

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
      <div className="p-5 pb-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-card-foreground">Localização</h2>
          <Link to={`/AssetMap`} className="text-sm text-primary hover:underline flex items-center gap-1">
            Ver no mapa completo →
          </Link>
        </div>
      </div>

      {/* Mini map */}
      <div style={{ height: 200 }}>
        <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }} zoomControl={false} scrollWheelZoom={false}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {polyPoints.length > 1 && <Polyline positions={polyPoints} color="#94a3b8" weight={2} dashArray="4,4" />}
          {sorted.slice(0, -1).map((loc, i) => (
            <Marker key={i} position={[loc.latitude, loc.longitude]} icon={oldIcon}>
              <Popup><p className="text-xs">{moment(loc.created_date).format('DD/MM HH:mm')}</p></Popup>
            </Marker>
          ))}
          <Marker position={[history[0].latitude, history[0].longitude]} icon={latestIcon}>
            <Popup><p className="text-xs font-medium">Posição atual</p></Popup>
          </Marker>
        </MapContainer>
      </div>

      {/* Last 3 positions */}
      <div className="p-4 space-y-2">
        <p className="text-sm font-medium text-muted-foreground mb-2">Últimas posições</p>
        {latest3.map((loc, i) => (
          <div
            key={loc.id}
            className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors cursor-default"
          >
            <div className={`flex-shrink-0 mt-1 h-2.5 w-2.5 rounded-full ${i === 0 ? 'bg-blue-500' : 'bg-slate-300'}`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-card-foreground truncate">{loc.address || `${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)}`}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <Clock className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{moment(loc.created_date).fromNow()}</span>
                <span className="text-xs text-muted-foreground">• {loc.source}</span>
                {loc.scanned_by && <span className="text-xs text-muted-foreground">• {loc.scanned_by}</span>}
              </div>
            </div>
          </div>
        ))}

        {history.length > 3 && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="w-full flex items-center justify-center gap-1 text-sm text-muted-foreground hover:text-foreground pt-1 transition-colors"
          >
            {showAll ? <><ChevronUp className="h-4 w-4" /> Ocultar histórico</> : <><ChevronDown className="h-4 w-4" /> Ver {history.length - 3} posição(ões) anteriores</>}
          </button>
        )}

        {showAll && history.slice(3).map((loc, i) => (
          <div key={loc.id} className="flex items-start gap-3 p-2 rounded-lg">
            <div className="flex-shrink-0 mt-1 h-2 w-2 rounded-full bg-slate-200" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground truncate">{loc.address || `${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)}`}</p>
              <p className="text-xs text-muted-foreground/60">{moment(loc.created_date).format('DD/MM/YYYY HH:mm')} • {loc.source}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}