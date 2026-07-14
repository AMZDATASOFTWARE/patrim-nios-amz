import { CheckSquare, Square, Download, Printer } from 'lucide-react';

// Linha minimalista da visualização em lista da tela Etiquetas/QR.
// Mantém seleção para impressão em massa + ações rápidas (baixar QR / imprimir).
export default function LabelListItem({ asset, appUrl, selected, onToggle, onPrint }) {
  const scanUrl = `${appUrl}/scan?token=${asset.public_scan_token}`;
  const patrimonioNum = asset.plaqueta || asset.id?.slice(-8).toUpperCase();
  const qrDownloadUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(scanUrl)}&bgcolor=ffffff&color=1e3a5f&margin=8`;

  return (
    <div
      onClick={onToggle}
      className={`flex items-center gap-3 px-3 sm:px-4 py-2.5 bg-card border rounded-lg cursor-pointer transition-all ${
        selected ? 'border-primary ring-1 ring-primary' : 'border-border hover:border-primary/40'
      }`}
    >
      {selected
        ? <CheckSquare className="h-4 w-4 text-primary flex-shrink-0" />
        : <Square className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      }
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-card-foreground truncate">{asset.name}</p>
        <p className="text-xs text-muted-foreground truncate">
          Nº {patrimonioNum} · {asset.category}{asset.sectorLabel ? ` · ${asset.sectorLabel}` : ''}
        </p>
      </div>
      <div className="flex gap-1.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
        <a
          href={qrDownloadUrl}
          download={`qr-${asset.plaqueta || asset.id}.png`}
          title="Baixar QR Code"
          className="flex items-center justify-center h-8 w-8 rounded-md bg-muted hover:bg-muted/80 transition-colors"
        >
          <Download className="h-3.5 w-3.5" />
        </a>
        <button
          onClick={onPrint}
          title="Imprimir etiqueta"
          className="flex items-center justify-center h-8 w-8 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Printer className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}