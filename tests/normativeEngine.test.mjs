import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

import ts from 'typescript';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const NORMATIVE_ROOT = resolve(ROOT, 'base44/functions/suggestAssetParameters/normative');

function loadTsModule(entryPath, cache = new Map()) {
  const fullPath = resolve(entryPath);
  if (cache.has(fullPath)) return cache.get(fullPath);

  const source = readFileSync(fullPath, 'utf8');
  const module = { exports: {} };
  cache.set(fullPath, module.exports);

  const output = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;

  const localRequire = (specifier) => {
    if (specifier.startsWith('.')) {
      const resolved = resolve(dirname(fullPath), specifier);
      return loadTsModule(resolved, cache);
    }
    return require(specifier);
  };

  const context = {
    exports: module.exports,
    module,
    require: localRequire,
    URL,
    console,
  };
  vm.runInNewContext(output, context, { filename: fullPath });
  cache.set(fullPath, module.exports);
  return module.exports;
}

const engine = loadTsModule(resolve(NORMATIVE_ROOT, 'normativeEngine.ts'));
const fiscal = loadTsModule(resolve(NORMATIVE_ROOT, 'fiscalDepreciationByNcm.ts'));
const fiscalRules = loadTsModule(resolve(NORMATIVE_ROOT, 'fiscalRules.ts'));
const sources = loadTsModule(resolve(NORMATIVE_ROOT, 'normativeSources.ts'));
const corporate = loadTsModule(resolve(NORMATIVE_ROOT, 'corporateRules.ts'));
const classifier = loadTsModule(resolve(NORMATIVE_ROOT, 'assetClassificationCandidates.ts'));

function lookup(ncmCode, classificationStatus = 'CONFIRMED_BY_USER', taxRegime = 'Lucro Real') {
  return fiscal.findFiscalRateByConfirmedNcm({
    ncm_code: ncmCode,
    classification_status: classificationStatus,
    tax_regime: taxRegime,
  });
}

function corporateEval(overrides = {}) {
  return corporate.evaluateCorporateDepreciation({
    asset_nature: 'PPE',
    recognized_cost: 24000,
    residual_value: 2400,
    useful_life_years: 5,
    depreciation_method: 'STRAIGHT_LINE',
    available_for_use_date: '2026-07-15',
    ...overrides,
  });
}

function assertReferencesExist(result) {
  const sourceIds = new Set(sources.getNormativeSources().map((source) => source.id));
  assert.ok(result.references.length > 0);
  for (const reference of result.references) {
    assert.ok(sourceIds.has(reference.source_id), `unknown reference source ${reference.source_id}`);
    assert.ok(reference.url);
    assert.ok(reference.version_label);
    assert.ok(reference.last_verified_at);
  }
}

test('normative knowledge base loads and validates core data', () => {
  assert.ok(sources.getNormativeSources().length >= 10);
  assert.ok(corporate.CORPORATE_RULES.length >= 20);
  assert.ok(fiscal.FISCAL_DEPRECIATION_RATES.length >= 150);
  const result = engine.validateNormativeKnowledgeBase();
  assert.equal(result.ok, true);
  assert.deepEqual(Array.from(result.errors), []);
});

test('normative source validation catches duplicated IDs and invalid source metadata', () => {
  const [first] = sources.getNormativeSources();
  const duplicated = sources.validateNormativeSources([first, first]);
  assert.equal(duplicated.ok, false);
  assert.match(duplicated.errors.join('\n'), /duplicated source id/);

  const invalid = sources.validateNormativeSources([{ ...first, id: 'BROKEN', official_url: 'http://example.com' }]);
  assert.equal(invalid.ok, false);
  assert.match(invalid.errors.join('\n'), /valid HTTPS official_url/);
});

test('fiscal depreciation validation rejects invalid life and rate values', () => {
  const [first] = fiscal.FISCAL_DEPRECIATION_RATES;
  const invalidLife = fiscal.validateFiscalDepreciationRates([{ ...first, id: 'BAD_LIFE', useful_life_years: 0 }]);
  assert.equal(invalidLife.ok, false);
  assert.match(invalidLife.errors.join('\n'), /invalid rate\/life/);

  const invalidRate = fiscal.validateFiscalDepreciationRates([{ ...first, id: 'BAD_RATE', annual_rate_percent: 0 }]);
  assert.equal(invalidRate.ok, false);
  assert.match(invalidRate.errors.join('\n'), /invalid rate\/life/);
});

test('normalizeNcm keeps only digits', () => {
  assert.equal(fiscal.normalizeNcm('84.71.30-12'), '84713012');
  assert.equal(fiscal.normalizeNcm(' 8703 '), '8703');
  assert.equal(fiscal.normalizeNcm(null), '');
});

