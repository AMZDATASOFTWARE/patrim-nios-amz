import { useState, useEffect } from 'react';
import { useWorkspace } from '@/lib/WorkspaceContext';
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

const makeNumberedIcon = (num, isLatest) => L.divIcon({
  html: isLatest
    ? `<div style="background:#2563eb;color:white;width:32px;height:32px;border-radius:50%;border:3px solid white;box-shadow:0 3px 10px rgba(37,99,235,0.5);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;font-family:sans-serif">${num}</div>`
    : `<div style="background:#64748b;color:white;width:22px;height:22px;border-radius:50%;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;font-family:sans-serif">${num}</div>`,
  iconSize: isLatest ? [32, 32] : [22, 22],
  iconAnchor: isLatest ? [16, 16] : [11, 11],
  className: '',
});

export default function LocationHistoryMini({ assetId }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const { workspaceId } = useWorkspace();

  useEffect(() => {
    if (!workspaceId || !assetId) return;
    setLoading(true);
    base44.entities.LocationHistory
      .filter({ asset_id: assetId, workspace_id: workspaceId }, '-created_date', 20)
      .then(d => {
        setHistory((d || []).filter(l => l.latitude != null && l.longitude != null));
        setLoading(false);
      });
  }, [assetId, workspaceId]);

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

  const sorted = [...history].sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
  const center = [history[0].latitude, history[0].longitude];
  const polyPoints = sorted.map(l => [l.latitude, l.longitude]);
  // For the list, show newest first with descending numbers
  const total = sorted.length;

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
      <div style={{ height: 240 }}>
        <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }} zoomControl={false} scrollWheelZoom={false}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {polyPoints.length > 1 && <Polyline positions={polyPoints} color="#3b82f6" weight={2} opacity={0.5} dashArray="5,5" />}
          {sorted.map((loc, i) => {
            const num = i + 1;
            const isLatest = i === sorted.length - 1;
            return (
              <Marker key={i} position={[loc.latitude, loc.longitude]} icon={makeNumberedIcon(num, isLatest)}>
                <Popup>
                  <p className="text-xs font-semibold">{isLatest ? '📍 Último local visto' : `Visita #${num}`}</p>
                  <p className="text-xs text-gray-500">{moment(loc.created_date).format('DD/MM/YYYY HH:mm')}</p>
                  {loc.address && <p className="text-xs mt-1">{loc.address}</p>}
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      {/* History list — newest first */}
      <div className="p-4 space-y-1">
        <p className="text-sm font-medium text-muted-foreground mb-3">Histórico de localizações</p>

        {/* Latest location — highlighted */}
        {(() => { const loc = history[0]; const num = total; return (
          <div key={loc.id} className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 border border-blue-200">
            <div className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold">{num}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-blue-800 truncate">{loc.address || `${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)}`}</p>
                <span className="text-xs bg-blue-600 text-white px-1.5 py-0.5 rounded-full whitespace-nowrap">Último local</span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <Clock className="h-3 w-3 text-blue-500" />
                <span className="text-xs text-blue-600">{moment(loc.created_date).fromNow()}</span>
                <span className="text-xs text-blue-500">• {loc.source}</span>
                {loc.scanned_by && <span className="text-xs text-blue-500">• {loc.scanned_by}</span>}
              </div>
            </div>
          </div>
        ); })()}

        {/* Older locations */}
        {(showAll ? history.slice(1) : history.slice(1, 4)).map((loc, i) => {
          const num = total - 1 - i;
          return (
            <div key={loc.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors">
              <div className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-slate-200 text-slate-600 text-xs font-bold">{num}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-card-foreground truncate">{loc.address || `${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)}`}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{moment(loc.created_date).format('DD/MM/YYYY HH:mm')}</span>
                  <span className="text-xs text-muted-foreground">• {loc.source}</span>
                  {loc.scanned_by && <span className="text-xs text-muted-foreground">• {loc.scanned_by}</span>}
                </div>
              </div>
            </div>
          );
        })}

        {history.length > 4 && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="w-full flex items-center justify-center gap-1 text-sm text-muted-foreground hover:text-foreground pt-1 transition-colors"
          >
            {showAll ? <><ChevronUp className="h-4 w-4" /> Ocultar histórico</> : <><ChevronDown className="h-4 w-4" /> Ver {history.length - 4} posição(ões) anteriores</>}
          </button>
        )}
      </div>
    </div>
  );
}