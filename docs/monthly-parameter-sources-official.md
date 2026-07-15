# Fontes oficiais controladas para parametros mensais

Atualizacao official_page: esta fase tambem suporta `official_page` com IA restrita a URL oficial cadastrada. Nao ha busca aberta, nao ha scraping livre e todo snapshot gerado por pagina oficial deve ficar `pending_review` ate aprovacao humana.

Este guia prepara modelos de `MonthlyParameterSource` para depreciação contabil e fiscal usando apenas fontes controladas suportadas nesta fase: `manual_table` e `internal_rule`.

Nao faz parte desta fase:
- scraping livre de `official_page` fora da URL cadastrada;
- `ai_research`;
- chamada a APIs externas;
- cadastro no banco remoto;
- tabela fiscal completa inventada;
- fonte FIPE, tributaria ou normativa sem validacao do responsavel.

## Fontes priorizadas

1. CPC 27 - Ativo Imobilizado  
   Uso: base normativa contabil para reconhecimento, mensuracao, depreciacao, valor residual e vida util do ativo imobilizado. Nao e tabela universal de taxas.

2. CPC 23 - Politicas Contabeis, Mudanca de Estimativa e Retificacao de Erro  
   Uso: base normativa para tratar mudanca de vida util, valor residual e metodo de depreciacao como estimativa contabil, quando aplicavel. Nao fornece taxa automatica.

3. Receita Federal / IN RFB 1.700/2017 / Anexo III  
   Uso: base fiscal para taxas anuais de depreciacao por referencia fiscal/NCM quando a tabela real for importada e validada. Nao preencher por categoria generica sem revisao fiscal.

4. RIR/2018 - Decreto 9.580/2018  
   Uso: base legal complementar do imposto sobre a renda. Deve apoiar a interpretacao fiscal, nao substituir a tabela validada da IN/anexos aplicaveis.

## Regras de uso

- Separe sempre parametros contabeis e fiscais.
- CPC 27 e CPC 23 podem justificar `internal_rule` aprovada internamente, mas nao devem ser tratados como tabela automatica universal.
- Fonte contabil aprovada internamente pode ficar `active`.
- Fonte normativa ainda nao conferida por contador deve ficar `pending_review`.
- Fonte fiscal baseada na IN RFB 1.700/2017 deve ser cadastrada por NCM, referencia fiscal ou categoria validada pelo responsavel fiscal.
- Todo `value` deve ser bruto: `10`, nao `"10%"`; `5`, nao `"5 anos"`; `1000.5`, nao `"R$ 1.000,50"`.
- Todo exemplo abaixo e amostra estrutural. Substitua `category`, `scope_key`, `value`, `source_date` e `notes` pela decisao aprovada.

## Modelo official_page com IA restrita

Uso correto:
- consultar somente a URL oficial cadastrada pelo admin;
- resumir referencia normativa ou extrair valor bruto quando o texto oficial trouxer o valor de forma clara;
- enviar todo resultado para `pending_review`.

Limitacao:
- nao pesquisa em Google/Bing;
- nao segue links fora do `allowed_domain`;
- nao transforma CPC 27/CPC 23 em taxa numerica automatica;
- PDF ainda deve ser tratado como pendencia de homologacao especifica.

Dominios oficiais aceitos inicialmente:
- `cpc.org.br`;
- `gov.br`;
- `receita.fazenda.gov.br`;
- `normas.receita.fazenda.gov.br`;
- `planalto.gov.br`;
- `confaz.fazenda.gov.br`;
- `sped.rfb.gov.br`;
- `veiculos.fipe.org.br`;
- `fipe.org.br`;
- SEFAZ/Detran somente quando o dominio oficial for cadastrado manualmente.

Exemplo de `MonthlyParameterSource` para referencia normativa textual:

