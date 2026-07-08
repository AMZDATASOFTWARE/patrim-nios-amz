import { Button } from '@/components/ui/button';
import { MessageSquare, Trash2, Plus } from 'lucide-react';
import { format } from 'date-fns';

// Histórico de conversas do assistente: seleção, criação e exclusão (ocultação) de conversas.
export default function ConversationList({ conversations, activeId, onSelect, onDelete, onNew }) {
  return (
    <div className="flex flex-col h-full">
      <Button variant="outline" size="sm" onClick={onNew} className="gap-2 mb-3 w-full">
        <Plus className="h-4 w-4" /> Nova conversa
      </Button>
      <div className="flex-1 overflow-y-auto space-y-1">
        {conversations.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-6">Nenhuma conversa ainda.</p>
        )}
        {conversations.map((c) => (
          <div
            key={c.id}
            className={`group flex items-center gap-2 rounded-lg px-3 py-2 cursor-pointer transition-colors ${
              c.id === activeId ? 'bg-primary/10 text-primary' : 'hover:bg-muted text-card-foreground'
            }`}
            onClick={() => onSelect(c.id)}
          >
            <MessageSquare className="h-4 w-4 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm truncate">{c.metadata?.name || 'Conversa'}</p>
              <p className="text-[11px] text-muted-foreground">
                {c.created_date ? format(new Date(c.created_date), 'dd/MM/yyyy HH:mm') : ''}
              </p>
            </div>
            <button
              type="button"
              className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
              onClick={(e) => { e.stopPropagation(); onDelete(c.id); }}
              title="Apagar conversa"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}