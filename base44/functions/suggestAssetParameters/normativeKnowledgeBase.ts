export type NormativeDomain = 'accounting' | 'fiscal' | 'classification';
export type NormativeStatus = 'vigente' | 'revogado' | 'substituido';
export type NormativeDocument = {
  document_id: string;
  title: string;
  authority: string;
  document_type: string;
  number?: string;
  year?: number;
  domain: NormativeDomain;
  status: NormativeStatus;
  effective_start?: string;
  effective_end?: string;
  official_url: string;
  version: string;
  content_hash: string;
  last_checked_at: string;
  replaces_document_id?: string;
  amended_by_document_ids?: string[];
};

export type NormativeVersion = {
  version_id: string;
  document_id: string;
  version: string;
  status: NormativeStatus;
  effective_start?: string;
  effective_end?: string;
  official_url: string;
  content_hash: string;
  checked_at: string;
};

export type NormativeChunk = {
  chunk_id: string;
  document_id: string;
  version: string;
  section: string;
  domain: NormativeDomain;
  status: NormativeStatus;
  text: string;
  keywords: string[];
};

export type DepreciationRule = {
  rule_id: string;
  document_id: string;
  version: string;
  domain: 'fiscal' | 'accounting';
  status: NormativeStatus;
  category?: string;
  asset_type?: string;
  ncm?: string;
  aliases: string[];
  depreciation_rate?: number;
  useful_life_years?: number;
  residual_guidance?: string;
  unit_rate?: 'percent_per_year';
  unit_life?: 'years';
  source_section: string;
  notes: string;
};

export type ClassificationAlias = {
  alias_id: string;
  normalized: string;
  category?: string;
  asset_type?: string;
  ncm?: string;
  cnae?: string;
  rule_ids: string[];
  document_ids: string[];
};

export type NormativeSource = {
  source_id: string;
  name: string;
  authority: string;
  official_base_url: string;
  domain: NormativeDomain;
  update_strategy: 'official_document' | 'catalog' | 'classification_table';
  active: boolean;
};

export type NormativeReference = {
  document_id: string;
  title: string;
  version: string;
  section?: string;
  rule_id?: string;
};

export type NormativeRetrievalResult = {
  documents: NormativeDocument[];
  versions: NormativeVersion[];
  chunks: NormativeChunk[];
  rules: DepreciationRule[];
  aliases: ClassificationAlias[];
  sources: NormativeSource[];
  normative_references: NormativeReference[];
};

export type NormativeKnowledgeData = {
  sources: NormativeSource[];
  documents: NormativeDocument[];
  versions: NormativeVersion[];
  chunks: NormativeChunk[];
  depreciation_rules: DepreciationRule[];
  classification_aliases: ClassificationAlias[];
};

export const NORMATIVE_SOURCES: NormativeSource[] = [
  { source_id: 'cpc', name: 'Comite de Pronunciamentos Contabeis', authority: 'CPC', official_base_url: 'https://www.cpc.org.br/', domain: 'accounting', update_strategy: 'official_document', active: true },
  { source_id: 'cfc', name: 'Conselho Federal de Contabilidade', authority: 'CFC', official_base_url: 'https://cfc.org.br/', domain: 'accounting', update_strategy: 'official_document', active: true },
  { source_id: 'cvm', name: 'Comissao de Valores Mobiliarios', authority: 'CVM', official_base_url: 'https://conteudo.cvm.gov.br/', domain: 'accounting', update_strategy: 'official_document', active: true },
  { source_id: 'receita_sijut2', name: 'Receita Federal - Sijut2', authority: 'Receita Federal', official_base_url: 'https://normas.receita.fazenda.gov.br/sijut2consulta/consulta.action', domain: 'fiscal', update_strategy: 'official_document', active: true },
  { source_id: 'planalto', name: 'Planalto', authority: 'Presidencia da Republica', official_base_url: 'https://www.planalto.gov.br/', domain: 'fiscal', update_strategy: 'official_document', active: true },
  { source_id: 'siscomex_ncm', name: 'Receita Federal/Siscomex - NCM', authority: 'Receita Federal/Siscomex', official_base_url: 'https://www.gov.br/receitafederal/pt-br/assuntos/aduana-e-comercio-exterior/classificacao-fiscal-de-mercadorias/ncm', domain: 'classification', update_strategy: 'classification_table', active: true },
  { source_id: 'ibge_concla_cnae', name: 'IBGE Concla - CNAE', authority: 'IBGE', official_base_url: 'https://concla.ibge.gov.br/', domain: 'classification', update_strategy: 'classification_table', active: true },
];

