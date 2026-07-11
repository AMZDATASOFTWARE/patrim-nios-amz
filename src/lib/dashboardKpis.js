/**
 * Fórmulas de KPI do /Dashboard — portadas de
 * base44/functions/generateDailyBriefings/entry.ts (mesma lógica que já
 * alimenta os 6 agentes supervisores de IA), adaptadas para rodar no client
 * a partir de dados já buscados via useWorkspaceEntity (sempre workspace_id
 * escopado pela RLS). Funções puras, sem I/O.
 */
import { getAssetDepreciation, formatCurrency as brl } from '@/lib/depreciation';

const DAY_MS = 24 * 60 * 60 * 1000;

function todayUTC() {
  return new Date(new Date().toISOString().split('T')[0] + 'T00:00:00Z').getTime();
}
function parseMs(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const t = new Date(dateStr.length <= 10 ? `${dateStr}T00:00:00Z` : dateStr).getTime();
  return Number.isNaN(t) ? null : t;
}
function daysBetween(a, b) {
  return Math.round((a - b) / DAY_MS);
}
function pct(part, total) {
  if (!total) return 0;
  return Math.round((part / total) * 1000) / 10;
}

export function computeAssetOverview(assets = [], attachments = []) {
  const assetIdsWithAttachment = new Set(attachments.map((x) => x.asset_id));
  let totalAcquisition = 0, totalCurrentValue = 0, totalAccumulated = 0;
  let undocumented = 0, fullyDepInUse = 0, cip = 0;

  for (const a of assets) {
    totalAcquisition += Number(a.acquisition_value) || 0;
    const dep = getAssetDepreciation(a, 'societaria');
    totalCurrentValue += dep.currentValue;
    totalAccumulated += dep.accumulated;
    const hasDoc = !!a.photo_url || !!a.invoice_url || assetIdsWithAttachment.has(a.id);
    if (!hasDoc) undocumented += 1;
    if (a.is_construction_in_progress) cip += 1;
    if (dep.depPct >= 99.9 && a.status === 'Ativo') fullyDepInUse += 1;
  }

  const activeCount = assets.filter((a) => a.status === 'Ativo').length;
  const undocPct = pct(undocumented, assets.length);

  return {
    totals: { totalAcquisition, totalCurrentValue, totalAccumulated, totalAssets: assets.length, activeCount },
    kpis: [
      { label: 'Sem foto ou nota fiscal', value: undocumented, formatted: `${undocumented} (${undocPct}%)`, severity: undocPct > 20 ? 'warn' : 'ok' },
      { label: 'Totalmente depreciados em uso', value: fullyDepInUse, formatted: String(fullyDepInUse), severity: fullyDepInUse > 0 ? 'warn' : 'ok' },
      { label: 'Obras em andamento (CIP)', value: cip, formatted: String(cip), severity: 'info' },
    ],
  };
}

export function computeFieldOps({ transfers = [], assignments = [], inventoryItems = [] }) {
  const today = todayUTC();

  const pendingTransfers = transfers.filter((t) => t.status === 'pendente');
  const decided = transfers.filter((t) => t.status === 'aceito' && t.decided_at && t.requested_at);
  let avgAcceptDays = 0;
  if (decided.length) {
    const sum = decided.reduce((acc, t) => {
      const d = parseMs(t.decided_at), r = parseMs(t.requested_at);
      return acc + (d && r ? Math.max(0, daysBetween(d, r)) : 0);
    }, 0);
    avgAcceptDays = Math.round((sum / decided.length) * 10) / 10;
  }
  const oldestPendingDays = pendingTransfers.reduce((mx, t) => {
    const r = parseMs(t.requested_at);
    return r ? Math.max(mx, daysBetween(today, r)) : mx;
  }, 0);

  const lateAssignments = assignments.filter((x) => x.status === 'Atrasado').length;
  const signedTerms = assignments.filter((x) => x.signed).length;
  const signedPct = pct(signedTerms, assignments.length);

  const surplusPending = inventoryItems.filter((i) => i.is_surplus && i.resolution === 'pendente_resolucao').length;
  const divergent = inventoryItems.filter((i) => i.status === 'divergente' || i.status === 'nao_encontrado').length;

  return [
    { label: 'Transferências pendentes', value: pendingTransfers.length, formatted: String(pendingTransfers.length), severity: oldestPendingDays > 7 ? 'alert' : pendingTransfers.length ? 'info' : 'ok' },
    { label: 'Pendente mais antiga', value: oldestPendingDays, formatted: pendingTransfers.length ? `${oldestPendingDays} dia(s)` : '—', severity: oldestPendingDays > 7 ? 'alert' : 'ok' },
    { label: 'Tempo médio de aceite', value: avgAcceptDays, formatted: `${avgAcceptDays} dia(s)`, severity: avgAcceptDays > 5 ? 'warn' : 'ok' },
    { label: 'Atribuições atrasadas', value: lateAssignments, formatted: String(lateAssignments), severity: lateAssignments > 0 ? 'warn' : 'ok' },
    { label: 'Termos assinados', value: signedTerms, formatted: `${signedTerms}/${assignments.length}`, severity: assignments.length && signedPct < 50 ? 'warn' : 'ok' },
    { label: 'Itens de inventário divergentes', value: divergent, formatted: String(divergent), severity: divergent > 0 ? 'warn' : 'ok' },
    { label: 'Sobras pendentes de resolução', value: surplusPending, formatted: String(surplusPending), severity: surplusPending > 0 ? 'info' : 'ok' },
  ];
}

