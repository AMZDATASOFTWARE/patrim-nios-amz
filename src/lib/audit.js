import { base44 } from '@/api/base44Client';

/**
 * Helper de trilha de auditoria.
 *
 * O registro é feito por uma backend function (logAudit) que carimba o autor e o
 * workspace a partir da sessão — o cliente não escolhe o actor, então a trilha não
 * pode ser falsificada em nome de outro usuário. A RLS de AuditLog bloqueia create
 * pelo SDK; esta é a única via de escrita.
 *
 * Uso:
 *   await logAudit({
 *     action: 'deleted', entity_type: 'Asset', entity_id, entity_label,
 *     summary: 'Excluiu o ativo',
 *   });
 *
 * Nunca deixa uma falha de log quebrar a ação principal — por isso engole erros.
 */
export async function logAudit({ action, entity_type, entity_id = '', entity_label = '', summary = '' }) {
  try {
    await base44.functions.invoke('logAudit', { action, entity_type, entity_id, entity_label, summary });
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
