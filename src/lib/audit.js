/**
 * Helper de trilha de auditoria.
 *
 * Uso:
 *   const AuditEntity = useWorkspaceEntity('AuditLog');
 *   await logAudit(AuditEntity, {
 *     action: 'deleted', entity_type: 'Asset', entity_id, entity_label,
 *     summary: 'Excluiu o ativo', actor: user,
 *   });
 *
 * Nunca deixa uma falha de log quebrar a ação principal — por isso engole erros.
 */
export async function logAudit(AuditEntity, { action, entity_type, entity_id = '', entity_label = '', summary = '', actor }) {
  try {
    await AuditEntity.create({
      actor_email: actor?.email || '',
      actor_name: actor?.full_name || actor?.email || '',
      action,
      entity_type,
      entity_id,
      entity_label,
      summary,
    });
  } catch (_) {
    // Auditoria é best-effort; não interrompe o fluxo do usuário.
  }
}

export const AUDIT_ACTION_LABELS = {
  created: 'criou',
  updated: 'editou',
  deleted: 'excluiu',
};

export const AUDIT_ENTITY_LABELS = {
  Asset: 'Ativo',
  Supplier: 'Fornecedor',
  Collaborator: 'Colaborador',
  MaintenanceRecord: 'Manutenção',
  AssetAssignment: 'Termo de responsabilidade',
  InventoryCount: 'Inventário',
};
