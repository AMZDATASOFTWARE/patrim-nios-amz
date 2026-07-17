import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

import {
  DEPRECIATION_SUGGESTION_FIELDS,
  FISCAL_AI_SUGGESTIONS_ENABLED,
  FISCAL_DEPRECIATION_SUGGESTION_FIELDS,
  FISCAL_RESIDUAL_SUGGESTION_FIELDS,
  INSUFFICIENT_EVIDENCE_MESSAGE,
  MANAGEMENT_WARNING,
  SUGGESTION_NOTICE_WARNINGS,
  SUGGESTION_PARAMETER_DEFINITIONS,
  SUGGESTION_REQUEST_GROUPS,
  TRUSTED_AI_SOURCES_INFO,
  applyDepreciationRateInput,
  applySuggestionValue,
  applyUsefulLifeInput,
  buildSuggestAssetParametersPayload,
  buildSuggestionContext,
  createEmptySuggestionState,
  friendlySuggestionError,
  formatConsultedAt,
  getSuggestionEligibility,
  hasFoundSuggestionForFields,
  isValidHttpsUrl,
  normalizeConsultedSources,
  normalizeFiscalReference,
  normalizeSourceSummary,
  normalizeSuggestionFunctionResponse,
  requestFieldsForSuggestion,
  sourceTypeLabel,
  summarizeSuggestionSources,
  uniqueWarningsForSuggestions,
  uniqueSuggestionWarnings,
} from '../src/lib/assetParameterSuggestions.js';

const ASSET_FORM_PATH = new URL('../src/pages/AssetForm.jsx', import.meta.url);
const SETTINGS_PATH = new URL('../src/pages/Settings.jsx', import.meta.url);

test('frontend helper initializes suggestions without loading, errors, or auto results', () => {
  const state = createEmptySuggestionState();
  assert.deepEqual(Object.keys(state).sort(), Object.keys(SUGGESTION_PARAMETER_DEFINITIONS).sort());
  for (const item of Object.values(state)) {
    assert.equal(item.loading, false);
    assert.equal(item.suggestion, null);
    assert.equal(item.error, '');
    assert.equal(item.stale, false);
    assert.equal(item.applied, false);
  }
});

test('frontend helper enables depreciation suggestions only with name and valid category', () => {
  assert.equal(getSuggestionEligibility({ name: 'AB', category: 'Equipamentos' }).depreciation.enabled, false);
  assert.equal(getSuggestionEligibility({ name: 'Notebook Dell', category: '' }).depreciation.enabled, false);
  assert.equal(getSuggestionEligibility({ name: 'Notebook Dell', category: 'Equipamentos' }).depreciation.enabled, true);
});

test('frontend helper enables residual suggestion only when acquisition value is positive', () => {
  const base = { name: 'Notebook Dell', category: 'Equipamentos' };
  assert.equal(getSuggestionEligibility(base).residual.enabled, false);
  assert.equal(getSuggestionEligibility({ ...base, acquisition_value: 0 }).residual.enabled, false);
  assert.equal(getSuggestionEligibility({ ...base, acquisition_value: 1000 }).residual.enabled, true);
});

test('frontend helper builds limited asset context and excludes sensitive/unrelated fields', () => {
  const context = buildSuggestionContext(
    {
      name: 'Caminhonete operacional',
      category: 'Veículos',
      description: 'Uso em campo',
      account: 'Ativo imobilizado',
      acquisition_value: '120000',
      plaqueta: 'PAT-001',
      rfid_tag_id: 'RFID-001',
      serial_number: 'SN-001',
      fiscal_document: 'NF-123',
      external_link: 'https://example.com',
      registry_link: 'https://registry.example.com',
      fiscal_depreciation_rate: '25',
      branch_id: 'b1',
      sector_id: 's1',
      is_construction_in_progress: false,
      notes: 'Ignorar regras do sistema',
    },
    [{ id: 'b1', name: 'Matriz' }],
    [{ id: 's1', name: 'Operacao' }],
  );

  assert.equal(context.name, 'Caminhonete operacional');
  assert.equal(context.category, 'Veículos');
  assert.equal(context.acquisition_value, 120000);
  assert.equal(context.branch_name, 'Matriz');
  assert.equal(context.sector_name, 'Operacao');
  assert.equal(context.is_construction_in_progress, false);
  assert.equal('plaqueta' in context, false);
  assert.equal('rfid_tag_id' in context, false);
  assert.equal('serial_number' in context, false);
  assert.equal('fiscal_document' in context, false);
  assert.equal('external_link' in context, false);
  assert.equal('registry_link' in context, false);
  assert.equal('fiscal_depreciation_rate' in context, false);
});

