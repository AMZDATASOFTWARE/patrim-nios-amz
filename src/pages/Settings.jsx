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
