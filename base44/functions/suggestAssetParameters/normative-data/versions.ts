import { NORMATIVE_DOCUMENTS_DATA } from './documents.ts';

export const NORMATIVE_VERSIONS_DATA = [
  ...NORMATIVE_DOCUMENTS_DATA.map((doc) => ({
    version_id: `${doc.document_id}:${doc.version}`,
    document_id: doc.document_id,
    version: doc.version,
    status: doc.status,
    effective_start: doc.effective_start,
    effective_end: doc.effective_end,
    official_url: doc.official_url,
    content_hash: doc.content_hash,
    checked_at: doc.last_checked_at,
  })),
  {
    version_id: 'in_rfb_1700_2017_anexo_iii:historical-revogado-seed',
    document_id: 'in_rfb_1700_2017_anexo_iii',
    version: 'historical-revogado-seed',
    status: 'revogado',
    effective_start: '2017-12-14',
    effective_end: '2026-06-30',
    official_url: 'https://normas.receita.fazenda.gov.br/sijut2consulta/link.action?idAto=81268',
    content_hash: 'historical-revogado-anexo-iii-seed',
    checked_at: '2026-07-17T00:00:00-03:00',
  },
] as const;
