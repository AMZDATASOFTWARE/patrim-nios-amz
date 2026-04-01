import { useState, useEffect } from 'react';
import { useWorkspaceEntity } from '@/lib/useWorkspaceData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Save, TrendingDown } from 'lucide-react';
import { toast } from 'sonner';

const DEFAULT_RATES = {
  'Imóveis':      { depreciation_rate: 4,  useful_life_years: 25 },
  'Veículos':     { depreciation_rate: 20, useful_life_years: 5  },
  'Equipamentos': { depreciation_rate: 10, useful_life_years: 10 },
  'Investimentos':{ depreciation_rate: 0,  useful_life_years: 0  },
  'Intangíveis':  { depreciation_rate: 20, useful_life_years: 5  },
};

const CATEGORIES = Object.keys(DEFAULT_RATES);

export default function Settings() {
  const [configs, setConfigs] = useState({});
  const [records, setRecords] = useState({});
  const [saving, setSaving] = useState(false);
  const ConfigEntity = useWorkspaceEntity('DepreciationConfig');

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
        <h1 className="text-3xl font-bold text-foreground">Configurações</h1>
        <p className="text-muted-foreground mt-1">Defina as taxas de depreciação padrão por categoria</p>
      </div>

      <div className="bg-card rounded-xl border border-border p-6 shadow-sm space-y-4">
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
    </div>
  );
}