```json
{
  "parameter_key": "depreciation.cpc27.policy_reference",
  "domain": "depreciation",
  "source_type": "official_page",
  "source_name": "CPC 27 - referencia normativa de depreciacao",
  "source_url": "https://www.cpc.org.br/CPC/Documentos-Emitidos/Pronunciamentos/Pronunciamento?Id=58",
  "priority": 80,
  "is_active": true,
  "parser_config_json": {
    "url": "https://www.cpc.org.br/CPC/Documentos-Emitidos/Pronunciamentos/Pronunciamento?Id=58",
    "allowed_domain": "cpc.org.br",
    "parameter_key": "depreciation.cpc27.policy_reference",
    "domain": "depreciation",
    "entity_type": "DepreciationConfig",
    "field_name": "depreciation_policy_reference",
    "scope_key": "policy:cpc27",
    "extraction_mode": "summary",
    "expected_value_type": "text",
    "unit": "",
    "confidence_level": "medium",
    "requires_manual_review": true,
    "prompt": "Resuma apenas pontos aplicaveis a vida util, valor residual e depreciacao. Nao transforme norma textual em taxa numerica."
  },
  "notes": "Snapshot deve ser revisado por responsavel contabil antes de aprovacao."
}
```

## Modelo 1: depreciation_rate contabil por categoria

Uso correto:
- para taxa contabil definida por politica interna, laudo tecnico ou estimativa aprovada;
- usar CPC 27 como base normativa, nao como fonte de taxa pronta.

Limitacao:
- nao aplicar universalmente a todas as empresas;
- revisar se houver componente relevante, uso especifico, obsolescencia, manutencao ou mudanca de estimativa.

Status recomendado:
- `pending_review` quando a politica ainda nao foi conferida pelo contador;
- `active` somente apos aprovacao interna documentada.

Exemplo de `MonthlyParameterSource`:

```json
{
  "parameter_key": "depreciation.accounting.vehicles.rate",
  "domain": "depreciation",
  "source_type": "manual_table",
  "source_name": "CPC 27 + politica contabil interna - taxa contabil por categoria",
  "source_url": "https://www.cpc.org.br/CPC/Documentos-Emitidos/Pronunciamentos/Pronunciamento?Id=58",
  "priority": 100,
  "is_active": true,
  "parser_config_json": {
    "items": [
      {
        "parameter_key": "depreciation.accounting.vehicles.rate",
        "domain": "depreciation",
        "entity_type": "Asset",
        "field_name": "depreciation_rate",
        "scope_key": "category:veiculos",
        "category": "veiculos",
        "value": 20,
        "value_type": "percent",
        "unit": "%",
        "source_name": "CPC 27 + politica contabil interna aprovada",
        "source_url": "https://www.cpc.org.br/CPC/Documentos-Emitidos/Pronunciamentos/Pronunciamento?Id=58",
        "source_date": "2009-07-31",
        "effective_start_date": "2026-01-01",
        "confidence_level": "high",
        "status": "pending_review",
        "notes": "AMOSTRA ESTRUTURAL: substituir por taxa contabil aprovada pelo responsavel contabil. CPC 27 nao fornece taxa universal."
      }
    ]
  },
  "notes": "Usar somente apos aprovacao contabil da politica de vida util/depreciacao."
}
```

## Modelo 2: useful_life_years contabil por categoria

Uso correto:
- para vida util contabil estimada por politica interna, laudo ou experiencia operacional aprovada;
- usar CPC 27 para fundamentar vida util como estimativa baseada no padrao de consumo dos beneficios economicos.

Limitacao:
- vida util contabil depende de uso esperado, manutencao, obsolescencia e politica da entidade;
- CPC 23 deve ser considerado quando houver mudanca de estimativa.

Status recomendado:
- `pending_review` antes da validacao contabil;
- `active` apos aprovacao interna.

Exemplo de `MonthlyParameterSource`:

```json
{
  "parameter_key": "depreciation.accounting.vehicles.useful_life",
  "domain": "depreciation",
  "source_type": "internal_rule",
  "source_name": "CPC 27/CPC 23 + politica contabil interna - vida util",
  "source_url": "https://www.cpc.org.br/CPC/Documentos-Emitidos/Pronunciamentos/Pronunciamento?Id=58",
  "priority": 100,
  "is_active": true,
  "parser_config_json": {
    "rules": [
      {
        "parameter_key": "depreciation.accounting.vehicles.useful_life",
        "domain": "depreciation",
        "entity_type": "Asset",
        "field_name": "useful_life_years",
        "scope_key": "category:veiculos",
        "category": "veiculos",
        "value": 5,
        "value_type": "decimal",
        "unit": "anos",
        "source_name": "CPC 27/CPC 23 + politica contabil interna aprovada",
        "source_url": "https://www.cpc.org.br/CPC/Documentos-Emitidos/Pronunciamentos/Pronunciamento?Id=58",
        "source_date": "2009-07-31",
        "effective_start_date": "2026-01-01",
        "confidence_level": "high",
        "status": "pending_review",
        "notes": "AMOSTRA ESTRUTURAL: substituir pela vida util aprovada. CPC 23 deve ser avaliado quando houver mudanca de estimativa."
      }
    ]
  },
  "notes": "Usar CPC 23 como referencia complementar para revisao de estimativas."
}
```

