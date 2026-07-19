/**
 * Layout puro (sem I/O, sem React) do organograma de Filiais: recebe a floresta
 * aninhada de buildBranchForest e devolve posições absolutas dos nós + arestas.
 *
 * Algoritmo top-down "tidy tree" simplificado: cada folha ocupa um slot horizontal
 * sequencial; cada nó interno é centralizado entre o primeiro e o último filho.
 * Suficiente para a profundidade máxima do domínio (12 níveis) e larguras típicas
 * (sem threading de contorno). Uma floresta com várias raízes fica lado a lado
 * automaticamente porque o cursor de slots é compartilhado entre as raízes.
 *
 * layoutForest(roots, { collapsedIds, nodeW, nodeH, hGap, vGap, padX, padY })
 *   → { nodes:[{ id, branch, x, y, depth, hasChildren, childCount, collapsed }],
 *       edges:[{ x1, y1, x2, y2 }], width, height, nodeW, nodeH }
 * Coordenadas (x, y) = canto superior-esquerdo do card. Arestas ligam o centro
 * inferior do pai ao centro superior do filho (o componente desenha o cotovelo).
 */
export function layoutForest(roots, opts = {}) {
  const nodeW = opts.nodeW ?? 220;
  const nodeH = opts.nodeH ?? 92;
  const hGap = opts.hGap ?? 28;
  const vGap = opts.vGap ?? 52;
  const padX = opts.padX ?? 24;
  const padY = opts.padY ?? 20;
  const collapsedIds = opts.collapsedIds ?? new Set();

  const level = nodeH + vGap; // passo vertical por profundidade
  const slot = nodeW + hGap;  // passo horizontal por folha

  const nodes = [];
  const edges = [];
  let cursor = 0; // borda esquerda do próximo slot de folha (px)

  // Posiciona a subárvore de `node` e devolve o centro-x usado (para o pai centralizar).
  const place = (node, depth) => {
    const allChildren = node.children || [];
    const isCollapsed = collapsedIds.has(node.id) && allChildren.length > 0;
    const children = isCollapsed ? [] : allChildren;
    const y = depth * level;

    let cx;
    if (children.length === 0) {
      cx = cursor + nodeW / 2;
      cursor += slot;
    } else {
      const centers = children.map((c) => place(c, depth + 1));
      cx = (centers[0] + centers[centers.length - 1]) / 2;
      const childY = (depth + 1) * level;
      for (const childCx of centers) {
        edges.push({ x1: cx, y1: y + nodeH, x2: childCx, y2: childY });
      }
    }

    nodes.push({
      id: node.id,
      branch: node,
      x: cx - nodeW / 2,
      y,
      depth,
      hasChildren: allChildren.length > 0,
      childCount: allChildren.length,
      collapsed: isCollapsed,
    });
    return cx;
  };

  for (const root of roots) place(root, 0);

  // Aplica o padding e mede a área total.
  let maxX = 0;
  let maxY = 0;
  for (const n of nodes) {
    n.x += padX;
    n.y += padY;
    maxX = Math.max(maxX, n.x + nodeW);
    maxY = Math.max(maxY, n.y + nodeH);
  }
  for (const e of edges) {
    e.x1 += padX;
    e.x2 += padX;
    e.y1 += padY;
    e.y2 += padY;
  }

  return { nodes, edges, width: maxX + padX, height: maxY + padY, nodeW, nodeH };
}