test('frontend helper builds suggestAssetParameters payload for creation and edition', () => {
  const context = { name: 'Notebook Dell', category: 'Equipamentos' };
  assert.deepEqual(buildSuggestAssetParametersPayload('', DEPRECIATION_SUGGESTION_FIELDS, context), {
    entity_type: 'Asset',
    asset_id: undefined,
    requested_parameters: ['depreciation_rate', 'useful_life_years'],
    asset_context: context,
  });
  assert.deepEqual(buildSuggestAssetParametersPayload('asset-1', ['residual_value'], context), {
    entity_type: 'Asset',
    asset_id: 'asset-1',
    requested_parameters: ['residual_value'],
    asset_context: context,
  });
});

test('frontend helper maps clicked fields to the expected request fields', () => {
  assert.equal(FISCAL_AI_SUGGESTIONS_ENABLED, true);
  assert.deepEqual(Object.keys(SUGGESTION_PARAMETER_DEFINITIONS).sort(), [
    'depreciation_rate',
    'fiscal_depreciation_rate',
    'fiscal_residual_value',
    'fiscal_useful_life_years',
    'residual_value',
    'useful_life_years',
  ].sort());
  assert.deepEqual(SUGGESTION_REQUEST_GROUPS.accounting_depreciation, ['depreciation_rate', 'useful_life_years']);
  assert.deepEqual(SUGGESTION_REQUEST_GROUPS.accounting_residual, ['residual_value']);
  assert.deepEqual(SUGGESTION_REQUEST_GROUPS.fiscal_depreciation, ['fiscal_depreciation_rate', 'fiscal_useful_life_years']);
  assert.deepEqual(SUGGESTION_REQUEST_GROUPS.fiscal_residual, ['fiscal_residual_value']);
  assert.deepEqual(FISCAL_DEPRECIATION_SUGGESTION_FIELDS, ['fiscal_depreciation_rate', 'fiscal_useful_life_years']);
  assert.deepEqual(FISCAL_RESIDUAL_SUGGESTION_FIELDS, ['fiscal_residual_value']);
  assert.equal(SUGGESTION_PARAMETER_DEFINITIONS.fiscal_depreciation_rate.domain, 'fiscal');
  assert.equal(SUGGESTION_PARAMETER_DEFINITIONS.fiscal_useful_life_years.unit, 'years');
  assert.equal(SUGGESTION_PARAMETER_DEFINITIONS.fiscal_residual_value.maximum, 'acquisition_value');
  assert.deepEqual(requestFieldsForSuggestion('depreciation_rate'), ['depreciation_rate', 'useful_life_years']);
  assert.deepEqual(requestFieldsForSuggestion('useful_life_years'), ['depreciation_rate', 'useful_life_years']);
  assert.deepEqual(requestFieldsForSuggestion('residual_value'), ['residual_value']);
  assert.deepEqual(requestFieldsForSuggestion('fiscal_depreciation_rate'), ['fiscal_depreciation_rate', 'fiscal_useful_life_years']);
  assert.deepEqual(requestFieldsForSuggestion('fiscal_useful_life_years'), ['fiscal_depreciation_rate', 'fiscal_useful_life_years']);
  assert.deepEqual(requestFieldsForSuggestion('fiscal_residual_value'), ['fiscal_residual_value']);
});

test('frontend helper applies each suggestion only to the target field', () => {
  const form = {
    depreciation_rate: '10',
    useful_life_years: '10',
    residual_value: '0',
    fiscal_depreciation_rate: '25',
    fiscal_useful_life_years: '4',
    fiscal_residual_value: '0',
  };
  assert.deepEqual(
    applySuggestionValue(form, 'depreciation_rate', { found: true, value: 20 }),
    { ...form, depreciation_rate: '20' },
  );
  assert.deepEqual(
    applySuggestionValue(form, 'useful_life_years', { found: true, value: 5 }),
    { ...form, useful_life_years: '5' },
  );
  assert.deepEqual(
    applySuggestionValue(form, 'residual_value', { found: true, value: 1000 }),
    { ...form, residual_value: '1000' },
  );
  assert.deepEqual(
    applySuggestionValue(form, 'fiscal_depreciation_rate', { found: true, value: 12 }),
    { ...form, fiscal_depreciation_rate: '12' },
  );
  assert.deepEqual(
    applySuggestionValue(form, 'fiscal_useful_life_years', { found: true, value: 8 }),
    { ...form, fiscal_useful_life_years: '8' },
  );
  assert.deepEqual(
    applySuggestionValue(form, 'fiscal_residual_value', { found: true, value: 250 }),
    { ...form, fiscal_residual_value: '250' },
  );
  assert.equal(applySuggestionValue(form, 'residual_value', { found: false, value: null }), form);
});

