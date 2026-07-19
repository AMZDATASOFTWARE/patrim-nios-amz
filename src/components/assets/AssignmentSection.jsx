import { useState, useEffect } from 'react';
import { useWorkspaceEntity } from '@/lib/useWorkspaceData';
import { useWorkspace } from '@/lib/WorkspaceContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, UserCheck, FileText, ChevronDown, ChevronUp, CheckCircle, Search, PenTool, BadgeCheck } from 'lucide-react';
import moment from 'moment';
import jsPDF from 'jspdf';
import { maskCpf } from '@/lib/mask';
import { base44 } from '@/api/base44Client';
import SignaturePad from '@/components/assets/SignaturePad';
import { toast } from 'sonner';

// Carrega uma imagem remota como dataURL (via canvas) para embutir no PDF.
// Retorna null se o carregamento falhar (ex.: CORS) — o PDF cai no fallback textual.
async function urlToDataUrl(url) {
  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; img.src = url; });
    const c = document.createElement('canvas');
    c.width = img.naturalWidth || 500;
    c.height = img.naturalHeight || 200;
    c.getContext('2d').drawImage(img, 0, 0);
    return c.toDataURL('image/png');
  } catch {
    return null;
  }
}

const EMPTY = { collaborator_name: '', collaborator_email: '', collaborator_cpf: '', collaborator_department: '', collaborator_sector_id: '', collaborator_phone: '', assignment_date: new Date().toISOString().split('T')[0], expected_return_date: '', purpose: '', condition_on_assignment: 'Bom estado', supervisor_name: '', notes: '', status: 'Ativo', signed: false };

const statusColors = { Ativo: 'bg-emerald-100 text-emerald-700', Devolvido: 'bg-gray-100 text-gray-600', Atrasado: 'bg-red-100 text-red-700', Cancelado: 'bg-gray-100 text-gray-400' };