export const NORMATIVE_DOCUMENTS: NormativeDocument[] = [
  { document_id: 'cpc_27', title: 'CPC 27 - Ativo Imobilizado', authority: 'CPC', document_type: 'Pronunciamento Tecnico', number: '27', domain: 'accounting', status: 'vigente', official_url: 'https://www.cpc.org.br/CPC/Documentos-Emitidos/Pronunciamentos/Pronunciamento?Id=58', version: 'seed-2026-07', content_hash: 'seed-cpc-27-2026-07', last_checked_at: '2026-07-01' },
  { document_id: 'nbc_tg_27', title: 'NBC TG 27 - Ativo Imobilizado', authority: 'CFC', document_type: 'Norma Brasileira de Contabilidade', number: 'TG 27', domain: 'accounting', status: 'vigente', official_url: 'https://cfc.org.br/tecnica/normas-brasileiras-de-contabilidade/', version: 'seed-2026-07', content_hash: 'seed-nbc-tg-27-2026-07', last_checked_at: '2026-07-01' },
  { document_id: 'cpc_01', title: 'CPC 01 - Reducao ao Valor Recuperavel de Ativos', authority: 'CPC', document_type: 'Pronunciamento Tecnico', number: '01', domain: 'accounting', status: 'vigente', official_url: 'https://www.cpc.org.br/CPC/Documentos-Emitidos/Pronunciamentos', version: 'seed-2026-07', content_hash: 'seed-cpc-01-2026-07', last_checked_at: '2026-07-01' },
  { document_id: 'cpc_04', title: 'CPC 04 - Ativo Intangivel', authority: 'CPC', document_type: 'Pronunciamento Tecnico', number: '04', domain: 'accounting', status: 'vigente', official_url: 'https://www.cpc.org.br/CPC/Documentos-Emitidos/Pronunciamentos', version: 'seed-2026-07', content_hash: 'seed-cpc-04-2026-07', last_checked_at: '2026-07-01' },
  { document_id: 'cpc_23', title: 'CPC 23 - Politicas Contabeis, Mudanca de Estimativa e Retificacao de Erro', authority: 'CPC', document_type: 'Pronunciamento Tecnico', number: '23', domain: 'accounting', status: 'vigente', official_url: 'https://www.cpc.org.br/CPC/Documentos-Emitidos/Pronunciamentos', version: 'seed-2026-07', content_hash: 'seed-cpc-23-2026-07', last_checked_at: '2026-07-01' },
  { document_id: 'cpc_28', title: 'CPC 28 - Propriedade para Investimento', authority: 'CPC', document_type: 'Pronunciamento Tecnico', number: '28', domain: 'accounting', status: 'vigente', official_url: 'https://www.cpc.org.br/CPC/Documentos-Emitidos/Pronunciamentos', version: 'seed-2026-07', content_hash: 'seed-cpc-28-2026-07', last_checked_at: '2026-07-01' },
  { document_id: 'cpc_31', title: 'CPC 31 - Ativo Nao Circulante Mantido para Venda', authority: 'CPC', document_type: 'Pronunciamento Tecnico', number: '31', domain: 'accounting', status: 'vigente', official_url: 'https://www.cpc.org.br/CPC/Documentos-Emitidos/Pronunciamentos', version: 'seed-2026-07', content_hash: 'seed-cpc-31-2026-07', last_checked_at: '2026-07-01' },
  { document_id: 'cpc_46', title: 'CPC 46 - Mensuracao do Valor Justo', authority: 'CPC', document_type: 'Pronunciamento Tecnico', number: '46', domain: 'accounting', status: 'vigente', official_url: 'https://www.cpc.org.br/CPC/Documentos-Emitidos/Pronunciamentos', version: 'seed-2026-07', content_hash: 'seed-cpc-46-2026-07', last_checked_at: '2026-07-01' },
  { document_id: 'icpc_10', title: 'ICPC 10 / ITG 10 - Interpretacao sobre Ativo Imobilizado', authority: 'CPC/CFC', document_type: 'Interpretacao', number: '10', domain: 'accounting', status: 'vigente', official_url: 'https://www.cpc.org.br/CPC/Documentos-Emitidos/Interpretacoes', version: 'seed-2026-07', content_hash: 'seed-icpc-10-2026-07', last_checked_at: '2026-07-01' },
  { document_id: 'in_rfb_1700_2017_anexo_iii', title: 'IN RFB 1.700/2017 - Anexo III', authority: 'Receita Federal', document_type: 'Instrucao Normativa', number: '1700', year: 2017, domain: 'fiscal', status: 'vigente', official_url: 'https://normas.receita.fazenda.gov.br/sijut2consulta/link.action?idAto=81268', version: 'seed-2026-07', content_hash: 'seed-in-rfb-1700-anexo-iii-2026-07', last_checked_at: '2026-07-01' },
  { document_id: 'decreto_9580_2018', title: 'Decreto 9.580/2018 - Regulamento do Imposto sobre a Renda', authority: 'Planalto', document_type: 'Decreto', number: '9580', year: 2018, domain: 'fiscal', status: 'vigente', official_url: 'https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/decreto/d9580.htm', version: 'seed-2026-07', content_hash: 'seed-decreto-9580-2026-07', last_checked_at: '2026-07-01' },
  { document_id: 'dl_1598_1977', title: 'Decreto-Lei 1.598/1977', authority: 'Planalto', document_type: 'Decreto-Lei', number: '1598', year: 1977, domain: 'fiscal', status: 'vigente', official_url: 'https://www.planalto.gov.br/ccivil_03/decreto-lei/del1598.htm', version: 'seed-2026-07', content_hash: 'seed-dl-1598-2026-07', last_checked_at: '2026-07-01' },
  { document_id: 'lei_4506_1964', title: 'Lei 4.506/1964', authority: 'Planalto', document_type: 'Lei', number: '4506', year: 1964, domain: 'fiscal', status: 'vigente', official_url: 'https://www.planalto.gov.br/ccivil_03/leis/l4506.htm', version: 'seed-2026-07', content_hash: 'seed-lei-4506-2026-07', last_checked_at: '2026-07-01' },
  { document_id: 'lei_12973_2014', title: 'Lei 12.973/2014', authority: 'Planalto', document_type: 'Lei', number: '12973', year: 2014, domain: 'fiscal', status: 'vigente', official_url: 'https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2014/lei/l12973.htm', version: 'seed-2026-07', content_hash: 'seed-lei-12973-2026-07', last_checked_at: '2026-07-01' },
  { document_id: 'lei_14871_2024', title: 'Lei 14.871/2024 - Depreciacao Acelerada', authority: 'Planalto', document_type: 'Lei', number: '14871', year: 2024, domain: 'fiscal', status: 'vigente', official_url: 'https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2024/lei/l14871.htm', version: 'seed-2026-07', content_hash: 'seed-lei-14871-2026-07', last_checked_at: '2026-07-01' },
  { document_id: 'decreto_12175_2024', title: 'Decreto 12.175/2024', authority: 'Planalto', document_type: 'Decreto', number: '12175', year: 2024, domain: 'fiscal', status: 'vigente', official_url: 'https://www.planalto.gov.br/', version: 'seed-2026-07', content_hash: 'seed-decreto-12175-2026-07', last_checked_at: '2026-07-01' },
  { document_id: 'decreto_12292_2024', title: 'Decreto 12.292/2024', authority: 'Planalto', document_type: 'Decreto', number: '12292', year: 2024, domain: 'fiscal', status: 'vigente', official_url: 'https://www.planalto.gov.br/', version: 'seed-2026-07', content_hash: 'seed-decreto-12292-2026-07', last_checked_at: '2026-07-01' },
  { document_id: 'ncm_tabela', title: 'NCM - Nomenclatura Comum do Mercosul', authority: 'Receita Federal/Siscomex', document_type: 'Tabela de Classificacao', domain: 'classification', status: 'vigente', official_url: 'https://www.gov.br/receitafederal/pt-br/assuntos/aduana-e-comercio-exterior/classificacao-fiscal-de-mercadorias/ncm', version: 'seed-2026-07', content_hash: 'seed-ncm-2026-07', last_checked_at: '2026-07-01' },
  { document_id: 'cnae_concla', title: 'CNAE - Classificacao Nacional de Atividades Economicas', authority: 'IBGE/Concla', document_type: 'Tabela de Classificacao', domain: 'classification', status: 'vigente', official_url: 'https://concla.ibge.gov.br/', version: 'seed-2026-07', content_hash: 'seed-cnae-2026-07', last_checked_at: '2026-07-01' },
];

