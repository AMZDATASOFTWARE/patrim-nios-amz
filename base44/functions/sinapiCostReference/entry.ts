import { createClientFromRequest } from 'npm:@base44/sdk@0.8.35';

// Referencia informativa de custo de construcao por m2 (SINAPI), consultada ao vivo na API
// publica do IBGE/SIDRA (tabela 6586, variavel 9327 = "Custo medio m2 - moeda corrente, sem
// desoneracao"). Nao escreve em nenhuma entidade e nao sobrescreve acquisition_value sozinho --
// o valor retornado e exibido no AssetForm apenas como comparacao para o usuario/contador decidir.
// Input:  { uf: string (sigla, ex. "SP"), area_m2: number }
// Output: { ok: true, found: boolean, cost_per_m2?, reference_value?, period?, uf?, source?, reason? }

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Codigos IBGE de Unidade da Federacao (padrao estavel, usado para filtrar a consulta SIDRA por UF).
const UF_TO_IBGE_CODE: Record<string, string> = {
  RO: '11', AC: '12', AM: '13', RR: '14', PA: '15', AP: '16', TO: '17',
  MA: '21', PI: '22', CE: '23', RN: '24', PB: '25', PE: '26', AL: '27', SE: '28', BA: '29',
  MG: '31', ES: '32', RJ: '33', SP: '35',
  PR: '41', SC: '42', RS: '43',
  MS: '50', MT: '51', GO: '52', DF: '53',
};

const SIDRA_VARIABLE_CUSTO_M2 = '9327';
const SIDRA_TIMEOUT_MS = 8000;

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: cors });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Metodo nao permitido.' }, 405);

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return json({ error: 'Unauthorized' }, 401);

    const svc = base44.asServiceRole;
    const fresh = (await svc.entities.User.filter({ id: user.id }))[0];
    if (!fresh?.workspace_id) return json({ error: 'Sessao invalida.' }, 403);

    const body = await req.json().catch(() => null);
    const uf = typeof (body as Record<string, unknown> | null)?.uf === 'string'
      ? String((body as Record<string, unknown>).uf).trim().toUpperCase()
      : '';
    const areaM2 = Number((body as Record<string, unknown> | null)?.area_m2);

    const ibgeCode = UF_TO_IBGE_CODE[uf];
    if (!ibgeCode) return json({ ok: true, found: false, reason: 'uf_invalida' });
    if (!Number.isFinite(areaM2) || areaM2 <= 0) return json({ ok: true, found: false, reason: 'area_invalida' });

    const url = `https://apisidra.ibge.gov.br/values/t/6586/n3/${ibgeCode}/v/${SIDRA_VARIABLE_CUSTO_M2}/p/last%201`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), SIDRA_TIMEOUT_MS);

    let rows: unknown;
    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { 'User-Agent': 'AMZ-Patrimonios-SinapiReader/1.0' },
      });
      if (!res.ok) return json({ ok: true, found: false, reason: 'sidra_indisponivel' });
      rows = await res.json();
    } catch (_) {
      return json({ ok: true, found: false, reason: 'sidra_indisponivel' });
    } finally {
      clearTimeout(timeout);
    }

    if (!Array.isArray(rows) || rows.length < 2) return json({ ok: true, found: false, reason: 'sidra_resposta_invalida' });

    // A primeira linha do SIDRA e sempre um cabecalho descritivo (D1C = "Unidade da Federacao"),
    // nunca um codigo de UF valido -- por isso filtrar por D1C === ibgeCode e seguro independente
    // da posicao no array.
    const dataRow = (rows as Array<Record<string, unknown>>).find((r) => r && r.D1C === ibgeCode);
    const value = dataRow ? Number(dataRow.V) : NaN;
    if (!Number.isFinite(value) || value <= 0) return json({ ok: true, found: false, reason: 'valor_indisponivel' });

    return json({
      ok: true,
      found: true,
      cost_per_m2: value,
      reference_value: Math.round(value * areaM2 * 100) / 100,
      period: (dataRow?.D3N as string) || null,
      uf,
      source: 'IBGE/SIDRA - Tabela 6586 (SINAPI), custo medio por m2 sem desoneracao',
    });
  } catch (_) {
    return json({ error: 'Nao foi possivel consultar a referencia de custo de construcao agora.' }, 500);
  }
});
