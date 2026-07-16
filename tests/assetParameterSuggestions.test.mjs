import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

import {
  DEPRECIATION_SUGGESTION_FIELDS,
  applyDepreciationRateInput,
  applySuggestionValue,
  applyUsefulLifeInput,
  buildSuggestAssetParametersPayload,
  buildSuggestionContext,
  createEmptySuggestionState,
  friendlySuggestionError,
  getSuggestionEligibility,
  requestFieldsForSuggestion,
  uniqueSuggestionWarnings,
} from '../src/lib/assetParameterSuggestions.js';

const ASSET_FORM_PATH = new URL('../src/pages/AssetForm.jsx', import.meta.url);

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
  assert.deepEqual(requestFieldsForSuggestion('depreciation_rate'), ['depreciation_rate', 'useful_life_years']);
  assert.deepEqual(requestFieldsForSuggestion('useful_life_years'), ['depreciation_rate', 'useful_life_years']);
  assert.deepEqual(requestFieldsForSuggestion('residual_value'), ['residual_value']);
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
});

test('frontend helper converts technical errors to friendly messages', () => {
  assert.match(friendlySuggestionError(new Error('network down')), /Não foi possível gerar/);
  assert.match(friendlySuggestionError({ response: { data: { error: '403 forbidden' } } }), /permissão/);
  assert.equal(
    friendlySuggestionError({ response: { data: { error: 'Parametro solicitado nao suportado.' } } }),
    'Parametro solicitado nao suportado.',
  );
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
