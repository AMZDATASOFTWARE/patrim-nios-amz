import { useEffect, useMemo, useState } from 'react';
import { Sparkles, Loader2, AlertCircle, CheckCircle2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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

function normalizeSuggestionError(message) {
  const raw = String(message || '').trim();
  const lower = raw.toLowerCase();
  if (
    !raw ||
    lower.includes('request failed') ||
    lower.includes('status code') ||
    lower.includes('404') ||
    lower.includes('json') ||
    lower.includes('provider')
  ) {
    return 'Não foi possível gerar a sugestão agora. Tente novamente em instantes.';
  }
  return raw;
}

function withUnit(value, unit) {
  const label = String(value ?? '').trim();
  const normalizedUnit = String(unit || '').trim();
  if (!label) return '';
  if (!normalizedUnit) return label;
  if (label.toLowerCase().includes(normalizedUnit.toLowerCase())) return label;
  if (normalizedUnit === '%' && label.includes('%')) return label;
  return `${label} ${normalizedUnit}`;
}

function formatSimpleSuggestion(suggestion, fieldName) {
  const baseLabel = suggestion?.label || withUnit(suggestion?.value, suggestion?.unit);
  if (!baseLabel) return '';

  if (fieldName === 'depreciation_rate' || fieldName === 'fiscal_depreciation_rate') {
    return baseLabel.includes('%') ? `${baseLabel} ao ano` : `${baseLabel}% ao ano`;
  }

  if (fieldName === 'useful_life_years' || fieldName === 'fiscal_useful_life_years') {
    return baseLabel.toLowerCase().includes('ano') ? baseLabel : `${baseLabel} anos`;
  }

  return baseLabel;
}

function classificationLabel(context, suggestion) {
  return (
    suggestion?.identified_classification ||
    suggestion?.classification ||
    context?.identified_classification ||
    context?.specific_classification ||
    context?.asset_description ||
    context?.description ||
    context?.category ||
    context?.scope_key ||
    'Não informado'
  );
}

function basisDescription(domain) {
  if (domain === 'fiscal') {
    return 'Sugestão fiscal: deve ser validada com o responsável fiscal/contábil antes de aplicar.';
  }
  if (domain === 'fipe') {
    return 'Referência de mercado: não altera valor contábil, custo histórico ou reavaliação.';
  }
  return 'Sugestão societária/gerencial: apoia a definição contábil, mas não substitui política aprovada.';
}

function shouldShowLowInformationWarning(suggestion) {
  return (
    suggestion?.confidence_level === 'low' ||
    !!suggestion?.warning ||
    !suggestion?.source_name ||
    (Array.isArray(suggestion?.warnings) && suggestion.warnings.length > 0)
  );
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
  const [detailsOpen, setDetailsOpen] = useState(false);

  const contextKey = useMemo(() => JSON.stringify({
    entity_type: entityType || 'Asset',
    field_name: fieldName,
    domain,
    context: context || {},
  }), [context, domain, entityType, fieldName]);

  useEffect(() => {
    setStatus('idle');
    setSuggestion(null);
    setError('');
    setApplying(false);
    setDetailsOpen(false);
  }, [fieldName, domain, contextKey]);

  const hasSuggestion = status === 'success' && !!suggestion;

  const handleFetch = async () => {
    setStatus('loading');
    setError('');
    setSuggestion(null);
    setDetailsOpen(false);

    const result = await getParameterSuggestion(buildPayload(fieldName, domain, context, entityType));
    if (!result?.ok || !result?.found) {
      setStatus('error');
      setError(normalizeSuggestionError(result?.error));
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
    setDetailsOpen(false);
  };

  const simpleSuggestion = hasSuggestion ? formatSimpleSuggestion(suggestion, fieldName) : '';
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
          Sugestão Automática
        </Button>
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
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-950">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span className="inline-flex items-center gap-2 font-medium">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-700" />
              Sugestão: {simpleSuggestion}
            </span>
            <Button
              type="button"
              variant="link"
              size="sm"
              className="h-auto p-0 text-xs text-emerald-800 underline-offset-2 hover:text-emerald-950"
              onClick={() => setDetailsOpen(true)}
            >
              Saiba mais
            </Button>
          </div>

          <div className="mt-2 flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleClose}
              disabled={applying}
              className="h-8 border-emerald-300 bg-white/70 text-emerald-950 hover:bg-white"
            >
              Ignorar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleApply}
              disabled={applying}
              className="h-8"
            >
              {applying ? 'Aplicando...' : 'Aplicar'}
            </Button>
          </div>
        </div>
      )}

      {hasSuggestion && (
        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Detalhes da sugestão</DialogTitle>
              <DialogDescription>
                Revise a classificação, fonte e limitações antes de aplicar.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 text-sm">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-medium uppercase text-muted-foreground">
                    Classificação identificada
                  </p>
                  <p className="mt-1 text-foreground">{classificationLabel(context, suggestion)}</p>
                </div>

                <div>
                  <p className="text-xs font-medium uppercase text-muted-foreground">
                    Confiança
                  </p>
                  <p className="mt-1 text-foreground">{formatConfidence(suggestion.confidence_level)}</p>
                </div>

                <div>
                  <p className="text-xs font-medium uppercase text-muted-foreground">
                    Fonte utilizada
                  </p>
                  <p className="mt-1 text-foreground">
                    {suggestion.source_name || 'Fonte configurada'}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium uppercase text-muted-foreground">
                    Competência
                  </p>
                  <p className="mt-1 text-foreground">
                    {formatCompetenceMonth(suggestion.competence_month) || 'Não informada'}
                  </p>
                </div>
              </div>

              {suggestion.source_url && (
                <div>
                  <p className="text-xs font-medium uppercase text-muted-foreground">
                    URL da fonte
                  </p>
                  <a
                    href={suggestion.source_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-flex items-center gap-1 break-all text-primary hover:underline"
                  >
                    {suggestion.source_url}
                    <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                  </a>
                </div>
              )}

              <div>
                <p className="text-xs font-medium uppercase text-muted-foreground">
                  Justificativa curta
                </p>
                <p className="mt-1 text-foreground">
                  {suggestion.explanation || 'Sugestão baseada em parâmetro aprovado para o campo solicitado.'}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase text-muted-foreground">
                  Tipo de sugestão
                </p>
                <p className="mt-1 text-foreground">{basisDescription(domain)}</p>
              </div>

              {vigencia && (
                <div>
                  <p className="text-xs font-medium uppercase text-muted-foreground">
                    Vigência
                  </p>
                  <p className="mt-1 text-foreground">{vigencia}</p>
                </div>
              )}

              {shouldShowLowInformationWarning(suggestion) && (
                <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  <p className="font-medium">Atenção</p>
                  {Array.isArray(suggestion.warnings) && suggestion.warnings.length > 0 ? (
                    <ul className="mt-1 list-disc space-y-1 pl-4">
                      {suggestion.warnings.map((warning, index) => (
                        <li key={`${fieldName}-warning-${index}`}>{warning}</li>
                      ))}
                    </ul>
                  ) : suggestion.warning ? (
                    <p className="mt-1">{suggestion.warning}</p>
                  ) : (
                    <p className="mt-1">
                      Há pouca informação de apoio para esta sugestão. Confirme os dados do bem e a política contábil antes de aplicar.
                    </p>
                  )}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
