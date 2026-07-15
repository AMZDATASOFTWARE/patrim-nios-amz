import { createClientFromRequest } from 'npm:@base44/sdk@0.8.35';

// Scheduled daily job that builds the "newspaper front page" of AI supervisor
// briefings — one AiBriefing row per (workspace, domain), 7 domains per workspace.
//
// ISOLATION MODEL (the whole point of this design):
// The job runs via service-role (asServiceRole) because a cron has no logged-in
// user. service-role IGNORES RLS entirely, so we NEVER let the LLM read entities.
// Instead, for EACH workspace we compute the KPIs ourselves — every entity query
// is explicitly scoped with { workspace_id: wsId } — and hand the LLM ONLY that
// already-isolated JSON. The model receives numbers, never a data tool. This is
// the same service-role-scoped-per-tenant pattern as dispatchExpiryAlerts.
//
// The 7 supervisor agents (base44/agents/supervisor_*.jsonc) exist as real Base44
// resources carrying the persona/contract (and are ready for a future in-app chat
// where the logged-in user's RLS applies). For this batch job the text is produced
// via svc.integrations.Core.InvokeLLM — the integration path already proven in this
// project under service-role — passing each agent's persona as the system prompt.
//
// Trigger: a scheduled (cron) automation created in the Base44 dashboard (the MCP
// sync does NOT create automations from a function.jsonc — same lesson as
// dispatchExpiryAlerts / appropriateCiapCredits). Can also be called manually by a
// platform admin for testing, optionally with { dry_run: true, only_workspace_id }.

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DAY_MS = 24 * 60 * 60 * 1000;
const nowMs = () => new Date().getTime();
const todayUTC = () => new Date(new Date().toISOString().split('T')[0] + 'T00:00:00Z').getTime();

