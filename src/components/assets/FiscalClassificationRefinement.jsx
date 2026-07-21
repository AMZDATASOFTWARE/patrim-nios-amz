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
  if (status === 'ERROR') return 'Não foi possível consultar a sugestão fiscal agora. Tente novamente.';
  if (evaluationStatus === 'OUT_OF_DEFAULT_SCOPE') {
    return 'Este regime tributário está fora do escopo automático da sugestão fiscal. Consulte o responsável contábil/fiscal.';
  }
  if (evaluationStatus === 'REQUIRES_TAX_REGIME_CONFIRMATION') {
    return 'Informe o regime tributário para analisar a sugestão fiscal.';
  }
  return 'Não foi possível relacionar este bem a um NCM seguro no catálogo local.';
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

function FiscalSuggestionLine({ field, suggestion, disabled, onApply }) {
  if (!suggestion?.found) return null;
  return (
    <div className="rounded-md bg-background/80 p-3 text-xs">
      <p className="text-[11px] font-medium uppercase text-muted-foreground">
        {field === 'fiscal_depreciation_rate' ? 'Taxa fiscal' : 'Vida útil fiscal'}
      </p>
      <p className="text-base font-semibold text-foreground">{formatSuggestionValue(field, suggestion.value)}</p>
      <p className="mt-1 text-muted-foreground">Confiança: {confidenceValueLabel(suggestion.confidence)}</p>
      <ActionButton variant="outline" className="mt-3" onClick={() => onApply(field)} disabled={disabled}>
        Usar {field === 'fiscal_depreciation_rate' ? 'taxa fiscal' : 'vida útil fiscal'}
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
  const status = state.loading ? 'LOADING' : state.status || 'IDLE';
  const source = fiscalSourceLabel(state.response, rate || life, evaluation);
  const reason = rate?.reason || life?.reason || classification?.reason || '';
  const noSafeReason = classification?.reason || rate?.reason || life?.reason || '';
  const usedFields = usedFieldsLabel(classification?.used_fields);
  const warnings = uniqueSuggestionWarnings([...(rate?.warnings || []), ...(life?.warnings || [])]).slice(0, 3);
  const confirmed = state.classificationConfirmed === true;
  const applyDisabled = state.loading || !confirmed;

  return (
    <div className="space-y-4 rounded-xl border border-primary/20 bg-card p-4 sm:p-6 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-card-foreground">Sugestão fiscal automática</h2>
          <p className="text-sm text-muted-foreground">A IA escolhe uma opção do catálogo fiscal local. Você confirma antes de usar os valores.</p>
        </div>
        <ActionButton variant="outline" className="gap-2" onClick={onStart} disabled={state.loading}>
          {state.loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {state.loading ? 'Analisando...' : 'Sugestão Automática'}
        </ActionButton>
      </div>

      <div>
        <label htmlFor="fiscal_tax_regime" className="text-sm font-medium leading-none">Regime tributário para análise</label>
        <select
          id="fiscal_tax_regime"
          className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          value={taxRegime}
          onChange={(event) => onTaxRegimeChange(event.target.value)}
          disabled={state.loading}
        >
          <option value="">Selecionar se necessário</option>
          <option value="LUCRO_REAL">Lucro Real</option>
          <option value="LUCRO_PRESUMIDO">Lucro Presumido</option>
          <option value="SIMPLES_NACIONAL">Simples Nacional</option>
          <option value="OTHER">Outro / precisa de análise</option>
        </select>
      </div>

      {status === 'LOADING' && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Analisando dados do patrimônio e relacionando com o catálogo fiscal...
        </p>
      )}

      {state.error && status !== 'LOADING' && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          {state.error}
        </div>
      )}

      {!state.error && !hasSuggestion && status !== 'IDLE' && status !== 'LOADING' && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <p>{fiscalPanelMessage(status, evaluation?.status)}</p>
          {noSafeReason && <p className="mt-2">Motivo: {noSafeReason}</p>}
        </div>
      )}

      {hasSuggestion && (
        <div className="space-y-3 rounded-md border border-primary/20 bg-primary/5 p-3">
          <div className="space-y-1 text-sm">
            <p><span className="font-medium text-foreground">Tipo identificado:</span> {classification?.confirmed_display_name || classification?.options?.[0]?.display_name || 'não informado'}</p>
            <p><span className="font-medium text-foreground">NCM sugerido pelo catálogo fiscal local:</span> {classification?.confirmed_ncm_code || classification?.options?.[0]?.ncm_display || 'não informado'}</p>
            <p><span className="font-medium text-foreground">Fonte / norma:</span> {source}</p>
            {reason && <p><span className="font-medium text-foreground">Justificativa:</span> {reason}</p>}
            {usedFields && <p><span className="font-medium text-foreground">Campos usados:</span> {usedFields}</p>}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <FiscalSuggestionLine field="fiscal_depreciation_rate" suggestion={rate} disabled={applyDisabled} onApply={onApply} />
            <FiscalSuggestionLine field="fiscal_useful_life_years" suggestion={life} disabled={applyDisabled} onApply={onApply} />
          </div>

          {warnings.length > 0 && (
            <div className="rounded-md bg-background/70 p-2 text-xs text-muted-foreground">
              <p className="mb-1 font-medium text-foreground">Avisos fiscais</p>
              <ul className="space-y-1">
                {warnings.map((warning) => <li key={warning}>• {warning}</li>)}
              </ul>
            </div>
          )}

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              {confirmed ? 'Classificação fiscal confirmada nesta tela. Os campos continuam editáveis.' : 'Confirme a classificação fiscal antes de usar os valores sugeridos.'}
            </p>
            <ActionButton onClick={() => onConfirm(classification?.options?.[0] || null)} disabled={state.loading || confirmed}>
              {confirmed ? 'Classificação confirmada' : 'Confirmar classificação fiscal'}
            </ActionButton>
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground">A sugestão automática de valor residual fiscal não está disponível. Informe o valor manualmente com orientação contábil.</p>
    </div>
  );
}
