const chunksVersion = 'curated-2026-07-17';
const cpc27Url = 'https://s3.sa-east-1.amazonaws.com/static.cpc.aatb.com.br/Documentos/316_CPC_27_rev%2022.pdf';
const inRfb1700Url = 'https://www.in.gov.br/web/dou/-/instrucao-normativa-n-1-700-de-14-de-marco-de-2017-20479996';
const anexoUrl = 'https://normas.receita.fazenda.gov.br/sijut2consulta/link.action?idAto=81268';

function chunk(data: {
  id: string;
  document_id: string;
  section: string;
  domain: 'accounting' | 'fiscal' | 'classification';
  text: string;
  keywords: string[];
  source_url: string;
  themes: string[];
  scope?: string;
  content_type?: 'faithful_excerpt' | 'derived_summary';
}) {
  return {
    chunk_id: `${data.id}:${chunksVersion}`,
    document_id: data.document_id,
    version: chunksVersion,
    section: data.section,
    domain: data.domain,
    status: 'vigente',
    text: data.text,
    keywords: data.keywords,
    content_type: data.content_type || 'derived_summary',
    themes: data.themes,
    scope: data.scope || data.section,
    source_url: data.source_url,
  };
}

export const NORMATIVE_CHUNKS_DATA = [
  chunk({ id: 'cpc_27:item_50', document_id: 'cpc_27', section: 'Item 50 - valor depreciavel', domain: 'accounting', text: 'Conteudo derivado do CPC 27 item 50: o valor depreciavel deve ser apropriado de forma sistematica durante a vida util estimada do ativo.', keywords: ['valor depreciavel', 'vida util', 'depreciacao sistematica'], themes: ['depreciacao', 'vida_util'], source_url: cpc27Url }),
  chunk({ id: 'cpc_27:item_51', document_id: 'cpc_27', section: 'Item 51 - revisao anual', domain: 'accounting', text: 'Conteudo derivado do CPC 27 item 51: valor residual e vida util devem ser revisados pelo menos ao fim de cada exercicio; mudancas sao tratadas como estimativa contabil conforme CPC 23.', keywords: ['valor residual', 'vida util', 'revisao anual', 'cpc 23'], themes: ['valor_residual', 'estimativa'], source_url: cpc27Url }),
  chunk({ id: 'cpc_27:item_56', document_id: 'cpc_27', section: 'Item 56 - fatores de vida util', domain: 'accounting', text: 'Conteudo derivado do CPC 27 item 56: vida util considera uso esperado, capacidade, producao, desgaste fisico, turnos, reparos, manutencao, obsolescencia tecnica ou comercial e limites legais ou contratuais.', keywords: ['uso esperado', 'desgaste fisico', 'turnos', 'manutencao', 'obsolescencia', 'limites legais'], themes: ['vida_util', 'classificacao'], source_url: cpc27Url }),
  chunk({ id: 'cpc_27:item_57', document_id: 'cpc_27', section: 'Item 57 - julgamento', domain: 'accounting', text: 'Conteudo derivado do CPC 27 item 57: vida util reflete a utilidade esperada para a entidade e pode ser menor que a vida economica do ativo, exigindo julgamento baseado em politica e experiencia com ativos semelhantes.', keywords: ['utilidade esperada', 'vida economica', 'julgamento', 'ativos semelhantes'], themes: ['vida_util', 'julgamento'], source_url: cpc27Url }),
  chunk({ id: 'cpc_27:item_58', document_id: 'cpc_27', section: 'Item 58 - terrenos e edificios', domain: 'accounting', text: 'Conteudo derivado do CPC 27 item 58: terrenos e edificios sao ativos separaveis; terrenos geralmente tem vida util ilimitada e nao sao depreciados, enquanto edificios sao depreciaveis.', keywords: ['terreno', 'edificio', 'vida util ilimitada', 'nao depreciado'], themes: ['imoveis', 'terreno'], source_url: cpc27Url }),
  chunk({ id: 'cpc_27:item_60_62', document_id: 'cpc_27', section: 'Itens 60 a 62 - metodo', domain: 'accounting', text: 'Conteudo derivado do CPC 27 itens 60 a 62: metodo de depreciacao deve refletir o padrao esperado de consumo dos beneficios economicos e pode incluir linha reta, saldos decrescentes ou unidades produzidas.', keywords: ['metodo', 'linha reta', 'saldos decrescentes', 'unidades produzidas'], themes: ['depreciacao', 'metodo'], source_url: cpc27Url }),
  chunk({ id: 'cpc_23:estimativa', document_id: 'cpc_23', section: 'Mudanca de estimativa', domain: 'accounting', text: 'Conteudo derivado do CPC 23: alteracoes em vida util, valor residual ou metodo de depreciacao sao mudancas de estimativa contabil aplicadas prospectivamente.', keywords: ['mudanca de estimativa', 'prospectiva', 'vida util', 'valor residual'], themes: ['estimativa'], source_url: 'https://www.cpc.org.br/CPC/Documentos-Emitidos/Pronunciamentos' }),
  chunk({ id: 'cpc_04:intangivel', document_id: 'cpc_04', section: 'Vida util de intangivel', domain: 'accounting', text: 'Conteudo derivado do CPC 04: ativo intangivel pode ter vida util definida ou indefinida; amortizacao exige vida util definida e nao deve ser confundida com depreciacao de ativo imobilizado.', keywords: ['intangivel', 'amortizacao', 'vida util definida', 'vida util indefinida'], themes: ['intangivel'], source_url: 'https://www.cpc.org.br/CPC/Documentos-Emitidos/Pronunciamentos' }),
  chunk({ id: 'cpc_01:impairment', document_id: 'cpc_01', section: 'Valor recuperavel', domain: 'accounting', text: 'Conteudo derivado do CPC 01: perda por reducao ao valor recuperavel trata recuperabilidade e nao substitui a estimativa normal de vida util, taxa ou valor residual.', keywords: ['impairment', 'valor recuperavel', 'perda'], themes: ['impairment'], source_url: 'https://www.cpc.org.br/CPC/Documentos-Emitidos/Pronunciamentos' }),
  chunk({ id: 'cpc_28:propriedade', document_id: 'cpc_28', section: 'Propriedade para investimento', domain: 'accounting', text: 'Conteudo derivado do CPC 28: imovel mantido para renda ou valorizacao deve ser avaliado separadamente de imovel de uso proprio classificado no ativo imobilizado.', keywords: ['propriedade para investimento', 'imovel', 'renda', 'valorizacao'], themes: ['imoveis', 'classificacao'], source_url: 'https://www.cpc.org.br/CPC/Documentos-Emitidos/Pronunciamentos' }),
  chunk({ id: 'icpc_10:revisao', document_id: 'icpc_10', section: 'Revisao de vida util e residual', domain: 'accounting', text: 'Conteudo derivado da ICPC/ITG 10: revisao inicial ou posterior de vida util e valor residual exige base tecnica e deve ser contabilizada conforme estimativa aplicavel.', keywords: ['revisao', 'vida util', 'valor residual', 'base tecnica'], themes: ['vida_util', 'valor_residual'], source_url: 'https://www.cpc.org.br/CPC/Documentos-Emitidos/Interpretacoes' }),
  chunk({ id: 'in_rfb_1700:art_120', document_id: 'in_rfb_1700_2017', section: 'Art. 120', domain: 'fiscal', text: 'Conteudo derivado do art. 120 da IN RFB 1.700/2017: custo de imobilizado ou intangivel deve ser ativado, salvo bem de pequeno valor unitario ou vida util nao superior a um ano.', keywords: ['ativo imobilizado', 'intangivel', 'pequeno valor', 'vida util um ano'], themes: ['capitalizacao', 'fiscal'], source_url: inRfb1700Url }),
  chunk({ id: 'in_rfb_1700:art_121', document_id: 'in_rfb_1700_2017', section: 'Art. 121', domain: 'fiscal', text: 'Conteudo derivado do art. 121 da IN RFB 1.700/2017: depreciacao fiscal corresponde a desgaste pelo uso, acao da natureza ou obsolescencia normal, sendo dedutivel por quem suporta o encargo economico.', keywords: ['desgaste', 'obsolescencia', 'dedutivel', 'encargo economico'], themes: ['depreciacao_fiscal'], source_url: inRfb1700Url }),
  chunk({ id: 'in_rfb_1700:art_122', document_id: 'in_rfb_1700_2017', section: 'Art. 122', domain: 'fiscal', text: 'Conteudo derivado do art. 122 da IN RFB 1.700/2017: terrenos nao admitem quota de depreciacao, salvo melhoramentos ou construcoes; obras de arte, antiguidades e bens sujeitos a exaustao tambem possuem restricoes.', keywords: ['terreno', 'construcao', 'obra de arte', 'exaustao'], themes: ['restricoes', 'terreno'], source_url: inRfb1700Url }),
  chunk({ id: 'in_rfb_1700:art_123', document_id: 'in_rfb_1700_2017', section: 'Art. 123', domain: 'fiscal', text: 'Conteudo derivado do art. 123 da IN RFB 1.700/2017: quota dedutivel de depreciacao e determinada pela aplicacao da taxa anual sobre o custo de aquisicao do bem.', keywords: ['quota dedutivel', 'taxa anual', 'custo de aquisicao'], themes: ['taxa_fiscal'], source_url: inRfb1700Url }),
  chunk({ id: 'in_rfb_1700:art_124', document_id: 'in_rfb_1700_2017', section: 'Art. 124', domain: 'fiscal', text: 'Conteudo derivado do art. 124 da IN RFB 1.700/2017: taxa anual fiscal e fixada em funcao da vida util economica esperada; o prazo admissivel e o previsto no Anexo III, admitida prova para taxa diferente.', keywords: ['taxa anual', 'anexo iii', 'vida util admissivel', 'prova'], themes: ['anexo_iii', 'taxa_fiscal'], source_url: inRfb1700Url }),
  chunk({ id: 'in_rfb_1700:art_124_pericia', document_id: 'in_rfb_1700_2017', section: 'Art. 124, paragrafos 2 e 3', domain: 'fiscal', text: 'Conteudo derivado do art. 124, paragrafos 2 e 3, da IN RFB 1.700/2017: em duvida, contribuinte ou Receita Federal podem pedir pericia de entidade oficial; conjunto sem especificacao deve usar taxa dos bens de maior vida util.', keywords: ['pericia', 'entidade oficial', 'conjunto', 'maior vida util'], themes: ['pericia', 'conjunto'], source_url: inRfb1700Url }),
  chunk({ id: 'in_rfb_1700:anexo_iii_notas', document_id: 'in_rfb_1700_2017_anexo_iii', section: 'Notas do Anexo III', domain: 'fiscal', text: 'Conteudo derivado das notas do Anexo III: algumas posicoes possuem observacoes especificas, como fornos da industria de vidro e maquinas ou instalacoes da industria quimica.', keywords: ['fornos', 'industria de vidro', 'industria quimica', 'nota'], themes: ['anexo_iii', 'notas'], source_url: anexoUrl }),
  chunk({ id: 'lei_14871:contexto', document_id: 'lei_14871_2024', section: 'Depreciacao acelerada', domain: 'fiscal', text: 'Conteudo derivado da Lei 14.871/2024: depreciacao acelerada depende de elegibilidade legal especifica e nao fundamenta depreciacao fiscal comum sem parametro estruturado aplicavel.', keywords: ['depreciacao acelerada', 'elegibilidade', 'lei 14871'], themes: ['depreciacao_acelerada'], source_url: 'https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2024/lei/l14871.htm' }),
] as const;
