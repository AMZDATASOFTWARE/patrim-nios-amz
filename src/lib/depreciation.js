// Utility functions for depreciation calculations

/**
 * Calculate straight-line depreciation
 * @param {number} acquisitionValue - Original value of the asset
 * @param {number} residualValue - Estimated value at end of useful life
 * @param {number} usefulLifeYears - Useful life in years
 * @returns {number} Annual depreciation amount
 */
export function calculateAnnualDepreciation(acquisitionValue, residualValue = 0, usefulLifeYears) {
  if (!usefulLifeYears || usefulLifeYears <= 0) return 0;
  return (acquisitionValue - residualValue) / usefulLifeYears;
}

/**
 * Calculate monthly depreciation
 */
export function calculateMonthlyDepreciation(acquisitionValue, residualValue = 0, usefulLifeYears) {
  return calculateAnnualDepreciation(acquisitionValue, residualValue, usefulLifeYears) / 12;
}

/**
 * Calculate accumulated depreciation based on purchase date
 * @param {string} purchaseDate - ISO date string
 * @param {number} acquisitionValue - Original value
 * @param {number} residualValue - Residual value
 * @param {number} usefulLifeYears - Useful life in years
 * @returns {number} Accumulated depreciation
 */
export function calculateAccumulatedDepreciation(purchaseDate, acquisitionValue, residualValue = 0, usefulLifeYears) {
  if (!purchaseDate || !usefulLifeYears || usefulLifeYears <= 0) return 0;
  
  const purchase = new Date(purchaseDate);
  const today = new Date();
  
  // Calculate months since purchase
  const monthsElapsed = 
    (today.getFullYear() - purchase.getFullYear()) * 12 + 
    (today.getMonth() - purchase.getMonth());
  
  if (monthsElapsed <= 0) return 0;
  
  const monthlyDep = calculateMonthlyDepreciation(acquisitionValue, residualValue, usefulLifeYears);
  const maxDepreciation = acquisitionValue - residualValue;
  
  // Cannot depreciate more than (acquisition - residual)
  return Math.min(monthsElapsed * monthlyDep, maxDepreciation);
}

/**
 * Calculate current book value
 */
export function calculateCurrentValue(purchaseDate, acquisitionValue, residualValue = 0, usefulLifeYears) {
  const accumulated = calculateAccumulatedDepreciation(purchaseDate, acquisitionValue, residualValue, usefulLifeYears);
  return acquisitionValue - accumulated;
}

/**
 * Calculate depreciation percentage complete
 */
export function calculateDepreciationPercentage(purchaseDate, acquisitionValue, residualValue = 0, usefulLifeYears) {
  if (!acquisitionValue || acquisitionValue <= residualValue) return 0;
  const accumulated = calculateAccumulatedDepreciation(purchaseDate, acquisitionValue, residualValue, usefulLifeYears);
  const depreciableAmount = acquisitionValue - residualValue;
  return Math.min((accumulated / depreciableAmount) * 100, 100);
}

/**
 * Format currency in BRL
 */
export function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value || 0);
}

/**
 * Format percentage
 */
export function formatPercentage(value) {
  return `${(value || 0).toFixed(1)}%`;
}

/**
 * Get default depreciation rate by category
 */
export function getDefaultDepreciationRate(category) {
  const rates = {
    'Imóveis': 4, // 25 years
    'Veículos': 20, // 5 years
    'Equipamentos': 10, // 10 years
    'Investimentos': 0, // No depreciation
    'Intangíveis': 20 // 5 years (can vary)
  };
  return rates[category] || 10;
}

/**
 * Get useful life from depreciation rate
 */
export function getUsefulLifeFromRate(rate) {
  if (!rate || rate <= 0) return 0;
  return 100 / rate;
}

/**
 * Um bem em obra/imobilização em andamento (CIP) NÃO deprecia enquanto não
 * concluído — seu valor contábil permanece igual ao valor de aquisição.
 */
export function isDepreciable(asset) {
  return !asset?.is_construction_in_progress;
}

/**
 * Ponto único de cálculo de depreciação por ativo, com o guard de obra em
 * andamento (item 9). Centraliza o que antes era chamado campo a campo em várias
 * telas. Retorna sempre o mesmo shape, com CIP => depreciação zero.
 */
export function getAssetDepreciation(asset) {
  const acquisition = asset?.acquisition_value || 0;
  const residual = asset?.residual_value || 0;
  const usefulLife = asset?.useful_life_years || getUsefulLifeFromRate(asset?.depreciation_rate);

  if (!isDepreciable(asset)) {
    return { acquisition, accumulated: 0, currentValue: acquisition, monthly: 0, depPct: 0, cip: true };
  }

  const accumulated = calculateAccumulatedDepreciation(asset?.purchase_date, acquisition, residual, usefulLife);
  const currentValue = acquisition - accumulated;
  const monthly = calculateMonthlyDepreciation(acquisition, residual, usefulLife);
  const depPct = calculateDepreciationPercentage(asset?.purchase_date, acquisition, residual, usefulLife);
  return { acquisition, accumulated, currentValue, monthly, depPct, cip: false };
}