import { useState } from 'react';
import { useWorkspace } from '@/lib/WorkspaceContext';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building2, Upload, Save, FileText } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';

export default function CompanyProfile() {
  const { workspace, refreshWorkspace } = useWorkspace();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [form, setForm] = useState({
    name: workspace?.name || '',
    cnpj: workspace?.cnpj || '',
    phone: workspace?.phone || '',
    address: workspace?.address || '',
    logo_url: workspace?.logo_url || '',
    report_letterhead_text: workspace?.report_letterhead_text || '',
    report_footer_text: workspace?.report_footer_text || '',
    report_responsible_name: workspace?.report_responsible_name || '',
    report_signature_url: workspace?.report_signature_url || '',
  });
  const [uploadingSignature, setUploadingSignature] = useState(false);

  const handleSignatureUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingSignature(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm((prev) => ({ ...prev, report_signature_url: file_url }));
    setUploadingSignature(false);
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingLogo(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm({ ...form, logo_url: file_url });
    setUploadingLogo(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // O RLS do Workspace bloqueia update pelo SDK (impede burlar o paywall). O perfil
      // é gravado via function com service-role e whitelist de campos (sem plano/cobrança).
      const res = await base44.functions.invoke('updateWorkspaceProfile', form);
      if (!res?.data?.ok) throw new Error(res?.data?.error);
      await refreshWorkspace();
      toast({ title: 'Dados da empresa salvos com sucesso!' });
    } catch (e) {
      toast({ title: e?.message || 'Não foi possível salvar os dados.', variant: 'destructive' });
    }
    setSaving(false);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Perfil da Empresa</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Informações utilizadas nas etiquetas e relatórios do sistema</p>
      </div>

      <div className="bg-card rounded-xl border border-border p-4 sm:p-6 shadow-sm space-y-6">
        {/* Logo */}
        <div>
          <Label className="text-base font-semibold">Logo da Empresa</Label>
          <p className="text-sm text-muted-foreground mb-3">Aparecerá nas etiquetas QR Code dos ativos</p>
          <div className="flex items-center gap-4">
            {form.logo_url ? (
              <div className="relative">
                <img src={form.logo_url} alt="Logo" className="h-20 w-20 object-contain rounded-lg border border-border bg-muted" />
                <button
                  onClick={() => setForm({ ...form, logo_url: '' })}
                  className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs"
                >×</button>
              </div>
            ) : (
              <div className="h-20 w-20 rounded-lg border-2 border-dashed border-border flex items-center justify-center bg-muted">
                <Building2 className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
            <label className="cursor-pointer">
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-muted hover:bg-muted/80 transition-colors text-sm font-medium">
                {uploadingLogo ? (
                  <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                {uploadingLogo ? 'Enviando...' : 'Enviar Logo'}
              </div>
              <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
            </label>
          </div>
        </div>

        {/* Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Label htmlFor="name">Razão Social / Nome da Empresa</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ex: Empresa LTDA"
            />
          </div>
          <div>
            <Label htmlFor="cnpj">CNPJ / CPF</Label>
            <Input
              id="cnpj"
              value={form.cnpj}
              onChange={(e) => setForm({ ...form, cnpj: e.target.value })}
              placeholder="00.000.000/0001-00"
            />
          </div>
          <div>
            <Label htmlFor="phone">Telefone</Label>
            <Input
              id="phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="(00) 00000-0000"
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="address">Endereço</Label>
            <Input
              id="address"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="Rua, número, cidade - estado"
            />
          </div>
        </div>

        {/* Preview */}
        {(form.logo_url || form.name || form.cnpj) && (
          <div className="border border-border rounded-lg p-4 bg-muted/30">
            <p className="text-xs text-muted-foreground mb-3 font-medium uppercase tracking-wide">Prévia na etiqueta</p>
            <div className="flex items-center gap-3">
              {form.logo_url && (
                <img src={form.logo_url} alt="Logo" className="h-10 w-10 object-contain rounded" />
              )}
              <div>
                {form.name && <p className="font-bold text-sm text-foreground">{form.name}</p>}
                {form.cnpj && <p className="text-xs text-muted-foreground">CNPJ: {form.cnpj}</p>}
              </div>
            </div>
          </div>
        )}

        <Button onClick={handleSave} disabled={saving} className="gap-2 w-full sm:w-auto">
          <Save className="h-4 w-4" />
          {saving ? 'Salvando...' : 'Salvar Informações'}
        </Button>
      </div>

      {/* Cabecalho de relatorios */}
      <div className="bg-card rounded-xl border border-border p-4 sm:p-6 shadow-sm space-y-6">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <div>
            <Label className="text-base font-semibold">Cabeçalho dos Relatórios</Label>
            <p className="text-sm text-muted-foreground">Personalize o topo, rodapé e assinatura impressos nos relatórios em PDF da sua empresa</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <div>
            <Label htmlFor="report_letterhead_text">Texto de cabeçalho</Label>
            <Textarea
              id="report_letterhead_text"
              value={form.report_letterhead_text}
              onChange={(e) => setForm({ ...form, report_letterhead_text: e.target.value })}
              placeholder="Ex: Empresa LTDA - Unidade Matriz"
              rows={2}
            />
          </div>
          <div>
            <Label htmlFor="report_responsible_name">Responsável pelos relatórios</Label>
            <Input
              id="report_responsible_name"
              value={form.report_responsible_name}
              onChange={(e) => setForm({ ...form, report_responsible_name: e.target.value })}
              placeholder="Nome do responsável pelo patrimônio"
            />
          </div>
          <div>
            <Label htmlFor="report_footer_text">Texto de rodapé</Label>
            <Textarea
              id="report_footer_text"
              value={form.report_footer_text}
              onChange={(e) => setForm({ ...form, report_footer_text: e.target.value })}
              placeholder="Ex: Documento gerado automaticamente pelo sistema de gestão patrimonial"
              rows={2}
            />
          </div>
          <div>
            <Label className="block mb-2">Imagem de assinatura</Label>
            <div className="flex items-center gap-4">
              {form.report_signature_url ? (
                <div className="relative">
                  <img src={form.report_signature_url} alt="Assinatura" className="h-16 w-32 object-contain rounded-lg border border-border bg-muted" />
                  <button
                    onClick={() => setForm({ ...form, report_signature_url: '' })}
                    className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs"
                  >×</button>
                </div>
              ) : (
                <div className="h-16 w-32 rounded-lg border-2 border-dashed border-border flex items-center justify-center bg-muted">
                  <FileText className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              <label className="cursor-pointer">
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-muted hover:bg-muted/80 transition-colors text-sm font-medium">
                  {uploadingSignature ? (
                    <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  {uploadingSignature ? 'Enviando...' : 'Enviar Assinatura'}
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={handleSignatureUpload} />
              </label>
            </div>
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving} className="gap-2 w-full sm:w-auto">
          <Save className="h-4 w-4" />
          {saving ? 'Salvando...' : 'Salvar Cabeçalho'}
        </Button>
      </div>
    </div>
  );
}