test('confirmed NCM returns fiscal rates for representative Annex III entries', () => {
  const expected = [
    ['8471', 20, 5],
    ['8415', 10, 10],
    ['8451', 10, 10],
    ['8703', 20, 5],
    ['8704', 25, 4],
    ['9403', 10, 10],
  ];

  for (const [ncm, rate, life] of expected) {
    const result = lookup(ncm);
    assert.equal(result.status, 'MATCHED');
    assert.equal(result.annual_rate_percent, rate);
    assert.equal(result.useful_life_years, life);
    assert.equal(result.residual_value, null);
    assert.equal(result.requires_human_confirmation, false);
  }
});

test('matched fiscal lookup includes reference version and verification metadata', () => {
  const result = lookup('8471');
  assert.equal(result.status, 'MATCHED');
  assert.equal(result.ncm_reference_version, 'ANNEX_III_IN_RFB_1700_2017');
  assert.equal(result.verification_status, 'OFFICIAL_TEXT_VERIFIED');
  assert.equal(typeof result.description_summary, 'string');
  assert.equal(result.references[0].ncm_reference_version, 'ANNEX_III_IN_RFB_1700_2017');
  assert.equal(result.references[0].verification_status, 'OFFICIAL_TEXT_VERIFIED');
  assert.equal(typeof result.references[0].description_summary, 'string');
});

test('AI or rule suggested NCM does not release fiscal rate automatically', () => {
  assert.equal(lookup('8471', 'SUGGESTED_BY_AI').status, 'REQUIRES_NCM_CONFIRMATION');
  assert.equal(lookup('8471', 'SUGGESTED_BY_RULE').status, 'REQUIRES_NCM_CONFIRMATION');
});

test('unknown NCM and unknown tax regime return controlled statuses', () => {
  assert.equal(lookup('99999999').status, 'NOT_FOUND');
  assert.equal(lookup('8471', 'CONFIRMED_BY_USER', '').status, 'REQUIRES_TAX_REGIME_CONFIRMATION');
  assert.equal(lookup('8471', 'CONFIRMED_BY_USER', 'Simples Nacional').status, 'OUT_OF_DEFAULT_SCOPE');
});

test('classification candidates are suggestions and require human confirmation', () => {
  const chair = classifier.findClassificationCandidates(['cadeira executiva escritorio']);
  assert.ok(chair.length > 0);
  assert.ok(chair.every((candidate) => candidate.requires_human_confirmation));
  assert.ok(chair.some((candidate) => candidate.candidate_ncm_codes.includes('9401')));
  assert.equal(chair.some((candidate) => candidate.candidate_ncm_codes.includes('9403')), false);

  const fixedOfficeChair = classifier.findClassificationCandidates(['cadeira fixa de escritório']);
  assert.ok(fixedOfficeChair.some((candidate) => candidate.candidate_ncm_codes.includes('9401')));
  assert.ok(fixedOfficeChair.every((candidate) => candidate.requires_human_confirmation));

  const officeDesk = classifier.findClassificationCandidates(['mesa de escritório confirmada']);
  assert.ok(officeDesk.some((candidate) => candidate.candidate_ncm_codes.includes('9403')));

  const cafeteriaDesk = classifier.findClassificationCandidates(['mesa de refeitório']);
  assert.ok(cafeteriaDesk.every((candidate) => candidate.requires_human_confirmation));

  const monitor = classifier.findClassificationCandidates(['monitor led 24 polegadas']);
  assert.ok(monitor.every((candidate) => candidate.requires_human_confirmation));
  assert.equal(monitor.some((candidate) => candidate.candidate_ncm_codes.includes('8471')), false);
});

test('candidate classification alone does not apply fiscal depreciation', () => {
  const [chairCandidate] = classifier.findClassificationCandidates(['cadeira executiva escritorio']);
  assert.ok(chairCandidate.candidate_ncm_codes.includes('9401'));
  const result = lookup(chairCandidate.candidate_ncm_codes[0], 'SUGGESTED_BY_RULE');
  assert.equal(result.status, 'REQUIRES_NCM_CONFIRMATION');

  const monitorCandidates = classifier.findClassificationCandidates(['monitor led 24 polegadas']);
  assert.equal(monitorCandidates.some((candidate) => candidate.candidate_ncm_codes.includes('8471')), false);
});

test('generic asset text does not create a complete computer classification', () => {
  const candidates = classifier.findClassificationCandidates(['gabinete']);
  assert.equal(candidates.some((candidate) => candidate.candidate_type === 'COMPUTER_EQUIPMENT'), false);
});