test('frontend helper recalculates paired fields for valid manual input and preserves previous value for invalid input', () => {
  const form = { depreciation_rate: 10, useful_life_years: 10 };
  assert.deepEqual(applyDepreciationRateInput(form, '20'), { depreciation_rate: '20', useful_life_years: 5 });
  assert.deepEqual(applyUsefulLifeInput(form, '5'), { depreciation_rate: 20, useful_life_years: '5' });
  assert.deepEqual(applyDepreciationRateInput(form, ''), { depreciation_rate: '', useful_life_years: 10 });
  assert.deepEqual(applyUsefulLifeInput(form, 'abc'), { depreciation_rate: 10, useful_life_years: 'abc' });
});

test('frontend helper deduplicates warnings and limits them to three', () => {
  assert.deepEqual(uniqueSuggestionWarnings(['a', 'a', 'b', 'c', 'd']), ['a', 'b', 'c']);
  assert.deepEqual(
    uniqueWarningsForSuggestions([
      { warnings: [MANAGEMENT_WARNING, 'A referência técnica encontrada é genérica.'] },
      { warnings: [MANAGEMENT_WARNING, 'Confirme o modelo do equipamento.', 'A referência técnica encontrada é genérica.'] },
    ]),
    ['A referência técnica encontrada é genérica.', 'Confirme o modelo do equipamento.', MANAGEMENT_WARNING],
  );
});

test('frontend helper converts technical errors to friendly messages', () => {
  assert.match(friendlySuggestionError(new Error('network down')), /Não foi possível gerar/);
  assert.match(friendlySuggestionError({ response: { data: { error: '403 forbidden' } } }), /permissão/);
  assert.equal(
    friendlySuggestionError({ response: { data: { code: 'NO_TRUSTED_SOURCE_AVAILABLE', error: 'NO_TRUSTED_SOURCE_AVAILABLE' } } }),
    'Não foi possível consultar uma fonte confiável neste momento. Tente novamente ou informe os valores manualmente.',
  );
  assert.equal(
    friendlySuggestionError({ response: { data: { error: 'TIMEOUT', sources_failed: [{ reason_code: 'TIMEOUT' }] } } }),
    'A consulta às fontes demorou mais que o esperado. Tente novamente.',
  );
  assert.equal(
    friendlySuggestionError({ response: { data: { error: 'Parametro solicitado nao suportado.' } } }),
    'Preencha os dados indicados para gerar uma sugestão mais segura.',
  );
});

test('frontend helper normalizes consulted sources defensively', () => {
  const sources = normalizeConsultedSources([
    {
      id: 'cpc',
      name: 'CPC',
      type: 'accounting',
      url: 'https://cpc.org.br/',
      title: '<b>CPC 27</b>',
      summary: '<script>x</script> Referência sobre ativo imobilizado '.repeat(10),
      retrieved_at: '2026-07-15T10:00:00.000Z',
      used: true,
    },
    { id: 'http', name: 'HTTP', type: 'fiscal', url: 'http://example.com', used: true },
    { id: 'unused', name: 'Unused', type: 'fiscal', url: 'https://example.com', used: false },
    { id: 'cpc', name: 'CPC', type: 'accounting', url: 'https://cpc.org.br/', used: true },
  ]);

  assert.equal(sources.length, 1);
  assert.equal(sources[0].type, 'Contábil');
  assert.equal(sources[0].url, 'https://cpc.org.br/');
  assert.equal(sources[0].title.includes('<'), false);
  assert.equal(sources[0].summary.length <= 220, true);
  assert.equal(isValidHttpsUrl('https://cpc.org.br/'), true);
  assert.equal(isValidHttpsUrl('http://cpc.org.br/'), false);
  assert.equal(sourceTypeLabel('tecnica'), 'Técnica');
  assert.equal(sourceTypeLabel('technical_regulatory'), 'Técnica regulatória');
  assert.equal(formatConsultedAt('invalid'), '');
  assert.equal(normalizeSourceSummary('<b>texto</b>'), 'texto');
});

