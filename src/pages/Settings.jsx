import { useState, useEffect } from 'react';
import { useWorkspaceEntity } from '@/lib/useWorkspaceData';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Info, Save, TrendingDown, Tag, Plus, Trash2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import {
  TRUSTED_AI_SOURCES_INFO,
  buildSuggestAssetParametersPayload,
  normalizeSuggestionFunctionResponse,
  friendlySuggestionError,
} from '@/lib/assetParameterSuggestions';

const DEFAULT_RATES = {
  'Imóveis':      { depreciation_rate: 4,  useful_life_years: 25 },
  'Veículos':     { depreciation_rate: 20, useful_life_years: 5  },
  'Equipamentos': { depreciation_rate: 10, useful_life_years: 10 },
  'Investimentos':{ depreciation_rate: 0,  useful_life_years: 0  },
  'Intangíveis':  { depreciation_rate: 20, useful_life_years: 5  },
};

const CATEGORIES = Object.keys(DEFAULT_RATES);

const EMPTY_TEMPLATE_FORM = {
  category: 'Equipamentos', brand: '', model: '',
  depreciation_rate: '', useful_life_years: '', residual_value: '',
  fiscal_depreciation_rate: '', fiscal_useful_life_years: '', fiscal_residual_value: '',
  regulatory_registration_type: 'nenhum', regulatory_registration_number: '', notes: '',
};