export const NORMATIVE_VERSIONS: NormativeVersion[] = NORMATIVE_DOCUMENTS.map((doc) => ({
  version_id: `${doc.document_id}:${doc.version}`,
  document_id: doc.document_id,
  version: doc.version,
  status: doc.status,
  effective_start: doc.effective_start,
  effective_end: doc.effective_end,
  official_url: doc.official_url,
  content_hash: doc.content_hash,
  checked_at: doc.last_checked_at,
}));

export const HISTORICAL_NORMATIVE_VERSIONS: NormativeVersion[] = [
  {
    version_id: 'in_rfb_1700_2017_anexo_iii:historical-revogado-seed',
    document_id: 'in_rfb_1700_2017_anexo_iii',
    version: 'historical-revogado-seed',
    status: 'revogado',
    effective_start: '2017-12-14',
    effective_end: '2026-06-30',
    official_url: 'https://normas.receita.fazenda.gov.br/sijut2consulta/link.action?idAto=81268',
    content_hash: 'historical-revogado-anexo-iii-seed',
    checked_at: '2026-07-01',
  },
];

export const NORMATIVE_CHUNKS: NormativeChunk[] = [
  { chunk_id: 'cpc_27:depreciacao', document_id: 'cpc_27', version: 'seed-2026-07', section: 'Depreciacao', domain: 'accounting', status: 'vigente', text: 'CPC 27 orienta que valor depreciavel, vida util e valor residual sejam estimados considerando uso esperado, desgaste, obsolescencia, limites legais ou semelhantes e revisados quando necessario.', keywords: ['depreciacao', 'vida util', 'valor residual', 'ativo imobilizado', 'uso esperado', 'obsolescencia'] },
  { chunk_id: 'cpc_23:estimativa', document_id: 'cpc_23', version: 'seed-2026-07', section: 'Mudanca de estimativa', domain: 'accounting', status: 'vigente', text: 'CPC 23 trata alteracoes em estimativas contabeis, incluindo revisao prospectiva de estimativas quando novas informacoes alteram a base anterior.', keywords: ['estimativa', 'revisao', 'prospectiva', 'vida util'] },
  { chunk_id: 'cpc_04:intangivel', document_id: 'cpc_04', version: 'seed-2026-07', section: 'Ativo intangivel', domain: 'accounting', status: 'vigente', text: 'CPC 04 orienta tratamento de ativo intangivel, incluindo vida util definida ou indefinida e amortizacao quando aplicavel.', keywords: ['intangivel', 'amortizacao', 'vida util'] },
  { chunk_id: 'cpc_01:impairment', document_id: 'cpc_01', version: 'seed-2026-07', section: 'Valor recuperavel', domain: 'accounting', status: 'vigente', text: 'CPC 01 trata reducao ao valor recuperavel e nao substitui a estimativa regular de vida util ou taxa de depreciacao.', keywords: ['valor recuperavel', 'impairment'] },
  { chunk_id: 'cpc_28:propriedade', document_id: 'cpc_28', version: 'seed-2026-07', section: 'Propriedade para investimento', domain: 'accounting', status: 'vigente', text: 'CPC 28 trata propriedade para investimento e a classificacao deve ser separada do uso proprio no ativo imobilizado.', keywords: ['propriedade para investimento', 'imoveis'] },
  { chunk_id: 'in_rfb_1700:anexo_iii', document_id: 'in_rfb_1700_2017_anexo_iii', version: 'seed-2026-07', section: 'Anexo III', domain: 'fiscal', status: 'vigente', text: 'Anexo III da IN RFB 1.700/2017 contem prazos de vida util e taxas anuais de depreciacao fiscal por tipo de bem. O seed local contem regras estruturadas iniciais e deve ser mantido por alteracao manual ou importacao administrativa controlada.', keywords: ['anexo iii', 'depreciacao fiscal', 'vida util fiscal', 'taxa fiscal'] },
  { chunk_id: 'rir_2018:depreciacao', document_id: 'decreto_9580_2018', version: 'seed-2026-07', section: 'Depreciacao fiscal', domain: 'fiscal', status: 'vigente', text: 'RIR/2018 consolida regras fiscais de dedutibilidade e depreciacao, mas a taxa especifica deve ser buscada na regra fiscal aplicavel.', keywords: ['rir', 'dedutibilidade', 'depreciacao'] },
  { chunk_id: 'lei_14871:acelerada', document_id: 'lei_14871_2024', version: 'seed-2026-07', section: 'Depreciacao acelerada', domain: 'fiscal', status: 'vigente', text: 'Lei 14.871/2024 trata depreciacao acelerada em condicoes especificas e nao substitui a depreciacao fiscal comum sem comprovacao de elegibilidade.', keywords: ['depreciacao acelerada', 'elegibilidade'] },
];

