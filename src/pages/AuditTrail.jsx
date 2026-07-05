import { useState, useEffect, useMemo } from 'react';
import { History, Search, Plus, Pencil, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useWorkspaceEntity } from '@/lib/useWorkspaceData';
import { AUDIT_ACTION_LABELS, AUDIT_ENTITY_LABELS } from '@/lib/audit';
import moment from 'moment';

const ACTION_META = {
  created: { icon: Plus, color: 'text-emerald-600 bg-emerald-100' },
  updated: { icon: Pencil, color: 'text-blue-600 bg-blue-100' },
  deleted: { icon: Trash2, color: 'text-red-600 bg-red-100' },
};

export default function AuditTrail() {
  const AuditEntity = useWorkspaceEntity('AuditLog');
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('todos');

  useEffect(() => {
    AuditEntity.list('-created_date', 500).then((data) => {
      setLogs(data);
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => logs.filter((l) => {
    if (actionFilter !== 'todos' && l.action !== actionFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (l.actor_name || '').toLowerCase().includes(q) ||
      (l.actor_email || '').toLowerCase().includes(q) ||
      (l.entity_label || '').toLowerCase().includes(q) ||
      (l.summary || '').toLowerCase().includes(q);
  }), [logs, search, actionFilter]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Trilha de Auditoria</h1>
        <p className="text-muted-foreground mt-1">Registro de quem criou, editou ou excluiu itens</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por autor, item ou descrição..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas as ações</SelectItem>
            <SelectItem value="created">Criações</SelectItem>
            <SelectItem value="updated">Edições</SelectItem>
            <SelectItem value="deleted">Exclusões</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-xl border border-border">
          <History className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-40" />
          <p className="text-lg font-medium text-foreground">Nenhum registro</p>
          <p className="text-muted-foreground mt-1">As ações sobre ativos aparecerão aqui.</p>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border shadow-sm divide-y divide-border">
          {filtered.map((l) => {
            const meta = ACTION_META[l.action] || ACTION_META.updated;
            const Icon = meta.icon;
            return (
              <div key={l.id} className="flex items-start gap-3 p-4">
                <span className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${meta.color}`}>
                  <Icon className="h-4 w-4" />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">
                    <span className="font-medium">{l.actor_name || l.actor_email || 'Alguém'}</span>{' '}
                    {AUDIT_ACTION_LABELS[l.action] || l.action}{' '}
                    <span className="text-muted-foreground">{AUDIT_ENTITY_LABELS[l.entity_type] || l.entity_type}</span>
                    {l.entity_label ? <> — <span className="font-medium">{l.entity_label}</span></> : null}
                  </p>
                  {l.summary && <p className="text-xs text-muted-foreground mt-0.5">{l.summary}</p>}
                </div>
                <span className="text-xs text-muted-foreground shrink-0">{moment(l.created_date).format('DD/MM/YYYY HH:mm')}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
