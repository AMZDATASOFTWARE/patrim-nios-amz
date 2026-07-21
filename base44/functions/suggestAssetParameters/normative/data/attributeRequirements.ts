// Generated from docs/amz_base_normativa_v3_amostra_empresa/sample_company_inventory/attribute_requirements.json.
// Keep this file local to suggestAssetParameters so the Base44 function remains deployable.

export const ATTRIBUTE_REQUIREMENTS_DATA = {
  "version": "1.0",
  "last_verified_at": "2026-07-20",
  "families": {
    "MOBILIARIO": {
      "required": [
        "material",
        "intended_use",
        "fixed_or_mobile",
        "invoice_ncm"
      ],
      "optional": [
        "dimensions",
        "upholstered",
        "environment",
        "usage_intensity"
      ]
    },
    "REFRIGERACAO": {
      "required": [
        "brand",
        "model",
        "active_refrigeration",
        "invoice_ncm"
      ],
      "optional": [
        "temperature_range",
        "capacity_liters",
        "compressor_type",
        "daily_hours"
      ]
    },
    "CLIMATIZACAO": {
      "required": [
        "brand",
        "model",
        "capacity_btu",
        "invoice_ncm"
      ],
      "optional": [
        "split_or_window",
        "inverter",
        "daily_hours",
        "environment"
      ]
    },
    "AUTOMACAO_COMERCIAL": {
      "required": [
        "brand",
        "model",
        "device_function",
        "invoice_ncm"
      ],
      "optional": [
        "fiscal_printer",
        "cash_register",
        "calculation_unit",
        "money_counter"
      ]
    },
    "EQUIPAMENTO_DE_COZINHA": {
      "required": [
        "brand",
        "model",
        "energy_source",
        "commercial_or_industrial_design",
        "invoice_ncm"
      ],
      "optional": [
        "power_watts",
        "capacity",
        "operating_temperature",
        "daily_cycles"
      ]
    },
    "TECNOLOGIA_DA_INFORMACAO": {
      "required": [
        "brand",
        "model",
        "device_type",
        "invoice_ncm"
      ],
      "optional": [
        "processor",
        "screen_size",
        "contains_cpu",
        "technological_generation"
      ]
    },
    "EXPOSITOR_DE_ALIMENTOS": {
      "required": [
        "active_refrigeration",
        "active_heating",
        "passive_display_only",
        "invoice_ncm"
      ],
      "optional": [
        "temperature_range",
        "brand",
        "model",
        "power_watts"
      ]
    }
  }
} as const;
