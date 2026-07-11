import { useState, useEffect } from 'react';
import { useWorkspaceEntity } from '@/lib/useWorkspaceData';
import { useWorkspace } from '@/lib/WorkspaceContext';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { QrCode, Search, Printer, Download, CheckSquare, Square, FileDown } from 'lucide-react';

function LabelCard({ asset, appUrl, workspace, selected, onToggle }) {
  // Uses the opaque public_scan_token (security audit A3), never the asset's own
  // id — an internal id would let anyone script through every asset of every tenant.
  const scanUrl = `${appUrl}/scan?token=${asset.public_scan_token}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(scanUrl)}&bgcolor=ffffff&color=1e3a5f&margin=6`;
  const patrimonioNum = asset.plaqueta || asset.id?.slice(-8).toUpperCase();

  const handlePrint = () => {
    const companyName = workspace?.name || 'Patrimônio';
    const companyDoc = workspace?.cnpj ? `CNPJ: ${workspace.cnpj}` : '';
    const logoHtml = workspace?.logo_url
      ? `<img src="${workspace.logo_url}" style="height:32px;width:32px;object-fit:contain;border-radius:4px;" crossorigin="anonymous" />`
      : `<div style="height:32px;width:32px;background:#1e3a5f;border-radius:4px;display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:14px;">${companyName.charAt(0)}</div>`;

    const w = window.open('', '_blank');
    w.document.write(`<!DOCTYPE html><html><head><title>Etiqueta - ${asset.name}</title>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
      * { margin:0; padding:0; box-sizing:border-box; }
      body { font-family:'Inter',sans-serif; background:#f0f4f8; display:flex; align-items:center; justify-content:center; min-height:100vh; }
      .label { background:white; border-radius:16px; overflow:hidden; width:340px; box-shadow:0 8px 32px rgba(0,0,0,0.15); }
      .header { background:linear-gradient(135deg,#1e3a5f,#2563eb); padding:12px 14px; display:flex; align-items:center; gap:10px; }
      .company-info { flex:1; }
      .company-name { color:white; font-size:11px; font-weight:700; }
      .company-doc { color:rgba(255,255,255,0.7); font-size:9px; }
      .body { display:flex; gap:12px; padding:14px; align-items:flex-start; }
      .qr-wrapper { flex-shrink:0; background:#f8fafc; border-radius:10px; padding:6px; border:2px solid #e2e8f0; }
      .qr-wrapper img { width:100px; height:100px; display:block; }
      .info { flex:1; }
      .asset-name { font-size:13px; font-weight:700; color:#0f172a; line-height:1.3; margin-bottom:6px; }
      .category { display:inline-block; font-size:9px; font-weight:600; text-transform:uppercase; letter-spacing:0.5px; color:#2563eb; background:#eff6ff; padding:2px 7px; border-radius:20px; margin-bottom:8px; }
      .detail { font-size:10px; color:#64748b; margin-bottom:3px; }
      .detail span { color:#0f172a; font-weight:600; }
      .footer { background:#f8fafc; border-top:1px solid #e2e8f0; padding:8px 14px; display:flex; align-items:center; justify-content:space-between; }
      .patrimonio { font-size:10px; font-weight:700; color:#1e3a5f; font-family:monospace; }
      .scan-hint { font-size:8px; color:#94a3b8; text-align:right; }
      @media print { body { background:white; } .label { box-shadow:none; } }
    </style></head><body>
    <div class="label">
      <div class="header">
        ${logoHtml}
        <div class="company-info">
          <div class="company-name">${companyName}</div>
          ${companyDoc ? `<div class="company-doc">${companyDoc}</div>` : ''}
        </div>
      </div>
      <div class="body">
        <div class="qr-wrapper">
          <img src="${qrUrl}" crossorigin="anonymous" />
        </div>
        <div class="info">
          <div class="asset-name">${asset.name}</div>
          <div class="category">${asset.category || 'Patrimônio'}</div>
          ${asset.location ? `<div class="detail">📍 <span>${asset.location}</span></div>` : ''}
          ${asset.serial_number ? `<div class="detail">S/N <span>${asset.serial_number}</span></div>` : ''}
          ${asset.cost_center ? `<div class="detail">Setor <span>${asset.cost_center}</span></div>` : ''}
        </div>
      </div>
      <div class="footer">
        <div class="patrimonio">N° ${patrimonioNum}</div>
        <div class="scan-hint">📱 Escaneie para<br/>ver detalhes</div>
      </div>
    </div>
    <script>window.onload=function(){setTimeout(function(){window.print();},600);}<\/script>
    </body></html>`);
    w.document.close();
  };

  const qrUrlSmall = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(scanUrl)}&bgcolor=ffffff&color=1e3a5f&margin=4`;

  return (
    <div
      className={`bg-card border rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-all cursor-pointer ${selected ? 'border-primary ring-2 ring-primary' : 'border-border'}`}
      onClick={onToggle}
    >
      {/* Selection indicator */}
      <div className="px-3 pt-2 flex items-center gap-2">
        {selected
          ? <CheckSquare className="h-4 w-4 text-primary flex-shrink-0" />
          : <Square className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        }
        <span className="text-xs text-muted-foreground">{selected ? 'Selecionado' : 'Clique para selecionar'}</span>
      </div>

      {/* Label Preview */}
      <div className="p-0">
        <div className="bg-gradient-to-r from-blue-900 to-blue-600 px-4 py-3 flex items-center gap-3">
          {workspace?.logo_url ? (
            <img src={workspace.logo_url} alt="Logo" className="h-8 w-8 object-contain rounded bg-white/10 p-0.5 flex-shrink-0" />
          ) : (
            <div className="h-8 w-8 bg-white/20 rounded flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {(workspace?.name || 'P').charAt(0)}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-white font-bold text-xs truncate">{workspace?.name || 'Patrimônio'}</p>
            {workspace?.cnpj && <p className="text-blue-200 text-[10px] truncate">CNPJ: {workspace.cnpj}</p>}
          </div>
        </div>

        <div className="flex gap-3 p-4 items-start">
          <div className="flex-shrink-0 bg-slate-50 rounded-lg p-1.5 border border-slate-200">
            <img src={qrUrlSmall} alt="QR Code" className="w-[72px] h-[72px] block" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-foreground text-sm leading-tight">{asset.name}</p>
            <span className="inline-block mt-1 text-[10px] font-semibold uppercase tracking-wide text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{asset.category}</span>
            <div className="mt-2 space-y-0.5">
              {asset.location && <p className="text-[11px] text-muted-foreground truncate">📍 {asset.location}</p>}
              {asset.serial_number && <p className="text-[11px] text-muted-foreground">S/N {asset.serial_number}</p>}
              {asset.cost_center && <p className="text-[11px] text-muted-foreground truncate">🏢 {asset.cost_center}</p>}
            </div>
          </div>
        </div>

        <div className="bg-slate-50 border-t border-slate-200 px-4 py-2.5 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-wide font-medium">Patrimônio Nº</p>
            <p className="font-mono font-bold text-blue-900 text-sm">{patrimonioNum}</p>
          </div>
          <div className="text-right">
            <p className="text-[9px] text-slate-400">📱 Escaneie para</p>
            <p className="text-[9px] text-slate-400">ver detalhes</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="px-4 py-3 border-t border-border flex justify-between items-center gap-2" onClick={e => e.stopPropagation()}>
        <p className="text-xs text-muted-foreground truncate flex-1">{asset.name}</p>
        <div className="flex gap-2">
          <a
            href={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(scanUrl)}&bgcolor=ffffff&color=1e3a5f&margin=8`}
            download={`qr-${asset.plaqueta || asset.id}.png`}
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
  const [selected, setSelected] = useState(new Set());
  const [printingBatch, setPrintingBatch] = useState(false);
  const appUrl = window.location.origin;
  const { workspace } = useWorkspace();
  const AssetEntity = useWorkspaceEntity('Asset');

  useEffect(() => {
    AssetEntity.list('-created_date', 200).then(d => { setAssets(d); setLoading(false); });
  }, []);

  const filtered = assets.filter(a => {
    const matchSearch = !search || a.name.toLowerCase().includes(search.toLowerCase()) || (a.plaqueta && a.plaqueta.toLowerCase().includes(search.toLowerCase()));
    const matchCat = categoryFilter === 'Todas' || a.category === categoryFilter;
    return matchSearch && matchCat;
  });

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map(a => a.id)));
    }
  };

  const printBatch = () => {
    const selectedAssets = assets.filter(a => selected.has(a.id));
    if (selectedAssets.length === 0) return;

    setPrintingBatch(true);
    const companyName = workspace?.name || 'Patrimônio';
    const companyDoc = workspace?.cnpj ? `CNPJ: ${workspace.cnpj}` : '';
    const logoHtml = workspace?.logo_url
      ? `<img src="${workspace.logo_url}" style="height:32px;width:32px;object-fit:contain;border-radius:4px;" crossorigin="anonymous" />`
      : `<div style="height:32px;width:32px;background:#1e3a5f;border-radius:4px;display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:14px;">${companyName.charAt(0)}</div>`;

    const labelsHtml = selectedAssets.map(asset => {
      const scanUrl = `${appUrl}/scan?token=${asset.public_scan_token}`;
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(scanUrl)}&bgcolor=ffffff&color=1e3a5f&margin=6`;
      const patrimonioNum = asset.plaqueta || asset.id?.slice(-8).toUpperCase();
      return `
        <div class="label">
          <div class="header">
            ${logoHtml}
            <div class="company-info">
              <div class="company-name">${companyName}</div>
              ${companyDoc ? `<div class="company-doc">${companyDoc}</div>` : ''}
            </div>
          </div>
          <div class="body">
            <div class="qr-wrapper"><img src="${qrUrl}" crossorigin="anonymous" /></div>
            <div class="info">
              <div class="asset-name">${asset.name}</div>
              <div class="category">${asset.category || 'Patrimônio'}</div>
              ${asset.location ? `<div class="detail">📍 <span>${asset.location}</span></div>` : ''}
              ${asset.serial_number ? `<div class="detail">S/N <span>${asset.serial_number}</span></div>` : ''}
              ${asset.cost_center ? `<div class="detail">Setor <span>${asset.cost_center}</span></div>` : ''}
            </div>
          </div>
          <div class="footer">
            <div class="patrimonio">N° ${patrimonioNum}</div>
            <div class="scan-hint">📱 Escaneie para<br/>ver detalhes</div>
          </div>
        </div>`;
    }).join('');

    const w = window.open('', '_blank');
    w.document.write(`<!DOCTYPE html><html><head><title>Etiquetas em Massa</title>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
      * { margin:0; padding:0; box-sizing:border-box; }
      body { font-family:'Inter',sans-serif; background:#f0f4f8; padding:20px; }
      .grid { display:grid; grid-template-columns: repeat(2, 340px); gap:20px; justify-content:center; }
      .label { background:white; border-radius:16px; overflow:hidden; width:340px; box-shadow:0 4px 16px rgba(0,0,0,0.1); page-break-inside:avoid; }
      .header { background:linear-gradient(135deg,#1e3a5f,#2563eb); padding:12px 14px; display:flex; align-items:center; gap:10px; }
      .company-info { flex:1; }
      .company-name { color:white; font-size:11px; font-weight:700; }
      .company-doc { color:rgba(255,255,255,0.7); font-size:9px; }
      .body { display:flex; gap:12px; padding:14px; align-items:flex-start; }
      .qr-wrapper { flex-shrink:0; background:#f8fafc; border-radius:10px; padding:6px; border:2px solid #e2e8f0; }
      .qr-wrapper img { width:100px; height:100px; display:block; }
      .info { flex:1; }
      .asset-name { font-size:13px; font-weight:700; color:#0f172a; line-height:1.3; margin-bottom:6px; }
      .category { display:inline-block; font-size:9px; font-weight:600; text-transform:uppercase; color:#2563eb; background:#eff6ff; padding:2px 7px; border-radius:20px; margin-bottom:8px; }
      .detail { font-size:10px; color:#64748b; margin-bottom:3px; }
      .detail span { color:#0f172a; font-weight:600; }
      .footer { background:#f8fafc; border-top:1px solid #e2e8f0; padding:8px 14px; display:flex; align-items:center; justify-content:space-between; }
      .patrimonio { font-size:10px; font-weight:700; color:#1e3a5f; font-family:monospace; }
      .scan-hint { font-size:8px; color:#94a3b8; text-align:right; }
      @media print { body { background:white; padding:10px; } .label { box-shadow:none; } }
    </style></head><body>
    <div class="grid">${labelsHtml}</div>
    <script>window.onload=function(){setTimeout(function(){window.print();},800);}<\/script>
    </body></html>`);
    w.document.close();
    setPrintingBatch(false);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );

  const allSelected = filtered.length > 0 && selected.size === filtered.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Etiquetas & QR Codes</h1>
          <p className="text-muted-foreground mt-1">Imprima etiquetas com QR Code. O scan registra a localização em tempo real.</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por nome ou plaqueta..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            {['Todas','Imóveis','Veículos','Equipamentos','Investimentos','Intangíveis'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Batch toolbar */}
      <div className="flex items-center justify-between bg-card border border-border rounded-xl px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={toggleAll} className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors">
            {allSelected ? <CheckSquare className="h-4 w-4 text-primary" /> : <Square className="h-4 w-4" />}
            {allSelected ? 'Desmarcar todos' : `Selecionar todos (${filtered.length})`}
          </button>
          {selected.size > 0 && (
            <span className="text-xs bg-primary/10 text-primary font-semibold px-2 py-0.5 rounded-full">
              {selected.size} selecionado(s)
            </span>
          )}
        </div>
        <Button
          onClick={printBatch}
          disabled={selected.size === 0 || printingBatch}
          className="gap-2"
          size="sm"
        >
          <FileDown className="h-4 w-4" />
          Imprimir {selected.size > 0 ? `${selected.size} etiquetas` : 'selecionados'}
        </Button>
      </div>

      {!workspace?.cnpj && !workspace?.logo_url && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800 flex items-center gap-2">
          💡 <span>Adicione a logo e CNPJ da empresa no <a href="/CompanyProfile" className="font-semibold underline">Perfil da Empresa</a> para enriquecer suas etiquetas.</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map(asset => (
          <LabelCard
            key={asset.id}
            asset={asset}
            appUrl={appUrl}
            workspace={workspace}
            selected={selected.has(asset.id)}
            onToggle={() => toggleSelect(asset.id)}
          />
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