function daysBetween(a: number, b: number): number {
  return Math.round((a - b) / DAY_MS);
}
function parseMs(dateStr: unknown): number | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const t = new Date(dateStr.length <= 10 ? `${dateStr}T00:00:00Z` : dateStr).getTime();
  return Number.isNaN(t) ? null : t;
}
function brl(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
function pct(part: number, total: number): number {
  if (!total) return 0;
  return Math.round((part / total) * 1000) / 10;
}

// ---- Depreciation (enxuto, replicando src/lib/depreciation.js sem importar o front) ----
function usefulLifeFromRate(rate: number): number {
  if (!rate || rate <= 0) return 0;
  return 100 / rate;
}
function accumulatedDep(startStr: unknown, acquisition: number, residual: number, life: number): number {
  const start = parseMs(startStr);
  if (!start || !life || life <= 0) return 0;
  const s = new Date(start);
  const t = new Date();
  const months = (t.getUTCFullYear() - s.getUTCFullYear()) * 12 + (t.getUTCMonth() - s.getUTCMonth());
  if (months <= 0) return 0;
  const monthly = (acquisition - residual) / life / 12;
  return Math.min(months * monthly, acquisition - residual);
}
interface Book { accumulated: number; current: number; }
function assetBooks(a: Record<string, unknown>): { soc: Book; fis: Book } {
  const acq = Number(a.acquisition_value) || 0;
  if (a.is_construction_in_progress) {
    return { soc: { accumulated: 0, current: acq }, fis: { accumulated: 0, current: acq } };
  }
  const socLife = Number(a.useful_life_years) || usefulLifeFromRate(Number(a.depreciation_rate));
  const socRes = Number(a.residual_value) || 0;
  const socAcc = accumulatedDep(a.purchase_date, acq, socRes, socLife);
  const hasFiscal = !!(a.fiscal_depreciation_rate || a.fiscal_useful_life_years);
  let fisAcc = socAcc;
  if (hasFiscal) {
    const fLife = Number(a.fiscal_useful_life_years) || usefulLifeFromRate(Number(a.fiscal_depreciation_rate));
    const fRes = Number(a.fiscal_residual_value) || 0;
    fisAcc = accumulatedDep(a.fiscal_depreciation_start_date || a.purchase_date, acq, fRes, fLife);
  }
  return { soc: { accumulated: socAcc, current: acq - socAcc }, fis: { accumulated: fisAcc, current: acq - fisAcc } };
}

interface Kpi { label: string; value: number; formatted: string; severity: 'ok' | 'info' | 'warn' | 'alert'; }

interface DomainBriefing {
  domain: string;
  agent_name: string;
  kpis: Kpi[];
  // Compact facts object handed to the LLM (already isolated to this workspace).
  facts: Record<string, unknown>;
}

const AGENT_BY_DOMAIN: Record<string, string> = {
  assets_docs: 'supervisor_ativos',
  field_ops: 'supervisor_operacao_campo',
  maintenance_contracts: 'supervisor_manutencao_contratos',
  fiscal_accounting: 'supervisor_fiscal_contabil',
  registries_structure: 'supervisor_cadastros',
  governance_admin: 'supervisor_governanca',
  org_structure: 'supervisor_estrutura',
};

// Persona system prompts mirror the agents' .jsonc instructions (kept short here;
// the .jsonc files are the canonical persona and drive the future chat surface).
const PERSONA: Record<string, string> = {
  assets_docs: 'Você é o Supervisor de Ativos & Documentação: orquestrador + jornalista investigativo. Escreva a manchete do dia sobre patrimônio e cobertura documental.',
  field_ops: 'Você é o Supervisor de Operação de Campo: orquestrador + jornalista investigativo. Escreva a manchete do dia sobre inventário, transferências e termos de responsabilidade.',
  maintenance_contracts: 'Você é o Supervisor de Manutenção & Contratos: orquestrador + jornalista investigativo. A razão preventiva×corretiva é o indicador de maturidade mais importante.',
  fiscal_accounting: 'Você é o Supervisor Fiscal & Contábil: orquestrador + jornalista investigativo, com vocabulário de contador brasileiro (CIAP, PIS/COFINS, depreciação fiscal×societária). Nunca dê conselho fiscal definitivo — sinalize e recomende validação com contador.',
  registries_structure: 'Você é o Supervisor de Cadastros: orquestrador + jornalista investigativo. Escreva sobre filiais (registro básico), fornecedores e colaboradores — a hierarquia de filiais e os vínculos de setor são do supervisor de Estrutura Organizacional.',
  governance_admin: 'Você é o Supervisor de Administração & Governança: orquestrador + jornalista investigativo. Escreva sobre auditoria e uso do sistema.',
  org_structure: 'Você é o Supervisor de Estrutura Organizacional: orquestrador + jornalista investigativo. Escreva sobre setores, hierarquia de filiais e vínculos de colaboradores.',
};

// deno-lint-ignore no-explicit-any
async function fetchAll(svc: any, entity: string, wsId: string): Promise<Record<string, unknown>[]> {
  try {
    return await svc.entities[entity].filter({ workspace_id: wsId }, '-created_date', 5000);
  } catch (_) {
    return [];
  }
}

function currentCompetenceMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

function summarizeMonthlyParameters(
  rows: Record<string, unknown>[],
  competenceMonth: string,
): Record<string, unknown> {
  const active = rows.filter((row) =>
    row.competence_month === competenceMonth && row.status === 'active'
  );

  if (!active.length) {
    return {
      competencia: competenceMonth,
      snapshots_ativos: 0,
      dominios: {},
      campos: {},
      destaques: [],
    };
  }

  const confidenceRank: Record<string, number> = { high: 3, medium: 2, low: 1 };
  const domains: Record<string, number> = {};
  const fields: Record<string, number> = {};

  for (const row of active) {
    const domain = typeof row.domain === 'string' ? row.domain : 'unknown';
    const field = typeof row.field_name === 'string' ? row.field_name : 'unknown';
    domains[domain] = (domains[domain] || 0) + 1;
    fields[field] = (fields[field] || 0) + 1;
  }

  const highlights = active
    .slice()
    .sort((a, b) => {
      const confidenceDiff =
        (confidenceRank[String(b.confidence_level || 'medium')] || 0) -
        (confidenceRank[String(a.confidence_level || 'medium')] || 0);
      if (confidenceDiff !== 0) return confidenceDiff;
      return String(b.retrieved_at || '').localeCompare(String(a.retrieved_at || ''));
    })
    .slice(0, 5)
    .map((row) => ({
      parameter_key: row.parameter_key,
      domain: row.domain,
      field_name: row.field_name,
      scope_key: row.scope_key,
      value: row.value,
      unit: row.unit || '',
      source_name: row.source_name || '',
      confidence_level: row.confidence_level || 'medium',
      notes: row.notes || '',
    }));

  return {
    competencia: competenceMonth,
    snapshots_ativos: active.length,
    dominios: domains,
    campos: fields,
    destaques: highlights,
  };
}

// deno-lint-ignore no-explicit-any
async function computeWorkspace(svc: any, wsId: string): Promise<DomainBriefing[]> {
  const today = todayUTC();
  const competenceMonth = currentCompetenceMonth();
  const [
    assets, attachments, transfers, invItems, assignments, maintenance, contracts, ciap,
    branches, suppliers, collaborators, audit,
    disposals, revaluations, loans, sectors, mappingRules, collabBranchLinks, collabSectorLinks,
    monthlyParameterSnapshots,
  ] = await Promise.all([
      fetchAll(svc, 'Asset', wsId),
      fetchAll(svc, 'AssetAttachment', wsId),
      fetchAll(svc, 'AssetTransfer', wsId),
      fetchAll(svc, 'InventoryItem', wsId),
      fetchAll(svc, 'AssetAssignment', wsId),
      fetchAll(svc, 'MaintenanceRecord', wsId),
      fetchAll(svc, 'Contract', wsId),
      fetchAll(svc, 'CiapCredit', wsId),
      fetchAll(svc, 'Branch', wsId),
      fetchAll(svc, 'Supplier', wsId),
      fetchAll(svc, 'Collaborator', wsId),
      fetchAll(svc, 'AuditLog', wsId),
      fetchAll(svc, 'AssetDisposal', wsId),
      fetchAll(svc, 'AssetRevaluation', wsId),
      fetchAll(svc, 'AssetLoan', wsId),
      fetchAll(svc, 'Sector', wsId),
      fetchAll(svc, 'AccountMappingRule', wsId),
      fetchAll(svc, 'CollaboratorBranchLink', wsId),
      fetchAll(svc, 'CollaboratorSectorLink', wsId),
      fetchAll(svc, 'MonthlyParameterSnapshot', wsId),
    ]);
  const monthlyParameterSummary = summarizeMonthlyParameters(monthlyParameterSnapshots, competenceMonth);

  // ---------- 1. assets_docs ----------
  const assetIdsWithAttachment = new Set(attachments.map((x) => x.asset_id));
  let totalAcq = 0, totalSocCurrent = 0, totalSocAcc = 0, totalFisAcc = 0, undocumented = 0, fullyDepInUse = 0, cip = 0;
  for (const a of assets) {
    const acq = Number(a.acquisition_value) || 0;
    totalAcq += acq;
    const { soc, fis } = assetBooks(a);
    totalSocCurrent += soc.current;
    totalSocAcc += soc.accumulated;
    totalFisAcc += fis.accumulated;
    const hasDoc = !!a.photo_url || !!a.invoice_url || assetIdsWithAttachment.has(a.id);
    if (!hasDoc) undocumented += 1;
    if (a.is_construction_in_progress) cip += 1;
    const depPct = acq > 0 ? (soc.accumulated / acq) * 100 : 0;
    if (depPct >= 99.9 && a.status === 'Ativo') fullyDepInUse += 1;
  }
  const assetsKpis: Kpi[] = [
    { label: 'Patrimônio total', value: Math.round(totalSocCurrent), formatted: brl(totalSocCurrent), severity: 'info' },
    { label: 'Sem foto/nota', value: undocumented, formatted: `${undocumented} (${pct(undocumented, assets.length)}%)`, severity: pct(undocumented, assets.length) > 20 ? 'warn' : 'ok' },
    { label: 'Depreciados em uso', value: fullyDepInUse, formatted: String(fullyDepInUse), severity: fullyDepInUse > 0 ? 'warn' : 'ok' },
  ];
  const monthStart = new Date(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1).getTime();
  const disposalsThisMonth = disposals.filter((d) => { const t = parseMs(d.disposal_date); return t && t >= monthStart; }).length;
  const revaluationsThisMonth = revaluations.filter((r) => { const t = parseMs(r.revaluation_date); return t && t >= monthStart; }).length;

  // ---------- 2. field_ops ----------
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
  const activeAssignments = assignments.filter((x) => x.status === 'Ativo' || x.status === 'Atrasado');
  const lateAssignments = assignments.filter((x) => x.status === 'Atrasado').length;
  const signedTerms = assignments.filter((x) => x.signed).length;
  const surplusPending = invItems.filter((i) => i.is_surplus && i.resolution === 'pendente_resolucao').length;
  const counted = invItems.filter((i) => i.status !== 'pendente');
  const divergent = invItems.filter((i) => i.status === 'divergente' || i.status === 'nao_encontrado').length;
  const inventoryAccuracy = counted.length ? pct(counted.length - divergent, counted.length) : 100;
  const loansActive = loans.filter((l) => l.status === 'emprestado').length;
  const loansOverdue = loans.filter((l) => {
    if (l.status !== 'emprestado') return false;
    const d = parseMs(l.expected_return_date);
    return d && d < today;
  }).length;
  const fieldKpis: Kpi[] = [
    { label: 'Transferências pendentes', value: pendingTransfers.length, formatted: String(pendingTransfers.length), severity: oldestPendingDays > 7 ? 'alert' : pendingTransfers.length ? 'info' : 'ok' },
    { label: 'Acurácia de inventário', value: inventoryAccuracy, formatted: `${inventoryAccuracy}%`, severity: inventoryAccuracy < 80 ? 'warn' : 'ok' },
    { label: 'Termos assinados', value: signedTerms, formatted: `${signedTerms}/${assignments.length}`, severity: assignments.length && pct(signedTerms, assignments.length) < 50 ? 'warn' : 'ok' },
  ];

  // ---------- 3. maintenance_contracts ----------
  const preventive = maintenance.filter((m) => m.type === 'Preventiva').length;
  const corrective = maintenance.filter((m) => m.type === 'Corretiva').length;
  const prevCorrRatio = corrective ? Math.round((preventive / corrective) * 100) / 100 : (preventive ? 999 : 0);
  const overdueMaint = maintenance.filter((m) => {
    if (m.status !== 'agendada') return false;
    const s = parseMs(m.scheduled_date);
    return s && s < today;
  }).length;
  const maintCost = maintenance.reduce((acc, m) => acc + (Number(m.cost) || 0), 0);
  const contractsExpiring = contracts.filter((c) => {
    const e = parseMs(c.end_date);
    return e && daysBetween(e, today) >= 0 && daysBetween(e, today) <= 30;
  }).length;
  const contractValue = contracts.reduce((acc, c) => {
    const e = parseMs(c.end_date);
    return e && e >= today ? acc + (Number(c.value) || 0) : acc;
  }, 0);
  const maintKpis: Kpi[] = [
    { label: 'Preventiva×Corretiva', value: prevCorrRatio, formatted: corrective ? `${prevCorrRatio}:1` : `${preventive}:0`, severity: corrective > preventive ? 'warn' : 'ok' },
    { label: 'Manutenções atrasadas', value: overdueMaint, formatted: String(overdueMaint), severity: overdueMaint > 0 ? 'warn' : 'ok' },
    { label: 'Contratos vencendo (30d)', value: contractsExpiring, formatted: String(contractsExpiring), severity: contractsExpiring > 0 ? 'warn' : 'ok' },
  ];

  // ---------- 4. fiscal_accounting ----------
  const socFisDiff = totalSocAcc - totalFisAcc;
  const ciapTotal = ciap.reduce((acc, c) => acc + (Number(c.icms_value) || 0), 0);
  const ciapMonthly = ciap.filter((c) => c.status === 'em_apropriacao').reduce((acc, c) => acc + (Number(c.monthly_credit_value) || 0), 0);
  const pisCofinsPotential = ciap.reduce((acc, c) => {
    const base = Number(c.pis_cofins_base) || 0;
    const rate = (Number(c.pis_rate) || 0) + (Number(c.cofins_rate) || 0);
    return acc + base * (rate / 100);
  }, 0);
  // Mesma logica de casamento (categoria/setor/centro_custo/todos) usada em
  // src/pages/AccountingExport.jsx `ruleFor()`, portada aqui sem importar o front.
  const ruleFor = (asset: Record<string, unknown>) => {
    return mappingRules.find((r) => r.match_type === 'categoria' && r.match_value === asset.category)
      || mappingRules.find((r) => r.match_type === 'setor' && r.match_value === (asset.sector_id || ''))
      || mappingRules.find((r) => r.match_type === 'centro_custo' && r.match_value === (asset.cost_center || ''))
      || mappingRules.find((r) => r.match_type === 'todos')
      || null;
  };
  const assetsWithoutMappingRule = assets.filter((a) => a.status !== 'Alienado' && a.status !== 'Inativo' && !ruleFor(a)).length;
  const fiscalKpis: Kpi[] = [
    { label: 'CIAP mensal', value: Math.round(ciapMonthly), formatted: brl(ciapMonthly), severity: 'info' },
    { label: 'Crédito PIS/COFINS potencial', value: Math.round(pisCofinsPotential), formatted: brl(pisCofinsPotential), severity: pisCofinsPotential > 0 ? 'info' : 'ok' },
    { label: 'Sem regra contábil', value: assetsWithoutMappingRule, formatted: String(assetsWithoutMappingRule), severity: assetsWithoutMappingRule > 0 ? 'warn' : 'ok' },
  ];

  // ---------- 5. registries_structure ----------
  const activeBranches = branches.filter((b) => b.status === 'ativa').length;
  const blockedSuppliers = suppliers.filter((s) => s.status === 'Bloqueado' || s.status === 'Inativo').length;
  const custodianEmails = new Set(activeAssignments.map((x) => x.collaborator_email).filter(Boolean));
  const activeCollab = collaborators.filter((c) => c.status === 'Ativo');
  const collabWithoutAsset = activeCollab.filter((c) => c.email && !custodianEmails.has(c.email)).length;
  // Value per branch (Asset.branch_id × Branch) — top branch.
  const branchValue: Record<string, number> = {};
  for (const a of assets) {
    const bid = (a.branch_id as string) || '__none__';
    const { soc } = assetBooks(a);
    branchValue[bid] = (branchValue[bid] || 0) + soc.current;
  }
  let topBranchName = '', topBranchValue = 0;
  for (const [bid, val] of Object.entries(branchValue)) {
    if (val > topBranchValue) {
      topBranchValue = val;
      topBranchName = bid === '__none__' ? 'Sem filial' : ((branches.find((b) => b.id === bid)?.name as string) || 'Filial');
    }
  }
  const custodianUnsignedEmails = new Set(
    assignments.filter((x) => (x.status === 'Ativo' || x.status === 'Atrasado') && !x.signed && x.collaborator_email).map((x) => x.collaborator_email)
  );
  const collabWithAssetUnsigned = custodianUnsignedEmails.size;
  const regKpis: Kpi[] = [
    { label: 'Filiais ativas', value: activeBranches, formatted: String(activeBranches), severity: 'info' },
    { label: 'Fornecedores bloqueados/inativos', value: blockedSuppliers, formatted: String(blockedSuppliers), severity: blockedSuppliers > 0 ? 'info' : 'ok' },
    { label: 'Sem termo assinado', value: collabWithAssetUnsigned, formatted: String(collabWithAssetUnsigned), severity: collabWithAssetUnsigned > 0 ? 'warn' : 'ok' },
  ];

  // ---------- 6. governance_admin ----------
  const auditToday = audit.filter((l) => {
    const c = parseMs(l.created_date);
    return c && c >= today;
  });
  const deletionsToday = auditToday.filter((l) => l.action === 'deleted').length;
  const actorCount: Record<string, number> = {};
  for (const l of auditToday) {
    const e = (l.actor_email as string) || 'desconhecido';
    actorCount[e] = (actorCount[e] || 0) + 1;
  }
  let topActor = '', topActorCount = 0;
  for (const [e, n] of Object.entries(actorCount)) {
    if (n > topActorCount) { topActorCount = n; topActor = e; }
  }
  const govKpis: Kpi[] = [
    { label: 'Ações hoje', value: auditToday.length, formatted: String(auditToday.length), severity: 'info' },
    { label: 'Exclusões hoje', value: deletionsToday, formatted: String(deletionsToday), severity: deletionsToday > 5 ? 'warn' : 'ok' },
    { label: 'Usuários ativos hoje', value: Object.keys(actorCount).length, formatted: String(Object.keys(actorCount).length), severity: 'ok' },
  ];

  // ---------- 7. org_structure ----------
  const activeSectors = sectors.filter((s) => s.status !== 'inativo');
  const branchesWithParent = branches.filter((b) => !!b.parent_branch_id).length;
  const linkedCollabIds = new Set([
    ...collabBranchLinks.map((l) => l.collaborator_id),
    ...collabSectorLinks.map((l) => l.collaborator_id),
  ]);
  const collabWithoutStructureLink = activeCollab.filter((c) => !linkedCollabIds.has(c.id)).length;
  const sectorIdsWithCollab = new Set(collabSectorLinks.map((l) => l.sector_id));
  const orphanSectors = activeSectors.filter((s) => !sectorIdsWithCollab.has(s.id)).length;
  const structureKpis: Kpi[] = [
    { label: 'Setores ativos', value: activeSectors.length, formatted: String(activeSectors.length), severity: 'info' },
    { label: 'Filiais em hierarquia', value: branchesWithParent, formatted: String(branchesWithParent), severity: 'info' },
    { label: 'Colaboradores sem vinculo', value: collabWithoutStructureLink, formatted: String(collabWithoutStructureLink), severity: collabWithoutStructureLink > 0 ? 'warn' : 'ok' },
  ];

  return [
    { domain: 'assets_docs', agent_name: AGENT_BY_DOMAIN.assets_docs, kpis: assetsKpis, facts: { total_ativos: assets.length, patrimonio_total: Math.round(totalSocCurrent), valor_aquisicao: Math.round(totalAcq), depreciacao_acumulada: Math.round(totalSocAcc), sem_documentacao: undocumented, pct_sem_documentacao: pct(undocumented, assets.length), totalmente_depreciados_em_uso: fullyDepInUse, obras_em_andamento: cip, baixas_alienacoes_no_mes: disposalsThisMonth, reavaliacoes_no_mes: revaluationsThisMonth } },
    { domain: 'field_ops', agent_name: AGENT_BY_DOMAIN.field_ops, kpis: fieldKpis, facts: { transferencias_pendentes: pendingTransfers.length, pendente_mais_antiga_dias: oldestPendingDays, tempo_medio_aceite_dias: avgAcceptDays, termos_assinados: signedTerms, termos_total: assignments.length, atribuicoes_atrasadas: lateAssignments, sobras_pendentes: surplusPending, itens_conferidos: counted.length, divergencias: divergent, acuracia_inventario_pct: inventoryAccuracy, emprestimos_ativos: loansActive, emprestimos_atrasados: loansOverdue } },
    { domain: 'maintenance_contracts', agent_name: AGENT_BY_DOMAIN.maintenance_contracts, kpis: maintKpis, facts: { preventivas: preventive, corretivas: corrective, razao_prev_corr: prevCorrRatio, manutencoes_atrasadas: overdueMaint, custo_total_manutencao: Math.round(maintCost), contratos_vencendo_30d: contractsExpiring, valor_sob_contrato_vigente: Math.round(contractValue) } },
    { domain: 'fiscal_accounting', agent_name: AGENT_BY_DOMAIN.fiscal_accounting, kpis: fiscalKpis, facts: { diferenca_societaria_fiscal: Math.round(socFisDiff), ciap_total_icms: Math.round(ciapTotal), ciap_mensal_em_apropriacao: Math.round(ciapMonthly), credito_pis_cofins_potencial: Math.round(pisCofinsPotential), ativos_sem_regra_contabil: assetsWithoutMappingRule, parametros_mensais: monthlyParameterSummary } },
    { domain: 'registries_structure', agent_name: AGENT_BY_DOMAIN.registries_structure, kpis: regKpis, facts: { filiais_ativas: activeBranches, filial_maior_patrimonio: topBranchName, filial_maior_patrimonio_valor: Math.round(topBranchValue), fornecedores_bloqueados_inativos: blockedSuppliers, colaboradores_ativos: activeCollab.length, colaboradores_sem_ativo: collabWithoutAsset, colaboradores_com_ativo_sem_termo: collabWithAssetUnsigned } },
    { domain: 'governance_admin', agent_name: AGENT_BY_DOMAIN.governance_admin, kpis: govKpis, facts: { acoes_hoje: auditToday.length, exclusoes_hoje: deletionsToday, usuario_mais_ativo: topActor, usuario_mais_ativo_acoes: topActorCount, usuarios_ativos_hoje: Object.keys(actorCount).length } },
    { domain: 'org_structure', agent_name: AGENT_BY_DOMAIN.org_structure, kpis: structureKpis, facts: { setores_ativos: activeSectors.length, filiais_em_hierarquia: branchesWithParent, colaboradores_sem_vinculo: collabWithoutStructureLink, setores_orfaos: orphanSectors } },
  ];
}

// deno-lint-ignore no-explicit-any
async function writeText(svc: any, domain: string, facts: Record<string, unknown>): Promise<{ headline: string; summary: string; ok: boolean }> {
  const system = `${PERSONA[domain]}\n\nVocê recebe um JSON com os KPIs JÁ isolados a um único workspace (você nunca consulta dados). Escreva uma manchete curta (até 90 caracteres) e uma análise investigativa de 2 a 4 frases que aponte o que é anômalo/urgente, não que descreva os números. Nunca invente números fora do JSON. Nunca cite outras empresas. Responda SOMENTE com JSON no formato {"headline": "...", "summary": "..."}.`;
  const prompt = `${system}\n\nKPIs do dia (JSON):\n${JSON.stringify(facts)}`;
  try {
    const res = await svc.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          headline: { type: 'string' },
          summary: { type: 'string' },
        },
        required: ['headline', 'summary'],
      },
    });
    const headline = String(res?.headline || '').slice(0, 200);
    const summary = String(res?.summary || '').slice(0, 2000);
    if (!headline && !summary) return { headline: '', summary: '', ok: false };
    return { headline, summary, ok: true };
  } catch (_) {
    return { headline: '', summary: '', ok: false };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const json = (body: unknown, status = 200) => Response.json(body, { status, headers: cors });

  try {
    const base44 = createClientFromRequest(req);
    const svc = base44.asServiceRole;

    const body = await req.json().catch(() => ({}));
    const dryRun = body?.dry_run === true;
    const onlyWs = typeof body?.only_workspace_id === 'string' ? body.only_workspace_id : null;

    // Guard: block regular authenticated users; allow cron (no user) or platform admin.
    // Optional shared-secret layer (security audit A2/M5): if CRON_SHARED_SECRET is set,
    // an unauthenticated caller must present it via x-cron-secret — closes the endpoint
    // to the open internet once the dashboard automation is configured to send it.
    // No-op (falls through to "anonymous cron" behavior) while the secret isn't configured,
    // so this never breaks an already-working scheduled automation.
    let user = null;
    try { user = await base44.auth.me(); } catch (_) { user = null; }
    if (user) {
      const fresh = (await svc.entities.User.filter({ id: user.id }))[0];
      if (!fresh?.is_platform_admin) {
        return json({ error: 'Somente o administrador da plataforma pode gerar os briefings manualmente.' }, 403);
      }
    } else {
      const cronSecret = Deno.env.get('CRON_SHARED_SECRET');
      if (cronSecret && req.headers.get('x-cron-secret') !== cronSecret) {
        return json({ error: 'Não autorizado.' }, 401);
      }
    }
    // force only ever honored for a validated platform-admin session — never for an
    // anonymous/cron caller, or the body could be used to bypass the cost guard below.
    const force = body?.force === true && !!user;

    const allWorkspaces = await svc.entities.Workspace.filter({}, '-created_date', 5000);
    const workspaces = allWorkspaces
      .filter((w: Record<string, unknown>) => w.plan_status === 'active' || w.plan_status === 'trial')
      .filter((w: Record<string, unknown>) => !onlyWs || w.id === onlyWs);

    const computedAt = new Date().toISOString();
    let wsDone = 0, rowsWritten = 0, llmOk = 0, llmFail = 0, skipped = 0;

    for (const ws of workspaces) {
      const wsId = ws.id as string;
      let briefings: DomainBriefing[];
      try {
        briefings = await computeWorkspace(svc, wsId);
      } catch (_) {
        continue; // a single workspace failing must not abort the whole sweep
      }

      for (const b of briefings) {
        // Cheap early-exit BEFORE any LLM call (security audit A2): if today's row
        // already exists for this workspace+domain, skip — this is what actually
        // bounds the cost of repeated/unauthenticated calls, not just the dedup write.
        const dayStart = todayUTC();
        let existingId: string | null = null;
        try {
          const existing = await svc.entities.AiBriefing.filter(
            { workspace_id: wsId, domain: b.domain }, '-computed_at', 1
          );
          if (existing.length) {
            const c = parseMs(existing[0].computed_at);
            if (c && c >= dayStart) existingId = existing[0].id as string;
          }
        } catch (_) { /* fall through to create */ }

        if (existingId && !force) {
          skipped += 1;
          continue;
        }

        if (dryRun) {
          // Preview only — never spend a real LLM call just to report what would happen.
          rowsWritten += 1;
          continue;
        }

        const text = await writeText(svc, b.domain, b.facts);
        if (text.ok) llmOk += 1; else llmFail += 1;
        const status = text.ok ? 'ok' : 'partial';

        const payload = {
          workspace_id: wsId,
          domain: b.domain,
          agent_name: b.agent_name,
          headline: text.headline || 'Sem destaques hoje',
          summary: text.summary || 'Não foi possível gerar a análise hoje. Os indicadores estão disponíveis nos cards.',
          kpis_json: JSON.stringify(b.kpis),
          computed_at: computedAt,
          generation_status: status,
        };
        try {
          if (existingId) await svc.entities.AiBriefing.update(existingId, payload);
          else await svc.entities.AiBriefing.create(payload);
          rowsWritten += 1;
        } catch (_) { /* non-critical, continue */ }
      }

      // Credit accounting: 1 LLM generation per domain per workspace, same pool as the chat.
      // credits_used is derived from briefings.length (not hardcoded) so it tracks the domain
      // count automatically if a supervisor is added/removed.
      if (!dryRun) {
        try {
          await svc.entities.CreditUsage.create({
            workspace_id: wsId,
            user_email: (ws.owner_email as string) || '',
            agent_name: 'supervisores_diarios',
            event_type: 'briefing_diario',
            credit_type: 'message',
            credits_used: briefings.length,
          });
        } catch (_) { /* non-critical */ }
      }
      wsDone += 1;
    }

    return json({ ok: true, dry_run: dryRun, workspaces: wsDone, rows: rowsWritten, llm_ok: llmOk, llm_fail: llmFail, skipped });
  } catch (_) {
    return json({ error: 'Não foi possível gerar os briefings.' }, 500);
  }
});