export const DEPRECIATION_RULES: DepreciationRule[] = [
  { rule_id: 'anexo_iii:computadores', document_id: 'in_rfb_1700_2017_anexo_iii', version: 'seed-2026-07', domain: 'fiscal', status: 'vigente', category: 'Equipamentos', asset_type: 'computer_equipment', aliases: ['computador', 'notebook', 'laptop', 'servidor', 'informatica', 'equipamento de informatica'], depreciation_rate: 20, useful_life_years: 5, unit_rate: 'percent_per_year', unit_life: 'years', source_section: 'Anexo III', notes: 'Regra fiscal estruturada local para equipamentos de informatica conforme seed da tabela fiscal.' },
  { rule_id: 'anexo_iii:veiculos', document_id: 'in_rfb_1700_2017_anexo_iii', version: 'seed-2026-07', domain: 'fiscal', status: 'vigente', category: 'Veiculos', asset_type: 'vehicle', aliases: ['veiculo', 'automovel', 'camioneta', 'utilitario', 'caminhao'], depreciation_rate: 20, useful_life_years: 5, unit_rate: 'percent_per_year', unit_life: 'years', source_section: 'Anexo III', notes: 'Regra fiscal estruturada local para veiculos conforme seed da tabela fiscal.' },
  { rule_id: 'anexo_iii:moveis_utensilios', document_id: 'in_rfb_1700_2017_anexo_iii', version: 'seed-2026-07', domain: 'fiscal', status: 'vigente', category: 'Equipamentos', asset_type: 'furniture', aliases: ['movel', 'moveis', 'mesa', 'cadeira', 'armario', 'utensilio'], depreciation_rate: 10, useful_life_years: 10, unit_rate: 'percent_per_year', unit_life: 'years', source_section: 'Anexo III', notes: 'Regra fiscal estruturada local para moveis e utensilios conforme seed da tabela fiscal.' },
  { rule_id: 'anexo_iii:maquinas_equipamentos', document_id: 'in_rfb_1700_2017_anexo_iii', version: 'seed-2026-07', domain: 'fiscal', status: 'vigente', category: 'Equipamentos', asset_type: 'industrial_machine', aliases: ['maquina', 'equipamento', 'gerador', 'compressor', 'prensa', 'motor'], depreciation_rate: 10, useful_life_years: 10, unit_rate: 'percent_per_year', unit_life: 'years', source_section: 'Anexo III', notes: 'Regra fiscal estruturada local generica para maquinas e equipamentos conforme seed da tabela fiscal.' },
  { rule_id: 'anexo_iii:edificacoes', document_id: 'in_rfb_1700_2017_anexo_iii', version: 'seed-2026-07', domain: 'fiscal', status: 'vigente', category: 'Imoveis', asset_type: 'property', aliases: ['edificacao', 'predio', 'galpao', 'construcao', 'imovel'], depreciation_rate: 4, useful_life_years: 25, unit_rate: 'percent_per_year', unit_life: 'years', source_section: 'Anexo III', notes: 'Regra fiscal estruturada local para edificacoes conforme seed da tabela fiscal.' },
  { rule_id: 'accounting:cpc_27_general', document_id: 'cpc_27', version: 'seed-2026-07', domain: 'accounting', status: 'vigente', aliases: ['ativo imobilizado', 'depreciacao', 'vida util', 'valor residual'], residual_guidance: 'Estimar valor residual considerando expectativa de alienacao, condicao do ativo, uso e mercado observavel quando houver.', source_section: 'Depreciacao', notes: 'Orientacao contabil geral para vida util, taxa e residual.' },
  { rule_id: 'historical:maquinas_equipamentos_revogada', document_id: 'in_rfb_1700_2017_anexo_iii', version: 'historical-revogado-seed', domain: 'fiscal', status: 'revogado', category: 'Equipamentos', asset_type: 'industrial_machine', aliases: ['maquina', 'equipamento', 'gerador', 'compressor', 'prensa', 'motor'], depreciation_rate: 99, useful_life_years: 1, unit_rate: 'percent_per_year', unit_life: 'years', source_section: 'Anexo III historico', notes: 'Regra historica revogada usada apenas para validar que versoes revogadas nao fundamentam sugestoes.' },
];