export function computeMaintenanceContracts({ maintenanceRecords = [], contracts = [] }) {
  const today = todayUTC();

  const preventive = maintenanceRecords.filter((m) => m.type === 'Preventiva').length;
  const corrective = maintenanceRecords.filter((m) => m.type === 'Corretiva').length;
  const prevCorrRatio = corrective ? Math.round((preventive / corrective) * 100) / 100 : (preventive ? 999 : 0);
  const overdueMaint = maintenanceRecords.filter((m) => {
    if (m.status !== 'agendada') return false;
    const s = parseMs(m.scheduled_date);
    return s && s < today;
  }).length;
  const maintCost = maintenanceRecords.reduce((acc, m) => acc + (Number(m.cost) || 0), 0);

  const contractsExpiring = contracts.filter((c) => {
    const e = parseMs(c.end_date);
    return e && daysBetween(e, today) >= 0 && daysBetween(e, today) <= 30;
  }).length;
  const contractValue = contracts.reduce((acc, c) => {
    const e = parseMs(c.end_date);
    return e && e >= today ? acc + (Number(c.value) || 0) : acc;
  }, 0);

  return [
    { label: 'Preventiva × Corretiva', value: prevCorrRatio, formatted: corrective ? `${prevCorrRatio}:1` : `${preventive}:0`, severity: corrective > preventive ? 'warn' : 'ok' },
    { label: 'Manutenções atrasadas', value: overdueMaint, formatted: String(overdueMaint), severity: overdueMaint > 0 ? 'warn' : 'ok' },
    { label: 'Custo de manutenção (total)', value: maintCost, formatted: brl(maintCost), severity: 'info' },
    { label: 'Contratos vencendo (30 dias)', value: contractsExpiring, formatted: String(contractsExpiring), severity: contractsExpiring > 0 ? 'warn' : 'ok' },
    { label: 'Valor sob contrato vigente', value: contractValue, formatted: brl(contractValue), severity: 'info' },
  ];
}

export function computeFiscal({ assets = [], ciapCredits = [] }) {
  let totalSocAcc = 0, totalFisAcc = 0;
  for (const a of assets) {
    totalSocAcc += getAssetDepreciation(a, 'societaria').accumulated;
    totalFisAcc += getAssetDepreciation(a, 'fiscal').accumulated;
  }
  const socFisDiff = totalSocAcc - totalFisAcc;

  const ciapTotal = ciapCredits.reduce((acc, c) => acc + (Number(c.icms_value) || 0), 0);
  const ciapMonthly = ciapCredits
    .filter((c) => c.status === 'em_apropriacao')
    .reduce((acc, c) => acc + (Number(c.monthly_credit_value) || 0), 0);
  const pisCofinsPotential = ciapCredits.reduce((acc, c) => {
    const base = Number(c.pis_cofins_base) || 0;
    const rate = (Number(c.pis_rate) || 0) + (Number(c.cofins_rate) || 0);
    return acc + base * (rate / 100);
  }, 0);
  const totalInstallments = ciapCredits.reduce((acc, c) => acc + (Number(c.installments_total) || 0), 0);
  const appropriatedInstallments = ciapCredits.reduce((acc, c) => acc + (Number(c.installments_appropriated) || 0), 0);
  const ciapProgress = pct(appropriatedInstallments, totalInstallments);

  return [
    { label: 'Diferença societária × fiscal', value: socFisDiff, formatted: brl(socFisDiff), severity: Math.abs(socFisDiff) > 0 ? 'info' : 'ok' },
    { label: 'CIAP total (ICMS)', value: ciapTotal, formatted: brl(ciapTotal), severity: 'info' },
    { label: 'CIAP crédito mensal', value: ciapMonthly, formatted: brl(ciapMonthly), severity: 'info' },
    { label: 'Progresso de apropriação CIAP', value: ciapProgress, formatted: `${ciapProgress}%`, severity: 'info' },
    { label: 'Crédito PIS/COFINS potencial', value: pisCofinsPotential, formatted: brl(pisCofinsPotential), severity: pisCofinsPotential > 0 ? 'info' : 'ok' },
  ];
}

