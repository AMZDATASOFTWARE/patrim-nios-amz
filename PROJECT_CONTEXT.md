# PROJECT_CONTEXT — Patrimônios AMZ

> Documento de contexto para futuras sessões. Última atualização: **2026-07-08**.
> Mantenha este arquivo atualizado ao final de mudanças estruturais.

---

## 1. Identidade do projeto

- **Produto:** Patrimônios AMZ — SaaS de gestão de patrimônio (ativos fixos, depreciação, QR codes, manutenção, inventário, fornecedores, colaboradores, contratos).
- **Plataforma:** app **Base44**. `appId = 69b9bbe612ad0c22812b5339`.
- **Acesso via MCP:** ferramentas `mcp__ceacbca7-89ad-43b1-97c5-f609098437f5__*` (list_entity_schemas, query_entities, read_file, edit_file, write_file, run_command, create_checkpoint, etc.). Sempre passar o `appId`.
- **URL pública do app:** `https://patrimoni-asset-flow.base44.app`
- **Empresa (dados reais):** Amz Data Software · CNPJ 53.646.811/0001-20 · ceo@amzdatasoftware.com · (91) 98134-2990 · dev responsável: Mateus da Silva Gonçalves. (Fonte única no código: `src/lib/company.js`.)
- **Stack:** React + Vite (frontend), Deno serverless (backend functions Base44), Stripe (pagamentos). UI em pt-BR; código/identificadores em inglês.
- **LGPD:** aplica-se integralmente (trata CPF, e-mail, telefone, endereço, geolocalização, IP). CFM **não** se aplica.

## 2. Modelo multi-tenant (isolamento por empresa)

- **Tenant = `Workspace`**, chave = `workspace_id` em toda entidade tenant-owned.
- **Membership** modelada por campos no `User` (`workspace_id`, `role`) + `member_emails[]` no `Workspace`. **1 workspace por usuário**. Multi-empresa por usuário exigiria entidade `Membership`/`Invitation`.
- **Papéis:** `admin`, `manager`, `viewer`, `user`. Além disso `is_platform_admin` (dono da plataforma), gravável só por service-role.
- Isolamento **lógico, enforced server-side** via RLS + backend functions com `asServiceRole`.

### Regra de ouro
**Editar `base44/entities/*.jsonc` é o que atualiza a RLS de forma durável.** Mudança só ao vivo (`update_entity_schema`) é revertida num redeploy. Sempre editar o `.jsonc` e verificar com `list_entity_schemas`.

### Padrão de RLS correto
- Escopo por tenant usa **`{{user.data.workspace_id}}`** (não `{{user.workspace_id}}` — este resolve vazio).
- Papel sempre **combinado com tenant via `$and`**.
- Entidades sensíveis: create/write bloqueado no SDK (só `is_platform_admin`), escritas por functions service-role.

## 3. Entidades (19)

Tenant-owned: **Asset, Collaborator, AssetAssignment, AssetAttachment, Supplier, MaintenanceRecord, LocationHistory, InventoryCount, InventoryItem, Contract, DepreciationConfig, Notification, AuditLog, AlertDispatchLog, PaymentRequest**. Raiz: **Workspace**. Built-in: **User** (FLS por campo em role/workspace_id/is_platform_admin). Plataforma (não-tenant, só platform-admin): **CreditUsage** (log de consumo de IA por workspace), **PricingConfig** (singleton de rateio/precificação).

**Roadmap paridade AfixCode (plano local `~/.claude/plans/c-users-mateu-...twinkly-eagle.md`) — Onda 1 entregue 2026-07-09:** `Asset` +campos por categoria (`property_*` imóveis, `vehicle_*` veículos, opcionais/aditivos, aceitos em createAsset/ImportExport); `InventoryItem` +5º estado `novo_sobra`+`is_surplus`/`found_*`/`resolution` (sobras não entram no progresso/auto-flip); **AssetAttachment** (múltiplos anexos, dual-write em `Asset.photo_url`); **AlertDispatchLog** (dedup de alertas, write só service-role). Ondas 2-4 pendentes.