export const CLASSIFICATION_ALIASES: ClassificationAlias[] = [
  { alias_id: 'alias:gerador', normalized: 'gerador', category: 'Equipamentos', asset_type: 'generator', rule_ids: ['anexo_iii:maquinas_equipamentos', 'accounting:cpc_27_general'], document_ids: ['in_rfb_1700_2017_anexo_iii', 'cpc_27'] },
  { alias_id: 'alias:notebook', normalized: 'notebook', category: 'Equipamentos', asset_type: 'computer_equipment', rule_ids: ['anexo_iii:computadores', 'accounting:cpc_27_general'], document_ids: ['in_rfb_1700_2017_anexo_iii', 'cpc_27'] },
  { alias_id: 'alias:veiculo', normalized: 'veiculo', category: 'Veiculos', asset_type: 'vehicle', rule_ids: ['anexo_iii:veiculos', 'accounting:cpc_27_general'], document_ids: ['in_rfb_1700_2017_anexo_iii', 'cpc_27'] },
  { alias_id: 'alias:predio', normalized: 'predio', category: 'Imoveis', asset_type: 'property', rule_ids: ['anexo_iii:edificacoes', 'accounting:cpc_27_general'], document_ids: ['in_rfb_1700_2017_anexo_iii', 'cpc_27'] },
];

