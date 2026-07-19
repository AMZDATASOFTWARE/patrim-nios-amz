/**
 * Helpers para renderizar a hierarquia de Filiais (Branch.parent_branch_id) como
 * árvore, sem depender de nenhuma chamada nova ao backend — trabalha sobre a
 * lista plana já carregada (mesmo padrão de lookup client-side já usado no
 * relatório "Bens por Grupo (Filial)" em reportCatalog.js).
 */

/** Ordena uma lista plana de Branch em DFS, anotando a profundidade (depth) de cada nó. */
export function flattenBranchTree(branches) {
  const byParent = new Map();
  for (const b of branches) {
    const key = b.parent_branch_id || null;
    const arr = byParent.get(key) || [];
    arr.push(b);
    byParent.set(key, arr);
  }

  const result = [];
  const visit = (parentId, depth) => {
    const children = (byParent.get(parentId) || []).slice().sort((a, b) => a.name.localeCompare(b.name));
    for (const child of children) {
      result.push({ ...child, depth });
      visit(child.id, depth + 1);
    }
  };
  visit(null, 0);
  return result;
}

/** Todos os ids descendentes (filhos, netos, ...) de branchId — para excluir da lista de "pai possível" na UI. */
export function getDescendantIds(branches, branchId) {
  const byParent = new Map();
  for (const b of branches) {
    const key = b.parent_branch_id || null;
    const arr = byParent.get(key) || [];
    arr.push(b.id);
    byParent.set(key, arr);
  }
  const result = new Set();
  const collect = (id) => {
    for (const childId of byParent.get(id) || []) {
      result.add(childId);
      collect(childId);
    }
  };
  collect(branchId);
  return result;
}

/** Nome resolvido de uma filial por id, ou 'Sede / Matriz' se null/vazio, ou 'Filial removida' se id inválido. */
export function branchLabel(branches, branchId) {
  if (!branchId) return 'Sede / Matriz';
  return branches.find((b) => b.id === branchId)?.name || 'Filial removida';
}

/**
 * Constrói a floresta de Filiais como estrutura aninhada { ...branch, children: [] }.
 * Raiz = parent_branch_id vazio OU apontando para um id inexistente (órfão por pai
 * deletado — defensivo, para nenhuma filial sumir do organograma). Filhos ordenados
 * por name.localeCompare (mesma ordem do flattenBranchTree). Retorna { roots, byId }.
 * Usado pelo organograma (branchLayout.js); os 3 helpers acima permanecem intactos
 * porque Sectors.jsx depende do formato { id, name, depth } do flattenBranchTree.
 */
export function buildBranchForest(branches) {
  const byId = new Map();
  for (const b of branches) byId.set(b.id, { ...b, children: [] });

  const roots = [];
  for (const b of branches) {
    const node = byId.get(b.id);
    const parent = b.parent_branch_id ? byId.get(b.parent_branch_id) : null;
    if (parent) parent.children.push(node);
    else roots.push(node); // sem pai OU pai inexistente (órfão)
  }

  const sortRec = (nodes) => {
    nodes.sort((a, b) => a.name.localeCompare(b.name));
    for (const n of nodes) sortRec(n.children);
  };
  sortRec(roots);

  return { roots, byId };
}
