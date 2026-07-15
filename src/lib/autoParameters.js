import { base44 } from '@/api/base44Client';

function unwrap(result) {
  return result?.data || result || {};
}

function extractErrorMessage(error, fallbackMessage) {
  return (
    error?.response?.data?.error ||
    error?.data?.error ||
    error?.message ||
    fallbackMessage
  );
}

function numericValueError(valueType) {
  return new Error(`Valor invalido para ${valueType}: informe valor bruto, sem simbolos, unidade ou separador de milhar.`);
}

function parseStrictNumericString(raw, valueType, integerOnly = false) {
  const value = String(raw ?? '').trim();
  if (!value) {
    throw new Error(`Valor vazio para ${valueType}.`);
  }
  if (/[^\d.,+-]/.test(value) || value.includes('%')) {
    throw numericValueError(valueType);
  }

  const hasComma = value.includes(',');
  const hasDot = value.includes('.');
  if (hasComma && hasDot) {
    throw numericValueError(valueType);
  }

  const normalized = hasComma ? value.replace(',', '.') : value;
  if (!/^[+-]?\d+(\.\d+)?$/.test(normalized)) {
    throw numericValueError(valueType);
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) {
    throw numericValueError(valueType);
  }
  if (integerOnly && !Number.isInteger(parsed)) {
    throw new Error(`Valor invalido para ${valueType}: esperado numero inteiro bruto.`);
  }
  return parsed;
}

export function currentCompetenceMonth() {
  return new Date().toISOString().slice(0, 7);
}

export function normalizeParameterValue(value, valueType = 'text') {
  if (valueType === 'json') {
    try {
      return typeof value === 'string' ? JSON.parse(value || 'null') : value ?? null;
    } catch {
      throw new Error('Valor invalido para json: JSON malformado.');
    }
  }

  if (valueType === 'integer') {
    if (typeof value === 'number') {
      if (!Number.isFinite(value) || !Number.isInteger(value)) {
        throw new Error('Valor invalido para integer: esperado numero inteiro bruto.');
      }
      return value;
    }
    return parseStrictNumericString(value, valueType, true);
  }

  if (valueType === 'decimal' || valueType === 'percent' || valueType === 'currency') {
    if (typeof value === 'number') {
      if (!Number.isFinite(value)) {
        throw new Error(`Valor invalido para ${valueType}: numero nao finito.`);
      }
      return value;
    }
    return parseStrictNumericString(value, valueType);
  }

  return value == null ? '' : String(value);
}

