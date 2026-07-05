import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useWorkspaceEntity } from '@/lib/useWorkspaceData';
import { Plus, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AssetCard from '@/components/assets/AssetCard';

const categories = ['Todas', 'Imóveis', 'Veículos', 'Equipamentos', 'Investimentos', 'Intangíveis'];
const statuses = ['Todos', 'Ativo', 'Em Manutenção', 'Inativo', 'Alienado'];
const PAGE_SIZE = 24;

export default function Assets() {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Todas');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const AssetEntity = useWorkspaceEntity('Asset');
  const { workspaceId } = AssetEntity;

  // Debounce da busca para não refazer query a cada tecla.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  // Monta a query server-side (categoria/status são filtrados no banco).
  const buildQuery = useCallback(() => {
    const q = {};
    if (categoryFilter !== 'Todas') q.category = categoryFilter;
    if (statusFilter !== 'Todos') q.status = statusFilter;
    return q;
  }, [categoryFilter, statusFilter]);

  // Volta para a primeira página quando filtros/busca mudam.
  useEffect(() => { setPage(0); }, [debouncedSearch, categoryFilter, statusFilter]);

  useEffect(() => {
    if (!workspaceId) return;
    let active = true;
    setLoading(true);
    const query = buildQuery();

    const run = async () => {
      if (debouncedSearch) {
        // Modo busca: varre uma janela ampla e filtra por texto no cliente, depois pagina.
        const rows = await AssetEntity.filter(query, '-created_date', 2000);
        const q = debouncedSearch.toLowerCase();
        const matched = rows.filter((a) =>
          a.name?.toLowerCase().includes(q) ||
          a.plaqueta?.toLowerCase().includes(q) ||
          a.description?.toLowerCase().includes(q)
        );
        if (!active) return;
        setTotal(matched.length);
        setAssets(matched.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE));
      } else {
        // Modo normal: paginação real no servidor (skip/limit) + contagem total.
        const [rows, count] = await Promise.all([
          AssetEntity.filter(query, '-created_date', PAGE_SIZE, page * PAGE_SIZE),
          AssetEntity.count(query),
        ]);
        if (!active) return;
        setTotal(count);
        setAssets(rows);
      }
      setLoading(false);
    };
    run();
    return () => { active = false; };
  }, [workspaceId, page, debouncedSearch, categoryFilter, statusFilter, buildQuery]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const from = total === 0 ? 0 : page * PAGE_SIZE + 1;
  const to = Math.min(total, page * PAGE_SIZE + assets.length);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Ativos</h1>
          <p className="text-muted-foreground mt-1">{total} ativo(s){debouncedSearch ? ' encontrados' : ' cadastrados'}</p>
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

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : assets.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-lg font-medium text-muted-foreground">Nenhum ativo encontrado</p>
          <p className="text-sm text-muted-foreground mt-1">Tente ajustar os filtros ou cadastre um novo ativo</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {assets.map((asset) => (
              <AssetCard key={asset.id} asset={asset} />
            ))}
          </div>

          {/* Paginação */}
          <div className="flex items-center justify-between pt-2">
            <p className="text-sm text-muted-foreground">Mostrando {from}–{to} de {total}</p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="gap-1" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
                <ChevronLeft className="h-4 w-4" /> Anterior
              </Button>
              <span className="text-sm text-muted-foreground">{page + 1} / {totalPages}</span>
              <Button variant="outline" size="sm" className="gap-1" disabled={page + 1 >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Próxima <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
