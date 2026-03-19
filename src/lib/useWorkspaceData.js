/**
 * Helper hook to always filter data by current workspace.
 * Usage: const { list, create, update, del } = useWorkspaceEntity('Asset');
 */
import { useWorkspace } from './WorkspaceContext';
import { base44 } from '@/api/base44Client';

export function useWorkspaceEntity(entityName) {
  const { workspaceId } = useWorkspace();

  const list = (sort = '-created_date', limit = 200) =>
    base44.entities[entityName].filter({ workspace_id: workspaceId }, sort, limit);

  const create = (data) =>
    base44.entities[entityName].create({ ...data, workspace_id: workspaceId });

  const update = (id, data) =>
    base44.entities[entityName].update(id, data);

  const del = (id) =>
    base44.entities[entityName].delete(id);

  const filter = (query, sort = '-created_date', limit = 200) =>
    base44.entities[entityName].filter({ ...query, workspace_id: workspaceId }, sort, limit);

  return { list, create, update, del, filter };
}