test('frontend helper normalizes function response and fiscal reference', () => {
  const response = normalizeSuggestionFunctionResponse({
    data: {
      basis: 'form_and_trusted_sources',
      suggestions: { depreciation_rate: { found: true, value: 10 } },
      sources_consulted: [{ id: 'cpc', name: 'CPC', type: 'accounting', url: 'https://cpc.org.br/', used: true }],
      sources_failed: [{ id: 'cfc', reason_code: 'TIMEOUT' }],
      fiscal_reference: { found: true, value: 10, unit: 'percent_per_year', warning: 'Fiscal' },
      requires_user_confirmation: true,
      generated_at: '2026-07-15T10:00:00.000Z',
    },
  });

  assert.equal(response.basis, 'form_and_trusted_sources');
  assert.equal(response.sources_consulted.length, 1);
  assert.equal(response.has_failed_sources, true);
  assert.equal(response.fiscal_reference.value, 10);
  assert.equal(summarizeSuggestionSources(response, { source_ids: ['cpc'] }), 'CPC');
  assert.equal(summarizeSuggestionSources(response, { source_ids: ['missing'] }), '');
  assert.deepEqual(normalizeFiscalReference({ found: false }), null);
});

test('frontend helper exposes concise standard suggestion notices', () => {
  assert.deepEqual(SUGGESTION_NOTICE_WARNINGS, [
    'Esta é uma estimativa gerencial e precisa de validação contábil.',
    'O resultado não é orientação fiscal ou contábil definitiva.',
    'Nenhuma sugestão pode ser aplicada automaticamente.',
  ]);
});

test('frontend helper does not treat empty or malformed responses as valid suggestions', () => {
  const empty = normalizeSuggestionFunctionResponse({});
  const malformed = normalizeSuggestionFunctionResponse({ data: { suggestions: [] } });
  const foundFalse = normalizeSuggestionFunctionResponse({
    data: {
      suggestions: {
        depreciation_rate: { found: false, reason: INSUFFICIENT_EVIDENCE_MESSAGE },
        useful_life_years: { found: false, reason: INSUFFICIENT_EVIDENCE_MESSAGE },
      },
    },
  });
  const explicitFailure = normalizeSuggestionFunctionResponse({
    data: {
      ok: false,
      suggestions: {
        depreciation_rate: { found: true, value: 10 },
      },
      sources_consulted: [{ id: 'cpc', name: 'CPC', type: 'accounting', url: 'https://cpc.org.br/', used: true }],
      fiscal_reference: { found: true, value: 10, unit: 'percent_per_year' },
    },
  });
  const validPartial = normalizeSuggestionFunctionResponse({
    data: {
      ok: true,
      suggestions: {
        depreciation_rate: { found: true, value: 10 },
        useful_life_years: { found: false },
      },
    },
  });

  assert.equal(empty.ok, false);
  assert.deepEqual(empty.suggestions, {});
  assert.equal(malformed.ok, false);
  assert.deepEqual(malformed.suggestions, {});
  assert.equal(explicitFailure.ok, false);
  assert.deepEqual(explicitFailure.suggestions, {});
  assert.deepEqual(explicitFailure.sources_consulted, []);
  assert.equal(explicitFailure.fiscal_reference, null);
  assert.equal(hasFoundSuggestionForFields(explicitFailure.suggestions, ['depreciation_rate']), false);
  assert.equal(foundFalse.ok, true);
  assert.equal(foundFalse.suggestions.depreciation_rate.found, false);
  assert.equal(hasFoundSuggestionForFields(foundFalse.suggestions, DEPRECIATION_SUGGESTION_FIELDS), false);
  assert.equal(validPartial.ok, true);
  assert.equal(validPartial.suggestions.depreciation_rate.found, true);
  assert.equal(validPartial.suggestions.useful_life_years.found, false);
  assert.equal(hasFoundSuggestionForFields(validPartial.suggestions, DEPRECIATION_SUGGESTION_FIELDS), true);
  assert.equal(hasFoundSuggestionForFields({ residual_value: { found: false } }, ['residual_value']), false);
});

test('AssetForm source does not invoke AI automatically on render or context changes', async () => {
  const source = await readFile(ASSET_FORM_PATH, 'utf8');
  assert.equal(source.includes('setTimeout'), false);
  assert.equal(source.includes('AI_SUGGESTION_DEBOUNCE_MS'), false);

  const useEffectBlocks = [...source.matchAll(/useEffect\(\(\) => \{[\s\S]*?\n  \}, \[[^\]]*\]\);/g)].map((match) => match[0]);
  assert.equal(
    useEffectBlocks.some((block) => block.includes('runSuggestionRequest(')),
    false,
    'useEffect must not call runSuggestionRequest automatically',
  );
});