## Modelo 3: residual_value contabil por categoria

Uso correto:
- para valor residual contabil estimado e aprovado por politica interna;
- aplicar quando a empresa possui criterio formal para valor residual por categoria, perfil de uso ou laudo.

Limitacao:
- CPC 27 exige revisao de valor residual quando aplicavel, mas nao define valor padrao;
- nao usar FIPE como valor contabil automatico.

Status recomendado:
- `pending_review` antes de aprovacao contabil;
- `active` somente se a politica interna estiver formalmente aprovada.

Exemplo de `MonthlyParameterSource`:

```json
{
  "parameter_key": "depreciation.accounting.vehicles.residual_value",
  "domain": "depreciation",
  "source_type": "manual_table",
  "source_name": "CPC 27 + politica contabil interna - valor residual",
  "source_url": "https://www.cpc.org.br/CPC/Documentos-Emitidos/Pronunciamentos/Pronunciamento?Id=58",
  "priority": 120,
  "is_active": true,
  "parser_config_json": {
    "items": [
      {
        "parameter_key": "depreciation.accounting.vehicles.residual_value",
        "domain": "depreciation",
        "entity_type": "Asset",
        "field_name": "residual_value",
        "scope_key": "category:veiculos",
        "category": "veiculos",
        "value": 0,
        "value_type": "currency",
        "unit": "R$",
        "source_name": "CPC 27 + politica contabil interna aprovada",
        "source_url": "https://www.cpc.org.br/CPC/Documentos-Emitidos/Pronunciamentos/Pronunciamento?Id=58",
        "source_date": "2009-07-31",
        "effective_start_date": "2026-01-01",
        "confidence_level": "medium",
        "status": "pending_review",
        "notes": "AMOSTRA ESTRUTURAL: valor zero nao e recomendacao universal. Substituir pela politica de valor residual aprovada."
      }
    ]
  },
  "notes": "Nao usar cotacao FIPE ou valor de mercado como valor contabil automatico."
}
```

## Modelo 4: fiscal_depreciation_rate

Uso correto:
- para taxa fiscal validada contra IN RFB 1.700/2017, Anexo III, por NCM/referencia fiscal;
- usar RIR/2018 como base legal complementar.

Limitacao:
- nao cadastrar por categoria generica sem mapeamento fiscal;
- nao inventar tabela fiscal completa;
- exige validacao do responsavel fiscal/contador.

Status recomendado:
- `pending_review` ate validacao fiscal completa;
- `active` somente depois de confirmar NCM/referencia, vigencia e base legal.

Exemplo de `MonthlyParameterSource`:

```json
{
  "parameter_key": "fiscal.depreciation.example.rate",
  "domain": "fiscal",
  "source_type": "manual_table",
  "source_name": "IN RFB 1.700/2017 Anexo III - taxa fiscal validada",
  "source_url": "https://www.in.gov.br/web/dou/-/instrucao-normativa-n-1-700-de-14-de-marco-de-2017-20479996",
  "priority": 80,
  "is_active": true,
  "parser_config_json": {
    "items": [
      {
        "parameter_key": "fiscal.depreciation.example.rate",
        "domain": "fiscal",
        "entity_type": "Asset",
        "field_name": "fiscal_depreciation_rate",
        "scope_key": "ncm:EXEMPLO_VALIDAR",
        "category": "categoria_exemplo",
        "value": 10,
        "value_type": "percent",
        "unit": "%",
        "source_name": "IN RFB 1.700/2017 Anexo III validado pelo fiscal",
        "source_url": "https://www.in.gov.br/web/dou/-/instrucao-normativa-n-1-700-de-14-de-marco-de-2017-20479996",
        "source_date": "2017-03-14",
        "effective_start_date": "2026-01-01",
        "confidence_level": "high",
        "status": "pending_review",
        "notes": "AMOSTRA ESTRUTURAL: substituir por NCM/referencia e taxa fiscal conferida no Anexo III. Nao usar sem validacao fiscal."
      }
    ]
  },
  "notes": "Cadastrar somente linhas fiscais conferidas contra a tabela real aplicavel."
}
```