export function computeRegistries({ branches = [], suppliers = [], collaborators = [], assignments = [] }) {
  const activeBranches = branches.filter((b) => b.status === 'ativa').length;
  const blockedSuppliers = suppliers.filter((s) => s.status === 'Bloqueado' || s.status === 'Inativo').length;

  const activeAssignments = assignments.filter((x) => x.status === 'Ativo' || x.status === 'Atrasado');
  const custodianEmails = new Set(activeAssignments.map((x) => x.collaborator_email).filter(Boolean));
  const activeCollab = collaborators.filter((c) => c.status === 'Ativo');
  const collabWithoutAsset = activeCollab.filter((c) => c.email && !custodianEmails.has(c.email)).length;

  return [
    { label: 'Filiais ativas', value: activeBranches, formatted: String(activeBranches), severity: 'info' },
    { label: 'Fornecedores bloqueados/inativos', value: blockedSuppliers, formatted: String(blockedSuppliers), severity: blockedSuppliers > 0 ? 'info' : 'ok' },
    { label: 'Colaboradores ativos', value: activeCollab.length, formatted: String(activeCollab.length), severity: 'info' },
    { label: 'Colaboradores sem ativo', value: collabWithoutAsset, formatted: String(collabWithoutAsset), severity: 'ok' },
  ];
}

export function computeActivity(auditLogs = []) {
  const today = todayUTC();
  const todayLogs = auditLogs.filter((l) => {
    const c = parseMs(l.created_date);
    return c && c >= today;
  });
  const created = todayLogs.filter((l) => l.action === 'created').length;
  const updated = todayLogs.filter((l) => l.action === 'updated').length;
  const deleted = todayLogs.filter((l) => l.action === 'deleted').length;

  return [
    { label: 'Ações hoje', value: todayLogs.length, formatted: String(todayLogs.length), severity: 'info' },
    { label: 'Cadastros hoje', value: created, formatted: String(created), severity: 'ok' },
    { label: 'Alterações hoje', value: updated, formatted: String(updated), severity: 'info' },
    { label: 'Exclusões hoje', value: deleted, formatted: String(deleted), severity: deleted > 5 ? 'warn' : 'ok' },
  ];
}

const EXPIRATION_LABEL = { warranty: 'Garantia', review: 'Revisão', ipva: 'IPVA', contract: 'Contrato' };

/**
 * Vencimentos próximos (garantia/revisão/IPVA de Asset + fim de vigência de
 * Contract), unificados e ordenados por urgência. Mesma janela de -14/+30
 * dias usada nas seções "reminders" já existentes no Dashboard antigo.
 */
export function computeUpcomingExpirations(assets = [], contracts = []) {
  const today = todayUTC();
  const items = [];

  const pushIfSoon = (dateStr, type, id, name) => {
    const t = parseMs(dateStr);
    if (!t) return;
    const days = daysBetween(t, today);
    if (days >= -14 && days <= 30) {
      items.push({ type, label: EXPIRATION_LABEL[type], days, date: dateStr, id, name: name || 'Item' });
    }
  };

  for (const a of assets) {
    pushIfSoon(a.warranty_expiry_date, 'warranty', a.id, a.name);
    pushIfSoon(a.next_review_date, 'review', a.id, a.name);
    pushIfSoon(a.vehicle_ipva_due_date, 'ipva', a.id, a.name);
  }
  for (const c of contracts) {
    pushIfSoon(c.end_date, 'contract', c.asset_id, c.title || c.type);
  }

  return items.sort((a, b) => a.days - b.days);
}
