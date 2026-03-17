import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Plus, Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AssetCard from '@/components/assets/AssetCard';

const categories = ['Todas', 'Imóveis', 'Veículos', 'Equipamentos', 'Investimentos', 'Intangíveis'];
const statuses = ['Todos', 'Ativo', 'Em Manutenção', 'Inativo', 'Alienado'];

export default function Assets() {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Todas');
  const [statusFilter, setStatusFilter] = useState('Todos');

  useEffect(() => {
    const loadAssets = async () => {
      const data = await base44.entities.Asset.list('-created_date', 200);
      setAssets(data);
      setLoading(false);
    };
    loadAssets();
  }, []);

  const filteredAssets = assets.filter((asset) => {
    const matchesSearch = !search || 
      asset.name.toLowerCase().includes(search.toLowerCase()) ||
      (asset.description && asset.description.toLowerCase().includes(search.toLowerCase()));
    const matchesCategory = categoryFilter === 'Todas' || asset.category === categoryFilter;
    const matchesStatus = statusFilter === 'Todos' || asset.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Ativos</h1>
          <p className="text-muted-foreground mt-1">{assets.length} ativos cadastrados</p>
        </div>
        <Link to="/AssetForm">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Novo Ativo
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar ativos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {statuses.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredAssets.map((asset) => (
          <AssetCard key={asset.id} asset={asset} />
        ))}
      </div>

      {filteredAssets.length === 0 && (
        <div className="text-center py-16">
          <p className="text-lg font-medium text-muted-foreground">Nenhum ativo encontrado</p>
          <p className="text-sm text-muted-foreground mt-1">Tente ajustar os filtros ou cadastre um novo ativo</p>
        </div>
      )}
    </div>
  );
}