test('revoked sources can exist as history but cannot support active fiscal rules or rates', () => {
  const [activeSource] = sources.getNormativeSources();
  const revokedSource = {
    ...activeSource,
    id: 'IN_SRF_162_1998',
    status: 'REVOKED_HISTORICAL_REFERENCE',
    version_label: 'Revogada',
    last_verified_at: '2026-07-20',
  };

  const sourceValidation = sources.validateNormativeSources([activeSource, revokedSource]);
  assert.equal(sourceValidation.ok, true);

  const sourceSimultaneouslyActiveAndRevoked = sources.validateNormativeSources([{
    ...revokedSource,
    status: 'ACTIVE_REVOKED',
  }]);
  assert.equal(sourceSimultaneouslyActiveAndRevoked.ok, false);
  assert.match(sourceSimultaneouslyActiveAndRevoked.errors.join('\n'), /both active and revoked/);

  const fiscalRuleValidation = fiscalRules.validateFiscalRules([{
    id: 'ACTIVE_RULE_WITH_REVOKED_SOURCE',
    title: 'Regra ativa invalida',
    source_refs: [{ source_id: 'IN_SRF_162_1998' }],
  }], [activeSource, revokedSource]);
  assert.equal(fiscalRuleValidation.ok, false);
  assert.match(fiscalRuleValidation.errors.join('\n'), /revoked source/);

  const historicalRuleValidation = fiscalRules.validateFiscalRules([{
    id: 'HISTORICAL_RULE_WITH_REVOKED_SOURCE',
    title: 'Regra historica valida',
    decision: 'BLOCK_REVOKED_SOURCE',
    source_refs: [{ source_id: 'IN_SRF_162_1998' }],
  }], [activeSource, revokedSource]);
  assert.equal(historicalRuleValidation.ok, true);

  const [firstRate] = fiscal.FISCAL_DEPRECIATION_RATES;
  const rateValidation = fiscal.validateFiscalDepreciationRates([{
    ...firstRate,
    id: 'RATE_WITH_REVOKED_SOURCE',
    source_id: 'IN_SRF_162_1998',
  }], [activeSource, revokedSource]);
  assert.equal(rateValidation.ok, false);
  assert.match(rateValidation.errors.join('\n'), /revoked source/);
});

test('corporate helpers calculate depreciable amount and straight-line values deterministically', () => {
  assert.equal(corporate.calculateDepreciableAmount(24000, 2400), 21600);
  assert.equal(corporate.calculateStraightLineAnnualExpense({
    recognized_cost: 24000,
    residual_value: 2400,
    useful_life_years: 5,
  }), 4320);
  assert.equal(corporate.calculateRateOnDepreciableAmount(5), 20);
});

test('corporate evaluation requires asset classification before calculation', () => {
  const result = corporateEval({ asset_nature: 'UNKNOWN' });
  assert.equal(result.status, 'REQUIRES_CLASSIFICATION');
  assert.equal(result.depreciable_amount, null);
  assert.ok(result.applied_rule_ids.includes('CORP_CLASSIFY_ASSET_BEFORE_DEPRECIATING'));
  assert.equal(result.requires_human_confirmation, true);
});

test('corporate evaluation treats land as not depreciable', () => {
  const result = corporateEval({ asset_nature: 'LAND' });
  assert.equal(result.status, 'NOT_DEPRECIABLE');
  assert.equal(result.annual_expense, null);
  assert.match(result.warnings.join(' '), /terreno/i);
  assert.ok(result.applied_rule_ids.includes('CORP_LAND_SEPARATE_FROM_BUILDING'));
});

test('corporate building evaluation does not inherit fiscal useful life automatically', () => {
  const result = corporateEval({
    asset_nature: 'BUILDING',
    useful_life_years: null,
  });
  assert.equal(result.status, 'REQUIRES_HUMAN_REVIEW');
  assert.equal(result.annual_rate_percent, null);
  assert.match(result.warnings.join(' '), /vida util fiscal/i);
});

test('corporate straight-line evaluation calculates depreciable amount, expenses and annual rate', () => {
  const result = corporateEval();
  assert.equal(result.status, 'CALCULABLE');
  assert.equal(result.depreciable_amount, 21600);
  assert.equal(result.annual_expense, 4320);
  assert.equal(result.monthly_expense, 360);
  assert.equal(result.annual_rate_percent, 20);
  assert.equal(result.depreciation_start_date, '2026-07-15');
  assert.equal(result.requires_human_confirmation, true);
  assert.ok(result.warnings.some((warning) => /revisados pelo menos ao final de cada exercicio/i.test(warning)));
});

test('corporate evaluation rejects residual above cost and invalid useful life', () => {
  const residualResult = corporateEval({ residual_value: 25000 });
  assert.equal(residualResult.status, 'REQUIRES_HUMAN_REVIEW');
  assert.equal(residualResult.depreciable_amount, null);
  assert.match(residualResult.blocking_reasons.join(' '), /residual_value cannot exceed/);

  const lifeResult = corporateEval({ useful_life_years: 0 });
  assert.equal(lifeResult.status, 'REQUIRES_HUMAN_REVIEW');
  assert.equal(lifeResult.annual_expense, null);
  assert.match(lifeResult.blocking_reasons.join(' '), /useful_life_years/);

  const negativeLifeResult = corporateEval({ useful_life_years: -1 });
  assert.equal(negativeLifeResult.status, 'REQUIRES_HUMAN_REVIEW');
});