export const NORMATIVE_KNOWLEDGE_SEED: NormativeKnowledgeData = {
  sources: NORMATIVE_SOURCES,
  documents: NORMATIVE_DOCUMENTS,
  versions: [...NORMATIVE_VERSIONS, ...HISTORICAL_NORMATIVE_VERSIONS],
  chunks: NORMATIVE_CHUNKS,
  depreciation_rules: DEPRECIATION_RULES,
  classification_aliases: CLASSIFICATION_ALIASES,
};

export function isNormativeKnowledgeEmpty(data: Partial<NormativeKnowledgeData> | null | undefined): boolean {
  return !data
    || (
      (data.documents?.length ?? 0) === 0
      && (data.versions?.length ?? 0) === 0
      && (data.chunks?.length ?? 0) === 0
      && (data.depreciation_rules?.length ?? 0) === 0
      && (data.classification_aliases?.length ?? 0) === 0
    );
}

export function normalizeNormativeKnowledgeData(data: Partial<NormativeKnowledgeData> | null | undefined): NormativeKnowledgeData {
  if (isNormativeKnowledgeEmpty(data)) return NORMATIVE_KNOWLEDGE_SEED;
  return {
    sources: data?.sources ?? [],
    documents: data?.documents ?? [],
    versions: data?.versions ?? [],
    chunks: data?.chunks ?? [],
    depreciation_rules: data?.depreciation_rules ?? [],
    classification_aliases: data?.classification_aliases ?? [],
  };
}

function normalizeTokenText(value: unknown): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function tokens(value: unknown): string[] {
  return normalizeTokenText(value).split(/\s+/).filter((token) => token.length >= 3);
}

function contextText(context: Record<string, unknown>): string {
  return [
    context.name,
    context.category,
    context.description,
    context.account,
    context.notes,
    context.vehicle_model_year,
    context.vehicle_fuel_type,
    context.property_registration_type,
  ].map(normalizeTokenText).filter(Boolean).join(' ');
}

function parameterDomain(params: string[]): NormativeDomain {
  return params.some((param) => param.startsWith('fiscal_')) ? 'fiscal' : 'accounting';
}

function scoreRule(rule: DepreciationRule, text: string, context: Record<string, unknown>, classification?: { type?: string | null }): number {
  if (rule.status !== 'vigente') return -1000;
  let score = 0;
  if (rule.category && rule.category === context.category) score += 5;
  if (rule.asset_type && classification?.type && rule.asset_type === classification.type) score += 8;
  for (const alias of rule.aliases) {
    const aliasText = normalizeTokenText(alias);
    if (aliasText && text.includes(aliasText)) score += 4;
  }
  return score;
}

