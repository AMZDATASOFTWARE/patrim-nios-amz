export * from './assetClassificationCandidates.ts';
export * from './corporateRules.ts';
export * from './fiscalDepreciationByNcm.ts';
export * from './fiscalRules.ts';
export * from './normativeSources.ts';
export type * from './normativeEngine.types.ts';

import { validateCorporateRules } from './corporateRules.ts';
import { validateFiscalDepreciationRates } from './fiscalDepreciationByNcm.ts';
import { validateFiscalRules } from './fiscalRules.ts';
import { validateNormativeSources } from './normativeSources.ts';
import type { NormativeValidationResult } from './normativeEngine.types.ts';

export function validateNormativeKnowledgeBase(): NormativeValidationResult {
  const validations = [
    validateNormativeSources(),
    validateCorporateRules(),
    validateFiscalRules(),
    validateFiscalDepreciationRates(),
  ];
  const errors = validations.flatMap((validation) => validation.errors);
  return { ok: errors.length === 0, errors };
}