## Modelo 5: fiscal_useful_life_years

Uso correto:
- para vida util fiscal derivada da taxa fiscal validada, quando a empresa decidir expor tambem o prazo em anos;
- manter consistencia com `fiscal_depreciation_rate`.

Limitacao:
- nao deve divergir da fonte fiscal/taxa validada;
- se houver regra especifica por NCM, o mesmo `scope_key` deve ser usado.

Status recomendado:
- `pending_review` ate validacao fiscal;
- `active` somente apos revisao do responsavel fiscal.

Exemplo de `MonthlyParameterSource`:

```json
{
  "parameter_key": "fiscal.depreciation.example.useful_life",
  "domain": "fiscal",
  "source_type": "internal_rule",
  "source_name": "IN RFB 1.700/2017 Anexo III - vida util fiscal derivada",
  "source_url": "https://www.in.gov.br/web/dou/-/instrucao-normativa-n-1-700-de-14-de-marco-de-2017-20479996",
  "priority": 85,
  "is_active": true,
  "parser_config_json": {
    "rules": [
      {
        "parameter_key": "fiscal.depreciation.example.useful_life",
        "domain": "fiscal",
        "entity_type": "Asset",
        "field_name": "fiscal_useful_life_years",
        "scope_key": "ncm:EXEMPLO_VALIDAR",
        "category": "categoria_exemplo",
        "value": 10,
        "value_type": "decimal",
        "unit": "anos",
        "source_name": "IN RFB 1.700/2017 Anexo III validado pelo fiscal",
        "source_url": "https://www.in.gov.br/web/dou/-/instrucao-normativa-n-1-700-de-14-de-marco-de-2017-20479996",
        "source_date": "2017-03-14",
        "effective_start_date": "2026-01-01",
        "confidence_level": "high",
        "status": "pending_review",
        "notes": "AMOSTRA ESTRUTURAL: prazo deve ser derivado/validado a partir da taxa fiscal aplicavel. Nao usar sem NCM/referencia conferida."
      }
    ]
  },
  "notes": "Manter alinhado com a taxa fiscal validada para o mesmo escopo."
}
```

## Modelo 6: FIPE como referencia de mercado para veiculos

Uso correto:
- exibir referencia de mercado para ativos da categoria veiculos;
- apoiar analise operacional, seguro, venda ou avaliacao, sem alterar custo historico;
- usar somente como `domain: "fipe"` e `field_name: "market_reference_value"`.

Limitacoes:
- FIPE nao e valor contabil automatico;
- nao deve preencher `acquisition_value`;
- nao deve atualizar `residual_value`;
- nao deve criar reavaliacao automaticamente;
- a consulta publica oficial da FIPE e modelo a modelo e nao representa API publica completa para base integral;
- provider externo/API contratado deve ser homologado antes de virar fonte `active`.

Status recomendado:
- `pending_review` para dados vindos de provider externo ainda nao homologado;
- `active` somente depois de aprovacao interna e conferencia do mes de referencia, codigo FIPE/modelo, ano modelo e combustivel.

Snapshot esperado:
- `domain`: `fipe`;
- `value_type`: `currency`;
- `unit`: `R$`;
- `entity_type`: `Asset`;
- `field_name`: `market_reference_value`;
- `scope_key`: preferencialmente `fipe_code:<codigo>:year:<ano>`; alternativamente um escopo controlado como `vehicle:<marca>:<modelo>:<ano>:<combustivel>`;
- `status`: `pending_review` ou `active`, conforme aprovacao.

Regra de matching:
- FIPE nunca deve consultar apenas `category: "veiculos"`;
- a indicacao exige `scope_key` especifico;
- sem codigo FIPE/ano ou escopo `vehicle:<marca>:<modelo>:<ano>:<combustivel>`, a function retorna erro amigavel e nao exibe valor generico.

Exemplo `manual_table` controlado:

```json
{
  "parameter_key": "fipe.vehicle.reference.example",
  "domain": "fipe",
  "source_type": "manual_table",
  "source_name": "Tabela FIPE - referencia manual conferida",
  "source_url": "https://www.fipe.org.br/pt-br/indices/veiculos",
  "priority": 70,
  "is_active": true,
  "parser_config_json": {
    "items": [
      {
        "parameter_key": "fipe.vehicle.reference.example",
        "domain": "fipe",
        "entity_type": "Asset",
        "field_name": "market_reference_value",
        "scope_key": "fipe_code:000000-0:year:2026",
        "category": "veiculos",
        "asset_type": "vehicle",
        "value": 100000,
        "value_type": "currency",
        "unit": "R$",
        "source_name": "Tabela FIPE - consulta manual conferida",
        "source_url": "https://www.fipe.org.br/pt-br/indices/veiculos",
        "source_date": "2026-07",
        "effective_start_date": "2026-07-01",
        "confidence_level": "medium",
        "status": "pending_review",
        "notes": "AMOSTRA ESTRUTURAL: substituir codigo, ano, valor e mes de referencia pela consulta conferida. Nao altera valor contabil."
      }
    ]
  },
  "notes": "Usar para referencias FIPE conferidas manualmente. Valor bruto numerico, sem R$ e sem separador de milhar."
}
```

Exemplo `api` generica para provider homologado:

```json
{
  "parameter_key": "fipe.vehicle.reference.provider",
  "domain": "fipe",
  "source_type": "api",
  "source_name": "Provider FIPE homologado - referencia mensal",
  "source_url": "https://api.provider-homologado.example/fipe",
  "priority": 65,
  "is_active": true,
  "parser_config_json": {
    "endpoint_url": "https://api.provider-homologado.example/fipe/references",
    "method": "GET",
    "timeout_ms": 10000,
    "headers": [
      {
        "name": "Authorization",
        "secret_name": "FIPE_PROVIDER_API_KEY",
        "prefix": "Bearer "
      }
    ],
    "query": {
      "competence_month": "{{competence_month}}",
      "domain": "fipe"
    },
    "items_path": "data.items",
    "field_map": {
      "parameter_key": "key",
      "domain": "domain",
      "entity_type": "entity_type",
      "field_name": "field_name",
      "scope_key": "scope_key",
      "category": "category",
      "asset_type": "asset_type",
      "value": "value",
      "value_type": "value_type",
      "unit": "unit",
      "source_name": "source_name",
      "source_url": "source_url",
      "source_date": "reference_month",
      "effective_start_date": "effective_start_date",
      "confidence_level": "confidence_level",
      "status": "status",
      "notes": "notes"
    }
  },
  "notes": "Informar apenas secret_name. Nao salvar chave de API em claro. Provider deve retornar JSON, HTTPS e value numerico bruto."
}
```

## Modelo 7: CIAP com coeficiente de apropriacao por competencia

Fonte prioritária:
- CONFAZ - Ajuste SINIEF 03/01, modelo de Controle de Crédito de ICMS do Ativo Permanente (CIAP).
- URL de referencia: `https://www.confaz.fazenda.gov.br/legislacao/ajustes/2001/AJ_003_01`
- Modelo do demonstrativo: `https://www.confaz.fazenda.gov.br/legislacao/ajustes/modelos/credito_ativo_permanente_mod_c_aj0301`

Regra conceitual:
- a fracao mensal padrao e `1/48`;
- o credito mensal efetivamente apropriavel depende do coeficiente de creditamento da competencia;
- formula conceitual: `credito_mensal = saldo/base_do_credito * fracao_mensal * coeficiente_de_creditamento`;
- o coeficiente e calculado a partir das saidas tributadas/exportacao sobre o total das saidas, conforme legislacao aplicavel;
- UF, regime, operacao, beneficios, exportacao e enquadramento fiscal devem ser validados pelo responsavel fiscal.

Limitacoes:
- estes exemplos nao substituem validacao fiscal;
- nao inventar regra estadual ou excecao por UF;
- usar `pending_review` ate aprovacao formal;
- nesta fase, a tela CIAP apenas sinaliza o calculo simplificado e exibe o coeficiente mensal como referencia.

Parametros mensais recomendados:

