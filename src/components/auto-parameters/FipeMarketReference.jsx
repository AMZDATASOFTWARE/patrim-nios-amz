import { useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, ExternalLink, Loader2, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { currentCompetenceMonth, getParameterSuggestion } from '@/lib/autoParameters';

function formatCompetenceMonth(value) {
  if (!value || typeof value !== 'string' || !value.includes('-')) return value || '';
  const [year, month] = value.split('-');
  return `${month}/${year}`;
}

function formatDate(value) {
  if (!value || typeof value !== 'string' || !value.includes('-')) return value || '';
  const [year, month, day] = value.split('-');
  return day ? `${day}/${month}/${year}` : value;
}

function formatConfidence(value) {
  if (value === 'high') return 'Alta';
  if (value === 'medium') return 'Media';
  return 'Baixa';
}

function extractModelYear(value) {
  const matches = String(value || '').match(/\d{4}/g);
  return matches?.length ? matches[matches.length - 1] : '';
}

function buildFipePayload(context) {
  const fipeCode = String(context?.fipe_code || '').trim();
  const modelYear = extractModelYear(context?.model_year);
  const payload = {
    entity_type: 'Asset',
    domain: 'fipe',
    field_name: 'market_reference_value',
    category: 'veiculos',
    asset_type: 'vehicle',
    competence_month: currentCompetenceMonth(),
    context: {
      plate: context?.plate || '',
      renavam: context?.renavam || '',
      chassis: context?.chassis || '',
      brand: context?.brand || '',
      model: context?.model || context?.asset_name || '',
      model_year: modelYear || context?.model_year || '',
      fuel: context?.fuel || '',
      fipe_code: fipeCode,
    },
  };

  if (fipeCode && modelYear) {
    payload.scope_key = `fipe_code:${fipeCode}:year:${modelYear}`;
  } else if (fipeCode) {
    payload.scope_key = `fipe_code:${fipeCode}`;
  }

  return payload;
}

export default function FipeMarketReference({ context }) {
  const [status, setStatus] = useState('idle');
  const [suggestion, setSuggestion] = useState(null);
  const [error, setError] = useState('');

  const payload = useMemo(() => buildFipePayload(context || {}), [context]);
  const hasSuggestion = status === 'success' && !!suggestion;

  const handleFetch = async () => {
    setStatus('loading');
    setSuggestion(null);
    setError('');

    const result = await getParameterSuggestion(payload);
    if (!result?.ok || !result?.found) {
      setStatus('error');
      setError(result?.error || 'Nenhuma referencia FIPE vigente encontrada para este veiculo.');
      return;
    }

    setSuggestion(result);
    setStatus('success');
  };

  const handleClose = () => {
    setStatus('idle');
    setSuggestion(null);
    setError('');
  };

  const vigencia = suggestion?.effective_start_date
    ? suggestion?.effective_end_date
      ? `${formatDate(suggestion.effective_start_date)} a ${formatDate(suggestion.effective_end_date)}`
      : `A partir de ${formatDate(suggestion.effective_start_date)}`
    : '';

  return (
    <div className="sm:col-span-2 rounded-lg border border-border bg-muted/20 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Referencia FIPE</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Referencia de mercado. Nao altera valor contabil nem custo historico.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleFetch}
          disabled={status === 'loading'}
        >
          {status === 'loading' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
          Buscar indicacao
        </Button>
      </div>

      {status === 'error' && (
        <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {hasSuggestion && (
        <div className="mt-3 space-y-3 rounded-md border border-border bg-background p-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">Referencia de mercado</Badge>
            <Badge variant="outline">Confianca: {formatConfidence(suggestion.confidence_level)}</Badge>
            {suggestion.requires_user_confirmation && (
              <Badge variant="outline">Confirmacao manual</Badge>
            )}
          </div>

          <div className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            <div>
              <p className="font-medium text-foreground">
                Valor FIPE: {suggestion.label || String(suggestion.value ?? '')}
              </p>
              {!!suggestion.unit && (
                <p className="text-xs text-muted-foreground">Unidade: {suggestion.unit}</p>
              )}
            </div>
          </div>

          <div className="space-y-1 text-xs text-muted-foreground">
            <p>
              Fonte:{' '}
              {suggestion.source_url ? (
                <a
                  href={suggestion.source_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  {suggestion.source_name || 'Fonte configurada'}
                  <ExternalLink className="h-3 w-3" />
                </a>
              ) : (
                suggestion.source_name || 'Fonte configurada'
              )}
            </p>
            <p>Competencia: {formatCompetenceMonth(suggestion.competence_month)}</p>
            {vigencia && <p>Vigencia: {vigencia}</p>}
            {suggestion.explanation && <p>{suggestion.explanation}</p>}
          </div>

          {Array.isArray(suggestion.warnings) && suggestion.warnings.length > 0 && (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              <p className="font-medium">Atencao</p>
              <ul className="mt-1 list-disc space-y-1 pl-4">
                {suggestion.warnings.map((warning, index) => (
                  <li key={`fipe-warning-${index}`}>{warning}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" onClick={handleClose}>
              Fechar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
