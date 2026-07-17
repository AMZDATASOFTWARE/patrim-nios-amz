// Anexo III da Instrucao Normativa RFB no 1.700/2017 -- taxas anuais de depreciacao e prazos de
// vida util fiscal admissiveis para os tipos de bem mais comuns cadastrados no app.
// Tabela ESTATICA e DETERMINISTICA: usada como referencia fiscal direta (sem depender de
// scraping/LLM) quando o tipo de bem casa com uma entrada conhecida. Nao substitui a estimativa
// GERENCIAL (que continua vindo do fluxo existente de IA + fontes confiaveis) nem dispensa
// confirmacao do contador quanto ao enquadramento exato do bem.
// Simplificacao deliberada: cobre os tipos de bem mais frequentes no app, nao o Anexo III inteiro.

export type ReceitaFederalEntry = {
  keywords: string[];
  category?: string;
  annual_rate_percent: number;
  useful_life_years: number;
  bem_tipo: string;
};

// Categorias grafadas sem acento de proposito (comparadas apos stripAccents(), nunca direto
// contra Asset.category) para evitar qualquer risco de encoding neste arquivo .ts.
const TABLE: ReceitaFederalEntry[] = [
  { category: 'veiculos', keywords: ['caminhao', 'onibus', 'carreta', 'reboque'], annual_rate_percent: 25, useful_life_years: 4, bem_tipo: 'Caminhoes, onibus e implementos rodoviarios' },
  { category: 'veiculos', keywords: ['motocicleta', 'moto'], annual_rate_percent: 25, useful_life_years: 4, bem_tipo: 'Motocicletas' },
  { category: 'veiculos', keywords: ['maquina agricola', 'trator', 'colheitadeira'], annual_rate_percent: 25, useful_life_years: 4, bem_tipo: 'Tratores e maquinas agricolas automotrizes' },
  { category: 'veiculos', keywords: [], annual_rate_percent: 20, useful_life_years: 5, bem_tipo: 'Veiculos em geral (automoveis, camionetas, utilitarios)' },
  { category: 'equipamentos', keywords: ['computador', 'notebook', 'servidor', 'informatica', 'periferico', 'impressora'], annual_rate_percent: 20, useful_life_years: 5, bem_tipo: 'Equipamentos de processamento de dados (informatica)' },
  { category: 'equipamentos', keywords: ['movel', 'moveis', 'mobiliario', 'estante', 'armario'], annual_rate_percent: 10, useful_life_years: 10, bem_tipo: 'Moveis e utensilios' },
  { category: 'equipamentos', keywords: ['equipamento medico', 'equipamento hospitalar', 'aparelho medico', 'hospitalar'], annual_rate_percent: 10, useful_life_years: 10, bem_tipo: 'Aparelhos e equipamentos medico-hospitalares' },
  { category: 'equipamentos', keywords: ['maquina agricola', 'trator', 'colheitadeira'], annual_rate_percent: 25, useful_life_years: 4, bem_tipo: 'Tratores e maquinas agricolas' },
  { category: 'equipamentos', keywords: [], annual_rate_percent: 10, useful_life_years: 10, bem_tipo: 'Maquinas, aparelhos e equipamentos industriais em geral' },
  { category: 'imoveis', keywords: [], annual_rate_percent: 4, useful_life_years: 25, bem_tipo: 'Edificacoes em geral' },
];

function stripAccents(value: string): string {
  return (value || '')
    .toLowerCase()
    .replace(/[aàáâãä]/g, 'a')
    .replace(/[eèéêë]/g, 'e')
    .replace(/[iìíîï]/g, 'i')
    .replace(/[oòóôõö]/g, 'o')
    .replace(/[uùúûü]/g, 'u')
    .replace(/[ç]/g, 'c');
}

// Prioriza a entrada mais especifica (com keywords) que casar com o nome/descricao do ativo;
// cai para a entrada generica da categoria (sem keywords) quando nada especifico casar.
export function lookupReceitaFederalDepreciation(category: string, name: string, description: string): ReceitaFederalEntry | null {
  const haystack = stripAccents(`${name} ${description}`);
  const normalizedCategory = stripAccents(category);
  const candidates = TABLE.filter((entry) => !entry.category || entry.category === normalizedCategory);

  for (const entry of candidates) {
    if (entry.keywords.length === 0) continue;
    if (entry.keywords.some((kw) => haystack.includes(kw))) return entry;
  }
  return candidates.find((entry) => entry.keywords.length === 0) || null;
}

export type StaticFiscalReference = {
  found: true;
  value: number;
  unit: 'percent_per_year';
  source_ids: ['receita_federal_anexo_iii'];
  warning: string;
};

export function toFiscalReference(entry: ReceitaFederalEntry): StaticFiscalReference {
  return {
    found: true,
    value: entry.annual_rate_percent,
    unit: 'percent_per_year',
    source_ids: ['receita_federal_anexo_iii'],
    warning: `Referencia fiscal deterministica (IN RFB 1.700/2017, Anexo III - ${entry.bem_tipo}). Vida util fiscal admissivel: ${entry.useful_life_years} anos. Simplificacao do Anexo III; confirme o enquadramento exato do bem com o contador antes de utilizar.`,
  };
}
