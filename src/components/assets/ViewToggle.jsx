import { LayoutGrid, List } from 'lucide-react';

// Alternador Card ↔ Lista compartilhado pelas telas Ativos e Etiquetas/QR.
export default function ViewToggle({ mode, onChange }) {
  const btn = (value, Icon, label) => (
    <button
      type="button"
      onClick={() => onChange(value)}
      title={label}
      aria-label={label}
      className={`flex items-center justify-center h-9 w-9 rounded-md transition-colors ${
        mode === value
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
      }`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );

  return (
    <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-0.5 flex-shrink-0">
      {btn('card', LayoutGrid, 'Visualização em cards')}
      {btn('list', List, 'Visualização em lista')}
    </div>
  );
}