| parameter_key | field_name | value_type | unit | observacao |
| --- | --- | --- | --- | --- |
| `ciap.installment_fraction` | `ciap_installment_fraction` | `decimal` | `fração` | Valor bruto equivalente a `1/48`, por exemplo `0.0208333333`. |
| `ciap.installments_total` | `ciap_installments_total` | `integer` | `parcelas` | Total de parcelas, usualmente `48`, sujeito a validacao fiscal. |
| `ciap.credit_coefficient` | `ciap_credit_coefficient` | `decimal` | `coeficiente` | Coeficiente mensal apurado para a competencia. |
| `ciap.taxed_outputs_value` | `ciap_taxed_outputs_value` | `currency` | `R$` | Saidas tributadas/exportacao usadas no numerador. |
| `ciap.total_outputs_value` | `ciap_total_outputs_value` | `currency` | `R$` | Total de saidas da competencia. |
| `ciap.export_outputs_value` | `ciap_export_outputs_value` | `currency` | `R$` | Saidas de exportacao, quando aplicavel. |

Exemplo `manual_table` para uma competencia:

```json
{
  "parameter_key": "ciap.monthly.coefficient.2026-07",
  "domain": "ciap",
  "source_type": "manual_table",
  "source_name": "CIAP - coeficiente mensal validado internamente",
  "source_url": "https://www.confaz.fazenda.gov.br/legislacao/ajustes/2001/AJ_003_01",
  "priority": 80,
  "is_active": true,
  "parser_config_json": {
    "items": [
      {
        "parameter_key": "ciap.installment_fraction",
        "domain": "ciap",
        "entity_type": "CiapCredit",
        "field_name": "ciap_installment_fraction",
        "scope_key": "workspace:default",
        "value": 0.0208333333,
        "value_type": "decimal",
        "unit": "fracao",
        "source_name": "CONFAZ Ajuste SINIEF 03/01 - CIAP",
        "source_url": "https://www.confaz.fazenda.gov.br/legislacao/ajustes/2001/AJ_003_01",
        "source_date": "2001-04-06",
        "effective_start_date": "2026-07-01",
        "confidence_level": "medium",
        "status": "pending_review",
        "notes": "Fracao mensal 1/48. Validar aplicabilidade antes de usar em apuracao."
      },
      {
        "parameter_key": "ciap.installments_total",
        "domain": "ciap",
        "entity_type": "CiapCredit",
        "field_name": "ciap_installments_total",
        "scope_key": "workspace:default",
        "value": 48,
        "value_type": "integer",
        "unit": "parcelas",
        "source_name": "CONFAZ Ajuste SINIEF 03/01 - CIAP",
        "source_url": "https://www.confaz.fazenda.gov.br/legislacao/ajustes/2001/AJ_003_01",
        "source_date": "2001-04-06",
        "effective_start_date": "2026-07-01",
        "confidence_level": "medium",
        "status": "pending_review",
        "notes": "Total de parcelas usado como referencia. Validar caso concreto."
      },
      {
        "parameter_key": "ciap.credit_coefficient.2026-07",
        "domain": "ciap",
        "entity_type": "CiapCredit",
        "field_name": "ciap_credit_coefficient",
        "scope_key": "competence:2026-07",
        "value": 0.75,
        "value_type": "decimal",
        "unit": "coeficiente",
        "source_name": "Apuracao mensal CIAP validada pelo fiscal",
        "source_url": "https://www.confaz.fazenda.gov.br/legislacao/ajustes/modelos/credito_ativo_permanente_mod_c_aj0301",
        "source_date": "2026-07",
        "effective_start_date": "2026-07-01",
        "confidence_level": "medium",
        "status": "pending_review",
        "notes": "AMOSTRA ESTRUTURAL: substituir pelos valores reais de saidas tributadas/exportacao e total de saidas."
      },
      {
        "parameter_key": "ciap.taxed_outputs_value.2026-07",
        "domain": "ciap",
        "entity_type": "CiapCredit",
        "field_name": "ciap_taxed_outputs_value",
        "scope_key": "competence:2026-07",
        "value": 750000,
        "value_type": "currency",
        "unit": "R$",
        "source_name": "Apuracao mensal CIAP validada pelo fiscal",
        "source_url": "https://www.confaz.fazenda.gov.br/legislacao/ajustes/modelos/credito_ativo_permanente_mod_c_aj0301",
        "source_date": "2026-07",
        "effective_start_date": "2026-07-01",
        "confidence_level": "medium",
        "status": "pending_review",
        "notes": "AMOSTRA ESTRUTURAL: valor bruto, sem R$ e sem separador de milhar."
      },
      {
        "parameter_key": "ciap.total_outputs_value.2026-07",
        "domain": "ciap",
        "entity_type": "CiapCredit",
        "field_name": "ciap_total_outputs_value",
        "scope_key": "competence:2026-07",
        "value": 1000000,
        "value_type": "currency",
        "unit": "R$",
        "source_name": "Apuracao mensal CIAP validada pelo fiscal",
        "source_url": "https://www.confaz.fazenda.gov.br/legislacao/ajustes/modelos/credito_ativo_permanente_mod_c_aj0301",
        "source_date": "2026-07",
        "effective_start_date": "2026-07-01",
        "confidence_level": "medium",
        "status": "pending_review",
        "notes": "AMOSTRA ESTRUTURAL: total de saidas da competencia, validado pelo responsavel fiscal."
      },
      {
        "parameter_key": "ciap.export_outputs_value.2026-07",
        "domain": "ciap",
        "entity_type": "CiapCredit",
        "field_name": "ciap_export_outputs_value",
        "scope_key": "competence:2026-07",
        "value": 0,
        "value_type": "currency",
        "unit": "R$",
        "source_name": "Apuracao mensal CIAP validada pelo fiscal",
        "source_url": "https://www.confaz.fazenda.gov.br/legislacao/ajustes/modelos/credito_ativo_permanente_mod_c_aj0301",
        "source_date": "2026-07",
        "effective_start_date": "2026-07-01",
        "confidence_level": "medium",
        "status": "pending_review",
        "notes": "AMOSTRA ESTRUTURAL: informar exportacoes quando aplicavel, sem inventar regra estadual."
      }
    ]
  },
  "notes": "Modelo para base mensal CIAP. Cadastrar valores reais somente apos validacao fiscal."
}
```