export default function Settings() {
  const [configs, setConfigs] = useState({});
  const [records, setRecords] = useState({});
  const [saving, setSaving] = useState(false);
  const ConfigEntity = useWorkspaceEntity('DepreciationConfig');
  const TemplateEntity = useWorkspaceEntity('AssetParameterTemplate');
  const AssetEntity = useWorkspaceEntity('Asset');
  const [templates, setTemplates] = useState([]);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState(null);
  const [templateForm, setTemplateForm] = useState(EMPTY_TEMPLATE_FORM);
  const [templateSaving, setTemplateSaving] = useState(false);
  const [templateSuggesting, setTemplateSuggesting] = useState(false);
  const [templateSuggestion, setTemplateSuggestion] = useState(null);
  const [pendingApply, setPendingApply] = useState(null); // { template, matchedCount }
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    ConfigEntity.list().then((data) => {
      const map = {};
      const recMap = {};
      data.forEach((r) => { map[r.category] = { depreciation_rate: r.depreciation_rate, useful_life_years: r.useful_life_years }; recMap[r.category] = r.id; });
      // Fill defaults for missing
      const initial = {};
      CATEGORIES.forEach((cat) => { initial[cat] = map[cat] || { ...DEFAULT_RATES[cat] }; });
      setConfigs(initial);
      setRecords(recMap);
    });
  }, []);

  const handleChange = (cat, field, value) => {
    const num = parseFloat(value) || 0;
    setConfigs((prev) => {
      const updated = { ...prev[cat], [field]: num };
      if (field === 'depreciation_rate') updated.useful_life_years = num > 0 ? parseFloat((100 / num).toFixed(1)) : 0;
      if (field === 'useful_life_years') updated.depreciation_rate = num > 0 ? parseFloat((100 / num).toFixed(1)) : 0;
      return { ...prev, [cat]: updated };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    for (const cat of CATEGORIES) {
      const data = { category: cat, depreciation_rate: configs[cat].depreciation_rate, useful_life_years: configs[cat].useful_life_years };
      if (records[cat]) {
        await ConfigEntity.update(records[cat], data);
      } else {
        const created = await ConfigEntity.create(data);
        setRecords((prev) => ({ ...prev, [cat]: created.id }));
      }
    }
    setSaving(false);
    toast.success('Configurações salvas!');
  };

  const loadTemplates = () => {
    TemplateEntity.list('-created_date', 500).then(setTemplates).catch(() => {});
  };

  useEffect(() => { loadTemplates(); }, []);

  const openNewTemplate = () => {
    setEditingTemplateId(null);
    setTemplateForm(EMPTY_TEMPLATE_FORM);
    setTemplateSuggestion(null);
    setTemplateDialogOpen(true);
  };

  const openEditTemplate = (t) => {
    setEditingTemplateId(t.id);
    setTemplateForm({
      category: t.category || 'Equipamentos', brand: t.brand || '', model: t.model || '',
      depreciation_rate: t.depreciation_rate ?? '', useful_life_years: t.useful_life_years ?? '', residual_value: t.residual_value ?? '',
      fiscal_depreciation_rate: t.fiscal_depreciation_rate ?? '', fiscal_useful_life_years: t.fiscal_useful_life_years ?? '', fiscal_residual_value: t.fiscal_residual_value ?? '',
      regulatory_registration_type: t.regulatory_registration_type || 'nenhum', regulatory_registration_number: t.regulatory_registration_number || '', notes: t.notes || '',
    });
    setTemplateSuggestion(null);
    setTemplateDialogOpen(true);
  };

  const handleDeleteTemplate = async (t) => {
    if (!window.confirm(`Excluir o template de ${t.brand} ${t.model}? Isso não altera os ativos já parametrizados.`)) return;
    await TemplateEntity.del(t.id);
    loadTemplates();
  };

  // Sugestão de IA em modo "template" (sem asset_id) — reaproveita 100% do pipeline já usado
  // no cadastro de ativos (mesma function, mesmas fontes confiáveis), com o nome sintetizado
  // a partir de Marca+Modelo para dar contexto suficiente à IA.
  const handleSuggestTemplate = async () => {
    if (!templateForm.brand.trim() || !templateForm.model.trim()) {
      toast.error('Preencha Marca e Modelo antes de pedir uma sugestão.');
      return;
    }
    setTemplateSuggesting(true);
    setTemplateSuggestion(null);
    try {
      const context = {
        name: `${templateForm.brand.trim()} ${templateForm.model.trim()}`,
        category: templateForm.category,
        description: templateForm.notes || '',
      };
      const res = await base44.functions.invoke(
        'suggestAssetParameters',
        buildSuggestAssetParametersPayload(undefined, ['depreciation_rate', 'useful_life_years'], context),
      );
      const payload = normalizeSuggestionFunctionResponse(res);
      if (!payload.ok) throw Object.assign(new Error('Falha ao gerar sugestão.'), { data: res?.data || res });
      setTemplateSuggestion(payload);
    } catch (err) {
      toast.error(friendlySuggestionError(err));
    } finally {
      setTemplateSuggesting(false);
    }
  };

  const applyTemplateSuggestion = () => {
    if (!templateSuggestion) return;
    const rate = templateSuggestion.suggestions?.depreciation_rate;
    const life = templateSuggestion.suggestions?.useful_life_years;
    setTemplateForm((prev) => ({
      ...prev,
      depreciation_rate: rate?.found ? rate.value : prev.depreciation_rate,
      useful_life_years: life?.found ? life.value : prev.useful_life_years,
      fiscal_depreciation_rate: templateSuggestion.fiscal_reference?.value ?? prev.fiscal_depreciation_rate,
    }));
    toast.success('Sugestão aplicada ao formulário. Revise antes de salvar.');
  };

  const handleSaveTemplate = async (e) => {
    e.preventDefault();
    if (!templateForm.brand.trim() || !templateForm.model.trim()) {
      toast.error('Marca e Modelo são obrigatórios.');
      return;
    }
    setTemplateSaving(true);
    const data = {
      category: templateForm.category,
      brand: templateForm.brand.trim(),
      model: templateForm.model.trim(),
      notes: templateForm.notes || '',
      regulatory_registration_type: templateForm.regulatory_registration_type,
      regulatory_registration_number: templateForm.regulatory_registration_number || '',
    };
    ['depreciation_rate', 'useful_life_years', 'residual_value', 'fiscal_depreciation_rate', 'fiscal_useful_life_years', 'fiscal_residual_value'].forEach((f) => {
      if (templateForm[f] !== '' && templateForm[f] !== null && templateForm[f] !== undefined) data[f] = parseFloat(templateForm[f]);
    });

    try {
      let saved;
      if (editingTemplateId) {
        saved = await TemplateEntity.update(editingTemplateId, data);
        saved = { ...data, id: editingTemplateId };
      } else {
        saved = await TemplateEntity.create(data);
      }
      setTemplateDialogOpen(false);
      loadTemplates();

      // Conta quantos ativos já cadastrados casam com esta marca/modelo para oferecer o
      // bulk-apply — só pergunta se houver pelo menos 1 ativo existente.
      const matches = await AssetEntity.filter({ category: data.category, brand: data.brand, model: data.model });
      if (matches.length > 0) {
        setPendingApply({ template: saved, matchedCount: matches.length });
      } else {
        toast.success('Template salvo. Nenhum ativo existente com esta marca/modelo ainda.');
      }
    } catch (_) {
      toast.error('Não foi possível salvar o template.');
    } finally {
      setTemplateSaving(false);
    }
  };

  const confirmApplyTemplate = async () => {
    if (!pendingApply) return;
    setApplying(true);
    try {
      const res = await base44.functions.invoke('applyAssetParameterTemplate', { template_id: pendingApply.template.id });
      const data = res?.data || res;
      if (data?.ok) {
        toast.success(`${data.updated_count} ativo(s) atualizado(s) com os novos parâmetros.`);
      } else {
        toast.error(data?.error || 'Não foi possível aplicar os parâmetros aos ativos existentes.');
      }
    } catch (_) {
      toast.error('Não foi possível aplicar os parâmetros aos ativos existentes.');
    } finally {
      setApplying(false);
      setPendingApply(null);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Configurações</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Defina as taxas de depreciação padrão por categoria</p>
      </div>

      <div className="bg-card rounded-xl border border-border p-4 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <TrendingDown className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-card-foreground">Depreciação por Categoria</h2>
        </div>
        <p className="text-sm text-muted-foreground -mt-2">Estes valores são usados como padrão ao cadastrar novos ativos. Alterar aqui não afeta ativos já cadastrados.</p>

        <div className="divide-y divide-border">
          {CATEGORIES.map((cat) => (
            <div key={cat} className="py-4 grid grid-cols-3 gap-4 items-center">
              <div>
                <p className="font-medium text-card-foreground">{cat}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Taxa Anual (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  value={configs[cat]?.depreciation_rate ?? ''}
                  onChange={(e) => handleChange(cat, 'depreciation_rate', e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Vida Útil (anos)</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  value={configs[cat]?.useful_life_years ?? ''}
                  onChange={(e) => handleChange(cat, 'useful_life_years', e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end pt-2">
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            <Save className="h-4 w-4" />
            {saving ? 'Salvando...' : 'Salvar Configurações'}
          </Button>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border p-4 sm:p-6 shadow-sm">
        <details>
          <summary className="flex cursor-pointer list-none items-center gap-2">
            <Info className="h-5 w-5 text-primary" />
            <span className="text-lg font-semibold text-card-foreground">Fontes confiáveis da IA</span>
          </summary>
          <p className="mt-3 text-sm text-muted-foreground">
            A Sugestão de Parâmetros combina os dados informados no cadastro com referências consultadas em fontes oficiais previamente aprovadas.
          </p>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {TRUSTED_AI_SOURCES_INFO.map((source) => (
              <div key={source.name} className="rounded-md border border-border bg-muted/20 p-3">
                <p className="text-sm font-medium text-card-foreground">{source.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">{source.purpose}</p>
                <p className="mt-1 text-xs text-muted-foreground">Aplicação: {source.application}</p>
              </div>
            ))}
          </div>
        </details>
      </div>
    </div>
  );
}
