// Local classification units for fiscal option refinement.
// These are not legal classifications by themselves; they describe when an option is specific enough to be confirmed.

export const CLASSIFICATION_UNITS_DATA = {
  version: 'CLASSIFICATION_UNITS_2026_07_20_V1',
  units: {
    REFRIGERATION_EQUIPMENT: {
      required_attributes: ['refrigeration_equipment_type'],
      question_id: 'refrigeration_equipment_type',
      refinements: {
        COMMERCIAL_FREEZER: {
          display_name: 'Freezer ou congelador comercial',
          plain_description: 'Equipamento comercial utilizado para congelamento ou conservacao em baixa temperatura.',
          ncm_code: '84185090',
          distinguishing_attributes: ['Freezer ou congelador comercial', 'Refrigeracao ativa confirmada'],
        },
      },
    },
    REFRIGERATION: {
      required_attributes: ['refrigeration_equipment_type'],
      question_id: 'refrigeration_equipment_type',
      refinements: {
        COMMERCIAL_FREEZER: {
          display_name: 'Freezer ou congelador comercial',
          plain_description: 'Equipamento comercial utilizado para congelamento ou conservacao em baixa temperatura.',
          ncm_code: '84185090',
          distinguishing_attributes: ['Freezer ou congelador comercial', 'Refrigeracao ativa confirmada'],
        },
      },
    },
    COMPUTER_MONITOR: {
      required_attributes: ['monitor_usage'],
      question_id: 'monitor_usage',
      refinements: {
        COMPUTER_MONITOR: {
          display_name: 'Monitor para uso com computador',
          plain_description: 'Tela destinada principalmente ao uso com computadores e equipamentos de processamento de dados.',
          ncm_code: '85285200',
          distinguishing_attributes: ['Uso principal com computador', 'Sem funcao principal de televisao'],
        },
      },
    },
    SEAT_OR_CHAIR: {
      required_attributes: ['chair_structure_material'],
      question_id: 'chair_structure_material',
      refinements: {
        METAL: {
          display_name: 'Cadeira giratoria de escritorio com estrutura metalica',
          plain_description: 'Assento de escritorio com estrutura metalica confirmada.',
          ncm_code: null,
          distinguishing_attributes: ['Estrutura metalica confirmada', 'Assento de escritorio'],
          requires_specialist_review: true,
        },
      },
    },
    AIR_CONDITIONING: {
      required_attributes: ['air_conditioning_type'],
      question_id: 'air_conditioning_type',
      refinements: {
        SPLIT: {
          display_name: 'Ar-condicionado do tipo split',
          plain_description: 'Equipamento de climatizacao do tipo split ou similar.',
          ncm_code: '84151011',
          distinguishing_attributes: ['Tipo split confirmado', 'Climatizacao de ambiente'],
        },
      },
    },
    INDUSTRIAL_LAUNDRY_EQUIPMENT: {
      required_attributes: ['laundry_machine_function'],
      question_id: 'laundry_machine_function',
      refinements: {
        WASHING: {
          display_name: 'Maquina industrial de lavar roupas',
          plain_description: 'Maquina industrial cuja funcao principal e lavar texteis.',
          ncm_code: '84519000',
          distinguishing_attributes: ['Uso industrial', 'Funcao principal de lavagem'],
        },
      },
    },
    PASSENGER_VEHICLE: {
      required_attributes: ['vehicle_primary_use'],
      question_id: 'vehicle_primary_use',
      refinements: {
        PASSENGER_TRANSPORT: {
          display_name: 'Automovel de passageiros',
          plain_description: 'Veiculo automovel destinado principalmente ao transporte de pessoas.',
          ncm_code: '87032310',
          distinguishing_attributes: ['Transporte de passageiros confirmado'],
        },
      },
    },
    CARGO_VEHICLE: {
      required_attributes: ['vehicle_primary_use'],
      question_id: 'vehicle_primary_use',
      refinements: {
        CARGO_TRANSPORT: {
          display_name: 'Veiculo para transporte de mercadorias',
          plain_description: 'Veiculo automovel destinado principalmente ao transporte de cargas.',
          ncm_code: '87042190',
          distinguishing_attributes: ['Transporte de mercadorias confirmado'],
        },
      },
    },
    OFFICE_FURNITURE: {
      required_attributes: ['furniture_kind'],
      question_id: 'furniture_kind',
      refinements: {
        OFFICE_DESK: {
          display_name: 'Mesa de escritorio',
          plain_description: 'Movel de escritorio que nao e assento.',
          ncm_code: '94033000',
          distinguishing_attributes: ['Mesa de escritorio confirmada', 'Nao e assento'],
        },
      },
    },
  },
} as const;
