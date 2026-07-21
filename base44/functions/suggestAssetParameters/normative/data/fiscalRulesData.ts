// Generated from docs/amz_base_normativa_v3_amostra_empresa/normative/fiscal_rules.json.
// Keep this file local to suggestAssetParameters so the Base44 function remains deployable.

export const FISCAL_RULES_DATA = [
  {
    "id": "FISCAL_CHECK_TAX_REGIME_SCOPE",
    "title": "Verificar regime tributário antes de aplicar o motor fiscal",
    "priority": 1000,
    "source_refs": [
      {
        "source_id": "IN_RFB_1700_2017",
        "reference": "Art. 1º, §2º"
      }
    ],
    "logic": {
      "LUCRO_REAL": "APPLICABLE",
      "LUCRO_PRESUMIDO": "REQUIRES_CONTEXT_REVIEW",
      "LUCRO_ARBITRADO": "REQUIRES_CONTEXT_REVIEW",
      "SIMPLES_NACIONAL": "OUT_OF_DEFAULT_SCOPE",
      "UNKNOWN": "BLOCK_AND_REQUEST_CONFIRMATION"
    },
    "summary": "A IN RFB nº 1.700/2017 informa que não se aplica ao Simples Nacional, salvo hipóteses expressas."
  },
  {
    "id": "FISCAL_CAPITALIZATION_OR_EXPENSE",
    "title": "Avaliar capitalização fiscal ou dedução direta",
    "priority": 900,
    "source_refs": [
      {
        "source_id": "IN_RFB_1700_2017",
        "reference": "Art. 120"
      }
    ],
    "logic": {
      "direct_expense_candidate_when": [
        "unit_cost <= 1200",
        "useful_life_years <= 1"
      ],
      "exception": "Do not apply when the activity requires a set of those goods.",
      "default": "CAPITALIZE"
    },
    "summary": "O valor legal deve ser versionado, porque pode ser alterado por norma posterior."
  },
  {
    "id": "FISCAL_START_WHEN_INSTALLED_OR_IN_SERVICE",
    "title": "Iniciar a depreciação fiscal quando instalado, posto em serviço ou apto a produzir",
    "priority": 900,
    "source_refs": [
      {
        "source_id": "IN_RFB_1700_2017",
        "reference": "Art. 121"
      }
    ],
    "preferred_date_field": "fiscal_available_for_use_date",
    "summary": "Não iniciar somente pela data da nota fiscal."
  },
  {
    "id": "FISCAL_INTRINSICALLY_RELATED_TO_ACTIVITY",
    "title": "Exigir relação intrínseca com produção ou comercialização",
    "priority": 850,
    "source_refs": [
      {
        "source_id": "IN_RFB_1700_2017",
        "reference": "Art. 121"
      }
    ],
    "decision": "REQUIRE_BUSINESS_RELATION_CONFIRMATION",
    "summary": "O sistema deve registrar a finalidade operacional do ativo."
  },
  {
    "id": "FISCAL_MAX_ACCUMULATED_COST",
    "title": "Limitar depreciação acumulada fiscal ao custo de aquisição",
    "priority": 1000,
    "source_refs": [
      {
        "source_id": "IN_RFB_1700_2017",
        "reference": "Art. 121"
      }
    ],
    "formula": "fiscal_accumulated_depreciation <= acquisition_cost",
    "summary": "Bloquear quotas que ultrapassem o custo fiscal registrado."
  },
  {
    "id": "FISCAL_NO_CATCH_UP_ABOVE_MAX_RATE",
    "title": "Não recuperar quotas omitidas usando taxa superior à máxima",
    "priority": 950,
    "source_refs": [
      {
        "source_id": "IN_RFB_1700_2017",
        "reference": "Art. 121"
      }
    ],
    "summary": "Uma omissão anterior não autoriza elevar a taxa sem fundamento."
  },
  {
    "id": "FISCAL_LAND_NOT_DEPRECIABLE",
    "title": "Terreno não é depreciável, ressalvados melhoramentos e construções",
    "priority": 1000,
    "source_refs": [
      {
        "source_id": "IN_RFB_1700_2017",
        "reference": "Art. 122"
      }
    ],
    "decision": "NOT_DEPRECIABLE",
    "summary": "Separar custo do terreno, edificação e benfeitorias."
  },
  {
    "id": "FISCAL_UNUSED_OR_RESALE_PROPERTY_REVIEW",
    "title": "Bloquear imóvel não utilizado para produzir rendimentos ou destinado à revenda",
    "priority": 980,
    "source_refs": [
      {
        "source_id": "IN_RFB_1700_2017",
        "reference": "Art. 122"
      }
    ],
    "decision": "NOT_DEPRECIABLE_OR_REQUIRES_RECLASSIFICATION",
    "summary": "Imóvel destinado à revenda pode ser estoque, não imobilizado depreciável."
  },
  {
    "id": "FISCAL_ART_AND_ANTIQUES_NOT_DEPRECIABLE",
    "title": "Obras de arte e antiguidades não são depreciáveis",
    "priority": 980,
    "source_refs": [
      {
        "source_id": "IN_RFB_1700_2017",
        "reference": "Art. 122"
      }
    ],
    "decision": "NOT_DEPRECIABLE",
    "summary": "Bloquear a aplicação automática da tabela."
  },
  {
    "id": "FISCAL_EXHAUSTIBLE_ASSET_SEPARATE_POLICY",
    "title": "Encaminhar bens sujeitos à exaustão para política própria",
    "priority": 980,
    "source_refs": [
      {
        "source_id": "IN_RFB_1700_2017",
        "reference": "Art. 122"
      }
    ],
    "decision": "ROUTE_TO_EXHAUSTION_POLICY",
    "summary": "Não aplicar taxa de depreciação comum."
  },
  {
    "id": "FISCAL_ANNEX_III_PRIMARY_RATE",
    "title": "Usar o Anexo III como referência primária de vida útil e taxa",
    "priority": 900,
    "source_refs": [
      {
        "source_id": "IN_RFB_1700_2017",
        "reference": "Art. 124 e Anexo III"
      }
    ],
    "decision": "LOOKUP_BY_CONFIRMED_NCM",
    "requirements": [
      "confirmed_ncm_or_explicit_generic_rule",
      "matching_normative_version"
    ],
    "summary": "Categoria e descrição servem para procurar candidatos, mas não confirmam sozinhas o enquadramento fiscal."
  },
  {
    "id": "FISCAL_ALTERNATIVE_RATE_REQUIRES_EVIDENCE",
    "title": "Exigir prova técnica para taxa diferente quando aplicável",
    "priority": 950,
    "source_refs": [
      {
        "source_id": "IN_RFB_1700_2017",
        "reference": "Art. 124, §§1º e 2º"
      },
      {
        "source_id": "SC_COSIT_86_2021",
        "reference": "Taxa diferente e comprovação"
      }
    ],
    "required_evidence": [
      "technical_report",
      "official_research_entity_report_or_equivalent",
      "justification",
      "approver",
      "effective_date"
    ],
    "decision": "REQUIRES_TECHNICAL_EVIDENCE",
    "summary": "A IA não pode criar uma exceção fiscal apenas com base em uso intenso ou percepção de desgaste."
  },
  {
    "id": "FISCAL_COMBINED_EQUIPMENT_LONGEST_LIFE",
    "title": "Conjunto sem detalhamento usa a taxa do componente de maior vida útil",
    "priority": 900,
    "source_refs": [
      {
        "source_id": "IN_RFB_1700_2017",
        "reference": "Art. 124, §3º"
      }
    ],
    "decision": "USE_LONGEST_LIFE_WHEN_NO_SUPPORT_FOR_WEIGHTED_RATE",
    "summary": "A melhor solução é cadastrar os componentes quando houver informação suficiente."
  },
  {
    "id": "FISCAL_ACCOUNTING_RATE_DIFFERENCE_CONTROL",
    "title": "Controlar diferenças entre quota contábil e fiscal",
    "priority": 900,
    "source_refs": [
      {
        "source_id": "IN_RFB_1700_2017",
        "reference": "Art. 124, §§4º e 5º"
      },
      {
        "source_id": "LEI_12973_ART_40",
        "reference": "Diferenças de depreciação"
      }
    ],
    "decision": "REQUIRE_TAX_LEDGER_CONTROL",
    "summary": "Guardar cronogramas societário e fiscal separadamente, com rastreabilidade para e-Lalur/e-Lacs quando aplicável."
  },
  {
    "id": "FISCAL_DISMANTLING_COST_WHEN_INCURRED",
    "title": "Deduzir desmontagem, retirada ou restauração fiscalmente quando incorridas",
    "priority": 850,
    "source_refs": [
      {
        "source_id": "IN_RFB_1700_2017",
        "reference": "Art. 125"
      }
    ],
    "decision": "ADD_BACK_PROVISION_UNTIL_INCURRED",
    "summary": "A provisão contábil e seu ajuste não devem ser confundidos com dedução fiscal imediata."
  },
  {
    "id": "FISCAL_INTANGIBLE_AMORTIZATION",
    "title": "Avaliar amortização fiscal de intangível relacionado à atividade",
    "priority": 850,
    "source_refs": [
      {
        "source_id": "IN_RFB_1700_2017",
        "reference": "Art. 126"
      }
    ],
    "requirements": [
      "accounting_compliance",
      "intrinsic_relation_to_business"
    ],
    "decision": "REQUIRES_FISCAL_INTANGIBLE_REVIEW",
    "summary": "Não reaproveitar automaticamente a tabela de depreciação de bens corpóreos."
  },
  {
    "id": "FISCAL_RESIDUAL_DEFAULT_NULL",
    "title": "Não inventar valor residual fiscal",
    "priority": 900,
    "source_refs": [
      {
        "source_id": "IN_RFB_1700_2017",
        "reference": "Arts. 121 a 124 e Anexo III"
      }
    ],
    "software_policy": {
      "fiscal_residual_value": null,
      "fiscal_residual_policy": "NOT_DEFINED_BY_GENERAL_ANNEX_III_RATE_RULE"
    },
    "summary": "É uma política de modelagem: a taxa do Anexo III não fornece, por si só, um residual fiscal estimado."
  },
  {
    "id": "FISCAL_NCM_VERSION_REQUIRED",
    "title": "Registrar versão da referência NCM usada",
    "priority": 900,
    "source_refs": [
      {
        "source_id": "IN_RFB_1700_2017",
        "reference": "Anexo III"
      }
    ],
    "required_fields": [
      "ncm_code",
      "ncm_reference_version",
      "classification_status"
    ],
    "summary": "Códigos e descrições podem mudar; não confundir uma correspondência histórica do Anexo III com classificação aduaneira atual confirmada."
  },
  {
    "id": "FISCAL_OLD_IN_162_REVOKED",
    "title": "Não usar a IN SRF nº 162/1998 como norma vigente",
    "priority": 1000,
    "source_refs": [
      {
        "source_id": "IN_RFB_1700_2017",
        "reference": "Revogações"
      },
      {
        "source_id": "SC_COSIT_672_2017",
        "reference": "Sucessão pelo Anexo III"
      }
    ],
    "decision": "BLOCK_REVOKED_SOURCE",
    "summary": "Dados históricos podem ser preservados, mas devem apontar para a fonte vigente ou indicar expressamente o caráter revogado."
  }
] as const;
