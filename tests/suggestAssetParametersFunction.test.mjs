import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import vm from 'node:vm';

import ts from 'typescript';

const ENTRY_PATH = new URL('../base44/functions/suggestAssetParameters/entry.ts', import.meta.url);

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function importPath(source, fileName) {
  const escaped = escapeRegExp(fileName);
  const match = source.match(new RegExp(`^import \\{[\\s\\S]*?\\} from '(\\.\\/${escaped})';\\s*`, 'm'));
  assert.ok(match, `suggestAssetParameters must import ${fileName} locally`);
  return match[1];
}

function stripImportsAndExports(source) {
  return source
    .replace(/^import type \{[\s\S]*?\} from '[^']+';\s*/gm, '')
    .replace(/^import \{[\s\S]*?\} from '[^']+';\s*/gm, '')
    .replace(/^export type \* from '[^']+';\s*/gm, '')
    .replace(/^export \* from '[^']+';\s*/gm, '')
    .replace(/^export /gm, '');
}

async function loadFunctionModule() {
  const source = await readFile(ENTRY_PATH, 'utf8');
  const functionRoot = new URL('../base44/functions/suggestAssetParameters/', import.meta.url);
  const trustedImport = importPath(source, 'trustedAssetSources.ts');
  const corporateImport = importPath(source, 'corporateSuggestionAdapter.ts');
  const fiscalImport = importPath(source, 'fiscalSuggestionAdapter.ts');

  const normativeFiles = [
    'normative/data/sourceRegistry.ts',
    'normative/data/assetAliases.ts',
    'normative/data/attributeRequirements.ts',
    'normative/data/classificationUnits.ts',
    'normative/data/fiscalDepreciationRates.ts',
    'normative/data/corporateRulesData.ts',
    'normative/normativeEngine.types.ts',
    'normative/normativeSources.ts',
    'normative/assetClassificationCandidates.ts',
    'normative/fiscalDepreciationByNcm.ts',
    'normative/corporateRules.ts',
  ];
  const normativeShared = (await Promise.all(
    normativeFiles.map((file) => readFile(new URL(file, functionRoot), 'utf8')),
  )).map(stripImportsAndExports).join('\n');

  const trustedSource = await readFile(new URL(trustedImport, ENTRY_PATH), 'utf8');
  const corporateSource = await readFile(new URL(corporateImport, ENTRY_PATH), 'utf8');
  const fiscalSource = await readFile(new URL(fiscalImport, ENTRY_PATH), 'utf8');
  const withoutImports = source
    .replace(/^import \{ createClientFromRequest \} from 'npm:@base44\/sdk@0\.8\.35';\s*/m, '')
    .replace(new RegExp(`^import \\{[\\s\\S]*?\\} from '${escapeRegExp(trustedImport)}';\\s*`, 'm'), '')
    .replace(new RegExp(`^import \\{[\\s\\S]*?\\} from '${escapeRegExp(corporateImport)}';\\s*`, 'm'), '')
    .replace(new RegExp(`^import \\{[\\s\\S]*?\\} from '${escapeRegExp(fiscalImport)}';\\s*`, 'm'), '');

  const instrumented = `
${stripImportsAndExports(trustedSource)}
${normativeShared}
${stripImportsAndExports(corporateSource)}
${stripImportsAndExports(fiscalSource)}
${withoutImports}
globalThis.__testExports = {
  TRUSTED_ASSET_SOURCES,
  buildTrustedSourceSearchTerms,
  selectTrustedSources,
  collectTrustedSourceEvidence,
  sanitizeContext,
  parseRequestedParameters,
  validateSuggestion,
  buildPrompt,
  buildDirectFiscalPrompt,
  buildDirectFiscalCatalogOptions,
  applyDirectFiscalSuggestionAdapter,
  handler: globalThis.__handler,
};`;

  const js = ts.transpileModule(instrumented, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;

  const context = {
    console,
    Date,
    JSON,
    Number,
    Object,
    RegExp,
    Response,
    Set,
    String,
    AbortController,
    TextEncoder,
    TextDecoder,
    URL,
    Headers,
    Request,
    clearTimeout,
    setTimeout,
    globalThis: null,
    __handler: null,
    __createClientFromRequest: null,
    fetch: null,
  };
  context.globalThis = context;
  context.Deno = {
    env: { get: () => undefined },
    resolveDns: async () => ['8.8.8.8'],
    serve(handler) {
      context.__handler = handler;
    },
  };
  context.createClientFromRequest = (...args) => context.__createClientFromRequest(...args);

  vm.createContext(context);
  vm.runInContext(js, context, { filename: 'suggestAssetParameters.entry.test.js' });
  return { context, ...context.__testExports, handler: context.__handler };
}

function validContext(overrides = {}) {
  return {
    name: 'Notebook Dell Latitude',
    description: 'Notebook corporativo para uso administrativo',
    category: 'Equipamentos',
    account: 'Maquinas e Equipamentos',
    brand: 'Dell',
    model: 'Latitude',
    acquisition_value: 5000,
    purchase_date: '2026-01-01',
    depreciation_start_date: '2026-01-15',
    conservation_state: 'Novo',
    tax_regime: 'LUCRO_REAL',
    ...overrides,
  };
}

function configureBase44(context, { llm, userRecord } = {}) {
  context.__createClientFromRequest = () => ({
    auth: { me: async () => ({ id: 'user-1' }) },
    asServiceRole: {
      entities: {
        User: { filter: async () => [userRecord || { id: 'user-1', workspace_id: 'ws-1', role: 'manager' }] },
        Asset: { filter: async () => [] },
      },
      integrations: {
        Core: {
          InvokeLLM: llm || (async () => ({
            selected_ncm_code: '8471',
            confidence: 'medium',
            reason: 'A descricao indica notebook corporativo.',
            used_fields: ['name', 'category', 'brand', 'model'],
            alternative_ncm_codes: [],
          })),
        },
      },
    },
  });
}

function configureFetch(context, { fail = false } = {}) {
  let count = 0;
  context.fetch = async () => {
    count += 1;
    if (fail) throw new Error('SOURCE_UNAVAILABLE');
    return new Response(
      '<html><title>Fonte fiscal</title><body>depreciacao fiscal vida util NCM ativo imobilizado notebook equipamento</body></html>',
      { status: 200, headers: { 'content-type': 'text/html' } },
    );
  };
  return () => count;
}

async function callHandler(handler, body) {
  const response = await handler(new Request('https://example.test/suggestAssetParameters', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }));
  const json = await response.json();
  return { status: response.status, body: json };
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

test('backend source does not keep the old fiscal refinement implementation', async () => {
  const entry = await readFile(ENTRY_PATH, 'utf8');
  const adapter = await readFile(new URL('../base44/functions/suggestAssetParameters/fiscalSuggestionAdapter.ts', import.meta.url), 'utf8');
  assert.equal(entry.includes(['fiscal', 'Classification', 'Ai', 'Refiner'].join('')), false);
  assert.equal(entry.includes("const FISCAL_CLASSIFICATION_ACTIONS = ['CLASSIFY_DIRECT'] as const;"), true);
  for (const term of legacyTerms()) {
    assert.equal(entry.includes(term), false);
    assert.equal(adapter.includes(term), false);
  }
});

test('backend helper sanitizes only direct fiscal action and minimal context', async () => {
  const loaded = await loadFunctionModule();
  const sanitized = loaded.sanitizeContext(validContext({ fiscal_classification_action: 'CLASSIFY_DIRECT' }), [
    'fiscal_depreciation_rate',
  ]);
  assert.equal(sanitized.error, undefined);
  assert.equal(sanitized.context.fiscal_classification_action, 'CLASSIFY_DIRECT');

  const rejected = loaded.sanitizeContext(validContext({ fiscal_classification_action: ['REFINE', 'OPTIONS'].join('_') }), [
    'fiscal_depreciation_rate',
  ]);
  assert.match(rejected.error, /Acao de classificacao fiscal invalida/);
});

test('backend direct fiscal prompt sends asset context, local catalog and source evidence', async () => {
  const loaded = await loadFunctionModule();
  const context = validContext();
  const catalog = loaded.buildDirectFiscalCatalogOptions(context);
  assert.equal(catalog.some((item) => item.ncm_code === '8471'), true);
  const prompt = loaded.buildDirectFiscalPrompt(context, catalog, [{
    source_id: 'receita',
    source_name: 'Receita Federal',
    source_type: 'fiscal',
    title: 'Referencia fiscal',
    url: 'https://normas.receita.fazenda.gov.br/',
    excerpt: 'Trecho fiscal relevante',
    summary: 'Trecho fiscal relevante',
    retrieved_at: '2026-01-01T00:00:00.000Z',
    used: true,
  }]);
  assert.equal(prompt.includes('asset_context:'), true);
  assert.equal(prompt.includes('local_ncm_catalog:'), true);
  assert.equal(prompt.includes('source_evidence:'), true);
  assert.match(prompt, /Descricao do Bem\/name e o criterio principal/);
  assert.match(prompt, /categoria e filtro inicial, mas nao bloqueio absoluto/i);
  assert.equal(prompt.includes('Notebook Dell Latitude'), true);
});

test('backend fiscal schema requires only selected NCM choice from AI', async () => {
  const entry = await readFile(ENTRY_PATH, 'utf8');
  assert.match(entry, /selected_ncm_code/);
  assert.equal(entry.includes(['selected', 'catalog', 'option', 'id'].join('_')), false);
});

test('backend direct fiscal adapter resolves AI-selected local NCM to fiscal rate and life', async () => {
  const loaded = await loadFunctionModule();
  const suggestions = loaded.applyDirectFiscalSuggestionAdapter({
    context: validContext(),
    requestedParams: ['fiscal_depreciation_rate', 'fiscal_useful_life_years'],
    aiChoice: {
      selected_ncm_code: '8471',
      confidence: 'medium',
      reason: 'A descricao indica notebook.',
      used_fields: ['name', 'category', 'brand', 'model'],
    },
  });

  assert.equal(suggestions.fiscal_depreciation_rate.found, true);
  assert.equal(suggestions.fiscal_depreciation_rate.value, 20);
  assert.equal(suggestions.fiscal_useful_life_years.found, true);
  assert.equal(suggestions.fiscal_useful_life_years.value, 5);
  assert.equal(suggestions.fiscal_depreciation_rate.fiscal_classification.action, 'CLASSIFY_DIRECT');
  assert.equal(suggestions.fiscal_depreciation_rate.fiscal_classification.confirmed_ncm_code, '8471');
});

test('backend direct fiscal adapter returns useful no-match reasons', async () => {
  const loaded = await loadFunctionModule();
  const missingRegime = loaded.applyDirectFiscalSuggestionAdapter({
    context: validContext({ tax_regime: '' }),
    requestedParams: ['fiscal_depreciation_rate'],
    aiChoice: { selected_ncm_code: '8471' },
  });
  assert.equal(missingRegime.fiscal_depreciation_rate.found, false);
  assert.match(missingRegime.fiscal_depreciation_rate.reason, /regime tributario/);

  const invalidNcm = loaded.applyDirectFiscalSuggestionAdapter({
    context: validContext(),
    requestedParams: ['fiscal_depreciation_rate'],
    aiChoice: { selected_ncm_code: '99999999' },
  });
  assert.equal(invalidNcm.fiscal_depreciation_rate.found, false);
  assert.match(invalidNcm.fiscal_depreciation_rate.reason, /nao existe no catalogo local/);
});

test('backend handler returns direct fiscal suggestions with consulted source evidence', async () => {
  const loaded = await loadFunctionModule();
  configureBase44(loaded.context);
  const fetchCount = configureFetch(loaded.context);

  const result = await callHandler(loaded.handler, {
    entity_type: 'Asset',
    requested_parameters: ['fiscal_depreciation_rate', 'fiscal_useful_life_years'],
    asset_context: validContext(),
  });

  assert.equal(result.status, 200);
  assert.equal(result.body.ok, true);
  assert.equal(fetchCount() > 0, true);
  assert.equal(result.body.suggestions.fiscal_depreciation_rate.found, true);
  assert.equal(result.body.suggestions.fiscal_useful_life_years.found, true);
  assert.equal(result.body.suggestions.fiscal_depreciation_rate.value, 20);
  assert.equal(result.body.suggestions.fiscal_useful_life_years.value, 5);
  assert.equal(Array.isArray(result.body.sources_consulted), true);
});

test('backend handler does not block fiscal suggestion when approved source fetch fails', async () => {
  const loaded = await loadFunctionModule();
  configureBase44(loaded.context);
  configureFetch(loaded.context, { fail: true });

  const result = await callHandler(loaded.handler, {
    entity_type: 'Asset',
    requested_parameters: ['fiscal_depreciation_rate', 'fiscal_useful_life_years'],
    asset_context: validContext(),
  });

  assert.equal(result.status, 200);
  assert.equal(result.body.suggestions.fiscal_depreciation_rate.found, true);
  assert.equal(result.body.sources_failed.length > 0, true);
  assert.match(result.body.suggestions.fiscal_depreciation_rate.warnings.join(' '), /fontes disponiveis nao puderam ser consultadas/);
});

test('backend handler rejects old fiscal actions instead of running compatibility flow', async () => {
  const loaded = await loadFunctionModule();
  configureBase44(loaded.context);
  configureFetch(loaded.context);

  const result = await callHandler(loaded.handler, {
    entity_type: 'Asset',
    requested_parameters: ['fiscal_depreciation_rate'],
    asset_context: validContext({ fiscal_classification_action: ['SUGGEST', 'OPTIONS'].join('_') }),
  });

  assert.equal(result.status, 400);
  assert.match(result.body.error, /Acao de classificacao fiscal invalida/);
});

test('backend handler keeps accounting suggestions separate from fiscal suggestions', async () => {
  const loaded = await loadFunctionModule();
  configureBase44(loaded.context, {
    llm: async () => ({
      suggestions: {
        depreciation_rate: {
          found: true,
          value: 20,
          unit: 'percent_per_year',
          confidence: 'medium',
          reason: 'Estimativa gerencial.',
          based_on: ['name', 'category'],
          missing_data: [],
          warnings: [],
          source_ids: [],
        },
        useful_life_years: {
          found: true,
          value: 5,
          unit: 'years',
          confidence: 'medium',
          reason: 'Estimativa gerencial.',
          based_on: ['name', 'category'],
          missing_data: [],
          warnings: [],
          source_ids: [],
        },
      },
    }),
  });
  configureFetch(loaded.context);

  const result = await callHandler(loaded.handler, {
    entity_type: 'Asset',
    requested_parameters: ['depreciation_rate', 'useful_life_years'],
    asset_context: validContext(),
  });

  assert.equal(result.status, 200);
  assert.equal(result.body.suggestions.depreciation_rate.found, true);
  assert.equal(result.body.suggestions.fiscal_depreciation_rate, undefined);
});

test('backend handler rejects unauthorized users before invoking the AI', async () => {
  const loaded = await loadFunctionModule();
  let invoked = false;
  configureBase44(loaded.context, {
    userRecord: { id: 'user-1', workspace_id: 'ws-1', role: 'viewer' },
    llm: async () => {
      invoked = true;
      return {};
    },
  });
  configureFetch(loaded.context);

  const result = await callHandler(loaded.handler, {
    entity_type: 'Asset',
    requested_parameters: ['fiscal_depreciation_rate'],
    asset_context: validContext(),
  });

  assert.equal(result.status, 403);
  assert.equal(invoked, false);
});
