// Generated from docs/amz_base_normativa_v3_amostra_empresa/classification/asset_aliases.json.
// Keep this file local to suggestAssetParameters so the Base44 function remains deployable.

export const ASSET_ALIASES_DATA = [
  {
    "asset_terms": [
      "notebook",
      "laptop",
      "desktop",
      "computador",
      "servidor",
      "workstation",
      "thin client"
    ],
    "candidate_ncm_codes": [
      "8471"
    ],
    "candidate_type": "COMPUTER_EQUIPMENT",
    "confidence": "MEDIUM",
    "requires_human_confirmation": true,
    "reason": "O termo comercial sugere equipamento de processamento de dados, mas configuração e NCM precisam ser confirmados."
  },
  {
    "asset_terms": [
      "impressora",
      "impressora laser",
      "impressora térmica",
      "plotter"
    ],
    "candidate_ncm_codes": [
      "8443"
    ],
    "candidate_type": "PRINTING_EQUIPMENT",
    "confidence": "MEDIUM",
    "requires_human_confirmation": true,
    "reason": "Multifuncionais e equipamentos específicos podem exigir detalhamento adicional."
  },
  {
    "asset_terms": [
      "copiadora",
      "fotocopiadora",
      "xerox"
    ],
    "candidate_ncm_codes": [
      "9009",
      "8443"
    ],
    "candidate_type": "COPYING_OR_PRINTING_EQUIPMENT",
    "confidence": "LOW",
    "requires_human_confirmation": true,
    "reason": "A classificação depende da tecnologia e da nomenclatura fiscal aplicável."
  },
  {
    "asset_terms": [
      "ar-condicionado",
      "split",
      "climatizador com refrigeração",
      "cassete",
      "chiller de ar"
    ],
    "candidate_ncm_codes": [
      "8415"
    ],
    "candidate_type": "AIR_CONDITIONING",
    "confidence": "MEDIUM",
    "requires_human_confirmation": true,
    "reason": "Capacidade e tipo do equipamento podem alterar a classificação detalhada."
  },
  {
    "asset_terms": [
      "geladeira",
      "refrigerador",
      "freezer",
      "câmara fria",
      "bebedouro refrigerado"
    ],
    "candidate_ncm_codes": [
      "8418"
    ],
    "candidate_type": "REFRIGERATION",
    "confidence": "MEDIUM",
    "requires_human_confirmation": true,
    "reason": "A posição geral pode exigir subposição específica."
  },
  {
    "asset_terms": [
      "caldeira",
      "gerador de vapor"
    ],
    "candidate_ncm_codes": [
      "8402",
      "8403"
    ],
    "candidate_type": "BOILER",
    "confidence": "LOW",
    "requires_human_confirmation": true,
    "reason": "Distinguir geração de vapor e aquecimento central."
  },
  {
    "asset_terms": [
      "bomba hidráulica",
      "bomba d'água",
      "bomba centrífuga",
      "bomba dosadora"
    ],
    "candidate_ncm_codes": [
      "8413"
    ],
    "candidate_type": "LIQUID_PUMP",
    "confidence": "MEDIUM",
    "requires_human_confirmation": true,
    "reason": "O modelo e a aplicação definem a subposição."
  },
  {
    "asset_terms": [
      "compressor",
      "compressor de ar",
      "ventilador industrial",
      "exaustor"
    ],
    "candidate_ncm_codes": [
      "8414"
    ],
    "candidate_type": "AIR_COMPRESSOR_OR_FAN",
    "confidence": "MEDIUM",
    "requires_human_confirmation": true,
    "reason": "Equipamentos combinados ou de climatização podem pertencer a outra posição."
  },
  {
    "asset_terms": [
      "autoclave",
      "esterilizador",
      "secador industrial",
      "túnel de secagem"
    ],
    "candidate_ncm_codes": [
      "8419"
    ],
    "candidate_type": "THERMAL_OR_STERILIZATION_EQUIPMENT",
    "confidence": "LOW",
    "requires_human_confirmation": true,
    "reason": "Equipamento médico específico pode exigir outra posição NCM."
  },
  {
    "asset_terms": [
      "balança",
      "balança industrial",
      "balança de plataforma"
    ],
    "candidate_ncm_codes": [
      "8423"
    ],
    "candidate_type": "WEIGHING_EQUIPMENT",
    "confidence": "MEDIUM",
    "requires_human_confirmation": true,
    "reason": "Capacidade, precisão e finalidade alteram a subposição."
  },
  {
    "asset_terms": [
      "empilhadeira"
    ],
    "candidate_ncm_codes": [
      "8427"
    ],
    "candidate_type": "FORKLIFT",
    "confidence": "HIGH",
    "requires_human_confirmation": true,
    "reason": "Ainda é necessário confirmar combustível, capacidade e subposição."
  },
  {
    "asset_terms": [
      "elevador",
      "transportador",
      "esteira transportadora",
      "correia transportadora"
    ],
    "candidate_ncm_codes": [
      "8428",
      "4010",
      "5910",
      "3926.90"
    ],
    "candidate_type": "MATERIAL_HANDLING",
    "confidence": "LOW",
    "requires_human_confirmation": true,
    "reason": "A máquina completa e a correia isolada possuem classificações distintas."
  },
  {
    "asset_terms": [
      "lavadora doméstica",
      "máquina de lavar roupa"
    ],
    "candidate_ncm_codes": [
      "8450"
    ],
    "candidate_type": "LAUNDRY_WASHER",
    "confidence": "MEDIUM",
    "requires_human_confirmation": true,
    "reason": "Equipamento industrial de lavanderia pode pertencer à posição 8451."
  },
  {
    "asset_terms": [
      "lavadora industrial",
      "secadora industrial",
      "calandra de lavanderia",
      "prensa de lavanderia",
      "dobradora de roupas",
      "centrífuga de lavanderia",
      "máquina de passar industrial"
    ],
    "candidate_ncm_codes": [
      "8451"
    ],
    "candidate_type": "INDUSTRIAL_LAUNDRY_EQUIPMENT",
    "confidence": "MEDIUM",
    "requires_human_confirmation": true,
    "reason": "A posição 8451 cobre diversas máquinas para tratamento de têxteis; confirmar função e subposição."
  },
  {
    "asset_terms": [
      "motor elétrico",
      "gerador elétrico"
    ],
    "candidate_ncm_codes": [
      "8501",
      "8502"
    ],
    "candidate_type": "ELECTRIC_MOTOR_OR_GENERATOR",
    "confidence": "LOW",
    "requires_human_confirmation": true,
    "reason": "Distinguir motor, gerador e grupo eletrogêneo."
  },
  {
    "asset_terms": [
      "transformador",
      "nobreak",
      "ups",
      "conversor elétrico",
      "fonte industrial"
    ],
    "candidate_ncm_codes": [
      "8504"
    ],
    "candidate_type": "ELECTRICAL_CONVERTER",
    "confidence": "MEDIUM",
    "requires_human_confirmation": true,
    "reason": "Nobreaks e fontes podem exigir subposições específicas."
  },
  {
    "asset_terms": [
      "telefone",
      "central telefônica",
      "roteador",
      "switch",
      "modem",
      "equipamento de rede"
    ],
    "candidate_ncm_codes": [
      "8517"
    ],
    "candidate_type": "TELECOMMUNICATION_EQUIPMENT",
    "confidence": "MEDIUM",
    "requires_human_confirmation": true,
    "reason": "A posição 8517 é ampla e exige classificação detalhada."
  },
  {
    "asset_terms": [
      "automóvel",
      "carro",
      "veículo de passeio"
    ],
    "candidate_ncm_codes": [
      "8703"
    ],
    "candidate_type": "PASSENGER_VEHICLE",
    "confidence": "MEDIUM",
    "requires_human_confirmation": true,
    "reason": "Confirmar uso, capacidade, motorização e classificação fiscal."
  },
  {
    "asset_terms": [
      "caminhão",
      "furgão de carga",
      "veículo de carga"
    ],
    "candidate_ncm_codes": [
      "8704"
    ],
    "candidate_type": "CARGO_VEHICLE",
    "confidence": "MEDIUM",
    "requires_human_confirmation": true,
    "reason": "Confirmar capacidade e configuração."
  },
  {
    "asset_terms": [
      "ambulância",
      "caminhão guindaste",
      "veículo especial"
    ],
    "candidate_ncm_codes": [
      "8705"
    ],
    "candidate_type": "SPECIAL_PURPOSE_VEHICLE",
    "confidence": "LOW",
    "requires_human_confirmation": true,
    "reason": "Nem todo veículo adaptado pertence automaticamente à posição de usos especiais."
  },
  {
    "asset_terms": [
      "ônibus",
      "micro-ônibus"
    ],
    "candidate_ncm_codes": [
      "8702"
    ],
    "candidate_type": "PASSENGER_TRANSPORT_VEHICLE",
    "confidence": "MEDIUM",
    "requires_human_confirmation": true,
    "reason": "Confirmar número de passageiros e configuração."
  },
  {
    "asset_terms": [
      "motocicleta",
      "moto"
    ],
    "candidate_ncm_codes": [
      "8711"
    ],
    "candidate_type": "MOTORCYCLE",
    "confidence": "HIGH",
    "requires_human_confirmation": true,
    "reason": "Confirmar cilindrada e subposição."
  },
  {
    "asset_terms": [
      "móvel de escritório",
      "mesa",
      "armário",
      "estante",
      "gaveteiro"
    ],
    "candidate_ncm_codes": [
      "9403"
    ],
    "candidate_type": "OFFICE_FURNITURE",
    "confidence": "LOW",
    "requires_human_confirmation": true,
    "reason": "Material, finalidade e tipo podem alterar a classificação."
  },
  {
    "asset_terms": [
      "cama hospitalar",
      "mesa cirúrgica",
      "cadeira odontológica",
      "mobiliário hospitalar"
    ],
    "candidate_ncm_codes": [
      "9402"
    ],
    "candidate_type": "MEDICAL_FURNITURE",
    "confidence": "MEDIUM",
    "requires_human_confirmation": true,
    "reason": "Equipamento médico eletromecânico pode não ser mero mobiliário."
  },
  {
    "asset_terms": [
      "termômetro",
      "pirômetro",
      "barômetro"
    ],
    "candidate_ncm_codes": [
      "9025"
    ],
    "candidate_type": "TEMPERATURE_OR_PRESSURE_INSTRUMENT",
    "confidence": "MEDIUM",
    "requires_human_confirmation": true,
    "reason": "Instrumentos incorporados a outro equipamento não devem ser classificados isoladamente."
  },
  {
    "asset_terms": [
      "medidor de vazão",
      "medidor de nível",
      "manômetro",
      "sensor de pressão"
    ],
    "candidate_ncm_codes": [
      "9026"
    ],
    "candidate_type": "FLOW_LEVEL_PRESSURE_INSTRUMENT",
    "confidence": "MEDIUM",
    "requires_human_confirmation": true,
    "reason": "Confirmar variável medida e função."
  },
  {
    "asset_terms": [
      "analisador químico",
      "espectrômetro",
      "fotômetro",
      "equipamento de laboratório de análise"
    ],
    "candidate_ncm_codes": [
      "9027"
    ],
    "candidate_type": "LAB_ANALYSIS_INSTRUMENT",
    "confidence": "MEDIUM",
    "requires_human_confirmation": true,
    "reason": "Equipamento médico diagnóstico pode pertencer a outra posição."
  },
  {
    "asset_terms": [
      "controlador automático",
      "controlador de temperatura",
      "controlador de processo"
    ],
    "candidate_ncm_codes": [
      "9032"
    ],
    "candidate_type": "AUTOMATIC_CONTROL_INSTRUMENT",
    "confidence": "MEDIUM",
    "requires_human_confirmation": true,
    "reason": "Pode ser componente integrado de máquina principal."
  },
  {
    "asset_terms": [
      "edificação",
      "prédio",
      "galpão"
    ],
    "candidate_internal_rules": [
      "GEN_BUILDINGS"
    ],
    "candidate_type": "BUILDING",
    "confidence": "MEDIUM",
    "requires_human_confirmation": true,
    "reason": "Separar terreno, estrutura, instalações e benfeitorias."
  },
  {
    "asset_terms": [
      "instalação elétrica",
      "instalação hidráulica",
      "instalação predial"
    ],
    "candidate_internal_rules": [
      "GEN_INSTALLATIONS"
    ],
    "candidate_type": "INSTALLATION",
    "confidence": "LOW",
    "requires_human_confirmation": true,
    "reason": "Instalações incorporadas a edificação ou equipamento podem exigir componentização."
  },
  {
    "asset_terms": [
      "cadeira branca",
      "cadeira executiva",
      "cadeira de escritório",
      "cadeira fixa",
      "cadeira fixa de escritório",
      "cadeira de balcão",
      "banqueta"
    ],
    "candidate_ncm_codes": [
      "9401"
    ],
    "candidate_type": "SEAT_OR_CHAIR",
    "confidence": "MEDIUM",
    "requires_human_confirmation": true,
    "reason": "Assentos devem ser separados de outros móveis; o Anexo III local não fornece taxa automática verificada para 9401."
  },
  {
    "asset_terms": [
      "mesa para 2 pessoas",
      "mesa para 4 pessoas",
      "mesa de refeitório",
      "mesa de cafeteria"
    ],
    "candidate_ncm_codes": [
      "9403"
    ],
    "candidate_type": "DINING_OR_CAFETERIA_TABLE",
    "confidence": "LOW",
    "requires_human_confirmation": true,
    "reason": "O uso em refeitório não confirma a regra de móveis de escritório."
  },
  {
    "asset_terms": [
      "armário de madeira",
      "armário 4 portas",
      "armário fixo",
      "roupeiro"
    ],
    "candidate_ncm_codes": [
      "9403"
    ],
    "candidate_internal_rules": [
      "GEN_INSTALLATIONS"
    ],
    "candidate_type": "CABINET_OR_FIXED_JOINERY",
    "confidence": "LOW",
    "requires_human_confirmation": true,
    "reason": "Pode ser móvel, marcenaria fixa, instalação ou benfeitoria."
  },
  {
    "asset_terms": [
      "freezer expositor",
      "freezer fricon",
      "freezer uma porta",
      "freezer duas portas",
      "expositor de frios"
    ],
    "candidate_ncm_codes": [
      "8418"
    ],
    "candidate_type": "REFRIGERATION_EQUIPMENT",
    "confidence": "HIGH",
    "requires_human_confirmation": true,
    "reason": "Confirmar refrigeração ativa e NCM documental."
  },
  {
    "asset_terms": [
      "emissor de cupom fiscal",
      "ecf bematech",
      "impressora fiscal"
    ],
    "candidate_ncm_codes": [
      "8443",
      "8470.50"
    ],
    "candidate_type": "FISCAL_PRINTER_OR_CASH_REGISTER",
    "confidence": "LOW",
    "requires_human_confirmation": true,
    "reason": "O modelo define se é impressora fiscal ou caixa registradora."
  },
  {
    "asset_terms": [
      "fogão industrial",
      "fogão 4 bocas",
      "metalmaq"
    ],
    "candidate_ncm_codes": [
      "7321",
      "8419"
    ],
    "candidate_type": "COMMERCIAL_OR_INDUSTRIAL_STOVE",
    "confidence": "LOW",
    "requires_human_confirmation": true,
    "reason": "Combustível, construção e finalidade determinam a classificação."
  },
  {
    "asset_terms": [
      "forno turbo elétrico",
      "forno progás",
      "forno elétrico comercial"
    ],
    "candidate_ncm_codes": [
      "8514",
      "8516",
      "8419"
    ],
    "candidate_type": "COMMERCIAL_ELECTRIC_OVEN",
    "confidence": "LOW",
    "requires_human_confirmation": true,
    "reason": "É necessário distinguir forno industrial, comercial e aparelho elétrico de cozinha."
  },
  {
    "asset_terms": [
      "gabinete de computador",
      "gabinete pc"
    ],
    "candidate_ncm_codes": [
      "8471"
    ],
    "candidate_type": "COMPUTER_CASE_OR_SYSTEM_UNIT",
    "confidence": "LOW",
    "requires_human_confirmation": true,
    "reason": "Gabinete vazio não é equivalente a unidade completa de processamento de dados."
  },
  {
    "asset_terms": [
      "liquidificador alta potência",
      "liquidificador industrial",
      "marcpro"
    ],
    "candidate_ncm_codes": [
      "8509",
      "8438"
    ],
    "candidate_type": "HIGH_POWER_BLENDER",
    "confidence": "LOW",
    "requires_human_confirmation": true,
    "reason": "Distinguir aparelho eletromecânico de uso doméstico/comercial de máquina industrial para preparação de alimentos."
  },
  {
    "asset_terms": [
      "monitor aoc",
      "monitor de tela",
      "monitor de computador"
    ],
    "candidate_ncm_codes": [
      "8528"
    ],
    "candidate_type": "COMPUTER_MONITOR",
    "confidence": "MEDIUM",
    "requires_human_confirmation": true,
    "reason": "Não herdar automaticamente a taxa de computador 8471."
  },
  {
    "asset_terms": [
      "bancada metálica de trabalho",
      "bancada industrial"
    ],
    "candidate_ncm_codes": [
      "9403"
    ],
    "candidate_type": "METAL_WORKBENCH",
    "confidence": "LOW",
    "requires_human_confirmation": true,
    "reason": "Mobiliário industrial não é automaticamente móvel de escritório."
  },
  {
    "asset_terms": [
      "máquina de caixa menno",
      "máquina de caixa"
    ],
    "candidate_ncm_codes": [
      "8470.50",
      "8472"
    ],
    "candidate_type": "CASH_REGISTER_OR_CASH_HANDLING_MACHINE",
    "confidence": "LOW",
    "requires_human_confirmation": true,
    "reason": "Confirmar se é registradora, contadora, autenticadora ou apenas gaveta."
  },
  {
    "asset_terms": [
      "expositora de salgados",
      "vitrine de salgados",
      "estufa de salgados"
    ],
    "candidate_ncm_codes": [
      "8418",
      "8419",
      "8516",
      "9403"
    ],
    "candidate_type": "FOOD_DISPLAY_CASE",
    "confidence": "LOW",
    "requires_human_confirmation": true,
    "reason": "Identificar se refrigera, aquece ou apenas expõe."
  }
] as const;
