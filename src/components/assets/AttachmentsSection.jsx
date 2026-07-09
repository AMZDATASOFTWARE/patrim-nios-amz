import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useWorkspaceEntity } from '@/lib/useWorkspaceData';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, Star, Trash2, FileText, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment';

const TYPE_LABELS = {
  foto: 'Foto',
  nota_fiscal: 'Nota Fiscal',
  laudo: 'Laudo',
  contrato: 'Contrato',
  outro: 'Outro',
};

const MAX_ATTACHMENTS = 20;

export default function AttachmentsSection({ assetId, onPrimaryPhotoChange }) {
  const AttachmentEntity = useWorkspaceEntity('AssetAttachment');
  const AssetEntity = useWorkspaceEntity('Asset');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadType, setUploadType] = useState('foto');

  useEffect(() => {
    load();
  }, [assetId]);

  const load = async () => {
    const data = await AttachmentEntity.filter({ asset_id: assetId }, '-uploaded_at', 100);
    setItems(data);
    setLoading(false);
  };

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    if (items.length + files.length > MAX_ATTACHMENTS) {
      toast.error(`Limite de ${MAX_ATTACHMENTS} anexos por ativo.`);
      e.target.value = '';
      return;
    }
    setUploading(true);
    try {
      for (const file of files) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        const row = await AttachmentEntity.create({
          asset_id: assetId,
          file_url,
          file_name: file.name,
          file_type: uploadType,
          is_primary_photo: false,
          uploaded_at: new Date().toISOString(),
        });
        setItems((prev) => [row, ...prev]);
      }
      toast.success('Anexo(s) enviado(s).');
    } catch (err) {
      toast.error(err?.message || 'Não foi possível enviar o(s) anexo(s).');
    }
    setUploading(false);
    e.target.value = '';
  };

  const handleSetPrimary = async (item) => {
    try {
      // Desmarca a foto principal anterior (se houver) e marca a nova.
      const currentPrimary = items.find((i) => i.is_primary_photo && i.id !== item.id);
      if (currentPrimary) {
        await AttachmentEntity.update(currentPrimary.id, { is_primary_photo: false });
      }
      await AttachmentEntity.update(item.id, { is_primary_photo: true });
      // Dual-write: mantém Asset.photo_url em sincronia para telas que ainda
      // usam o campo legado (etiquetas, listagem, cards do dashboard).
      await AssetEntity.update(assetId, { photo_url: item.file_url });
      setItems((prev) => prev.map((i) => ({ ...i, is_primary_photo: i.id === item.id })));
      onPrimaryPhotoChange?.(item.file_url);
      toast.success('Foto principal atualizada.');
    } catch (err) {
      toast.error(err?.message || 'Não foi possível definir a foto principal.');
    }
  };

  const handleDelete = async (item) => {
    try {
      await AttachmentEntity.del(item.id);
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      if (item.is_primary_photo) onPrimaryPhotoChange?.('');
    } catch (err) {
      toast.error(err?.message || 'Não foi possível remover o anexo.');
    }
  };

  const isImage = (item) => item.file_type === 'foto' || /\.(png|jpe?g|gif|webp)$/i.test(item.file_name || '');

  return (
    <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold text-card-foreground">Anexos e Fotos</h2>
          <p className="text-sm text-muted-foreground">{items.length} arquivo(s) — até {MAX_ATTACHMENTS} por ativo</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={uploadType} onValueChange={setUploadType}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(TYPE_LABELS).map(([k, label]) => (
                <SelectItem key={k} value={k}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <label>
            <Button type="button" size="sm" className="gap-2" disabled={uploading} asChild>
              <span>
                <Upload className="h-4 w-4" />
                {uploading ? 'Enviando...' : 'Enviar'}
              </span>
            </Button>
            <input type="file" multiple accept="image/*,.pdf" className="hidden" onChange={handleUpload} disabled={uploading} />
          </label>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <ImageIcon className="h-10 w-10 mx-auto mb-2 opacity-50" />
          <p>Nenhum anexo enviado</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {items.map((item) => (
            <div key={item.id} className="relative group rounded-lg border border-border overflow-hidden bg-muted/30">
              {isImage(item) ? (
                <img src={item.file_url} alt={item.file_name || 'Anexo'} className="h-28 w-full object-cover" />
              ) : (
                <a href={item.file_url} target="_blank" rel="noopener noreferrer" className="h-28 w-full flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-primary">
                  <FileText className="h-8 w-8" />
                  <span className="text-xs px-2 truncate max-w-full">{item.file_name || 'Arquivo'}</span>
                </a>
              )}
              <div className="p-2 space-y-1">
                <p className="text-xs font-medium text-card-foreground truncate">{TYPE_LABELS[item.file_type] || item.file_type}</p>
                <p className="text-[10px] text-muted-foreground">{item.uploaded_at ? moment(item.uploaded_at).format('DD/MM/YYYY') : ''}</p>
              </div>
              {item.is_primary_photo && (
                <span className="absolute top-1.5 left-1.5 bg-primary text-primary-foreground text-[10px] font-medium px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                  <Star className="h-2.5 w-2.5 fill-current" /> Principal
                </span>
              )}
              <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {isImage(item) && !item.is_primary_photo && (
                  <button
                    type="button"
                    onClick={() => handleSetPrimary(item)}
                    className="h-6 w-6 rounded-full bg-white/90 flex items-center justify-center text-slate-600 hover:text-primary shadow"
                    title="Definir como foto principal"
                  >
                    <Star className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleDelete(item)}
                  className="h-6 w-6 rounded-full bg-white/90 flex items-center justify-center text-slate-600 hover:text-destructive shadow"
                  title="Remover"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
