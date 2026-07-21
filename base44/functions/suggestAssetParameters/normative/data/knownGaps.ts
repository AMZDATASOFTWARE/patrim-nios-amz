// Generated from docs/amz_base_normativa_v3_amostra_empresa/normative/known_gaps.json.
// Keep this file local to suggestAssetParameters so the Base44 function remains deployable.

export const KNOWN_GAPS_DATA = [
  {
    "topic": "Equipamentos médicos das posições 9018, 9019, 9020, 9021 e 9022",
    "status": "NOT_INCLUDED_IN_VERIFIED_RATE_SEED",
    "reason": "Necessário importar e validar as linhas oficiais específicas do Anexo III antes de liberar taxa automática.",
    "fallback": "REQUIRES_NCM_CONFIRMATION_AND_NORMATIVE_REVIEW"
  },
  {
    "topic": "Softwares, licenças, marcas, patentes e outros intangíveis",
    "status": "SEPARATE_FISCAL_AMORTIZATION_POLICY_REQUIRED",
    "reason": "Não devem ser tratados pela tabela de bens corpóreos sem análise do art. 126 e da natureza do direito.",
    "fallback": "REQUIRES_FISCAL_INTANGIBLE_REVIEW"
  },
  {
    "topic": "Bens usados e aceleração por turnos",
    "status": "IMPLEMENT_ONLY_AFTER_EXACT_RULE_VALIDATION",
    "reason": "Regras podem depender de requisitos, comprovação e contexto fiscal específico.",
    "fallback": "REQUIRES_TAX_PROFESSIONAL_REVIEW"
  },
  {
    "topic": "Valor residual fiscal",
    "status": "NO_AUTOMATIC_GENERAL_VALUE",
    "reason": "O Anexo III fornece vida útil e taxa, não uma estimativa geral de residual fiscal.",
    "fallback": "NULL_BY_SOFTWARE_POLICY"
  }
] as const;
