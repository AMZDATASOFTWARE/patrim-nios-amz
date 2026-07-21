import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

import {
  DEPRECIATION_SUGGESTION_FIELDS,
  FISCAL_DEPRECIATION_SUGGESTION_FIELDS,
  INSUFFICIENT_EVIDENCE_MESSAGE,
  MANAGEMENT_WARNING,
  SUGGESTION_NOTICE_WARNINGS,
  TRUSTED_AI_SOURCES_INFO,
  applyDepreciationRateInput,
  applySuggestionValue,
  applyUsefulLifeInput,
  buildSuggestAssetParametersPayload,
  buildFiscalRefinementContext,
  buildNextFiscalRefinementState,
  buildSuggestionContext,
  createEmptyFiscalRefinementState,
  createEmptySuggestionState,
  fiscalClassificationFromSuggestions,
  fiscalCurrentQuestion,
  fiscalReadyOption,
  fiscalRefinementToken,
  fiscalSuggestionsFromResponse,
  fiscalUserMessage,
  formatSuggestionValue,
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
const FISCAL_REFINEMENT_PATH = new URL('../src/components/assets/FiscalClassificationRefinement.jsx', import.meta.url);

test('frontend helper initializes suggestions without loading, errors, or auto results', () => {
  const state = createEmptySuggestionState();
  assert.deepEqual(Object.keys(state).sort(), ['depreciation_rate', 'residual_value', 'useful_life_years'].sort());
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
      brand: 'Toyota',
      model: 'Hilux',
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
  assert.equal(context.brand, 'Toyota');
  assert.equal(context.model, 'Hilux');
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

test('frontend helper builds fiscal refinement payload without exposing NCM as decision', () => {
  const baseContext = { name: 'Freezer comercial', category: 'Equipamentos' };
  const state = createEmptyFiscalRefinementState();
  const suggestContext = buildFiscalRefinementContext(baseContext, state, 'CLASSIFY_DIRECT', { taxRegime: 'LUCRO_REAL' });
  assert.equal(suggestContext.fiscal_classification_action, 'CLASSIFY_DIRECT');
  assert.equal(suggestContext.tax_regime, 'LUCRO_REAL');
  assert.equal('fiscal_refinement_state_token' in suggestContext, false);
  assert.equal('fiscal_classification_answers' in suggestContext, false);
  assert.equal('selected_fiscal_classification_option_id' in suggestContext, false);

  const questionState = {
    ...state,
    refinementStateToken: 'token-2',
    answers: { AI_Q_001: 'REFRIGERATION' },
  };
  const refineContext = buildFiscalRefinementContext(baseContext, questionState, 'REFINE_OPTIONS', {
    questionId: 'AI_Q_002',
    answerValue: 'COMMERCIAL_FREEZER',
    taxRegime: 'LUCRO_REAL',
  });
  assert.equal(refineContext.fiscal_refinement_state_token, 'token-2');
  assert.deepEqual(refineContext.fiscal_classification_answers, {
    AI_Q_001: 'REFRIGERATION',
    AI_Q_002: 'COMMERCIAL_FREEZER',
  });

  const option = {
    option_id: 'REFRIGERATION_EQUIPMENT_PENDING_V1',
    classification_catalog_version: 'v1',
    option_fingerprint: 'fp-1',
    display_name: 'Freezer ou congelador comercial',
    ncm_code: '84185090',
  };
  const confirmContext = buildFiscalRefinementContext(baseContext, questionState, 'CONFIRM_OPTION', {
    selectedOption: option,
    taxRegime: 'LUCRO_REAL',
  });
  assert.equal(confirmContext.ncm_source, 'CLASSIFICATION_OPTION');
  assert.equal(confirmContext.ncm_classification_status, 'CONFIRMED_BY_USER');
  assert.equal(confirmContext.selected_fiscal_classification_option_id, option.option_id);
  assert.equal(confirmContext.selected_fiscal_classification_catalog_version, option.classification_catalog_version);
  assert.equal(confirmContext.selected_fiscal_classification_option_fingerprint, option.option_fingerprint);
  assert.equal(confirmContext.selected_fiscal_classification_name, option.display_name);
  assert.equal('ncm_code' in confirmContext, false);
});

test('frontend helper extracts fiscal questions, tokens, options and suggestions defensively', () => {
  const response = normalizeSuggestionFunctionResponse({
    ok: true,
    suggestions: {
      fiscal_depreciation_rate: {
        found: true,
        value: 10,
        fiscal_classification: {
          questions: [{ question_id: 'AI_Q_001', question: 'Qual funcao?', options: [{ value: 'A', label: 'Opcao A' }] }],
          options: [{ option_id: 'OPT_1', display_name: 'Freezer comercial', can_release_fiscal_rule: true }],
          refinement_state: {
            status: 'READY_FOR_CONFIRMATION',
            refinement_state_token: 'token-3',
            current_question: null,
          },
        },
      },
      fiscal_useful_life_years: { found: true, value: 10 },
      fiscal_residual_value: { found: false, value: null },
    },
  });
  const fiscalSuggestions = fiscalSuggestionsFromResponse(response);
  const classification = fiscalClassificationFromSuggestions(fiscalSuggestions);
  assert.equal(fiscalSuggestions.fiscal_depreciation_rate.value, 10);
  assert.equal(fiscalSuggestions.fiscal_residual_value, undefined);
  assert.equal(fiscalRefinementToken(classification), 'token-3');
  assert.equal(fiscalCurrentQuestion(classification).question_id, 'AI_Q_001');
  assert.equal(fiscalReadyOption(classification).option_id, 'OPT_1');
  assert.equal(FISCAL_DEPRECIATION_SUGGESTION_FIELDS.includes('fiscal_residual_value'), false);
});

test('frontend helper does not expose pending fiscal option as ready for confirmation', () => {
  const classification = {
    refinement_state: { status: 'READY_FOR_CONFIRMATION' },
    options: [{ option_id: 'OPT_PENDING', display_name: 'Equipamento genérico', can_release_fiscal_rule: false }],
  };
  assert.equal(fiscalReadyOption(classification), null);
  assert.equal(
    fiscalReadyOption({
      ...classification,
      options: [{ option_id: 'OPT_READY', display_name: 'Equipamento liberado', can_release_fiscal_rule: true }],
    }).option_id,
    'OPT_READY',
  );
  assert.equal(
    fiscalReadyOption({
      refinement_state: { status: 'NEEDS_MORE_INFORMATION' },
      options: [{ option_id: 'OPT_READY', display_name: 'Equipamento liberado', can_release_fiscal_rule: true }],
    }),
    null,
  );
});

test('frontend helper replaces or clears fiscal refinement token from backend response', () => {
  const previous = { ...createEmptyFiscalRefinementState(), refinementStateToken: 'token-1' };
  const withToken = buildNextFiscalRefinementState(previous, {
    suggestions: {
      fiscal_depreciation_rate: {
        found: false,
        fiscal_classification: {
          refinement_state: {
            status: 'NEEDS_MORE_INFORMATION',
            refinement_state_token: 'token-2',
          },
        },
      },
    },
  }, 'ctx-1');
  assert.equal(withToken.refinementStateToken, 'token-2');

  const withoutToken = buildNextFiscalRefinementState(previous, {
    suggestions: {
      fiscal_depreciation_rate: {
        found: false,
        fiscal_classification: {
          refinement_state: {
            status: 'REQUIRES_HUMAN_REVIEW',
          },
        },
      },
    },
  }, 'ctx-2');
  assert.equal(withoutToken.refinementStateToken, null);
});

test('frontend helper exposes fiscal refinement states with actionable messages', () => {
  assert.match(fiscalUserMessage('REQUIRES_HUMAN_REVIEW'), /revis|Revise/i);
  assert.match(fiscalUserMessage('NO_SAFE_CANDIDATE'), /classifica/i);

  const previous = createEmptyFiscalRefinementState();
  const classified = buildNextFiscalRefinementState(previous, {
    suggestions: {
      fiscal_depreciation_rate: {
        found: true,
        value: 20,
        fiscal_classification: {
          status: 'CLASSIFIED',
          confirmed_display_name: 'Notebook / computador portátil',
          confirmed_ncm_code: '84713012',
        },
      },
      fiscal_useful_life_years: { found: true, value: 5 },
    },
  }, 'ctx-classified');
  assert.equal(classified.status, 'CLASSIFIED');
  assert.equal(classified.classificationConfirmed, false);
  assert.equal(classified.currentQuestion, null);

  const noSafeMatch = buildNextFiscalRefinementState(previous, {
    suggestions: {
      fiscal_depreciation_rate: {
        found: false,
        fiscal_classification: { status: 'UNKNOWN' },
      },
    },
  }, 'ctx-empty');
  assert.equal(noSafeMatch.status, 'NO_SAFE_MATCH');
});

test('frontend helper maps clicked fields to the expected request fields', () => {
  assert.deepEqual(requestFieldsForSuggestion('depreciation_rate'), ['depreciation_rate', 'useful_life_years']);
  assert.deepEqual(requestFieldsForSuggestion('useful_life_years'), ['depreciation_rate', 'useful_life_years']);
  assert.deepEqual(requestFieldsForSuggestion('residual_value'), ['residual_value']);
});

test('frontend helper formats accounting and fiscal suggestion values with user-facing units', () => {
  assert.equal(formatSuggestionValue('depreciation_rate', 10), '10% ao ano');
  assert.equal(formatSuggestionValue('useful_life_years', 10), '10 anos');
  assert.match(formatSuggestionValue('residual_value', 0), /R\$\s?0,00/);
  assert.equal(formatSuggestionValue('fiscal_depreciation_rate', 20), '20% ao ano');
  assert.equal(formatSuggestionValue('fiscal_useful_life_years', 5), '5 anos');
  assert.equal(FISCAL_DEPRECIATION_SUGGESTION_FIELDS.includes('fiscal_residual_value'), false);
});

test('frontend helper applies each suggestion only to the target field', () => {
  const form = { depreciation_rate: '10', useful_life_years: '10', residual_value: '0' };
  assert.deepEqual(
    applySuggestionValue(form, 'depreciation_rate', { found: true, value: 20 }),
    { depreciation_rate: '20', useful_life_years: '10', residual_value: '0' },
  );
  assert.deepEqual(
    applySuggestionValue(form, 'useful_life_years', { found: true, value: 5 }),
    { depreciation_rate: '10', useful_life_years: '5', residual_value: '0' },
  );
  assert.deepEqual(
    applySuggestionValue(form, 'residual_value', { found: true, value: 1000 }),
    { depreciation_rate: '10', useful_life_years: '10', residual_value: '1000' },
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
  assert.equal(
    friendlySuggestionError({ response: { data: { error: 'Unidade inválida para depreciation_rate.' } } }),
    'Não foi possível validar a unidade retornada pela sugestão. Tente novamente.',
  );
});

test('frontend helper normalizes consulted sources defensively', () => {
  const sources = normalizeConsultedSources([
    {
      id: 'cpc',
      name: 'CPC',
      type: 'contabil',
      url: 'https://cpc.org.br/',
      title: '<b>CPC 27</b>',
      summary: '<script>x</script> Referência sobre ativo imobilizado '.repeat(10),
      retrieved_at: '2026-07-15T10:00:00.000Z',
      used: true,
    },
    { id: 'http', name: 'HTTP', type: 'fiscal', url: 'http://example.com', used: true },
    { id: 'unused', name: 'Unused', type: 'fiscal', url: 'https://example.com', used: false },
    { id: 'cpc', name: 'CPC', type: 'contabil', url: 'https://cpc.org.br/', used: true },
  ]);

  assert.equal(sources.length, 1);
  assert.equal(sources[0].type, 'Contábil');
  assert.equal(sources[0].url, 'https://cpc.org.br/');
  assert.equal(sources[0].title.includes('<'), false);
  assert.equal(sources[0].summary.length <= 220, true);
  assert.equal(isValidHttpsUrl('https://cpc.org.br/'), true);
  assert.equal(isValidHttpsUrl('http://cpc.org.br/'), false);
  assert.equal(sourceTypeLabel('tecnica'), 'Técnica');
  assert.equal(formatConsultedAt('invalid'), '');
  assert.equal(normalizeSourceSummary('<b>texto</b>'), 'texto');
});

test('frontend helper normalizes function response and fiscal reference', () => {
  const response = normalizeSuggestionFunctionResponse({
    data: {
      basis: 'form_and_trusted_sources',
      suggestions: { depreciation_rate: { found: true, value: 10 } },
      sources_consulted: [{ id: 'cpc', name: 'CPC', type: 'contabil', url: 'https://cpc.org.br/', used: true }],
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
      sources_consulted: [{ id: 'cpc', name: 'CPC', type: 'contabil', url: 'https://cpc.org.br/', used: true }],
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
  assert.equal(source.includes('Informações Financeiras'), true);
  assert.equal(source.includes('Depreciação societária / gerencial'), true);
  assert.equal(source.includes('Sugestão gerencial automática'), true);
  assert.equal(source.includes('Depreciação Fiscal (opcional)'), true);
  assert.equal(source.includes('Sugerir taxa e vida útil'), true);
  assert.equal(source.includes('Sugerir valor residual'), true);
  assert.equal((source.match(/renderSuggestionButton\('depreciation_rate'/g) || []).length, 0);
  assert.equal((source.match(/renderSuggestionButton\('useful_life_years'/g) || []).length, 0);
  assert.equal((source.match(/renderSuggestionButton\('residual_value'/g) || []).length, 1);
  assert.equal(source.indexOf('Sugestão gerencial automática') > source.indexOf('Depreciação societária / gerencial'), true);
  assert.equal(source.includes('Consultando fontes confiáveis e analisando os dados do ativo'), true);
  assert.equal(source.includes(`Fonte:</span> {sourceSummary || 'não informada'}`), true);
  assert.equal(source.includes('Avisos específicos'), true);
  assert.equal(source.includes('const notices = [...extraWarnings, ...SUGGESTION_NOTICE_WARNINGS]'), false);
  assert.equal(source.includes('const renderSuggestionNotices = (fields) =>'), true);
  assert.equal(source.includes('SUGGESTION_NOTICE_WARNINGS'), true);
  assert.equal(source.includes('{renderSuggestionNotices(DEPRECIATION_SUGGESTION_FIELDS)}'), true);
  assert.equal(source.includes("{renderSuggestionNotices(['residual_value'])}"), true);
  assert.equal(source.includes('Referência fiscal:'), false);
  const managementPanel = source.slice(source.indexOf('Sugestão gerencial automática'), source.indexOf('Fornecedor & Documento Fiscal'));
  assert.equal(managementPanel.includes('NCM'), false);
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

test('AssetForm source integrates fiscal refinement only through explicit user actions', async () => {
  const source = await readFile(ASSET_FORM_PATH, 'utf8');
  const fiscalSource = await readFile(FISCAL_REFINEMENT_PATH, 'utf8');

  assert.equal(source.includes('FiscalClassificationRefinement'), true);
  assert.equal(source.includes("runFiscalRefinementRequest('CLASSIFY_DIRECT'"), true);
  assert.equal(source.includes("runFiscalRefinementRequest('SUGGEST_OPTIONS'"), false);
  assert.equal(source.includes('FISCAL_DEPRECIATION_SUGGESTION_FIELDS'), true);
  assert.equal(source.includes("['fiscal_residual_value']"), false);
  assert.equal(source.includes('localStorage'), false);
  assert.equal(source.includes('sessionStorage'), false);
  assert.equal(source.includes('VITE_FISCAL_REFINEMENT_STATE_SECRET'), false);
  assert.equal(fiscalSource.includes('Confirmar classificação fiscal'), true);
  assert.equal(fiscalSource.includes('NCM sugerido pelo catálogo fiscal local'), true);
  assert.equal(fiscalSource.includes('Tipo identificado'), true);
  assert.equal(fiscalSource.includes('Campos usados'), true);
  assert.equal(fiscalSource.includes('FIELD_LABELS'), true);
  assert.equal(fiscalSource.includes('refinement_state_token'), false);
  assert.equal(fiscalSource.includes('candidate_ref'), false);
  assert.equal(fiscalSource.includes('question_fingerprint'), false);
  assert.equal(fiscalSource.includes('Sugestão Automática'), true);
  assert.equal(fiscalSource.includes('valor residual fiscal'), true);
  assert.equal(source.includes('Revise nome, categoria'), false);
  assert.equal(source.includes('NCM seguro no catálogo local'), true);
});

test('frontend fiscal refinement files do not contain common mojibake patterns', async () => {
  const files = [ASSET_FORM_PATH, FISCAL_REFINEMENT_PATH, new URL('../src/lib/assetParameterSuggestions.js', import.meta.url)];
  const forbiddenPatterns = [
    String.fromCharCode(92) + 'u00',
    `sugest${String.fromCharCode(63)}o`,
    `classifica${String.fromCharCode(63)}${String.fromCharCode(63)}o`,
    `Sugest${String.fromCharCode(92)}ão`,
    `Autom${String.fromCharCode(92)}ática`,
    ...[
    [0xc3, 0x192, 0xc2, 0xa3],
    [0xc3, 0x192, 0xc2, 0xa7],
    [0xc3, 0x192, 0xc2, 0xa9],
    [0xc3, 0x192, 0xc2, 0xaa],
    [0xc3, 0x192, 0xc2, 0xad],
    [0xc3, 0x192, 0xc2, 0xb3],
    [0xc3, 0x192, 0xc2, 0xba],
  ].map((codes) => String.fromCharCode(...codes)),
  ];
  for (const file of files) {
    const source = await readFile(file, 'utf8');
    for (const pattern of forbiddenPatterns) {
      assert.equal(source.includes(pattern), false, `${file.pathname} contains ${pattern}`);
    }
  }
});

test('Settings source includes informational trusted sources without management actions', async () => {
  const source = await readFile(SETTINGS_PATH, 'utf8');

  assert.equal(TRUSTED_AI_SOURCES_INFO.length, 12);
  assert.equal(source.includes('Fontes confiáveis da IA'), true);
  assert.equal(source.includes('TRUSTED_AI_SOURCES_INFO.map'), true);
  assert.equal(/testar fonte|nova fonte|adicionar fonte|editar fonte|remover fonte/i.test(source), false);
});