function currentVersionByDocument(documents: NormativeDocument[]): Map<string, string> {
  return new Map(documents
    .filter((doc) => doc.status === 'vigente' && doc.document_id && doc.version)
    .map((doc) => [doc.document_id, doc.version]));
}

function scoreChunk(chunk: NormativeChunk, text: string, domain: NormativeDomain): number {
  if (chunk.status !== 'vigente') return -1000;
  let score = chunk.domain === domain ? 4 : 0;
  for (const keyword of chunk.keywords) {
    const keywordText = normalizeTokenText(keyword);
    if (keywordText && text.includes(keywordText)) score += 2;
  }
  return score;
}

function byDocument(documents: NormativeDocument[], id: string): NormativeDocument {
  const fallback = documents[0] || NORMATIVE_DOCUMENTS[0];
  const document = documents.find((doc) => doc.document_id === id);
  if (!document && !fallback) throw new Error(`Normative document not found: ${id}`);
  return document || fallback;
}

function referenceForRule(documents: NormativeDocument[], rule: DepreciationRule): NormativeReference {
  const doc = byDocument(documents, rule.document_id);
  return {
    document_id: doc.document_id,
    title: doc.title,
    version: rule.version,
    section: rule.source_section,
    rule_id: rule.rule_id,
  };
}

function referenceForChunk(documents: NormativeDocument[], chunk: NormativeChunk): NormativeReference {
  const doc = byDocument(documents, chunk.document_id);
  return {
    document_id: doc.document_id,
    title: doc.title,
    version: chunk.version,
    section: chunk.section,
  };
}

export function retrieveNormativeKnowledge(
  data: NormativeKnowledgeData,
  context: Record<string, unknown>,
  params: string[],
  classification?: { type?: string | null },
): NormativeRetrievalResult {
  const normalizedData = normalizeNormativeKnowledgeData(data);
  const domain = parameterDomain(params);
  const text = contextText(context);
  const allTokens = new Set(tokens(text));
  const currentVersions = currentVersionByDocument(normalizedData.documents);

  const rules = normalizedData.depreciation_rules
    .map((rule) => ({ rule, score: scoreRule(rule, text, context, classification) }))
    .filter(({ rule, score }) => (
      score > 0
      && rule.domain === domain
      && rule.status === 'vigente'
      && currentVersions.get(rule.document_id) === rule.version
    ))
    .sort((a, b) => b.score - a.score)
    .slice(0, 30)
    .map(({ rule }) => rule);

  const chunks = normalizedData.chunks
    .map((chunk) => ({ chunk, score: scoreChunk(chunk, text, domain) }))
    .filter(({ chunk, score }) => (
      score > 0
      && chunk.status === 'vigente'
      && currentVersions.get(chunk.document_id) === chunk.version
    ))
    .sort((a, b) => b.score - a.score)
    .slice(0, 20)
    .map(({ chunk }) => chunk);

  const aliases = normalizedData.classification_aliases.filter((alias) => {
    if (alias.category && alias.category !== context.category) return false;
    return tokens(alias.normalized).some((token) => allTokens.has(token));
  });

  const documentIds = new Set<string>();
  rules.forEach((rule) => documentIds.add(rule.document_id));
  chunks.forEach((chunk) => documentIds.add(chunk.document_id));
  aliases.forEach((alias) => alias.document_ids.forEach((id) => documentIds.add(id)));
  if (domain === 'accounting') documentIds.add('cpc_27');
  if (domain === 'fiscal') documentIds.add('in_rfb_1700_2017_anexo_iii');

  const documents = normalizedData.documents.filter((doc) => documentIds.has(doc.document_id));
  const versions = normalizedData.versions.filter((version) => documentIds.has(version.document_id));
  const sourceAuthorities = new Set(documents.map((doc) => doc.authority));
  const sources = normalizedData.sources.filter((source) => sourceAuthorities.has(source.authority) || source.domain === 'classification');
  const normativeReferences = [
    ...rules.map((rule) => referenceForRule(normalizedData.documents, rule)),
    ...chunks.map((chunk) => referenceForChunk(normalizedData.documents, chunk)),
  ];

  return {
    documents,
    versions,
    chunks,
    rules,
    aliases,
    sources,
    normative_references: normativeReferences.slice(0, 30),
  };
}
