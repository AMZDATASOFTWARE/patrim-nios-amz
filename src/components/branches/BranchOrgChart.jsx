import { useMemo, useState } from 'react';
import { buildBranchForest, getDescendantIds } from '@/lib/branchTree';
import { layoutForest } from '@/lib/branchLayout';
import { Button } from '@/components/ui/button';
import { Building2, Move, Trash2, ChevronDown, ChevronRight, CornerLeftUp, GripVertical, Pencil } from 'lucide-react';

const NODE_W = 220;
const NODE_H = 92;

/**
 * Organograma (top-down) da hierarquia de Filiais. Renderiza os conectores numa
 * camada SVG e os cards como <div> posicionados absolutamente por cima. Suporta
 * recolher/expandir sub-árvores e arrastar-e-soltar para reparentar.
 *
 * IMPORTANTE: reparentar é sempre delegado ao backend via onMove (que chama a
 * function moveBranch — o campo parent_branch_id é RLS-travado). O bloqueio
 * client-side de soltar num descendente é só UX; o servidor revalida ciclo,
 * profundidade (máx. 12) e a regra de matriz-sem-pai.
 */
export default function BranchOrgChart({ branches, canManage, onMove, onDelete, onEditMove, onEdit }) {
  const [collapsedIds, setCollapsedIds] = useState(() => new Set());
  const [dragId, setDragId] = useState(null);
  const [dropTargetId, setDropTargetId] = useState(null);
  const [rootDropActive, setRootDropActive] = useState(false);

  const { roots } = useMemo(() => buildBranchForest(branches), [branches]);
  const layout = useMemo(
    () => layoutForest(roots, { collapsedIds, nodeW: NODE_W, nodeH: NODE_H, hGap: 28, vGap: 52 }),
    [roots, collapsedIds],
  );

  // Alvos inválidos ao arrastar: o próprio nó + todos os seus descendentes (evita ciclo na UI).
  const invalidTargets = useMemo(() => {
    if (!dragId) return new Set();
    const set = getDescendantIds(branches, dragId);
    set.add(dragId);
    return set;
  }, [dragId, branches]);

  const toggleCollapse = (id) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const resetDrag = () => { setDragId(null); setDropTargetId(null); setRootDropActive(false); };

  const startDrag = (e, node) => {
    if (!canManage || node.is_headquarters) return;
    setDragId(node.id);
    try {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', node.id);
      // Usa o card inteiro como "fantasma" do arraste, não só a alcinha.
      const card = e.currentTarget.closest('[data-branch-node]');
      if (card) e.dataTransfer.setDragImage(card, 24, 24);
    } catch (_) { /* noop */ }
  };

  const dropOnNode = (targetId) => {
    if (dragId && !invalidTargets.has(targetId)) onMove(dragId, targetId);
    resetDrag();
  };

  const dropOnRoot = () => {
    if (dragId) onMove(dragId, null);
    resetDrag();
  };

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm overflow-auto">
      {canManage && (
        <div
          onDragOver={(e) => { if (dragId) { e.preventDefault(); setRootDropActive(true); } }}
          onDragLeave={() => setRootDropActive(false)}
          onDrop={(e) => { e.preventDefault(); dropOnRoot(); }}
          className={`flex items-center justify-center gap-2 text-xs border-b border-border transition-all ${
            dragId ? 'py-2.5 opacity-100' : 'py-1 opacity-0 h-0 overflow-hidden pointer-events-none'
          } ${rootDropActive ? 'bg-primary/15 text-primary' : 'text-muted-foreground'}`}
        >
          <CornerLeftUp className="h-3.5 w-3.5" />
          Soltar aqui para tornar uma filial de primeiro nível (Matriz)
        </div>
      )}

      <div className="relative" style={{ width: layout.width, height: layout.height, minWidth: '100%' }}>
        <svg
          width={layout.width}
          height={layout.height}
          className="absolute inset-0 pointer-events-none"
          style={{ overflow: 'visible' }}
        >
          {layout.edges.map((e, i) => {
            const midY = (e.y1 + e.y2) / 2;
            return (
              <path
                key={i}
                d={`M ${e.x1} ${e.y1} V ${midY} H ${e.x2} V ${e.y2}`}
                fill="none"
                stroke="hsl(var(--border))"
                strokeWidth={2}
              />
            );
          })}
        </svg>

        {layout.nodes.map((n) => {
          const b = n.branch;
          const secondary = [b.code, b.cnpj, [b.city, b.state].filter(Boolean).join('/')].filter(Boolean).join(' • ');
          const isDragging = dragId === b.id;
          const isInvalid = dragId && invalidTargets.has(b.id);
          const isDropTarget = dropTargetId === b.id && dragId && !isInvalid;

          return (
            <div
              key={n.id}
              data-branch-node
              className="absolute group"
              style={{ left: n.x, top: n.y, width: NODE_W, height: NODE_H }}
              onDragOver={(e) => { if (dragId && !isInvalid) { e.preventDefault(); setDropTargetId(b.id); } }}
              onDragLeave={() => setDropTargetId((cur) => (cur === b.id ? null : cur))}
              onDrop={(e) => { e.preventDefault(); dropOnNode(b.id); }}
            >
              <div
                className={`h-full rounded-xl border-2 bg-card px-2.5 py-2 flex flex-col justify-center shadow-sm transition-all ${
                  isDropTarget ? 'border-primary ring-2 ring-primary/40' : 'border-border'
                } ${isDragging ? 'opacity-40' : ''} ${isInvalid ? 'opacity-30' : ''}`}
              >
                <div className="flex items-start gap-1.5">
                  {canManage && !b.is_headquarters && (
                    <div
                      draggable
                      onDragStart={(e) => startDrag(e, b)}
                      onDragEnd={resetDrag}
                      title="Arraste para mover para outra filial pai"
                      className="shrink-0 -ml-0.5 mt-0.5 cursor-grab active:cursor-grabbing text-muted-foreground/60 hover:text-primary"
                    >
                      <GripVertical className="h-4 w-4" />
                    </div>
                  )}
                  <Building2 className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm text-card-foreground truncate">
                      {b.name}
                      {b.is_headquarters && (
                        <span className="ml-1.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">Matriz</span>
                      )}
                    </p>
                    {secondary && <p className="text-[11px] text-muted-foreground truncate mt-0.5">{secondary}</p>}
                  </div>
                  {canManage && (
                    <div
                      className="flex gap-0.5 shrink-0"
                      draggable={false}
                      onDragStart={(e) => e.stopPropagation()}
                    >
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onEdit(b)} title="Editar dados da filial">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      {!b.is_headquarters && (
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onEditMove(b)} title="Mover para outra filial pai">
                          <Move className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => onDelete(b)} title="Excluir filial">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {n.hasChildren && (
                <button
                  type="button"
                  draggable={false}
                  onDragStart={(e) => e.stopPropagation()}
                  onClick={() => toggleCollapse(n.id)}
                  title={n.collapsed ? 'Expandir sub-filiais' : 'Recolher sub-filiais'}
                  className="absolute left-1/2 -translate-x-1/2 -bottom-3 z-20 flex items-center gap-0.5 h-6 min-w-6 px-1.5 rounded-full border border-border bg-card text-muted-foreground hover:text-primary hover:border-primary/40 shadow-sm text-[11px] font-medium"
                >
                  {n.collapsed ? (
                    <>
                      <ChevronRight className="h-3.5 w-3.5" />
                      {n.childCount}
                    </>
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5" />
                  )}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
