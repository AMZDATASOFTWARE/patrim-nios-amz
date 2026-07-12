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
