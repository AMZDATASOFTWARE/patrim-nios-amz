import { useEffect, useMemo, useState } from 'react';
import { Sparkles, Loader2, AlertCircle, CheckCircle2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getParameterSuggestion } from '@/lib/autoParameters';

function currentCompetenceMonth() {
  return new Date().toISOString().slice(0, 7);
}

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

function buildPayload(fieldName, domain, context, entityType) {
  const payload = {
    entity_type: entityType || 'Asset',
    field_name: fieldName,
    domain,
    competence_month: currentCompetenceMonth(),
    context: context || {},
  };

  if (context?.category) payload.category = context.category;
  if (context?.asset_type) payload.asset_type = context.asset_type;
  if (context?.uf) payload.uf = context.uf;
  if (context?.regime_fiscal) payload.regime_fiscal = context.regime_fiscal;
  if (context?.scope_key) payload.scope_key = context.scope_key;
  if (context?.parameter_key) payload.parameter_key = context.parameter_key;

  return payload;
}

export default function AutoParameterSuggestion({
  fieldName,
  domain,
  context,
  entityType = 'Asset',
  onApply,
}) {
  const [status, setStatus] = useState('idle');
  const [suggestion, setSuggestion] = useState(null);
  const [error, setError] = useState('');
  const [applying, setApplying] = useState(false);

  const contextKey = useMemo(() => JSON.stringify({
    entity_type: entityType || 'Asset',
    category: context?.category || '',
    asset_type: context?.asset_type || '',
    uf: context?.uf || '',
    regime_fiscal: context?.regime_fiscal || '',
    scope_key: context?.scope_key || '',
    parameter_key: context?.parameter_key || '',
  }), [context, entityType]);

  useEffect(() => {
    setStatus('idle');
    setSuggestion(null);
    setError('');
    setApplying(false);
  }, [fieldName, domain, contextKey]);

  const isFiscal = domain === 'fiscal';
  const hasSuggestion = status === 'success' && !!suggestion;

  const handleFetch = async () => {
    setStatus('loading');
    setError('');
    setSuggestion(null);

    const result = await getParameterSuggestion(buildPayload(fieldName, domain, context, entityType));
    if (!result?.ok || !result?.found) {
      setStatus('error');
      setError(result?.error || 'Ainda não há sugestão aprovada para este campo. Cadastre ou aprove uma fonte para habilitar sugestões.');
      return;
    }

    setSuggestion(result);
    setStatus('success');
  };

  const handleApply = async () => {
    if (!suggestion || !onApply) return;
    setApplying(true);
    try {
      await onApply(suggestion);
    } finally {
      setApplying(false);
    }
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
    <div className="mt-2 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-auto px-0 py-0 text-xs text-primary hover:bg-transparent hover:text-primary/80"
          onClick={handleFetch}
          disabled={status === 'loading' || applying}
        >
          {status === 'loading' ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" />
          )}
          Indicacao automatica
        </Button>

        {hasSuggestion && <Badge variant="secondary">Sugestao pronta</Badge>}
        {status === 'error' && <Badge variant="outline">Sem sugestao</Badge>}
      </div>

      {status === 'error' && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {hasSuggestion && (
        <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">Sugestao</Badge>
            <Badge variant="outline">Confianca: {formatConfidence(suggestion.confidence_level)}</Badge>
            {suggestion.requires_user_confirmation && (
              <Badge variant="outline">Confirmacao manual</Badge>
            )}
          </div>

          <div className="mt-3 space-y-2">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <div>
                <p className="font-medium text-foreground">
                  Valor sugerido: {suggestion.label || String(suggestion.value ?? '')}
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
              {isFiscal && (
                <p className="text-amber-700">
                  Valide com responsavel fiscal/contabil antes de aplicar.
                </p>
              )}
            </div>

            {Array.isArray(suggestion.warnings) && suggestion.warnings.length > 0 && (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                <p className="font-medium">Atencao</p>
                <ul className="mt-1 list-disc space-y-1 pl-4">
                  {suggestion.warnings.map((warning, index) => (
                    <li key={`${fieldName}-warning-${index}`}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleClose}
                disabled={applying}
              >
                Fechar
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleApply}
                disabled={applying}
              >
                {applying ? 'Aplicando...' : 'Aplicar'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
