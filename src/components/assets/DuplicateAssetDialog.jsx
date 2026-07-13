import { useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { logAudit } from '@/lib/audit';

// Mesmo critério de campos de identificação única do cadastro em lote em
// AssetForm.jsx — não fazem sentido replicados; plaqueta pode ganhar
// numeração sequencial via prefixo, resolvida no backend (createAsset).
const UNIQUE_FIELDS = [
  'plaqueta', 'serial_number', 'rfid_tag_id', 'vehicle_plate', 'vehicle_renavam',
  'vehicle_chassis', 'property_registration_number', 'property_iptu_number',
  'fiscal_document', 'photo_url', 'invoice_url',
];

// Metadados de instância do ativo original — nunca copiados para as cópias.
const OMIT_FIELDS = ['id', 'created_date', 'updated_date', 'workspace_id', 'public_scan_token'];

function buildClones(asset, qty) {
  const base = { ...asset };
  [...OMIT_FIELDS, ...UNIQUE_FIELDS].forEach((f) => { delete base[f]; });
  if (qty <= 1) return [{ ...base, name: asset.name }];
  return Array.from({ length: qty }, (_, idx) => ({
    ...base,
    name: `${asset.name} (${idx + 1}/${qty})`,
  }));
}

export default function DuplicateAssetDialog({ asset, onDuplicated }) {
  const [open, setOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [plaquetaPrefix, setPlaquetaPrefix] = useState('');
  const [saving, setSaving] = useState(false);

  const handleConfirm = async () => {
    const qty = Math.min(50, Math.max(1, parseInt(quantity, 10) || 1));
    setSaving(true);
    try {
      const assets = buildClones(asset, qty);
      const prefix = plaquetaPrefix.trim();
      const res = await base44.functions.invoke('createAsset', {
        assets,
        ...(prefix ? { plaqueta_prefix: prefix } : {}),
      });
      if (!res?.data?.ok || !res.data.created) {
        throw new Error(res?.data?.error || 'Não foi possível duplicar o ativo.');
      }
      await logAudit({
        action: 'created', entity_type: 'Asset', entity_id: res.data.ids?.[0] || '',
        entity_label: asset.name,
        summary: `Duplicou o ativo "${asset.name}" em ${res.data.created} cópia(s)`,
        new_data: { source_asset_id: asset.id, quantity: qty },
      });
      if (res.data.limit_reached || res.data.failed > 0) {
        toast.warning(`${res.data.created} de ${qty} cópias criadas — limite do plano atingido ou item inválido.`);
      } else {
        toast.success(`${res.data.created} cópia(s) de "${asset.name}" criada(s).`);
      }
      setOpen(false);
      setQuantity(1);
      setPlaquetaPrefix('');
      onDuplicated?.(res.data.ids);
    } catch (err) {
      toast.error(err?.message || 'Não foi possível duplicar o ativo.');
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Copy className="h-4 w-4" /> Duplicar
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Duplicar Ativo</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            As cópias herdam categoria, filial, setor, valor e demais características de &quot;{asset.name}&quot;. Número de série, placa, matrícula e anexos ficam em branco para preenchimento manual.
          </p>
          <div>
            <Label htmlFor="dup_quantity">Quantas cópias deseja criar?</Label>
            <Input id="dup_quantity" type="number" min={1} max={50} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="dup_prefix">Prefixo da Plaqueta (opcional)</Label>
            <Input id="dup_prefix" value={plaquetaPrefix} onChange={(e) => setPlaquetaPrefix(e.target.value)} placeholder="Ex: NB" />
            <p className="text-xs text-muted-foreground mt-1">
              Cada cópia receberá {plaquetaPrefix.trim() || 'PREFIXO'}-001, -002... Deixe em branco para preencher manualmente depois.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={saving} className="gap-2">
            {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Copy className="h-4 w-4" />}
            Duplicar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