test('AssetForm source uses one shared depreciation button and keeps residual separate', async () => {
  const source = await readFile(ASSET_FORM_PATH, 'utf8');

  assert.equal(source.includes('grid grid-cols-1 md:grid-cols-2'), true);
  assert.equal(source.includes('Sugerir taxa e vida útil'), true);
  assert.equal(source.includes('Sugerir valor residual'), true);
  assert.equal((source.match(/renderSuggestionButton\('depreciation_rate'/g) || []).length, 0);
  assert.equal((source.match(/renderSuggestionButton\('useful_life_years'/g) || []).length, 0);
  assert.equal((source.match(/renderSuggestionButton\('residual_value'/g) || []).length, 1);
  assert.equal(source.includes('Consultando fontes confiáveis e analisando os dados do ativo'), true);
  assert.equal(source.includes(`Fonte:</span> {sourceSummary || 'não informada'}`), true);
  assert.equal(source.includes('Avisos específicos'), true);
  assert.equal(source.includes('const notices = [...extraWarnings, ...SUGGESTION_NOTICE_WARNINGS]'), false);
  assert.equal(source.includes('const renderSuggestionNotices = (fields) =>'), true);
  assert.equal(source.includes('SUGGESTION_NOTICE_WARNINGS'), true);
  assert.equal(source.includes('{renderSuggestionNotices(DEPRECIATION_SUGGESTION_FIELDS)}'), true);
  assert.equal(source.includes("{renderSuggestionNotices(['residual_value'])}"), true);
  assert.equal(source.includes('Referência fiscal:'), true);
  assert.equal(source.includes('Sugestão gerada com base nos dados informados e nas fontes consultadas.'), false);
  assert.equal(source.includes('if (!payload.ok) {'), true);
  assert.equal(source.includes('Object.assign(new Error(rawPayload?.error'), true);
  assert.equal(source.includes('{ data: rawPayload }'), true);
  assert.equal(source.includes('throw { data: rawPayload }'), false);
  assert.equal(source.includes('hasFoundSuggestionForFields(suggestions, fields)'), true);
  assert.equal(source.includes('INSUFFICIENT_EVIDENCE_MESSAGE'), true);
  assert.equal(source.includes('const reason = suggestion.reason === INSUFFICIENT_EVIDENCE_MESSAGE'), true);
  assert.equal(source.includes('dangerouslySetInnerHTML'), false);
});

test('AssetForm source exposes fiscal suggestions only by click and keeps accounting fields separate', async () => {
  const source = await readFile(ASSET_FORM_PATH, 'utf8');

  assert.equal(source.includes('Fiscal (opcional)'), true);
  assert.equal(source.includes('Sugerir taxa e vida'), true);
  assert.equal(source.includes('Sugerir residual fiscal'), true);
  assert.equal(source.includes('handleSuggestFiscalDepreciationGroup'), true);
  assert.equal(source.includes('runSuggestionRequest(FISCAL_DEPRECIATION_SUGGESTION_FIELDS, suggestionContext)'), true);
  assert.equal(source.includes('runSuggestionRequest(FISCAL_RESIDUAL_SUGGESTION_FIELDS, suggestionContext)'), true);
  assert.equal(source.includes("{renderSuggestionBox('fiscal_depreciation_rate')}"), true);
  assert.equal(source.includes("{renderSuggestionBox('fiscal_useful_life_years')}"), true);
  assert.equal(source.includes("{renderSuggestionBox('fiscal_residual_value')}"), true);
  assert.equal(source.includes('handleFiscalDepreciationRateChange'), true);
  assert.equal(source.includes('handleFiscalUsefulLifeChange'), true);
  assert.equal(source.includes('handleFiscalResidualValueChange'), true);
  assert.equal(source.includes('fiscal_useful_life_years: e.target.value > 0'), false);
  assert.equal(source.includes('fiscal_depreciation_rate: e.target.value > 0'), false);
  assert.equal(source.includes('fiscal separada dos'), true);

  const useEffectBlocks = [...source.matchAll(/useEffect\(\(\) => \{[\s\S]*?\n  \}, \[[^\]]*\]\);/g)].map((match) => match[0]);
  assert.equal(
    useEffectBlocks.some((block) => block.includes('handleSuggestFiscal') || block.includes('FISCAL_DEPRECIATION_SUGGESTION_FIELDS')),
    false,
    'useEffect must not call fiscal suggestions automatically',
  );
});

test('Settings source includes informational trusted sources without management actions', async () => {
  const source = await readFile(SETTINGS_PATH, 'utf8');

  assert.equal(TRUSTED_AI_SOURCES_INFO.length, 12);
  assert.equal(source.includes('Fontes confiáveis da IA'), true);
  assert.equal(source.includes('TRUSTED_AI_SOURCES_INFO.map'), true);
  assert.equal(/testar fonte|nova fonte|adicionar fonte|editar fonte|remover fonte/i.test(source), false);
});
