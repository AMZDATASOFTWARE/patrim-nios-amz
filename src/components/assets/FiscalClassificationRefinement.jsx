import { RefreshCw, Sparkles } from 'lucide-react';
import {
  FISCAL_DEPRECIATION_SUGGESTION_FIELDS,
  confidenceValueLabel,
  fiscalCurrentQuestion,
  fiscalEvaluationFromSuggestions,
  fiscalReadyOption,
  fiscalUserMessage,
  formatSuggestionValue,
  hasFoundSuggestionForFields,
  isInvalidFiscalTokenMessage,
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

function fiscalStatusLabel(status) {
  if (status === 'READY_FOR_CONFIRMATION') return 'Tipo identificado';
  if (status === 'NEEDS_MORE_INFORMATION') return 'Refinando identificação';
  if (status === 'NO_SAFE_CANDIDATE') return 'Sem classificação segura';
  if (status === 'REQUIRES_HUMAN_REVIEW') return 'Revisão necessária';
  return 'Análise fiscal';
}

function optionDescription(option) {
  return option?.plain_description || option?.description || '';
}

function missingDataForFiscalSuggestions(suggestions) {
  const items = [];
  FISCAL_DEPRECIATION_SUGGESTION_FIELDS.forEach((field) => {
    const missing = suggestions?.[field]?.missing_data;
    if (!Array.isArray(missing)) return;
    missing.forEach((item) => {
      const text = String(item || '').trim();
      if (text && !items.includes(text)) items.push(text);
    });
  });
  return items.slice(0, 4);
}

function fiscalFallbackMessage(status, suggestions) {
  if (status === 'ERROR') return 'Não foi possível consultar a sugestão fiscal agora. Tente novamente em instantes.';
  if (status === 'REQUIRES_HUMAN_REVIEW') {
    return 'A classificação fiscal precisa de revisão humana antes de sugerir taxa ou vida útil.';
  }
  if (status === 'NO_SAFE_CANDIDATE') {
    return 'Não encontramos uma classificação fiscal segura para este bem com as informações disponíveis.';
  }
  if (status === 'NEEDS_MORE_INFORMATION') {
    const missing = missingDataForFiscalSuggestions(suggestions);
    if (missing.length > 0) return `Preencha ou revise: ${missing.join(', ')}.`;
    return 'Informe uma descrição mais detalhada, a conta contábil, marca ou modelo para melhorar a classificação fiscal.';
  }
  return '';
}

function TechnicalDetails({ option, classification, suggestions, response }) {
  if (!option && !classification) return null;
  const rate = suggestions.fiscal_depreciation_rate;
  const life = suggestions.fiscal_useful_life_years;
  const source = summarizeSuggestionSources(response, rate || life, 3);

  return (
    <details className="rounded-md bg-background/70 p-2 text-xs">
      <summary className="cursor-pointer font-medium text-foreground">Saiba mais</summary>
      <div className="mt-2 space-y-1 text-muted-foreground">
        {option?.display_name && <p><span className="font-medium text-foreground">Tipo:</span> {option.display_name}</p>}
        {option?.ncm_display && <p><span className="font-medium text-foreground">Detalhe técnico fiscal:</span> {option.ncm_display}</p>}
        {rate?.found && <p><span className="font-medium text-foreground">Taxa fiscal:</span> {formatSuggestionValue('fiscal_depreciation_rate', rate.value)}</p>}
        {life?.found && <p><span className="font-medium text-foreground">Vida útil fiscal:</span> {formatSuggestionValue('fiscal_useful_life_years', life.value)}</p>}
        {source && <p><span className="font-medium text-foreground">Fonte normativa:</span> {source}</p>}
        {(rate?.reason || life?.reason) && <p><span className="font-medium text-foreground">Justificativa:</span> {rate?.reason || life?.reason}</p>}
        {(rate?.confidence || life?.confidence) && <p><span className="font-medium text-foreground">Confiança:</span> {confidenceValueLabel(rate?.confidence || life?.confidence)}</p>}
        {classification?.refinement_state?.warnings?.length > 0 && (
          <p><span className="font-medium text-foreground">Aviso:</span> {classification.refinement_state.warnings[0]}</p>
        )}
      </div>
    </details>
  );
}

export default function FiscalClassificationRefinement({
  state,
  taxRegime,
  onTaxRegimeChange,
  onStart,
  onSelectOption,
  onContinue,
  onConfirm,
  onApply,
  onReset,
}) {
  const suggestions = state.suggestions || {};
  const classification = state.classification || null;
  const evaluation = fiscalEvaluationFromSuggestions(suggestions);
  const question = state.currentQuestion || fiscalCurrentQuestion(classification);
  const readyOption = state.readyOption || fiscalReadyOption(classification);
  const hasSuggestion = hasFoundSuggestionForFields(suggestions, FISCAL_DEPRECIATION_SUGGESTION_FIELDS);
  const status = state.status || classification?.refinement_state?.status || 'IDLE';
  const fallbackMessage = !question && !readyOption && !hasSuggestion ? fiscalFallbackMessage(status, suggestions) : '';
  const userMessage = state.error || fiscalUserMessage(status, evaluation?.status) || fallbackMessage;
  const invalidToken = isInvalidFiscalTokenMessage(classification);
  const loadingLabel = status === 'CONFIRMING' ? 'Confirmando tipo do item...' : 'Refinando a identificação do item...';
  const disabled = state.loading;

  return (
    <div className="space-y-3 rounded-lg border border-dashed border-border bg-muted/20 p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">Sugestão fiscal automática</p>
          <p className="text-xs text-muted-foreground">A referência é fiscal, exige validação profissional e não substitui os parâmetros contábeis.</p>
        </div>
        <ActionButton variant="outline" className="gap-2" onClick={onStart} disabled={disabled}>
          {state.loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {state.loading ? 'Analisando...' : 'Sugestão Automática'}
        </ActionButton>
      </div>

      <div className="grid gap-2 sm:grid-cols-[220px_1fr] sm:items-end">
        <div>
          <label htmlFor="fiscal_tax_regime" className="text-sm font-medium leading-none">Regime tributário para análise</label>
          <select
            id="fiscal_tax_regime"
            className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={taxRegime}
            onChange={(event) => onTaxRegimeChange(event.target.value)}
            disabled={disabled}
          >
            <option value="">Selecionar se necessário</option>
            <option value="LUCRO_REAL">Lucro Real</option>
            <option value="LUCRO_PRESUMIDO">Lucro Presumido</option>
            <option value="SIMPLES_NACIONAL">Simples Nacional</option>
            <option value="OTHER">Outro / precisa de análise</option>
          </select>
        </div>
        {status && status !== 'IDLE' && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex rounded-md border px-2.5 py-0.5 text-xs font-semibold text-foreground">{fiscalStatusLabel(status)}</span>
            <span>Nada é aplicado sem confirmação.</span>
          </div>
        )}
      </div>

      {state.loading && (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <RefreshCw className="h-3 w-3 animate-spin" />
          {loadingLabel}
        </p>
      )}

      {invalidToken && !state.loading && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          <p>Esta análise expirou ou os dados do bem foram alterados. Vamos iniciar uma nova análise com as informações atuais.</p>
          <button type="button" className="h-auto px-0 py-1 text-xs font-medium text-amber-900 underline" onClick={onReset}>
            Reiniciar análise
          </button>
        </div>
      )}

      {userMessage && !invalidToken && !state.loading && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          {userMessage}
        </div>
      )}

      {question && !state.loading && !invalidToken && (
        <div className="rounded-md border border-border bg-background p-3">
          <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">Precisamos de mais uma informação</p>
          <p className="text-sm font-medium text-foreground">{question.question}</p>
          {question.reason && <p className="mt-1 text-xs text-muted-foreground">{question.reason}</p>}
          <div className="mt-3 grid gap-2" role="radiogroup" aria-label={question.question}>
            {(question.options || []).map((option) => (
              <div key={option.value} className="flex items-start gap-2 rounded-md border border-border p-2">
                <input
                  id={`${question.question_id}-${option.value}`}
                  type="radio"
                  name={question.question_id}
                  value={option.value}
                  checked={state.selectedOption === option.value}
                  onChange={() => onSelectOption(option.value)}
                  disabled={disabled}
                  className="mt-0.5 h-4 w-4"
                />
                <label htmlFor={`${question.question_id}-${option.value}`} className="flex-1 cursor-pointer text-sm font-normal">
                  {option.label}
                </label>
              </div>
            ))}
          </div>
          <div className="mt-3 flex justify-end">
            <ActionButton onClick={onContinue} disabled={disabled || !state.selectedOption}>
              Continuar
            </ActionButton>
          </div>
        </div>
      )}

      {readyOption && !question && !hasSuggestion && !state.loading && !invalidToken && !userMessage && (
        <div className="rounded-md border border-primary/20 bg-primary/5 p-3">
          <p className="text-xs font-medium uppercase text-muted-foreground">Tipo identificado</p>
          <p className="text-base font-semibold text-foreground">{readyOption.display_name}</p>
          {optionDescription(readyOption) && <p className="mt-1 text-sm text-muted-foreground">{optionDescription(readyOption)}</p>}
          <TechnicalDetails option={readyOption} classification={classification} suggestions={suggestions} response={state.response} />
          <div className="mt-3 flex justify-end">
            <ActionButton onClick={() => onConfirm(readyOption)} disabled={disabled || !taxRegime}>
              Confirmar tipo do item
            </ActionButton>
          </div>
          {!taxRegime && <p className="mt-2 text-xs text-muted-foreground">Informe o regime tributário para confirmar o tipo e consultar a regra fiscal aplicável.</p>}
        </div>
      )}

      {hasSuggestion && !state.loading && (
        <div className="rounded-md border border-primary/20 bg-primary/5 p-3">
          <p className="text-sm font-semibold text-foreground">Sugestão fiscal</p>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            {FISCAL_DEPRECIATION_SUGGESTION_FIELDS.map((field) => {
              const suggestion = suggestions[field];
              if (!suggestion?.found) return null;
              const warnings = uniqueSuggestionWarnings(suggestion.warnings).slice(0, 2);
              return (
                <div key={field} className="rounded-md bg-background/80 p-3 text-xs">
                  <p className="text-[11px] font-medium uppercase text-muted-foreground">
                    {field === 'fiscal_depreciation_rate' ? 'Taxa fiscal' : 'Vida útil fiscal'}
                  </p>
                  <p className="text-base font-semibold text-foreground">{formatSuggestionValue(field, suggestion.value)}</p>
                  <p className="mt-1 text-muted-foreground">Confiança: {confidenceValueLabel(suggestion.confidence)}</p>
                  {warnings.length > 0 && <p className="mt-1 text-muted-foreground">{warnings[0]}</p>}
                  <ActionButton variant="outline" className="mt-3" onClick={() => onApply(field)} disabled={disabled}>
                    Usar sugestão
                  </ActionButton>
                </div>
              );
            })}
          </div>
          <TechnicalDetails option={readyOption} classification={classification} suggestions={suggestions} response={state.response} />
          <p className="mt-2 text-xs text-muted-foreground">A aplicação é manual e cada campo continua editável.</p>
        </div>
      )}

      <p className="text-xs text-muted-foreground">A sugestão automática de valor residual fiscal não está disponível. Informe o valor manualmente com orientação contábil.</p>
    </div>
  );
}
