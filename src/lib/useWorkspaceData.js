/**
 * Helper hook to always filter data by current workspace.
 * Usage: const { list, create, update, del } = useWorkspaceEntity('Asset');
 */
import { useWorkspace } from './WorkspaceContext';
import { base44 } from '@/api/base44Client';

export function useWorkspaceEntity(entityName) {
  const { workspaceId } = useWorkspace();

  const list = (sort = '-created_date', limit = 200) => {
    if (!workspaceId) return Promise.resolve([]);
    return base44.entities[entityName].filter({ workspace_id: workspaceId }, sort, limit);
  };

  const create = (data) =>
    base44.entities[entityName].create({ ...data, workspace_id: workspaceId });

  const update = (id, data) =>
    base44.entities[entityName].update(id, data);

  const del = (id) =>
    base44.entities[entityName].delete(id);

  // Busca TODOS os registros do workspace, paginando em lotes de 1000 —
  // evita o corte silencioso que distorcia os KPIs quando havia 1000+ registros.
  const listAll = async (sort = '-created_date') => {
    if (!workspaceId) return [];
    const BATCH = 1000;
    const all = [];
    let skip = 0;
    for (;;) {
      const batch = await base44.entities[entityName].filter(
        { workspace_id: workspaceId }, sort, BATCH, skip
      );
      all.push(...batch);
      if (batch.length < BATCH) break;
      skip += BATCH;
    }
    return all;
  };

  const filter = (query, sort = '-created_date', limit = 200, skip = 0) => {
    if (!workspaceId) return Promise.resolve([]);
    return base44.entities[entityName].filter({ ...query, workspace_id: workspaceId }, sort, limit, skip);
  };

  // Como listAll, porém com um filtro adicional — pagina TODOS os registros que
  // casam o query (sempre escopado ao workspace), em lotes de 1000. Use quando a
  // tela precisa da coleção completa e não de uma janela.
  const filterAll = async (query = {}, sort = '-created_date') => {
    if (!workspaceId) return [];
    const BATCH = 1000;
    const all = [];
    let skip = 0;
    for (;;) {
      const batch = await base44.entities[entityName].filter(
        { ...query, workspace_id: workspaceId }, sort, BATCH, skip
      );
      all.push(...batch);
      if (batch.length < BATCH) break;
      skip += BATCH;
    }
    return all;
  };

  // Contagem leve: busca só o campo id (janela ampla) e conta. Serve para paginação/limites.
  const count = async (query = {}, cap = 100000) => {
    if (!workspaceId) return 0;
    const rows = await base44.entities[entityName].filter(
      { ...query, workspace_id: workspaceId }, '-created_date', cap, 0, ['id']
    );
    return rows.length;
  };

  return { list, listAll, create, update, del, filter, filterAll, count, workspaceId };
}