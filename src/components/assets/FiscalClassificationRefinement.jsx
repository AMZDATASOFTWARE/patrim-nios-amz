import { RefreshCw, Sparkles } from 'lucide-react';
import {
  FISCAL_DEPRECIATION_SUGGESTION_FIELDS,
  confidenceValueLabel,
  fiscalClassificationFromSuggestions,
  fiscalEvaluationFromSuggestions,
  formatSuggestionValue,
  hasFoundSuggestionForFields,
  summarizeSuggestionSources,
  uniqueSuggestionWarnings,
} from '@/lib/assetParameterSuggestions';

function ActionButton({ children, className = '', variant = 'primary', ...props }) {
  const variantClass = variant === 'outline'
    ? 'border border-input bg-background hover:bg-muted'
    : 'bg-primary text-primary-foreground hover:bg-primary/90';
  return (
    <button
      type="button"
      className={`inline-flex h-9 items-center justify-center rounded-md px-3 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 ${variantClass} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

function fiscalPanelMessage(status, evaluationStatus) {
  if (status === 'ERROR') return 'Nao foi possivel consultar a sugestao fiscal agora. Tente novamente.';
  if (status === 'NO_HYPOTHESIS') {
    return 'A IA nao encontrou uma hipotese fiscal util. Informe mais detalhes do bem, como tipo, finalidade de uso, marca ou modelo.';
  }
  if (evaluationStatus === 'OUT_OF_DEFAULT_SCOPE') {
    return 'Este regime tributario esta fora do escopo automatico da sugestao fiscal. Consulte o responsavel contabil/fiscal.';
  }
  if (evaluationStatus === 'REQUIRES_TAX_REGIME_CONFIRMATION') {
    return 'Informe o regime tributario para analisar a sugestao fiscal.';
  }
  return 'A IA nao encontrou uma classificacao fiscal suficientemente forte. Informe mais detalhes do bem, como tipo, finalidade de uso, marca ou modelo, para melhorar a sugestao.';
}

function fiscalSourceLabel(response, suggestion, evaluation) {
  const source = summarizeSuggestionSources(response, suggestion, 2);
  if (source) return source;
  return evaluation?.references?.[0]?.source_reference || evaluation?.references?.[0]?.source_id || 'Base normativa fiscal local';
}

const FIELD_LABELS = {
  name: 'Nome',
  description: 'Descricao',
  category: 'Categoria',
  account: 'Conta contabil',
  brand: 'Marca',
  model: 'Modelo',
  tax_regime: 'Regime tributario',
  conservation_state: 'Estado de conservacao',
  acquisition_value: 'Valor de aquisicao',
};

function usedFieldsLabel(fields) {
  if (!Array.isArray(fields)) return '';
  const labels = [];
  fields.forEach((field) => {
    const label = FIELD_LABELS[String(field || '').trim()] || '';
    if (label && !labels.includes(label)) labels.push(label);
  });
  return labels.join(', ');
}

function fiscalConfidenceLabel(value) {
  const normalized = String(value || '').toLowerCase();
  if (normalized === 'high') return 'Alta';
  if (normalized === 'medium') return 'Media';
  if (normalized === 'low') return 'Baixa';
  return '';
}

function FiscalSuggestionLine({ field, suggestion, disabled, onApply }) {
  if (!suggestion?.found) return null;
  return (
    <div className="rounded-md bg-background/80 p-3 text-xs">
      <p className="text-[11px] font-medium uppercase text-muted-foreground">
        {field === 'fiscal_depreciation_rate' ? 'Taxa fiscal' : 'Vida util fiscal'}
      </p>
      <p className="text-base font-semibold text-foreground">{formatSuggestionValue(field, suggestion.value)}</p>
      <p className="mt-1 text-muted-foreground">Confianca: {confidenceValueLabel(suggestion.confidence)}</p>
      <ActionButton variant="outline" className="mt-3" onClick={() => onApply(field)} disabled={disabled}>
        Usar {field === 'fiscal_depreciation_rate' ? 'taxa fiscal' : 'vida util fiscal'}
      </ActionButton>
    </div>
  );
}

export default function FiscalClassificationRefinement({
  state,
  taxRegime,
  onTaxRegimeChange,
  onStart,
  onConfirm,
  onApply,
}) {
  const suggestions = state.suggestions || {};
  const classification = state.classification || fiscalClassificationFromSuggestions(suggestions);
  const evaluation = fiscalEvaluationFromSuggestions(suggestions);
  const rate = suggestions.fiscal_depreciation_rate;
  const life = suggestions.fiscal_useful_life_years;
  const hasSuggestion = hasFoundSuggestionForFields(suggestions, FISCAL_DEPRECIATION_SUGGESTION_FIELDS);
  const hasClassificationHypothesis = Boolean(
    classification?.status === 'CLASSIFIED_APPLICABLE'
    || classification?.status === 'CLASSIFIED_REVIEW_ONLY'
    || classification?.confirmed_ncm_code
    || classification?.ncm_code,
  );
  const reviewOnly = classification?.status === 'CLASSIFIED_REVIEW_ONLY' && !hasSuggestion;
  const applicable = classification?.status === 'CLASSIFIED_APPLICABLE' && hasSuggestion;
  const status = state.loading ? 'LOADING' : state.status || 'IDLE';
  const source = fiscalSourceLabel(state.response, rate || life, evaluation);
  const reason = rate?.reason || life?.reason || classification?.reason || '';
  const noSafeReason = classification?.reason || rate?.reason || life?.reason || '';
  const usedFields = usedFieldsLabel(classification?.used_fields);
  const warnings = uniqueSuggestionWarnings([...(rate?.warnings || []), ...(life?.warnings || [])]).slice(0, 3);
  const confirmed = state.classificationConfirmed === true;
  const applyDisabled = state.loading || !confirmed || !hasSuggestion;
  const ncmLabel = classification?.ncm_display || classification?.confirmed_ncm_code || classification?.options?.[0]?.ncm_display || 'nao informado';
  const typeLabel = classification?.confirmed_display_name || classification?.display_name || classification?.options?.[0]?.display_name || 'nao informado';
  const confidence = fiscalConfidenceLabel(classification?.confidence);

  return (
    <div className="space-y-4 rounded-xl border border-primary/20 bg-card p-4 sm:p-6 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-card-foreground">Sugestao fiscal automatica</h2>
          <p className="text-sm text-muted-foreground">A IA analisa os dados do bem, compara com o catalogo fiscal local e mostra uma sugestao para revisao. Voce decide se usa os valores quando houver regra aplicavel.</p>
        </div>
        <ActionButton variant="outline" className="gap-2" onClick={onStart} disabled={state.loading}>
          {state.loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {state.loading ? 'Analisando...' : 'Sugestao Automatica'}
        </ActionButton>
      </div>

      <div>
        <label htmlFor="fiscal_tax_regime" className="text-sm font-medium leading-none">Regime tributario para analise</label>
        <select
          id="fiscal_tax_regime"
          className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          value={taxRegime}
          onChange={(event) => onTaxRegimeChange(event.target.value)}
          disabled={state.loading}
        >
          <option value="">Selecionar se necessario</option>
          <option value="LUCRO_REAL">Lucro Real</option>
          <option value="LUCRO_PRESUMIDO">Lucro Presumido</option>
          <option value="SIMPLES_NACIONAL">Simples Nacional</option>
          <option value="OTHER">Outro / precisa de analise</option>
        </select>
      </div>

      {status === 'LOADING' && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Analisando dados do patrimonio e relacionando com o catalogo fiscal...
        </p>
      )}

      {state.error && status !== 'LOADING' && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          {state.error}
        </div>
      )}

      {!state.error && !hasClassificationHypothesis && status !== 'IDLE' && status !== 'LOADING' && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <p>{fiscalPanelMessage(status, evaluation?.status)}</p>
          {noSafeReason && <p className="mt-2">Motivo: {noSafeReason}</p>}
        </div>
      )}

      {hasClassificationHypothesis && (
        <div className="space-y-3 rounded-md border border-primary/20 bg-primary/5 p-3">
          <div className="space-y-1 text-sm">
            <p className="text-sm font-semibold text-foreground">{reviewOnly ? 'Classificacao provavel para revisao' : 'Classificacao fiscal aplicavel'}</p>
            <p><span className="font-medium text-foreground">Tipo identificado:</span> {typeLabel}</p>
            <p><span className="font-medium text-foreground">NCM sugerido pela IA:</span> {ncmLabel}</p>
            {confidence && <p><span className="font-medium text-foreground">Confianca:</span> {confidence}</p>}
            <p><span className="font-medium text-foreground">Fonte / norma:</span> {source}</p>
            {reason && <p><span className="font-medium text-foreground">Justificativa:</span> {reason}</p>}
            {usedFields && <p><span className="font-medium text-foreground">Campos usados:</span> {usedFields}</p>}
          </div>

          {hasSuggestion ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <FiscalSuggestionLine field="fiscal_depreciation_rate" suggestion={rate} disabled={applyDisabled} onApply={onApply} />
              <FiscalSuggestionLine field="fiscal_useful_life_years" suggestion={life} disabled={applyDisabled} onApply={onApply} />
            </div>
          ) : (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              Esta classificacao e apenas uma hipotese fiscal. Revise com responsavel fiscal/contabil antes de usar em calculo oficial.
            </div>
          )}

          {warnings.length > 0 && (
            <div className="rounded-md bg-background/70 p-2 text-xs text-muted-foreground">
              <p className="mb-1 font-medium text-foreground">Avisos fiscais</p>
              <ul className="space-y-1">
                {warnings.map((warning) => <li key={warning}>- {warning}</li>)}
              </ul>
            </div>
          )}

          {applicable && (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">
                {confirmed ? 'Classificacao fiscal confirmada nesta tela. Os campos continuam editaveis.' : 'Confirme a classificacao fiscal antes de usar valores aplicaveis.'}
              </p>
              <ActionButton onClick={() => onConfirm(classification?.options?.[0] || null)} disabled={state.loading || confirmed}>
                {confirmed ? 'Classificacao confirmada' : 'Confirmar classificacao fiscal'}
              </ActionButton>
            </div>
          )}
        </div>
      )}

      <p className="text-xs text-muted-foreground">A sugestao automatica de valor residual fiscal nao esta disponivel. Informe o valor manualmente com orientacao contabil.</p>
    </div>
  );
}
