// Generated from docs/amz_base_normativa_v3_amostra_empresa/normative/corporate_rules.json.
// Keep this file local to suggestAssetParameters so the Base44 function remains deployable.

export const CORPORATE_RULES_DATA = [
  {
    "id": "CORP_CLASSIFY_ASSET_BEFORE_DEPRECIATING",
    "title": "Classificar a natureza do ativo antes de calcular depreciação ou amortização",
    "scope": [
      "PPE",
      "INTANGIBLE",
      "INVESTMENT_PROPERTY",
      "RIGHT_OF_USE"
    ],
    "decision": "REQUIRE_CLASSIFICATION",
    "priority": 1000,
    "source_refs": [
      {
        "source_id": "CPC_27_REV_22",
        "reference": "Escopo e definições"
      },
      {
        "source_id": "CPC_04_R1_REV_21",
        "reference": "Escopo e definições"
      }
    ],
    "implementation": {
      "required_fields": [
        "asset_nature"
      ],
      "allowed_values": [
        "PPE",
        "INTANGIBLE",
        "LAND",
        "INVENTORY",
        "INVESTMENT_PROPERTY",
        "RIGHT_OF_USE",
        "OTHER"
      ],
      "block_when_unknown": true
    },
    "summary": "Evita aplicar a mesma lógica a imobilizado, intangível, terreno, estoque ou direito de uso."
  },
  {
    "id": "CORP_DEPRECIABLE_AMOUNT",
    "title": "Calcular o valor depreciável após deduzir o valor residual",
    "scope": [
      "PPE"
    ],
    "decision": "CALCULATE",
    "priority": 900,
    "source_refs": [
      {
        "source_id": "CPC_27_REV_22",
        "reference": "Definições e itens 50 a 53"
      }
    ],
    "formula": "depreciable_amount = recognized_cost - residual_value",
    "validation": [
      "recognized_cost >= 0",
      "residual_value >= 0",
      "residual_value <= recognized_cost"
    ],
    "summary": "A despesa de depreciação deve ser calculada sobre a base depreciável, e não automaticamente sobre o custo bruto."
  },
  {
    "id": "CORP_START_WHEN_AVAILABLE_FOR_USE",
    "title": "Iniciar quando o ativo estiver disponível para uso",
    "scope": [
      "PPE",
      "FINITE_INTANGIBLE"
    ],
    "decision": "START",
    "priority": 900,
    "source_refs": [
      {
        "source_id": "CPC_27_REV_22",
        "reference": "Item 55"
      },
      {
        "source_id": "CPC_04_R1_REV_21",
        "reference": "Amortização de vida útil definida"
      }
    ],
    "implementation": {
      "preferred_date_field": "available_for_use_date",
      "do_not_assume_equal_to": [
        "purchase_date",
        "invoice_date",
        "payment_date"
      ]
    },
    "summary": "A data de aquisição não substitui automaticamente a data em que o ativo está instalado e apto a operar."
  },
  {
    "id": "CORP_STOP_AT_DERECOGNITION_OR_HELD_FOR_SALE",
    "title": "Cessar na baixa ou na classificação como mantido para venda",
    "scope": [
      "PPE",
      "FINITE_INTANGIBLE"
    ],
    "decision": "STOP",
    "priority": 950,
    "source_refs": [
      {
        "source_id": "CPC_27_REV_22",
        "reference": "Item 55"
      },
      {
        "source_id": "CPC_31",
        "reference": "Suspensão de depreciação/amortização"
      }
    ],
    "summary": "A mera ociosidade não equivale à baixa ou à classificação formal como mantido para venda."
  },
  {
    "id": "CORP_IDLE_ASSET_CONTINUES",
    "title": "Ociosidade não encerra automaticamente a depreciação",
    "scope": [
      "PPE"
    ],
    "decision": "CONTINUE",
    "priority": 800,
    "source_refs": [
      {
        "source_id": "CPC_27_REV_22",
        "reference": "Item 55"
      }
    ],
    "conditions": {
      "is_idle": true,
      "held_for_sale": false,
      "disposed": false
    },
    "warning": "No método por unidades produzidas, a despesa pode ser zero enquanto não houver produção.",
    "summary": "Não interromper o cronograma apenas porque o ativo ficou temporariamente fora de uso."
  },
  {
    "id": "CORP_LAND_SEPARATE_FROM_BUILDING",
    "title": "Separar terreno e edificação",
    "scope": [
      "PPE"
    ],
    "decision": "SPLIT_ASSET",
    "priority": 1000,
    "source_refs": [
      {
        "source_id": "CPC_27_REV_22",
        "reference": "Itens 58 e 59"
      }
    ],
    "implementation": {
      "land_default_depreciable": false,
      "building_default_depreciable": true
    },
    "summary": "Terreno normalmente não é depreciável; edificação e melhoramentos precisam de registros próprios."
  },
  {
    "id": "CORP_COMPONENTIZATION",
    "title": "Depreciar separadamente componentes significativos",
    "scope": [
      "PPE"
    ],
    "decision": "REQUIRE_REVIEW",
    "priority": 850,
    "source_refs": [
      {
        "source_id": "CPC_27_REV_22",
        "reference": "Itens 43 a 47"
      }
    ],
    "triggers": [
      "significant_component_cost",
      "different_useful_life",
      "different_consumption_pattern",
      "major_inspection_component"
    ],
    "summary": "Exemplo: estrutura, motor, painel e grande inspeção podem ter vidas ou padrões de consumo diferentes."
  },
  {
    "id": "CORP_DAILY_MAINTENANCE_EXPENSE",
    "title": "Reconhecer manutenção cotidiana como despesa",
    "scope": [
      "PPE"
    ],
    "decision": "EXPENSE",
    "priority": 800,
    "source_refs": [
      {
        "source_id": "CPC_27_REV_22",
        "reference": "Itens 12 a 14"
      }
    ],
    "conditions": {
      "maintenance_type": "DAY_TO_DAY"
    },
    "summary": "Peças pequenas, mão de obra e consumíveis de reparos cotidianos não aumentam automaticamente o custo do ativo."
  },
  {
    "id": "CORP_REPLACEMENT_COMPONENT",
    "title": "Capitalizar substituição que atenda aos critérios e baixar a parcela substituída",
    "scope": [
      "PPE"
    ],
    "decision": "CAPITALIZE_AND_DERECOGNIZE_REPLACED_PART",
    "priority": 820,
    "source_refs": [
      {
        "source_id": "CPC_27_REV_22",
        "reference": "Itens 13 e 14"
      }
    ],
    "summary": "Evita manter simultaneamente no valor contábil o componente antigo e o novo."
  },
  {
    "id": "CORP_MAJOR_INSPECTION",
    "title": "Tratar inspeção relevante como componente quando aplicável",
    "scope": [
      "PPE"
    ],
    "decision": "CAPITALIZE_COMPONENT",
    "priority": 820,
    "source_refs": [
      {
        "source_id": "CPC_27_REV_22",
        "reference": "Item 14"
      }
    ],
    "summary": "O valor remanescente da inspeção anterior deve ser baixado quando a nova inspeção é reconhecida."
  },
  {
    "id": "CORP_USEFUL_LIFE_FACTORS",
    "title": "Estimar vida útil com base no uso econômico esperado",
    "scope": [
      "PPE"
    ],
    "decision": "ESTIMATE",
    "priority": 700,
    "source_refs": [
      {
        "source_id": "CPC_27_REV_22",
        "reference": "Itens 56 e 57"
      }
    ],
    "input_factors": [
      "expected_usage",
      "capacity_or_output",
      "daily_shifts",
      "physical_wear",
      "maintenance_program",
      "care_while_idle",
      "technical_obsolescence",
      "commercial_obsolescence",
      "market_demand_changes",
      "legal_limits",
      "contractual_limits",
      "company_experience_with_similar_assets"
    ],
    "summary": "A vida útil societária é uma estimativa da entidade e não deve ser copiada automaticamente da taxa fiscal."
  },
  {
    "id": "CORP_RESIDUAL_VALUE_ESTIMATE",
    "title": "Estimar valor residual separadamente",
    "scope": [
      "PPE"
    ],
    "decision": "ESTIMATE",
    "priority": 700,
    "source_refs": [
      {
        "source_id": "CPC_27_REV_22",
        "reference": "Definições e itens 50 a 54"
      }
    ],
    "input_factors": [
      "expected_disposal_value",
      "expected_condition_at_end_of_life",
      "disposal_costs",
      "market_reference",
      "company_disposal_history"
    ],
    "summary": "Valor residual não deve ser um percentual arbitrário fixo para todas as categorias."
  },
  {
    "id": "CORP_ANNUAL_REVIEW",
    "title": "Revisar vida útil, residual e método pelo menos ao final de cada exercício",
    "scope": [
      "PPE",
      "FINITE_INTANGIBLE"
    ],
    "decision": "SCHEDULE_REVIEW",
    "priority": 900,
    "source_refs": [
      {
        "source_id": "CPC_27_REV_22",
        "reference": "Itens 51 e 61"
      },
      {
        "source_id": "CPC_04_R1_REV_21",
        "reference": "Revisão do período e método de amortização"
      }
    ],
    "implementation": {
      "minimum_frequency": "ANNUAL",
      "effect": "PROSPECTIVE"
    },
    "summary": "Mudanças não reescrevem silenciosamente o histórico anterior; alteram os períodos atual e futuros."
  },
  {
    "id": "CORP_CHANGE_OF_ESTIMATE_PROSPECTIVE",
    "title": "Aplicar mudança de estimativa prospectivamente",
    "scope": [
      "PPE",
      "FINITE_INTANGIBLE"
    ],
    "decision": "PROSPECTIVE_CHANGE",
    "priority": 900,
    "source_refs": [
      {
        "source_id": "CPC_23",
        "reference": "Mudança de estimativa contábil"
      }
    ],
    "summary": "Registrar motivo, aprovador, data, valores antigos e novos, sem apagar o histórico."
  },
  {
    "id": "CORP_METHOD_REFLECTS_CONSUMPTION",
    "title": "Selecionar método que reflita o padrão de consumo",
    "scope": [
      "PPE",
      "FINITE_INTANGIBLE"
    ],
    "decision": "SELECT_METHOD",
    "priority": 700,
    "source_refs": [
      {
        "source_id": "CPC_27_REV_22",
        "reference": "Itens 60 a 62"
      },
      {
        "source_id": "CPC_04_R1_REV_21",
        "reference": "Método de amortização"
      }
    ],
    "allowed_methods": [
      "STRAIGHT_LINE",
      "DECLINING_BALANCE",
      "UNITS_OF_PRODUCTION"
    ],
    "fallback": "STRAIGHT_LINE_WHEN_PATTERN_CANNOT_BE_DETERMINED_RELIABLY",
    "summary": "O método linear pode ser padrão operacional, mas não deve ser descrito como obrigatório em todos os casos."
  },
  {
    "id": "CORP_IMPAIRMENT_INDICATORS",
    "title": "Encaminhar para avaliação de recuperabilidade quando houver indícios",
    "scope": [
      "PPE",
      "INTANGIBLE"
    ],
    "decision": "REQUIRE_IMPAIRMENT_REVIEW",
    "priority": 980,
    "source_refs": [
      {
        "source_id": "CPC_01_R1",
        "reference": "Identificação de ativo possivelmente desvalorizado"
      },
      {
        "source_id": "LEI_6404_ART_183",
        "reference": "Art. 183, §3º"
      }
    ],
    "possible_triggers": [
      "significant_damage",
      "technological_obsolescence",
      "market_value_drop",
      "adverse_legal_change",
      "adverse_operational_change",
      "performance_below_expectation",
      "planned_discontinuation"
    ],
    "summary": "O motor deve gerar alerta, não calcular automaticamente uma perda por impairment sem dados suficientes."
  },
  {
    "id": "CORP_INTANGIBLE_FINITE_LIFE",
    "title": "Amortizar intangível de vida útil definida",
    "scope": [
      "FINITE_INTANGIBLE"
    ],
    "decision": "AMORTIZE",
    "priority": 900,
    "source_refs": [
      {
        "source_id": "CPC_04_R1_REV_21",
        "reference": "Itens sobre vida útil definida"
      }
    ],
    "summary": "A amortização começa quando o ativo está disponível para uso."
  },
  {
    "id": "CORP_INTANGIBLE_INDEFINITE_LIFE",
    "title": "Não amortizar intangível de vida útil indefinida",
    "scope": [
      "INDEFINITE_INTANGIBLE"
    ],
    "decision": "DO_NOT_AMORTIZE",
    "priority": 1000,
    "source_refs": [
      {
        "source_id": "CPC_04_R1_REV_21",
        "reference": "Itens 107 a 110"
      }
    ],
    "implementation": {
      "annual_impairment_test": true,
      "review_indefinite_classification": true
    },
    "summary": "Vida indefinida não significa vida infinita; exige revisão e teste de recuperabilidade."
  },
  {
    "id": "CORP_INTANGIBLE_RESIDUAL_ZERO_DEFAULT",
    "title": "Presumir residual zero para intangível de vida definida, salvo exceções",
    "scope": [
      "FINITE_INTANGIBLE"
    ],
    "decision": "DEFAULT_ZERO_WITH_EXCEPTIONS",
    "priority": 850,
    "source_refs": [
      {
        "source_id": "CPC_04_R1_REV_21",
        "reference": "Itens 100 a 103"
      }
    ],
    "exceptions": [
      "third_party_purchase_commitment",
      "active_market_expected_at_end_of_life"
    ],
    "summary": "Uma exceção precisa ser documentada; não sugerir residual positivo livremente."
  },
  {
    "id": "CORP_INTANGIBLE_USEFUL_LIFE_FACTORS",
    "title": "Considerar limites técnicos, econômicos, legais e contratuais do intangível",
    "scope": [
      "INTANGIBLE"
    ],
    "decision": "ESTIMATE",
    "priority": 700,
    "source_refs": [
      {
        "source_id": "CPC_04_R1_REV_21",
        "reference": "Itens sobre determinação da vida útil"
      }
    ],
    "input_factors": [
      "expected_use",
      "product_life_cycles",
      "technical_obsolescence",
      "technological_obsolescence",
      "commercial_obsolescence",
      "industry_stability",
      "competitor_actions",
      "maintenance_expenditure",
      "legal_right_period",
      "renewal_evidence",
      "dependency_on_other_assets"
    ],
    "summary": "Software e tecnologia frequentemente exigem atenção reforçada à obsolescência."
  },
  {
    "id": "CORP_RIGHT_OF_USE_SEPARATE_POLICY",
    "title": "Encaminhar ativo de direito de uso para política de arrendamentos",
    "scope": [
      "RIGHT_OF_USE"
    ],
    "decision": "ROUTE_TO_LEASE_POLICY",
    "priority": 1000,
    "source_refs": [
      {
        "source_id": "CPC_06_R2",
        "reference": "Ativo de direito de uso"
      }
    ],
    "summary": "Não tratar automaticamente como um imobilizado próprio comum."
  },
  {
    "id": "CORP_INVESTMENT_PROPERTY_SEPARATE_POLICY",
    "title": "Encaminhar propriedade para investimento para política específica",
    "scope": [
      "INVESTMENT_PROPERTY"
    ],
    "decision": "ROUTE_TO_INVESTMENT_PROPERTY_POLICY",
    "priority": 1000,
    "source_refs": [
      {
        "source_id": "CPC_28",
        "reference": "Classificação e mensuração"
      }
    ],
    "summary": "A classificação depende do uso do imóvel e da política de mensuração aplicável."
  }
] as const;
