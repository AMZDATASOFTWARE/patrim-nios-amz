import { useState, useEffect, useMemo, useCallback } from 'react';
import { History, Search, RefreshCw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useWorkspaceEntity } from '@/lib/useWorkspaceData';
import { AUDIT_ENTITY_LABELS } from '@/lib/audit';
import AuditLogEntry from '@/components/audit/AuditLogEntry';
import moment from 'moment';

export default function AuditTrail() {
  const AuditEntity = useWorkspaceEntity('AuditLog');
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('todos');
  const [entityFilter, setEntityFilter] = useState('todos');

  const load = useCallback(() => {
    setLoading(true);
    AuditEntity.list('-created_date', 500).then((data) => {
      setLogs(data);
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const entityTypes = useMemo(() => {
    const set = new Set(logs.map((l) => l.entity_type).filter(Boolean));
    return Array.from(set).sort();
  }, [logs]);

  const filtered = useMemo(() => logs.filter((l) => {
    if (actionFilter !== 'todos' && l.action !== actionFilter) return false;
    if (entityFilter !== 'todos' && l.entity_type !== entityFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (l.actor_name || '').toLowerCase().includes(q) ||
      (l.actor_email || '').toLowerCase().includes(q) ||
      (l.entity_type || '').toLowerCase().includes(q) ||
      (l.entity_label || '').toLowerCase().includes(q) ||
      (l.summary || '').toLowerCase().includes(q);
  }), [logs, search, actionFilter, entityFilter]);

  const todayCount = useMemo(() => {
    const today = moment().startOf('day');
    return logs.filter((l) => moment(l.created_date).isAfter(today)).length;
  }, [logs]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Log de Auditoria</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {logs.length} registro{logs.length !== 1 ? 's' : ''} no total · {todayCount} hoje
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por usuário, entidade ou descrição..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas ações</SelectItem>
            <SelectItem value="created">Criações</SelectItem>
            <SelectItem value="updated">Atualizações</SelectItem>
            <SelectItem value="deleted">Exclusões</SelectItem>
          </SelectContent>
        </Select>
        <Select value={entityFilter} onValueChange={setEntityFilter}>
          <SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas entidades</SelectItem>
            {entityTypes.map((type) => (
              <SelectItem key={type} value={type}>
                {AUDIT_ENTITY_LABELS[type] || type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-xl border border-border">
          <History className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-40" />
          <p className="text-lg font-medium text-foreground">Nenhum registro</p>
          <p className="text-muted-foreground mt-1">As ações sobre ativos aparecerão aqui.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((log) => (
            <AuditLogEntry key={log.id} log={log} />
          ))}
        </div>
      )}
    </div>
  );
}