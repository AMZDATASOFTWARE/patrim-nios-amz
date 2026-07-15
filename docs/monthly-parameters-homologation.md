# Homologacao da base mensal de parametros

Este guia valida o fluxo ponta a ponta da base mensal de parametros sem cadastrar dados reais no banco remoto e sem inventar fonte normativa, FIPE ou fiscal.

Fontes suportadas nesta fase:
- `manual_table`
- `internal_rule`
- `api`
- `official_page` restrito a URL oficial cadastrada

Ainda fora do escopo:
- scraping livre fora da URL cadastrada
- `ai_research`
- providers especificos de FIPE, tributos ou fontes normativas oficiais

## Fluxo homologado

1. Um administrador cadastra uma `MonthlyParameterSource` ativa.
2. `refresh-monthly-parameters` le apenas fontes ativas do workspace.
3. O provider gera candidatos de snapshot.
4. Cada item e validado com valor bruto, `domain`, `value_type`, `confidence_level` e vigencia.
5. O refresh cria ou versiona `MonthlyParameterSnapshot`.
6. `get-parameter-suggestion` busca snapshot `active` da competencia vigente.
7. `AssetForm.jsx` consome a sugestao por `AutoParameterSuggestion`.
8. O usuario precisa clicar em `Aplicar`; nenhum campo e preenchido automaticamente.
9. `Settings.jsx` mostra fontes, ultima execucao, snapshots ativos/pendentes e erros por item.

## Exemplo: manual_table de depreciacao

Exemplo interno controlado para homologacao. Nao representa regra normativa.

```json
{
  "items": [
    {
      "parameter_key": "depreciation.internal.vehicles.rate",
      "domain": "depreciation",
      "entity_type": "Asset",
      "field_name": "depreciation_rate",
      "scope_key": "category:veiculos",
      "category": "veiculos",
      "value": 20,
      "value_type": "percent",
      "unit": "%",
      "effective_start_date": "2026-01-01",
      "confidence_level": "high",
      "notes": "Exemplo interno controlado para homologacao"
    }
  ]
}
```

Resultado esperado:
- snapshot `active`;
- `value` salvo como valor bruto serializado (`"20"`);
- sugestao exibida como `20%`;
- aplicacao manual no campo `depreciation_rate`.

## Exemplo: internal_rule de vida util

Exemplo interno controlado para homologacao. Nao representa regra normativa.

```json
{
  "rules": [
    {
      "parameter_key": "depreciation.internal.vehicles.useful_life",
      "domain": "depreciation",
      "entity_type": "Asset",
      "field_name": "useful_life_years",
      "scope_key": "category:veiculos",
      "category": "veiculos",
      "value": 5,
      "value_type": "decimal",
      "unit": "anos",
      "effective_start_date": "2026-01-01",
      "confidence_level": "high",
      "notes": "Exemplo interno controlado para homologacao"
    }
  ]
}
```

Resultado esperado:
- snapshot `active`;
- `value` salvo como valor bruto serializado (`"5"`);
- sugestao exibida como `5 anos`;
- aplicacao manual no campo `useful_life_years`.

## Exemplo: api generica

Use somente URL e secret fornecidos pelo responsavel pela integracao. Nao informe chave real no JSON.

```json
{
  "endpoint_url": "https://api.exemplo.com/parametros",
  "method": "GET",
  "timeout_ms": 10000,
  "headers": [
    {
      "name": "Authorization",
      "secret_name": "PARAMETER_API_KEY",
      "prefix": "Bearer "
    }
  ],
  "query": {
    "competence_month": "{{competence_month}}",
    "domain": "{{domain}}"
  },
  "items_path": "data.items",
  "field_map": {
    "parameter_key": "key",
    "domain": "domain",
    "entity_type": "entity_type",
    "field_name": "field_name",
    "scope_key": "scope_key",
    "category": "category",
    "value": "value",
    "value_type": "value_type",
    "unit": "unit",
    "effective_start_date": "effective_start_date",
    "confidence_level": "confidence_level",
    "notes": "notes"
  }
}
```

