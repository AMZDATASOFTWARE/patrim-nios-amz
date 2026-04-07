import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useWorkspaceEntity } from '@/lib/useWorkspaceData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Upload, Save } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getDefaultDepreciationRate, getUsefulLifeFromRate } from '@/lib/depreciation';
import SupplierSelect from '@/components/assets/SupplierSelect';

const categories = ['Imóveis', 'Veículos', 'Equipamentos', 'Investimentos', 'Intangíveis'];
const statuses = ['Ativo', 'Em Manutenção', 'Inativo', 'Alienado'];

export default function AssetForm() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const editId = urlParams.get('id');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!!editId);
  const AssetEntity = useWorkspaceEntity('Asset');
  const ConfigEntity = useWorkspaceEntity('DepreciationConfig');

  const [form, setForm] = useState({
    name: '',
    plaqueta: '',
    description: '',
    category: 'Equipamentos',
    account: '',
    cost_center: '',
    acquisition_value: '',
    purchase_date: '',
    depreciation_start_date: '',
    depreciation_rate: 10,
    useful_life_years: 10,
    residual_value: '',
    location: '',
    status: 'Ativo',
    conservation_state: 'Novo',
    serial_number: '',
    fiscal_document: '',
    supplier_id: '',
    supplier_name: '',
    external_link: '',
    registry_link: '',
    notes: '',
  });

  useEffect(() => {
    if (editId) {
      const loadAsset = async () => {
        const assets = await base44.entities.Asset.filter({ id: editId });
        if (assets.length > 0) {
          const asset = assets[0];
          setForm({
            name: asset.name || '',
            plaqueta: asset.plaqueta || '',
            description: asset.description || '',
            category: asset.category || 'Equipamentos',
            account: asset.account || '',
            cost_center: asset.cost_center || '',
            acquisition_value: asset.acquisition_value || '',
            purchase_date: asset.purchase_date || '',
            depreciation_start_date: asset.depreciation_start_date || '',
            depreciation_rate: asset.depreciation_rate || 10,
            useful_life_years: asset.useful_life_years || getUsefulLifeFromRate(asset.depreciation_rate),
            residual_value: asset.residual_value || '',
            location: asset.location || '',
            status: asset.status || 'Ativo',
            conservation_state: asset.conservation_state || 'Novo',
            serial_number: asset.serial_number || '',
            fiscal_document: asset.fiscal_document || '',
            supplier_id: asset.supplier_id || '',
            supplier_name: asset.supplier_name || '',
            photo_url: asset.photo_url || '',
            invoice_url: asset.invoice_url || '',
            external_link: asset.external_link || '',
            registry_link: asset.registry_link || '',
            notes: asset.notes || '',
          });
        }
        setLoading(false);
      };
      loadAsset();
    }
  }, [editId]);

  const handleCategoryChange = async (value) => {
    // Try to load from saved config first
    const configs = await ConfigEntity.filter({ category: value });
    let rate, life;
    if (configs.length > 0) {
      rate = configs[0].depreciation_rate;
      life = configs[0].useful_life_years;
    } else {
      rate = getDefaultDepreciationRate(value);
      life = getUsefulLifeFromRate(rate);
    }
    setForm({ ...form, category: value, depreciation_rate: rate, useful_life_years: life });
  };

  const handleFileUpload = async (e, field) => {
    const file = e.target.files[0];
    if (!file) return;
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm({ ...form, [field]: file_url });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    const data = {
      ...form,
      acquisition_value: parseFloat(form.acquisition_value) || 0,
      depreciation_rate: parseFloat(form.depreciation_rate) || 0,
      useful_life_years: parseFloat(form.useful_life_years) || 0,
      residual_value: parseFloat(form.residual_value) || 0,
      supplier_id: form.supplier_id || '',
      supplier_name: form.supplier_name || '',
    };

    if (editId) {
      await AssetEntity.update(editId, data);
    } else {
      await AssetEntity.create(data);
    }
    
    navigate('/Assets');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/Assets" className="p-2 rounded-lg hover:bg-muted transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {editId ? 'Editar Ativo' : 'Novo Ativo'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {editId ? 'Atualize as informações do ativo' : 'Preencha os dados para cadastrar um novo ativo'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="bg-card rounded-xl border border-border p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold text-card-foreground">Identificação do Bem</h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Label htmlFor="name">Descrição do Bem *</Label>
              <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="Ex: Caminhão Mercedes-Benz Atego 1719" />
            </div>

            <div>
              <Label htmlFor="plaqueta">Plaqueta / Código Patrimonial</Label>
              <Input id="plaqueta" value={form.plaqueta} onChange={(e) => setForm({ ...form, plaqueta: e.target.value })} placeholder="Ex: PAT-00123" />
            </div>

            <div>
              <Label htmlFor="serial_number">Número de Série</Label>
              <Input id="serial_number" value={form.serial_number} onChange={(e) => setForm({ ...form, serial_number: e.target.value })} placeholder="Ex: SN-ABC123456" />
            </div>

            <div>
              <Label>Grupo de Patrimônio *</Label>
              <Select value={form.category} onValueChange={handleCategoryChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (<SelectItem key={cat} value={cat}>{cat}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {statuses.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Estado de Conservação</Label>
              <Select value={form.conservation_state} onValueChange={(v) => setForm({ ...form, conservation_state: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['Novo','Ótimo','Bom','Regular','Ruim'].map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="account">Conta Contábil</Label>
              <Input id="account" value={form.account} onChange={(e) => setForm({ ...form, account: e.target.value })} placeholder="Ex: 1.2.3.01 - Máquinas e Equipamentos" />
            </div>

            <div>
              <Label htmlFor="cost_center">Centro de Custo / Departamento</Label>
              <Input id="cost_center" value={form.cost_center} onChange={(e) => setForm({ ...form, cost_center: e.target.value })} placeholder="Ex: Produção - Galpão 1" />
            </div>

            <div className="sm:col-span-2">
              <Label htmlFor="location">Localização Física</Label>
              <Input id="location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Ex: Matriz - Galpão 3, Sala 02" />
            </div>

            <div className="sm:col-span-2">
              <Label htmlFor="description">Detalhes Adicionais</Label>
              <Textarea id="description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Detalhes sobre o bem..." rows={3} />
            </div>
          </div>
        </div>

        {/* Financial Info */}
        <div className="bg-card rounded-xl border border-border p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold text-card-foreground">Informações Financeiras</h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="acquisition_value">Valor de Aquisição (R$) *</Label>
              <Input
                id="acquisition_value"
                type="number"
                step="0.01"
                value={form.acquisition_value}
                onChange={(e) => setForm({ ...form, acquisition_value: e.target.value })}
                required
                placeholder="0,00"
              />
            </div>
            
            <div>
              <Label htmlFor="purchase_date">Data de Aquisição *</Label>
              <Input
                id="purchase_date"
                type="date"
                value={form.purchase_date}
                onChange={(e) => setForm({ ...form, purchase_date: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="depreciation_start_date">Início da Depreciação</Label>
              <Input
                id="depreciation_start_date"
                type="date"
                value={form.depreciation_start_date}
                onChange={(e) => setForm({ ...form, depreciation_start_date: e.target.value })}
              />
            </div>
            
            <div>
              <Label htmlFor="depreciation_rate">Taxa de Depreciação Anual (%)</Label>
              <Input
                id="depreciation_rate"
                type="number"
                step="0.1"
                value={form.depreciation_rate}
                onChange={(e) => setForm({ 
                  ...form, 
                  depreciation_rate: e.target.value,
                  useful_life_years: e.target.value > 0 ? (100 / parseFloat(e.target.value)).toFixed(1) : 0
                })}
                placeholder="10"
              />
            </div>
            
            <div>
              <Label htmlFor="useful_life_years">Vida Útil (anos)</Label>
              <Input
                id="useful_life_years"
                type="number"
                step="0.1"
                value={form.useful_life_years}
                onChange={(e) => setForm({ 
                  ...form, 
                  useful_life_years: e.target.value,
                  depreciation_rate: e.target.value > 0 ? (100 / parseFloat(e.target.value)).toFixed(1) : 0
                })}
                placeholder="10"
              />
            </div>
            
            <div>
              <Label htmlFor="residual_value">Valor Residual (R$)</Label>
              <Input
                id="residual_value"
                type="number"
                step="0.01"
                value={form.residual_value}
                onChange={(e) => setForm({ ...form, residual_value: e.target.value })}
                placeholder="0,00"
              />
            </div>
          </div>
        </div>

        {/* Supplier & Fiscal */}
        <div className="bg-card rounded-xl border border-border p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold text-card-foreground">Fornecedor & Documento Fiscal</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Label>Fornecedor</Label>
              <SupplierSelect
                value={form.supplier_id}
                onChange={({ supplier_id, supplier_name }) => setForm({ ...form, supplier_id, supplier_name })}
              />
            </div>
            <div>
              <Label htmlFor="fiscal_document">Número da Nota Fiscal</Label>
              <Input id="fiscal_document" value={form.fiscal_document} onChange={(e) => setForm({ ...form, fiscal_document: e.target.value })} placeholder="Ex: NF-e 000123" />
            </div>
            <div>
              <Label htmlFor="warranty_expiry_date">Vencimento da Garantia</Label>
              <Input id="warranty_expiry_date" type="date" value={form.warranty_expiry_date || ''} onChange={(e) => setForm({ ...form, warranty_expiry_date: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="next_review_date">Data da Próxima Revisão</Label>
              <Input id="next_review_date" type="date" value={form.next_review_date || ''} onChange={(e) => setForm({ ...form, next_review_date: e.target.value })} />
            </div>
          </div>
        </div>

        {/* Attachments */}
        <div className="bg-card rounded-xl border border-border p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold text-card-foreground">Anexos e Links</h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Foto do Ativo</Label>
              <div className="mt-1">
                {form.photo_url ? (
                  <div className="relative">
                    <img src={form.photo_url} alt="Foto" className="h-32 w-full object-cover rounded-lg" />
                    <Button type="button" variant="destructive" size="sm" className="absolute top-2 right-2" onClick={() => setForm({ ...form, photo_url: '' })}>Remover</Button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                    <Upload className="h-6 w-6 text-muted-foreground mb-2" />
                    <span className="text-sm text-muted-foreground">Clique para enviar</span>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'photo_url')} />
                  </label>
                )}
              </div>
            </div>
            
            <div>
              <Label>Nota Fiscal (Arquivo)</Label>
              <div className="mt-1">
                {form.invoice_url ? (
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                    <span className="text-sm text-card-foreground flex-1 truncate">Arquivo enviado</span>
                    <Button type="button" variant="destructive" size="sm" onClick={() => setForm({ ...form, invoice_url: '' })}>Remover</Button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                    <Upload className="h-6 w-6 text-muted-foreground mb-2" />
                    <span className="text-sm text-muted-foreground">Enviar Nota Fiscal</span>
                    <input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => handleFileUpload(e, 'invoice_url')} />
                  </label>
                )}
              </div>
            </div>
            
            <div>
              <Label htmlFor="external_link">Link Externo (Consulta de Valor)</Label>
              <Input id="external_link" value={form.external_link} onChange={(e) => setForm({ ...form, external_link: e.target.value })} placeholder="https://..." />
            </div>
            
            <div>
              <Label htmlFor="registry_link">Link do Registro (Cartório/Corretora)</Label>
              <Input id="registry_link" value={form.registry_link} onChange={(e) => setForm({ ...form, registry_link: e.target.value })} placeholder="https://..." />
            </div>
          </div>
          
          <div>
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Notas adicionais..."
              rows={3}
            />
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Link to="/Assets">
            <Button type="button" variant="outline">Cancelar</Button>
          </Link>
          <Button type="submit" disabled={saving} className="gap-2">
            <Save className="h-4 w-4" />
            {saving ? 'Salvando...' : (editId ? 'Atualizar' : 'Cadastrar')}
          </Button>
        </div>
      </form>
    </div>
  );
}