export function formatParameterLabel(value, valueType = 'text', unit = '') {
  if (valueType === 'currency' && typeof value === 'number') {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  if (valueType === 'percent' && typeof value === 'number') {
    return `${value}%`;
  }

  if (valueType === 'json') {
    return unit ? `${unit} (JSON)` : 'JSON';
  }

  return unit ? `${value} ${unit}`.trim() : String(value ?? '');
}

export async function refreshMonthlyParameters(payload) {
  try {
    const result = await base44.functions.invoke('refresh-monthly-parameters', payload);
    return {
      ok: true,
      ...unwrap(result),
    };
  } catch (error) {
    const status = error?.status || error?.response?.status || 0;
    const message = extractErrorMessage(error, 'Nao foi possivel atualizar a base mensal de parametros.');

    if (status === 403) {
      return {
        ok: false,
        forbidden: true,
        error: 'Voce nao tem permissao para atualizar parametros automaticos.',
      };
    }

    return {
      ok: false,
      forbidden: false,
      error: message,
    };
  }
}

async function invokeMonthlySourceManager(payload, fallbackMessage) {
  try {
    const result = await base44.functions.invoke('manage-monthly-parameter-sources', payload);
    const data = unwrap(result);
    if (data?.ok === false) {
      return {
        ok: false,
        forbidden: false,
        error: data.error || fallbackMessage,
        ...data,
      };
    }
    return {
      ok: true,
      ...data,
    };
  } catch (error) {
    const status = error?.status || error?.response?.status || 0;
    const message = extractErrorMessage(error, fallbackMessage);

    if (status === 403) {
      return {
        ok: false,
        forbidden: true,
        error: 'Voce nao tem permissao para gerenciar fontes de parametros mensais.',
      };
    }

    return {
      ok: false,
      forbidden: false,
      error: message,
      warnings: Array.isArray(error?.response?.data?.warnings)
        ? error.response.data.warnings
        : Array.isArray(error?.data?.warnings)
          ? error.data.warnings
          : [],
    };
  }
}

async function invokeMonthlySnapshotManager(payload, fallbackMessage) {
  try {
    const result = await base44.functions.invoke('manage-monthly-parameter-snapshots', payload);
    const data = unwrap(result);
    if (data?.ok === false) {
      return {
        ok: false,
        forbidden: false,
        error: data.error || fallbackMessage,
        ...data,
      };
    }
    return {
      ok: true,
      ...data,
    };
  } catch (error) {
    const status = error?.status || error?.response?.status || 0;
    const message = extractErrorMessage(error, fallbackMessage);

    if (status === 403) {
      return {
        ok: false,
        forbidden: true,
        error: 'Voce nao tem permissao para aprovar snapshots mensais.',
      };
    }

    return {
      ok: false,
      forbidden: false,
      error: message,
    };
  }
}

export async function listMonthlyParameterSources() {
  return invokeMonthlySourceManager(
    { operation: 'list' },
    'Nao foi possivel listar as fontes de parametros mensais.',
  );
}

export async function createMonthlyParameterSource(source) {
  return invokeMonthlySourceManager(
    { operation: 'create', source },
    'Nao foi possivel criar a fonte de parametros mensais.',
  );
}

export async function updateMonthlyParameterSource(id, source) {
  return invokeMonthlySourceManager(
    { operation: 'update', id, source },
    'Nao foi possivel atualizar a fonte de parametros mensais.',
  );
}

export async function deactivateMonthlyParameterSource(id) {
  return invokeMonthlySourceManager(
    { operation: 'deactivate', id },
    'Nao foi possivel inativar a fonte de parametros mensais.',
  );
}

export async function reactivateMonthlyParameterSource(id) {
  return invokeMonthlySourceManager(
    { operation: 'reactivate', id },
    'Nao foi possivel reativar a fonte de parametros mensais.',
  );
}

export async function testMonthlyParameterSource({ id = '', source = null, competence_month = currentCompetenceMonth() } = {}) {
  return invokeMonthlySourceManager(
    { operation: 'test', id, source, competence_month },
    'Nao foi possivel testar a fonte de parametros mensais.',
  );
}

export async function listMonthlyParameterSnapshots(status = '') {
  return invokeMonthlySnapshotManager(
    { operation: 'list', status },
    'Nao foi possivel listar snapshots mensais.',
  );
}

export async function approveMonthlyParameterSnapshot(id) {
  return invokeMonthlySnapshotManager(
    { operation: 'approve', id },
    'Nao foi possivel aprovar o snapshot mensal.',
  );
}

export async function rejectMonthlyParameterSnapshot(id, rejectionReason) {
  return invokeMonthlySnapshotManager(
    { operation: 'reject', id, rejection_reason: rejectionReason },
    'Nao foi possivel rejeitar o snapshot mensal.',
  );
}

export async function expireMonthlyParameterSnapshot(id) {
  return invokeMonthlySnapshotManager(
    { operation: 'expire', id },
    'Nao foi possivel expirar o snapshot mensal.',
  );
}

export async function getParameterSuggestion(payload) {
  try {
    const result = await base44.functions.invoke('get-parameter-suggestion', payload);
    const data = unwrap(result);
    if (!data?.found) {
      return {
        ok: false,
        found: false,
        error: data?.error || 'Nenhuma indicacao automatica vigente encontrada para este campo.',
        warnings: Array.isArray(data?.warnings) ? data.warnings : [],
        requires_user_confirmation: true,
      };
    }

    return {
      ok: true,
      found: true,
      value: data.value,
      unit: data.unit || '',
      label: data.label || '',
      explanation: data.explanation || '',
      source_name: data.source_name || '',
      source_url: data.source_url || '',
      source_date: data.source_date || '',
      competence_month: data.competence_month || '',
      effective_start_date: data.effective_start_date || '',
      effective_end_date: data.effective_end_date || '',
      confidence_level: data.confidence_level || 'low',
      warnings: Array.isArray(data.warnings) ? data.warnings : [],
      snapshot_id: data.snapshot_id || '',
      requires_user_confirmation: data.requires_user_confirmation !== false,
    };
  } catch (error) {
    const message = extractErrorMessage(error, 'Nenhuma indicacao automatica vigente encontrada para este campo.');

    return {
      ok: false,
      found: false,
      error: message,
      warnings: Array.isArray(error?.response?.data?.warnings)
        ? error.response.data.warnings
        : Array.isArray(error?.data?.warnings)
          ? error.data.warnings
          : [],
      requires_user_confirmation: true,
    };
  }
}