Controles obrigatorios do provider `api`:
- chamada feita somente no backend;
- `endpoint_url` apenas HTTPS;
- bloqueio de localhost, IPs locais e privados;
- segredo lido por `Deno.env.get(secret_name)`;
- header sensivel exige `secret_name`;
- rejeicao de token, senha ou API key em claro;
- timeout e limite de tamanho de resposta;
- resposta deve ser JSON;
- `items_path` usa caminho simples por ponto, como `data.items`;
- `field_map` usa caminho simples por ponto, como `payload.value`;
- item invalido entra em `errors`; itens validos continuam gerando preview/snapshot.

## Exemplo: official_page com IA restrita

Use apenas URL oficial cadastrada pelo administrador. A IA recebe somente o texto limitado dessa pagina, sem busca aberta e sem seguir links externos. Todo snapshot gerado deve ficar `pending_review`.

```json
{
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
}
```

Controles obrigatorios do provider `official_page`:
- chamada feita somente no backend;
- URL apenas HTTPS;
- bloqueio de localhost, IPs locais/privados e credenciais embutidas;
- `allowed_domain` obrigatorio e dentro de dominios oficiais permitidos;
- redirect permitido somente dentro do mesmo dominio cadastrado;
- resposta limitada em tamanho, HTML/texto apenas;
- PDF entra como pendencia de homologacao propria;
- retorno da IA e validado pelo mesmo contrato `value` bruto, `label` separado e `unit` separado;
- item invalido entra em `errors`; itens validos seguem para `pending_review`.

## Checklist de homologacao local

- `manual_table -> snapshot`: `resolveMonthlyParameterSourceSnapshots` retorna candidato valido.
- `refresh -> snapshot ativo`: o refresh normaliza `value`, define `status`, cria ou versiona `MonthlyParameterSnapshot` quando `dry_run` e falso.
- `get-parameter-suggestion -> sugestao`: snapshot ativo e vigente e ranqueado por `snapshotScore`, convertido por `parseSnapshotValue` e exibido por `buildSuggestionLabel`.
- `AssetForm -> consumo`: `AutoParameterSuggestion` chama `getParameterSuggestion` e aplica somente apos clique em `Aplicar`.
- `Settings -> governanca`: mostra fontes, ultima execucao, snapshots ativos/pendentes e erros por item retornados no `test` ou no dry run.
- `dry_run`: nao chama `MonthlyParameterSnapshot.create`; apenas calcula contadores.
- `test de fonte`: chama o provider e retorna `preview`/`errors`, sem persistir snapshot.

## Checklist de deploy/configuracao Base44

Entities a publicar:
- `MonthlyParameterSource`
- `MonthlyParameterRun`
- `MonthlyParameterSnapshot`

Functions a publicar:
- `refresh-monthly-parameters`
- `get-parameter-suggestion`
- `manage-monthly-parameter-sources`

Arquivos compartilhados usados pelas functions:
- `base44/functions/_shared/monthlyParameters.ts`
- `base44/functions/_shared/monthlyParameterSources.ts`

Agent a publicar:
- `assistente_patrimonial`

Permissoes e seguranca:
- confirmar RLS por `workspace_id`;
- confirmar escrita administrativa/service-role para snapshots e runs;
- confirmar que `MonthlyParameterSource` e `MonthlyParameterSnapshot` so sao gerenciados por `is_platform_admin === true` ou por e-mails explicitamente autorizados;
- tratar a gestao de fontes/snapshots como sensivel; etapa futura recomendada: criar permissao granular como `manage_monthly_parameters`;
- confirmar que o frontend nao exibe `raw_payload` nem secrets.

Secrets necessarios:
- `CRON_SHARED_SECRET`, se a execucao automatica usar chamada sem usuario autenticado;
- secrets de API apenas quando houver provider `api` real fornecido pelo cliente, por exemplo `PARAMETER_API_KEY`.

Automacao mensal:
- publicar a automacao `refresh-monthly-parameters-monthly`;
- confirmar timezone efetivo da Base44 antes do deploy;
- confirmar `competence_month` esperado para o primeiro dia do mes;
- acompanhar a primeira execucao por `MonthlyParameterRun`.

## Pendencias para fontes reais

- validar URLs e contratos de APIs reais fornecidas pelo cliente;
- cadastrar secrets reais fora do codigo;
- definir regras de aprovacao quando fonte exigir revisao;
- homologar fontes `official_page` reais somente quando houver URL oficial e responsavel definidos;
- implementar `ai_research` somente com politica de revisao manual e baixa confianca por padrao;
- criar providers especificos, como FIPE ou tributos, apenas com fonte, contrato e credenciais confirmados.