test('corporate evaluation does not use acquisition date as available-for-use date', () => {
  const result = corporateEval({
    acquisition_date: '2026-01-10',
    available_for_use_date: null,
  });
  assert.equal(result.depreciation_start_date, null);
  assert.equal(result.depreciable_amount, 21600);
  assert.match(result.warnings.join(' '), /aquisicao nao substitui/i);
});

test('corporate evaluation keeps depreciation running for idle assets', () => {
  const result = corporateEval({ is_idle: true });
  assert.equal(result.depreciable_amount, 21600);
  assert.equal(result.annual_expense, 4320);
  assert.match(result.warnings.join(' '), /Ociosidade nao interrompe/i);
  assert.ok(result.applied_rule_ids.includes('CORP_IDLE_ASSET_CONTINUES'));
});

test('corporate evaluation stops calculation for held-for-sale and disposed assets', () => {
  const held = corporateEval({ held_for_sale: true, held_for_sale_date: '2026-09-01' });
  assert.equal(held.status, 'REQUIRES_HELD_FOR_SALE_REVIEW');
  assert.equal(held.depreciable_amount, null);
  assert.equal(held.depreciation_stop_date, '2026-09-01');

  const disposed = corporateEval({ disposed: true, disposal_date: '2026-10-15' });
  assert.equal(disposed.status, 'REQUIRES_HUMAN_REVIEW');
  assert.equal(disposed.annual_expense, null);
  assert.equal(disposed.depreciation_stop_date, '2026-10-15');
});

test('corporate evaluation requires component review for significant components', () => {
  const result = corporateEval({ has_significant_components: true });
  assert.equal(result.status, 'REQUIRES_COMPONENT_REVIEW');
  assert.equal(result.annual_expense, null);
  assert.match(result.warnings.join(' '), /componente, custo, vida util/i);
});

test('corporate evaluation signals impairment without erasing depreciation calculation', () => {
  const result = corporateEval({ has_impairment_indicators: true });
  assert.equal(result.status, 'REQUIRES_IMPAIRMENT_REVIEW');
  assert.equal(result.depreciable_amount, 21600);
  assert.equal(result.annual_expense, 4320);
  assert.ok(result.applied_rule_ids.includes('CORP_IMPAIRMENT_INDICATORS'));
});

test('corporate evaluation amortizes finite intangible and reviews positive residual', () => {
  const noResidual = corporateEval({
    asset_nature: 'FINITE_INTANGIBLE',
    residual_value: null,
    useful_life_years: 4,
  });
  assert.equal(noResidual.status, 'CALCULABLE');
  assert.equal(noResidual.depreciable_amount, 24000);
  assert.equal(noResidual.annual_expense, 6000);
  assert.ok(noResidual.applied_rule_ids.includes('CORP_INTANGIBLE_FINITE_LIFE'));

  const positiveResidual = corporateEval({
    asset_nature: 'FINITE_INTANGIBLE',
    residual_value: 1000,
    useful_life_years: 4,
  });
  assert.equal(positiveResidual.status, 'REQUIRES_HUMAN_REVIEW');
  assert.equal(positiveResidual.depreciable_amount, 23000);
  assert.match(positiveResidual.warnings.join(' '), /Residual positivo/);
});

test('corporate evaluation routes special asset natures to their own policies', () => {
  assert.equal(corporateEval({ asset_nature: 'INDEFINITE_INTANGIBLE' }).status, 'DO_NOT_AMORTIZE');
  assert.equal(corporateEval({ asset_nature: 'RIGHT_OF_USE' }).status, 'ROUTE_TO_LEASE_POLICY');
  assert.equal(corporateEval({ asset_nature: 'INVESTMENT_PROPERTY' }).status, 'ROUTE_TO_INVESTMENT_PROPERTY_POLICY');
  assert.equal(corporateEval({ asset_nature: 'INVENTORY' }).status, 'REQUIRES_HUMAN_REVIEW');
});

test('corporate evaluation requires review for unsupported depreciation methods', () => {
  const result = corporateEval({ depreciation_method: 'UNITS_OF_PRODUCTION' });
  assert.equal(result.status, 'REQUIRES_HUMAN_REVIEW');
  assert.equal(result.annual_expense, null);
  assert.match(result.warnings.join(' '), /metodo nao linear/i);
});

test('corporate evaluation returns catalog references and always requires human confirmation', () => {
  const result = corporateEval();
  assertReferencesExist(result);
  assert.equal(result.requires_human_confirmation, true);
});