## Checklist para transformar fonte oficial em MonthlyParameterSource

1. Confirmar a URL oficial ou fonte controlada arquivada.
2. Confirmar a vigencia e a data da fonte.
3. Confirmar o responsavel contabil/fiscal pela aprovacao.
4. Confirmar se o parametro e contabil ou fiscal.
5. Confirmar categoria, NCM ou escopo aplicavel.
6. Inserir `value` bruto, sem simbolo, unidade ou separador de milhar.
7. Definir `value_type` correto: `percent`, `decimal` ou `currency`.
8. Definir `source_name`, `source_url`, `source_date`, `effective_start_date`, `notes` e `confidence_level`.
9. Usar `pending_review` enquanto a fonte nao estiver conferida.
10. Testar a fonte em Settings com `Testar fonte`.
11. Rodar `Simular atualizacao`.
12. Conferir erros por item.
13. Rodar refresh real apenas depois da aprovacao.
14. Validar o `MonthlyParameterSnapshot` gerado.
15. Validar a indicacao no `AssetForm`.
16. Registrar evidencias da aprovacao contabil/fiscal fora do JSON, se o processo interno exigir.

## Cuidados contabeis e fiscais

- Depreciacao contabil e fiscal podem divergir; nao sincronizar automaticamente sem decisao formal.
- `DepreciationConfig` e `Asset` sao cadastro operacional, nao fonte oficial mensal.
- Mudanca de vida util ou valor residual deve avaliar CPC 23.
- Taxa fiscal deve ser validada contra a tabela oficial aplicavel e o enquadramento do ativo.
- `pending_review` e o status padrao recomendado para qualquer linha ainda nao conferida.
- `active` so deve ser usado quando houver aprovacao interna documentada.

## Proxima etapa recomendada

1. Selecionar uma categoria contabil piloto aprovada internamente.
2. Cadastrar uma fonte `manual_table` contabil com status `pending_review`.
3. Testar a fonte em Settings.
4. Aprovar internamente e trocar para `active`.
5. Rodar dry run.
6. Rodar refresh real.
7. Validar snapshot e AssetForm.
8. Repetir o processo para uma linha fiscal real somente apos NCM/referencia e taxa serem conferidos pelo responsavel fiscal.