export default function AssignmentSection({ assetId, assetName }) {
  const [records, setRecords] = useState([]);
  const [collaborators, setCollaborators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [expanded, setExpanded] = useState(null);
  const [collabSearch, setCollabSearch] = useState('');
  const [showCollabDropdown, setShowCollabDropdown] = useState(false);
  const AssignEntity = useWorkspaceEntity('AssetAssignment');
  const CollabEntity = useWorkspaceEntity('Collaborator');
  const CollabSectorLinkEntity = useWorkspaceEntity('CollaboratorSectorLink');
  const SectorEntity = useWorkspaceEntity('Sector');
  const [sectors, setSectors] = useState([]);

  useEffect(() => { load(); }, [assetId]);

  const load = async () => {
    const [data, collabs, s] = await Promise.all([
      AssignEntity.filterAll({ asset_id: assetId }, '-assignment_date'),
      CollabEntity.listAll('-name'),
      SectorEntity.listAll('name'),
    ]);
    setRecords(data);
    setCollaborators(collabs);
    setSectors(s.filter((row) => row.status !== 'inativo'));
    setLoading(false);
  };

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const selectCollaborator = async (collab) => {
    // Auto-preenche o setor só quando o vínculo é inequívoco (exatamente 1 setor
    // ligado ao colaborador) -- com 0 ou 2+ vínculos, deixa em branco e editável,
    // pra não gravar um setor errado num documento com relevância legal (o termo assinado).
    let sectorId = '';
    try {
      const links = await CollabSectorLinkEntity.filter({ collaborator_id: collab.id }, '-created_date', 5);
      if (links.length === 1) sectorId = links[0].sector_id;
    } catch (_) { /* não critico -- campo fica editavel manualmente */ }
    setForm(p => ({
      ...p,
      collaborator_name: collab.name,
      collaborator_cpf: collab.cpf || '',
      collaborator_email: collab.email || '',
      collaborator_department: collab.department || '',
      collaborator_sector_id: sectorId,
      collaborator_phone: collab.phone || '',
    }));
    setCollabSearch(collab.name);
    setShowCollabDropdown(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await AssignEntity.create({ ...form, asset_id: assetId, asset_name: assetName });
    setOpen(false);
    setForm(EMPTY);
    setCollabSearch('');
    load();
  };

  const handleReturn = async (id) => {
    await AssignEntity.update(id, { status: 'Devolvido', return_date: new Date().toISOString().split('T')[0] });
    load();
  };

  const [signingId, setSigningId] = useState(null);
  const [savingSignature, setSavingSignature] = useState(false);

  const handleSign = async (rec, dataUrl) => {
    setSavingSignature(true);
    try {
      const res = await base44.functions.invoke('signAssignment', {
        assignment_id: rec.id,
        signature_png_base64: dataUrl,
        signed_by_name: rec.collaborator_name,
      });
      if (!res?.data?.ok) throw new Error(res?.data?.error || 'Falha ao registrar assinatura.');
      toast.success('Termo assinado.');
      setSigningId(null);
      load();
    } catch (e) {
      toast.error(e?.response?.data?.error || e?.message || 'Não foi possível registrar a assinatura.');
    }
    setSavingSignature(false);
  };

  const generatePDF = async (rec) => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('TERMO DE RESPONSABILIDADE DE USO DE PATRIMÔNIO', 14, 20);
    doc.setFontSize(10);
    doc.text(`Data: ${moment(rec.assignment_date).format('DD/MM/YYYY')}`, 14, 32);
    doc.setFontSize(12);
    doc.text('1. IDENTIFICAÇÃO DO BEM', 14, 44);
    doc.setFontSize(10);
    doc.text(`Patrimônio: ${rec.asset_name}`, 14, 52);
    doc.text(`Estado na entrega: ${rec.condition_on_assignment || '—'}`, 14, 58);
    doc.setFontSize(12);
    doc.text('2. IDENTIFICAÇÃO DO RESPONSÁVEL', 14, 70);
    doc.setFontSize(10);
    doc.text(`Nome: ${rec.collaborator_name}`, 14, 78);
    doc.text(`CPF: ${rec.collaborator_cpf}`, 14, 84);
    doc.text(`E-mail: ${rec.collaborator_email || '—'}`, 14, 90);
    doc.text(`Departamento: ${rec.collaborator_department || '—'}`, 14, 96);
    doc.text(`Telefone: ${rec.collaborator_phone || '—'}`, 14, 102);
    doc.setFontSize(12);
    doc.text('3. FINALIDADE E PRAZO', 14, 114);
    doc.setFontSize(10);
    doc.text(`Finalidade: ${rec.purpose}`, 14, 122);
    doc.text(`Data de atribuição: ${moment(rec.assignment_date).format('DD/MM/YYYY')}`, 14, 128);
    if (rec.expected_return_date) doc.text(`Devolução prevista: ${moment(rec.expected_return_date).format('DD/MM/YYYY')}`, 14, 134);
    doc.setFontSize(12);
    doc.text('4. TERMO DE RESPONSABILIDADE', 14, 146);
    doc.setFontSize(9);
    const termo = `Eu, ${rec.collaborator_name}, portador(a) do CPF nº ${rec.collaborator_cpf}, declaro ter recebido o patrimônio descrito acima em ${rec.condition_on_assignment || 'bom estado'}, comprometendo-me a utilizá-lo exclusivamente para a finalidade descrita, a zelar pela sua conservação e a devolvê-lo nas mesmas condições em que o recebi, sob pena de ressarcimento dos danos causados.`;
    const lines = doc.splitTextToSize(termo, 182);
    doc.text(lines, 14, 154);
    let y = 154 + lines.length * 5 + 20;
    // Se assinado digitalmente, embute a imagem da assinatura sobre a linha do responsável.
    if (rec.signed && rec.signature_file_url) {
      const dataUrl = await urlToDataUrl(rec.signature_file_url);
      if (dataUrl) {
        try { doc.addImage(dataUrl, 'PNG', 14, y - 18, 60, 20); } catch (_) { /* fallback textual abaixo */ }
      }
    }
    doc.line(14, y, 95, y);
    doc.line(110, y, 196, y);
    doc.setFontSize(8);
    doc.text('Assinatura do Responsável', 14, y + 5);
    doc.text('Assinatura do Supervisor', 110, y + 5);
    doc.text(rec.collaborator_name, 14, y + 10);
    doc.text(rec.supervisor_name || '_______________', 110, y + 10);
    if (rec.signed && rec.signed_at) {
      doc.setFontSize(7);
      doc.setTextColor(120);
      doc.text(`Assinado digitalmente em ${moment(rec.signed_at).format('DD/MM/YYYY HH:mm')}${rec.signature_hash ? ` — hash: ${rec.signature_hash.substring(0, 32)}...` : ''}`, 14, y + 18);
      doc.text('Assinatura eletronica simples (captura + hash de integridade) — nao substitui assinatura ICP-Brasil.', 14, y + 22);
      doc.setTextColor(0);
    }
    doc.save(`termo-${rec.collaborator_name.replace(/ /g, '_')}-${rec.asset_name.replace(/ /g, '_')}.pdf`);
  };

  const filteredCollabs = collaborators.filter(c =>
    !collabSearch || c.name.toLowerCase().includes(collabSearch.toLowerCase()) ||
    (c.cpf && c.cpf.includes(collabSearch))
  );

  const active = records.filter(r => r.status === 'Ativo');

  return (
    <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-card-foreground">Termos de Responsabilidade</h2>
          <p className="text-sm text-muted-foreground">{records.length} registro(s) • {active.length} ativo(s)</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setCollabSearch(''); setShowCollabDropdown(false); } }}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> Novo Termo</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Atribuir Patrimônio</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">

                {/* Busca de colaborador cadastrado */}
                <div className="col-span-2">
                  <Label>Colaborador *</Label>
                  <div className="relative">
                    <div className="flex items-center border border-input rounded-md px-3 py-2 gap-2 focus-within:ring-1 focus-within:ring-ring bg-background">
                      <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <input
                        className="flex-1 text-sm outline-none bg-transparent"
                        placeholder="Buscar colaborador cadastrado..."
                        value={collabSearch}
                        onChange={e => { setCollabSearch(e.target.value); setShowCollabDropdown(true); f('collaborator_name', e.target.value); }}
                        onFocus={() => setShowCollabDropdown(true)}
                        required
                      />
                    </div>
                    {showCollabDropdown && filteredCollabs.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {filteredCollabs.map(c => (
                          <button
                            key={c.id}
                            type="button"
                            className="w-full text-left px-3 py-2.5 hover:bg-muted transition-colors flex items-center justify-between"
                            onClick={() => selectCollaborator(c)}
                          >
                            <div>
                              <p className="text-sm font-medium text-foreground">{c.name}</p>
                              <p className="text-xs text-muted-foreground">{c.department || ''} {c.cpf ? `• CPF: ${maskCpf(c.cpf)}` : ''}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {collaborators.length === 0 && (
                    <p className="text-xs text-amber-600 mt-1">Nenhum colaborador cadastrado. <a href="/Collaborators" className="underline font-medium">Cadastre aqui</a> antes de criar um termo.</p>
                  )}
                </div>

                <div><Label>CPF *</Label><Input value={form.collaborator_cpf} onChange={e => f('collaborator_cpf', e.target.value)} required placeholder="000.000.000-00" /></div>
                <div><Label>E-mail</Label><Input type="email" value={form.collaborator_email} onChange={e => f('collaborator_email', e.target.value)} /></div>
                <div><Label>Departamento</Label><Input value={form.collaborator_department} onChange={e => f('collaborator_department', e.target.value)} /></div>
                <div>
                  <Label>Setor</Label>
                  <Select value={form.collaborator_sector_id || 'none'} onValueChange={(v) => f('collaborator_sector_id', v === 'none' ? '' : v)}>
                    <SelectTrigger><SelectValue placeholder="Nenhum setor cadastrado" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem setor</SelectItem>
                      {sectors.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Telefone</Label><Input value={form.collaborator_phone} onChange={e => f('collaborator_phone', e.target.value)} /></div>
                <div><Label>Data Atribuição</Label><Input type="date" value={form.assignment_date} onChange={e => f('assignment_date', e.target.value)} required /></div>
                <div><Label>Devolução Prevista</Label><Input type="date" value={form.expected_return_date} onChange={e => f('expected_return_date', e.target.value)} /></div>
                <div className="col-span-2"><Label>Finalidade *</Label><Input value={form.purpose} onChange={e => f('purpose', e.target.value)} required placeholder="Ex: Uso em visitas técnicas" /></div>
                <div><Label>Estado na Entrega</Label><Input value={form.condition_on_assignment} onChange={e => f('condition_on_assignment', e.target.value)} /></div>
                <div><Label>Supervisor</Label><Input value={form.supervisor_name} onChange={e => f('supervisor_name', e.target.value)} /></div>
                <div className="col-span-2"><Label>Observações</Label><Textarea value={form.notes} onChange={e => f('notes', e.target.value)} rows={2} /></div>
              </div>
              <Button type="submit" className="w-full">Criar Termo</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center py-6"><div className="w-6 h-6 border-4 border-primary/30 border-t-primary rounded-full animate-spin" /></div>
      ) : records.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <UserCheck className="h-10 w-10 mx-auto mb-2 opacity-50" />
          <p>Nenhum termo registrado</p>
        </div>
      ) : (
        <div className="space-y-2">
          {records.map(rec => (
            <div key={rec.id} className="border border-border rounded-lg overflow-hidden">
              <div
                className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => setExpanded(expanded === rec.id ? null : rec.id)}
              >
                <div className="flex items-center gap-3">
                  <UserCheck className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  <div>
                    <p className="font-medium text-sm">{rec.collaborator_name}</p>
                    <p className="text-xs text-muted-foreground">{rec.collaborator_department} • {moment(rec.assignment_date).format('DD/MM/YYYY')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[rec.status] || statusColors.Ativo}`}>{rec.status}</span>
                  {expanded === rec.id ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </div>
              </div>

              {expanded === rec.id && (
                <div className="px-4 pb-4 border-t border-border pt-3 space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-muted-foreground">CPF: </span>{maskCpf(rec.collaborator_cpf)}</div>
                    <div><span className="text-muted-foreground">E-mail: </span>{rec.collaborator_email || '—'}</div>
                    <div><span className="text-muted-foreground">Telefone: </span>{rec.collaborator_phone || '—'}</div>
                    <div><span className="text-muted-foreground">Supervisor: </span>{rec.supervisor_name || '—'}</div>
                    <div className="col-span-2"><span className="text-muted-foreground">Finalidade: </span>{rec.purpose}</div>
                    {rec.expected_return_date && <div><span className="text-muted-foreground">Dev. prevista: </span>{moment(rec.expected_return_date).format('DD/MM/YYYY')}</div>}
                    {rec.return_date && <div><span className="text-muted-foreground">Dev. realizada: </span>{moment(rec.return_date).format('DD/MM/YYYY')}</div>}
                  </div>
                  {rec.signed && (
                    <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2">
                      <BadgeCheck className="h-4 w-4" />
                      Assinado digitalmente {rec.signed_at ? `em ${moment(rec.signed_at).format('DD/MM/YYYY HH:mm')}` : ''}{rec.signed_by_name ? ` por ${rec.signed_by_name}` : ''}.
                    </div>
                  )}
                  <div className="flex gap-2 flex-wrap">
                    <Button size="sm" variant="outline" className="gap-1" onClick={() => generatePDF(rec)}>
                      <FileText className="h-3 w-3" /> Gerar PDF
                    </Button>
                    {!rec.signed && (
                      <Dialog open={signingId === rec.id} onOpenChange={(v) => setSigningId(v ? rec.id : null)}>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline" className="gap-1 text-primary border-primary/30">
                            <PenTool className="h-3 w-3" /> Assinar termo
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader><DialogTitle>Assinatura de {rec.collaborator_name}</DialogTitle></DialogHeader>
                          <SignaturePad confirming={savingSignature} onConfirm={(dataUrl) => handleSign(rec, dataUrl)} />
                          <p className="text-xs text-muted-foreground">Assinatura eletrônica simples (captura + hash de integridade). Não substitui assinatura ICP-Brasil.</p>
                        </DialogContent>
                      </Dialog>
                    )}
                    {rec.status === 'Ativo' && (
                      <Button size="sm" variant="outline" className="gap-1 text-emerald-600 border-emerald-200" onClick={() => handleReturn(rec.id)}>
                        <CheckCircle className="h-3 w-3" /> Registrar Devolução
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}