- `Asset.create` → bloqueado no SDK; cadastro pela function `createAsset` (valida limite de plano + status pagamento; carimba workspace) — **inclusive para o agente de IA**, que usa `createAsset` como function tool (não a operação de entidade — ver seção 6).
- `AuditLog.create` → bloqueado no SDK; escrita pela function `logAudit` (carimba actor+workspace da sessão).
- `Notification.create` → exige workspace **E** papel admin/manager.
- `Workspace`/`PaymentRequest`/`User` → escrita só service-role/platform-admin. `Workspace` tem `stripe_customer_id`/`stripe_subscription_id` (gravados só por stripeCheckout/stripeWebhook).
- `CreditUsage.create` → só service-role (via `logCreditConsumption`); `PricingConfig` → só platform-admin (via `creditReport`).

## 4. Backend functions (`base44/functions/*/entry.ts`)

createWorkspace · acceptWorkspaceInvite · inviteMember (aplica limite de usuários do plano) · workspaceMembers (list/setRole/remove) · updateWorkspaceProfile · **createAsset** (lote ≤200; valida plano; único caminho de cadastro, inclusive via agente de IA; allowlist estende campos por categoria) · **logAudit** · notifyBilling (days server-side) · registerPublicScan (público; IP server-side; rate-limit 30s) · getPublicAssetInfo (público; projeção mínima) · **stripeCheckout** (preço server-side) · **stripeWebhook** (assinatura verificada; dunning; idempotente) · **stripePortal** · adminApi (platform-admin: workspaces/planos) · **logCreditConsumption** (registra consumo de créditos de IA do chat in-app) · **creditReport** (platform-admin: relatório de custo/margem de IA por workspace + edita rateio) · **dispatchExpiryAlerts** (1ª automation agendada do projeto: alerta garantia/revisão/IPVA/contrato vencendo → Notification+e-mail, dedup via AlertDispatchLog; platform-admin pode chamar manual com `{dry_run:true}`. **LIÇÃO:** sync MCP NÃO processa automações de function.jsonc — a automação diária 7h07 foi criada MANUALMENTE no dashboard, essa é a fonte de verdade; endpoint invocável sem auth, dedup bounded).

## 5. Stripe (LIVE — conta `acct_1TieigL04LdxLhj9`)

- **Preços:** Starter `prod_UpipD0wgrT1TM4` (mês `price_1Tq3NlL04LdxLhj992EfmEd6` R$97 / ano `price_1Tq3NxL04LdxLhj9BaDzwnTN` R$970); Professional `prod_Upip3emBd6KeAs` (mês `price_1Tq3NzL04LdxLhj9doQPyFcB` R$247 / ano `price_1Tq3OAL04LdxLhj9KJXiWcuW` R$2.470); Enterprise sob consulta.
- **Webhook:** `patrimoniosstrip` → `.../functions/stripeWebhook`, 9 eventos. Legado `captivating-legacy` excluído.
- **Secrets Base44:** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (configurados).
- Portal + e-mails nativos + Smart Retries (cancelar ao esgotar) ativados no dashboard.
- **Mapa preço→plano** duplicado em stripeCheckout/stripeWebhook e `src/lib/plans.js` — atualizar nos 3 se mudar preços.
- E2E validado 2026-07-06 (checkout R$0 com cupom, ativação automática, cancelamento). MCP Stripe **não** gerencia webhooks/portal/coupons-update — isso é feito no dashboard pelo usuário.

## 6. Assistente de IA (agente Base44)

- **1 agente único** (não uma pirâmide de 4 agentes): `base44/agents/assistente_patrimonial.jsonc`. As *instructions* implementam 3 papéis (Pesquisador → Redator → Revisor) executados **internamente pelo mesmo modelo em sequência** — desenho deliberado, já que a Base44 não suporta orquestração nativa agente→agente ("Agent2Agent Integration" está só no feedback board da plataforma, não implementado).
- **Isolamento por tenant:** não há instância de agente por workspace — é um singleton de app. O isolamento vem de RLS (cada `tool_config` de entidade herda a RLS do usuário na conversa) + memória com escopo `"both"` (Global & Per User). `allow_anonymous_access: false`.
- **Ferramentas:** leitura/escrita (nunca `delete`) nas entidades tenant-owned + leitura de `Workspace`/`AuditLog`/`CreditUsage`/`PricingConfig`. Cadastro de ativos usa a function tool `createAsset` (não `Asset.create`, bloqueado por RLS — ver seção 3).
- **Disponibilidade:** sem gate de plano — disponível para todos os planos (decisão consciente do usuário).
- **Canais:** chat in-app (`src/pages/AssistantChat.jsx`, rota `/Assistant`) + WhatsApp (`base44.agents.getWhatsAppConnectURL`), número próprio atribuído pela Base44, sem webhook/API key a configurar.
- **Base de conhecimento:** `context_files` (10 `.md`) + `selected_workspace_skill_ids` (10 skills).
- **Custo de IA (observabilidade interna da AMZ, não é limite por cliente):** `CreditUsage`/`PricingConfig` + `logCreditConsumption`/`creditReport` + `src/pages/AdminCredits.jsx` (`/AdminCredits`, só platform-admin) fazem o rateio do custo do plano Base44 da própria AMZ e projetam margem por workspace.
  - **Gap conhecido:** só o chat in-app chama `logCreditConsumption` — mensagens via WhatsApp não são contabilizadas (sem hook documentado de "mensagem recebida no canal"). Margem reportada subestima o custo real conforme o uso via WhatsApp cresce.

