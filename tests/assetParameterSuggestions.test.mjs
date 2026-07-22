import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

import {
  DEPRECIATION_SUGGESTION_FIELDS,
  FISCAL_DEPRECIATION_SUGGESTION_FIELDS,
  INSUFFICIENT_EVIDENCE_MESSAGE,
  MANAGEMENT_WARNING,
  SUGGESTION_NOTICE_WARNINGS,
  buildFiscalRefinementContext,
  buildNextFiscalRefinementState,
  buildSuggestAssetParametersPayload,
  buildSuggestionContext,
  confidenceValueLabel,
  createEmptyFiscalRefinementState,
  createEmptySuggestionState,
  fiscalClassificationFromSuggestions,
  fiscalEvaluationFromSuggestions,
  fiscalSuggestionsFromResponse,
  formatSuggestionValue,
  friendlySuggestionError,
  getSuggestionEligibility,
  hasFoundSuggestionForFields,
  normalizeSuggestionFunctionResponse,
  requestFieldsForSuggestion,
  summarizeSuggestionSources,
  uniqueSuggestionWarnings,
  uniqueWarningsForSuggestions,
} from '../src/lib/assetParameterSuggestions.js';
import { canUseAssetAutomaticSuggestions } from '../src/lib/permissions.js';

const ASSET_FORM_PATH = new URL('../src/pages/AssetForm.jsx', import.meta.url);
const SETTINGS_PATH = new URL('../src/pages/Settings.jsx', import.meta.url);
const FISCAL_REFINEMENT_PATH = new URL('../src/components/assets/FiscalClassificationRefinement.jsx', import.meta.url);