## 7. Frontend

- **Rotas públicas** (`PUBLIC_PATHS` em `src/App.jsx`): `/scan`, `/landing`, `/privacidade`, `/termos`. `/` → `/Dashboard`.
- **Guard de rota por papel:** `src/lib/routePermissions.js` + `AppLayout` → "Acesso restrito" se o papel não permite (defesa-em-profundidade; dado protegido no servidor).
- **Onboarding:** sem workspace → convite → senão `WorkspaceSetup` → `createWorkspace`.
- **Paywall:** `PaymentGate.jsx` (UI). Escrita bloqueada no servidor; leitura de tenant suspenso ainda possível (N1 pendente).
- **Rodapé:** `src/components/AppFooter.jsx` (dados em `src/lib/company.js`); variantes `sidebar`/`band`/`onDark`.
- **Legais:** `/termos` e `/privacidade` com CNPJ real. **Rascunho — revisar com advogado.**
- **Permissões:** `src/lib/permissions.js`. Máscara de CPF: `src/lib/mask.js` (CPF completo só no termo/PDF).

## 8. Segurança (auditoria)

Ver `AUDIT_REPORT.md`. **Zero CRÍTICO.** Fechados: N2, N4, N5, N7, N9, N10, N11, N12, N14, N15.
Aceitos/adiados: **N1** (bloquear leitura de tenant suspenso — inviável limpo; escrita já bloqueada), **N6** (retenção IP/GPS — usuário optou manter; órfãos em `workspace_id="__orphan_quarantine__"`), **N13** (CORS `*` — baixo valor em endpoints por token).

## 9. Pendências / gates de lançamento

1. 🚦 **Pentest de 2 contas** (gate final; testa isolamento cross-tenant + `updateMe`).
2. 📄 **Publish no builder** — frontend só chega aos usuários após Publish (functions fazem deploy sozinhas).
3. ✍️ Revisar páginas legais com advogado.
4. (Opcional) `Membership`/`Invitation`; limpar ações legadas de PaymentRequest no `adminApi`; raiz deslogado→Landing.

## 10. Notas operacionais (sandbox)

- `run_command` inicia em `/` — usar `cd /app && ...`.
- `npm run build` não faz stream; **exit 0 + `dist/` novo = ok**. Buildar após mudanças.
- **create_checkpoint** antes/depois de mudanças estruturais.
- Sandbox não faz curl externo — checar endpoints públicos pelo Bash local.
- Não há ferramenta MCP para invocar conversa de agente (`agents.createConversation`/`addMessage`) nem para chamar functions diretamente — testar o assistente (chat/WhatsApp) exige o app real.
- `Workspace.jsonc` tem escapes `\uXXXX` literais — ancorar edições em ASCII.
- `update_entities` em massa exige **autorização explícita do usuário**.
- Plataforma teve 503/429 em 2026-07-06 (indisponibilidade deles); esperar/reconectar resolve.
- Editar `base44/agents/*.jsonc` parece propagar imediatamente (mesma mecânica de `edit_file`), mas isso **não foi confirmado empiricamente contra uma conversa real** — verificar no app após qualquer mudança de agente.

## 11. Skills e memória
Skills: `audit-base44`, `base44-backend`, `base44-frontend`, `base44-multitenant`. Memória: `project_patrimonios_amz_refactor.md`. Cópia deste doc também em `C:\Users\mateu\Desktop\glpi\PROJECT_CONTEXT.md`.