function text(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function legacyTerms() {
  return [
    ['SUGGEST', 'OPTIONS'].join('_'),
    ['REFINE', 'OPTIONS'].join('_'),
    ['CONFIRM', 'OPTION'].join('_'),
    ['MANUAL', 'SPECIALIST', 'CONFIRMATION'].join('_'),
    ['fiscal', 'refinement', 'state', 'token'].join('_'),
    ['refinement', 'State', 'Token'].join(''),
    ['current', 'Question'].join(''),
    ['ready', 'Option'].join(''),
    ['selected', 'Option'].join(''),
    ['candidate', 'ref'].join('_'),
    ['question', 'fingerprint'].join('_'),
    ['selected', 'fiscal', 'classification', 'option', 'id'].join('_'),
    ['fiscal', 'classification', 'answers'].join('_'),
  ];
}

test('frontend helper initializes accounting and direct fiscal states safely', () => {
  const state = createEmptySuggestionState();
  assert.deepEqual(Object.keys(state).sort(), ['depreciation_rate', 'residual_value', 'useful_life_years'].sort());
  for (const item of Object.values(state)) {
    assert.equal(item.loading, false);
    assert.equal(item.suggestion, null);
    assert.equal(item.error, '');
    assert.equal(item.stale, false);
    assert.equal(item.applied, false);
  }

  const fiscal = createEmptyFiscalRefinementState();
  assert.deepEqual(Object.keys(fiscal).sort(), [
    'applied',
    'classificationConfirmed',
    'contextKey',
    'error',
    'loading',
    'response',
    'status',
    'suggestions',
  ].sort());
  assert.equal(fiscal.classificationConfirmed, false);
});

test('frontend helper builds sanitized asset context with name as primary description', () => {
  const context = buildSuggestionContext({
    name: 'Notebook Dell Latitude',
    category: 'Equipamentos',
    description: '',
    account: 'Maquinas e Equipamentos',
    brand: 'Dell',
    model: 'Latitude 5440',
    acquisition_value: '5000',
    purchase_date: '2026-01-01',
    depreciation_start_date: '2026-01-15',
    conservation_state: 'Novo',
    tax_regime: 'LUCRO_REAL',
    password: 'secret',
  });

  assert.equal(context.name, 'Notebook Dell Latitude');
  assert.equal(context.description, 'Notebook Dell Latitude');
  assert.equal(context.category, 'Equipamentos');
  assert.equal(context.brand, 'Dell');
  assert.equal(context.model, 'Latitude 5440');
  assert.equal(context.acquisition_value, 5000);
  assert.equal('password' in context, false);
});

test('frontend helper builds direct fiscal payload and does not include legacy state fields', () => {
  const base = buildSuggestionContext({ name: 'Notebook Dell', category: 'Equipamentos' });
  const context = buildFiscalRefinementContext(base, { ignored: true }, 'anything', { taxRegime: 'LUCRO_REAL' });
  const payload = buildSuggestAssetParametersPayload('asset-1', FISCAL_DEPRECIATION_SUGGESTION_FIELDS, context);

  assert.equal(context.fiscal_classification_action, 'CLASSIFY_DIRECT');
  assert.equal(context.tax_regime, 'LUCRO_REAL');
  assert.deepEqual(payload.requested_parameters, ['fiscal_depreciation_rate', 'fiscal_useful_life_years']);
  for (const term of legacyTerms()) {
    assert.equal(term in context, false);
    assert.equal(JSON.stringify(payload).includes(term), false);
  }
});

test('frontend helper interprets direct fiscal response without old refinement state', () => {
  const response = {
    suggestions: {
      fiscal_depreciation_rate: {
        found: true,
        value: 20,
        unit: 'percent_per_year',
        confidence: 'medium',
        reason: 'NCM provavel escolhido pela IA.',
        warnings: ['Revise a classificacao fiscal.'],
        fiscal_classification: {
          status: 'CLASSIFIED_APPLICABLE',
          confirmed_display_name: 'Computador portatil',
          confirmed_ncm_code: '84713012',
          used_fields: ['name', 'category'],
        },
      },
      fiscal_useful_life_years: {
        found: true,
        value: 5,
        unit: 'years',
        confidence: 'medium',
        reason: 'Vida util resolvida pelo catalogo local.',
        warnings: [],
      },
    },
  };

  const next = buildNextFiscalRefinementState(createEmptyFiscalRefinementState(), response, 'ctx-1');
  assert.equal(next.status, 'CLASSIFIED_APPLICABLE');
  assert.equal(next.classificationConfirmed, false);
  assert.equal(next.suggestions.fiscal_depreciation_rate.value, 20);
  for (const term of legacyTerms()) assert.equal(JSON.stringify(next).includes(term), false);
});

test('frontend helper keeps fiscal hypothesis visible when values are review-only', () => {
  const response = {
    suggestions: {
      fiscal_depreciation_rate: {
        found: false,
        reason: 'Classificacao fiscal provavel identificada, mas sem regra fiscal local aplicavel.',
        warnings: ['Classificacao provavel. Revise com responsavel fiscal antes de aplicar qualquer parametro.'],
        fiscal_classification: {
          status: 'CLASSIFIED_REVIEW_ONLY',
          action: 'CLASSIFY_DIRECT',
          confirmed_display_name: 'Classificacao fiscal provavel',
          confirmed_ncm_code: '99999999',
          ncm_display: '9999.99.99',
          confidence: 'LOW',
          reason: 'A IA encontrou uma hipotese provavel.',
          used_fields: ['name', 'description'],
        },
      },
      fiscal_useful_life_years: {
        found: false,
        reason: 'Classificacao fiscal provavel identificada, mas sem regra fiscal local aplicavel.',
      },
    },
  };

  const next = buildNextFiscalRefinementState(createEmptyFiscalRefinementState(), response, 'ctx-review');
  assert.equal(next.status, 'CLASSIFIED_REVIEW_ONLY');
  assert.equal(next.classification.confirmed_ncm_code, '99999999');
  assert.equal(hasFoundSuggestionForFields(next.suggestions, FISCAL_DEPRECIATION_SUGGESTION_FIELDS), false);
});

test('frontend helper marks direct fiscal response as no safe match when nothing is found', () => {
  const response = {
    suggestions: {
      fiscal_depreciation_rate: {
        found: false,
        reason: 'A IA nao selecionou um NCM do catalogo local.',
        fiscal_classification: { status: 'NO_HYPOTHESIS', action: 'CLASSIFY_DIRECT' },
      },
      fiscal_useful_life_years: { found: false, reason: 'Sem classificacao.' },
    },
  };
  const next = buildNextFiscalRefinementState(createEmptyFiscalRefinementState(), response, 'ctx-2');
  assert.equal(next.status, 'NO_HYPOTHESIS');
  assert.equal(next.classificationConfirmed, false);
});

test('frontend helper preserves accounting grouping and manual value formatting', () => {
  assert.deepEqual(requestFieldsForSuggestion('depreciation_rate'), DEPRECIATION_SUGGESTION_FIELDS);
  assert.deepEqual(requestFieldsForSuggestion('useful_life_years'), DEPRECIATION_SUGGESTION_FIELDS);
  assert.deepEqual(requestFieldsForSuggestion('residual_value'), ['residual_value']);
  assert.equal(formatSuggestionValue('depreciation_rate', 10), '10% ao ano');
  assert.equal(formatSuggestionValue('useful_life_years', 10), '10 anos');
  assert.equal(formatSuggestionValue('fiscal_depreciation_rate', 20), '20% ao ano');
  assert.equal(formatSuggestionValue('fiscal_useful_life_years', 5), '5 anos');
  assert.equal(text(confidenceValueLabel('medium')), 'media');
});

test('frontend helper keeps warnings friendly and deduplicated', () => {
  assert.deepEqual(uniqueSuggestionWarnings(['a', 'a', 'b', 'c', 'd']), ['a', 'b', 'c']);
  assert.deepEqual(
    uniqueWarningsForSuggestions([
      { warnings: [MANAGEMENT_WARNING, 'Referencia tecnica generica.'] },
      { warnings: [MANAGEMENT_WARNING, 'Confirme o modelo.', 'Referencia tecnica generica.'] },
    ]),
    ['Referencia tecnica generica.', 'Confirme o modelo.', MANAGEMENT_WARNING],
  );
  assert.equal(SUGGESTION_NOTICE_WARNINGS.length, 3);
});

test('frontend helper normalizes responses and sources defensively', () => {
  const normalized = normalizeSuggestionFunctionResponse({
    ok: true,
    suggestions: { depreciation_rate: { found: false } },
    sources_consulted: [{
      id: 'cpc',
      name: 'CPC',
      type: 'contabil',
      url: 'https://cpc.org.br/',
      summary: '<b>referencia</b>',
      retrieved_at: '2026-01-01T00:00:00.000Z',
      used: true,
    }],
  });
  assert.equal(normalized.ok, true);
  assert.equal(normalized.sources_consulted.length, 1);
  assert.equal(summarizeSuggestionSources(normalized, { source_ids: ['cpc'] }), 'CPC');
  assert.equal(normalizeSuggestionFunctionResponse({}).ok, false);
});

test('frontend helper converts backend failures to friendly messages', () => {
  assert.match(text(friendlySuggestionError(new Error('network down'))), /possivel gerar/);
  assert.match(text(friendlySuggestionError({ response: { data: { error: '403 forbidden' } } })), /permiss/);
  assert.equal(
    text(friendlySuggestionError({ response: { data: { error: 'Unidade invalida para depreciation_rate.' } } })),
    'nao foi possivel validar a unidade retornada pela sugestao. tente novamente.',
  );
  assert.equal(
    text(friendlySuggestionError({ response: { data: { error: 'Parametro solicitado nao suportado.' } } })),
    'preencha os dados indicados para gerar uma sugestao mais segura.',
  );
});

test('frontend helper exposes fiscal classification and evaluation from suggestions', () => {
  const suggestions = {
    fiscal_depreciation_rate: {
      found: true,
      fiscal_classification: { status: 'CLASSIFIED_APPLICABLE', action: 'CLASSIFY_DIRECT' },
      fiscal_evaluation: { status: 'MATCHED' },
    },
  };
  assert.equal(fiscalSuggestionsFromResponse({ suggestions }).fiscal_depreciation_rate.found, true);
  assert.equal(fiscalClassificationFromSuggestions(suggestions).status, 'CLASSIFIED_APPLICABLE');
  assert.equal(fiscalEvaluationFromSuggestions(suggestions).status, 'MATCHED');
  assert.equal(hasFoundSuggestionForFields(suggestions, FISCAL_DEPRECIATION_SUGGESTION_FIELDS), true);
});

test('AssetForm keeps AI calls explicit and uses only direct fiscal action', async () => {
  const source = await readFile(ASSET_FORM_PATH, 'utf8');
  const normalized = text(source);
  assert.equal(source.includes('base44.functions.invoke'), true);
  assert.equal(source.includes('useEffect(() => { handleSuggest'), false);
  assert.equal(source.includes("runFiscalRefinementRequest('CLASSIFY_DIRECT'"), true);
  for (const term of legacyTerms().filter((item) => item !== 'CLASSIFY_DIRECT')) {
    assert.equal(source.includes(term), false);
  }
  assert.equal(normalized.includes('ncm seguro'), false);
});

test('AssetForm gates automatic suggestions to account admins and platform admins', async () => {
  const source = await readFile(ASSET_FORM_PATH, 'utf8');
  assert.equal(canUseAssetAutomaticSuggestions({ role: 'admin' }, null), true);
  assert.equal(canUseAssetAutomaticSuggestions({ is_platform_admin: true, role: 'user' }, null), true);
  assert.equal(canUseAssetAutomaticSuggestions(
    { role: 'user', email: 'owner@example.com' },
    { owner_email: 'OWNER@example.com' },
  ), true);
  assert.equal(canUseAssetAutomaticSuggestions({ role: 'manager', email: 'manager@example.com' }, null), false);
  assert.equal(canUseAssetAutomaticSuggestions({ role: 'user', email: 'user@example.com' }, null), false);
  assert.equal(source.includes('canUseAutomaticSuggestions &&'), true);
  assert.equal(source.includes('if (!canUseAutomaticSuggestions) return;'), true);
});

test('FiscalClassificationRefinement shows direct suggestion and keeps manual confirmation', async () => {
  const source = await readFile(FISCAL_REFINEMENT_PATH, 'utf8');
  const normalized = text(source);
  assert.equal(normalized.includes('sugestao automatica'), true);
  assert.equal(normalized.includes('a ia escolhe uma opcao do catalogo fiscal local'), false);
  assert.equal(normalized.includes('a ia analisa os dados do bem, compara com o catalogo fiscal local'), true);
  assert.equal(normalized.includes('confirmar classificacao fiscal'), true);
  assert.equal(source.includes('{applicable && ('), true);
  assert.equal(source.includes("Usar {field === 'fiscal_depreciation_rate'"), true);
  assert.equal(source.includes("field === 'fiscal_depreciation_rate' ? 'taxa fiscal'"), true);
  assert.equal(normalized.includes('classificacao provavel para revisao'), true);
  assert.equal(normalized.includes('esta classificacao e apenas uma hipotese fiscal'), true);
  assert.equal(normalized.includes('valor residual fiscal'), true);
  for (const term of legacyTerms()) assert.equal(source.includes(term), false);
});

test('Settings still presents trusted source information without management actions', async () => {
  const source = await readFile(SETTINGS_PATH, 'utf8');
  assert.equal(text(source).includes('fontes confiaveis da ia'), true);
  assert.equal(/testar fonte|nova fonte|adicionar fonte|editar fonte|remover fonte/i.test(source), false);
});

test('frontend helper eligibility still protects minimum accounting context', () => {
  const invalid = getSuggestionEligibility({});
  assert.equal(invalid.depreciation.enabled, false);
  assert.equal(invalid.residual.enabled, false);
  const valid = getSuggestionEligibility({ name: 'Notebook', category: 'Equipamentos', acquisition_value: 1000 });
  assert.equal(valid.depreciation.enabled, true);
  assert.equal(valid.residual.enabled, true);
  assert.equal(INSUFFICIENT_EVIDENCE_MESSAGE.length > 0, true);
});
