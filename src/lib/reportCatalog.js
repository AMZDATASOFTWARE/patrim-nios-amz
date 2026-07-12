import jsPDF from 'jspdf';
import moment from 'moment';
import { formatCurrency, getAssetDepreciation } from './depreciation';

/**
 * Motor genérico de relatórios em PDF — usado pelo catálogo de relatórios
 * um-clique (inspirado no menu de relatórios do PatPro). Uma única função de
 * tabela + cabeçalho/rodapé/assinatura parametrizados pelo Workspace atende
 * todos os relatórios do catálogo; cada entrada só declara colunas e como
 * agrupar/filtrar os dados já carregados (nenhuma query nova por relatório).
 */

function drawLetterhead(doc, workspace, title, orientation) {
  const pageWidth = orientation === 'landscape' ? 297 : 210;
  let y = 14;
  doc.setFontSize(9);
  doc.setTextColor(90);
  if (workspace?.report_letterhead_text) {
    doc.text(workspace.report_letterhead_text, 14, y);
    y += 6;
  }
  doc.setTextColor(0);
  doc.setFontSize(15);
  doc.setFont(undefined, 'bold');
  doc.text(title, 14, y + 4);
  doc.setFont(undefined, 'normal');
  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text(`Gerado em ${moment().format('DD/MM/YYYY HH:mm')}`, 14, y + 10);
  doc.setTextColor(0);
  doc.setDrawColor(200);
  doc.line(14, y + 14, pageWidth - 14, y + 14);
  return y + 22;
}

function drawFooterAndSignature(doc, workspace) {
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();
    doc.setFontSize(7);
    doc.setTextColor(140);
    if (workspace?.report_footer_text) {
      doc.text(workspace.report_footer_text.substring(0, 110), 14, pageHeight - 8);
    }
    doc.text(`Página ${i} de ${pageCount}`, pageWidth - 32, pageHeight - 8);
    doc.setTextColor(0);
  }
  if (workspace?.report_responsible_name || workspace?.report_signature_url) {
    doc.setPage(pageCount);
    const pageHeight = doc.internal.pageSize.getHeight();
    const y = pageHeight - 26;
    if (workspace.report_signature_url) {
      try { doc.addImage(workspace.report_signature_url, 'PNG', 14, y - 14, 42, 14); } catch (_) { /* imagem invalida, ignora */ }
    }
    doc.setFontSize(8);
    doc.text('_______________________________', 14, y);
    if (workspace.report_responsible_name) doc.text(workspace.report_responsible_name, 14, y + 5);
  }
}

function drawTable(doc, startY, columns, rows, orientation) {
  const pageWidth = orientation === 'landscape' ? 297 : 210;
  const pageHeight = orientation === 'landscape' ? 210 : 297;
  const marginLeft = 14;
  const usableWidth = pageWidth - marginLeft * 2;
  const totalWeight = columns.reduce((s, c) => s + (c.width || 1), 0);
  const colWidths = columns.map((c) => ((c.width || 1) / totalWeight) * usableWidth);

  let y = startY;
  const drawHeader = () => {
    doc.setFontSize(8);
    doc.setFont(undefined, 'bold');
    let x = marginLeft;
    columns.forEach((c, i) => { doc.text(c.label, x, y); x += colWidths[i]; });
    doc.setFont(undefined, 'normal');
    y += 5;
    doc.setDrawColor(220);
    doc.line(marginLeft, y - 3, pageWidth - marginLeft, y - 3);
  };
  drawHeader();

  if (rows.length === 0) {
    doc.setFontSize(9);
    doc.setTextColor(140);
    doc.text('Nenhum registro encontrado para este relatório.', marginLeft, y + 4);
    doc.setTextColor(0);
    return;
  }

  rows.forEach((row) => {
    if (y > pageHeight - 24) {
      doc.addPage();
      y = 20;
      drawHeader();
    }
    let x = marginLeft;
    columns.forEach((c, i) => {
      const val = c.get(row);
      const text = String(val === undefined || val === null || val === '' ? '-' : val);
      doc.setFontSize(8);
      doc.text(text.substring(0, Math.floor(colWidths[i] / 1.7)), x, y);
      x += colWidths[i];
    });
    y += 5;
  });
}

/** Gera e baixa um PDF tabular padronizado (cabeçalho/rodapé/assinatura do workspace). */
export function generateTablePDF({ title, columns, rows, workspace, orientation = 'landscape' }) {
  const doc = new jsPDF({ orientation });
  const startY = drawLetterhead(doc, workspace, title, orientation);
  drawTable(doc, startY, columns, rows, orientation);
  drawFooterAndSignature(doc, workspace);
  const filename = title.toLowerCase().replace(/[^a-z0-9]+/g, '_');
  doc.save(`${filename}_${moment().format('YYYYMMDD')}.pdf`);
}

/** Ficha Individual — folha detalhada de 1 ativo (retrato, layout label/valor). */
export function generateAssetSheet({ asset, workspace, orientation = 'portrait' }) {
  const doc = new jsPDF({ orientation });
  const title = `Ficha Individual — ${asset.name || 'Ativo'}`;
  let y = drawLetterhead(doc, workspace, title, orientation);
  const dep = getAssetDepreciation(asset);

  const fields = [
    ['Plaqueta / Código', asset.plaqueta || '-'],
    ['Categoria', asset.category || '-'],
    ['Descrição', asset.description || '-'],
    ['Localização', asset.location || '-'],
    ['Centro de Custo', asset.cost_center || '-'],
    ['Status', asset.status || '-'],
    ['Estado de Conservação', asset.conservation_state || '-'],
    ['Nº de Série', asset.serial_number || '-'],
    ['Data de Aquisição', asset.purchase_date ? moment(asset.purchase_date).format('DD/MM/YYYY') : '-'],
    ['Valor de Aquisição', formatCurrency(asset.acquisition_value)],
    ['Valor Contábil Atual', formatCurrency(dep.currentValue)],
    ['Depreciação Acumulada', formatCurrency(dep.accumulated)],
    ['Fornecedor', asset.supplier_name || '-'],
    ['Nota Fiscal', asset.fiscal_document || '-'],
    ['Garantia até', asset.warranty_expiry_date ? moment(asset.warranty_expiry_date).format('DD/MM/YYYY') : '-'],
  ];

  doc.setFontSize(10);
  fields.forEach(([label, value]) => {
    if (y > (orientation === 'landscape' ? 190 : 270)) { doc.addPage(); y = 20; }
    doc.setFont(undefined, 'bold');
    doc.text(`${label}:`, 14, y);
    doc.setFont(undefined, 'normal');
    doc.text(String(value), 75, y);
    y += 7;
  });

  drawFooterAndSignature(doc, workspace);
  doc.save(`ficha_${(asset.plaqueta || asset.id || 'ativo')}_${moment().format('YYYYMMDD')}.pdf`);
}

// --- Definições declarativas do catálogo ------------------------------

const ASSET_COLS_BASE = [
  { label: 'Ativo', width: 3, get: (a) => a.name },
  { label: 'Plaqueta', width: 1.4, get: (a) => a.plaqueta || '' },
  { label: 'Categoria', width: 1.8, get: (a) => a.category || '' },
];

function assetValueCols() {
  return [
    { label: 'Valor Aquisição', width: 1.8, get: (a) => formatCurrency(a.acquisition_value) },
    { label: 'Valor Atual', width: 1.8, get: (a) => formatCurrency(getAssetDepreciation(a).currentValue) },
  ];
}

function groupByField(assets, field, fallback) {
  const groups = {};
  assets.forEach((a) => {
    const key = (a[field] || '').trim() || fallback;
    if (!groups[key]) groups[key] = [];
    groups[key].push(a);
  });
  return groups;
}

function flattenGrouped(groups, groupLabel) {
  const rows = [];
  Object.keys(groups).sort().forEach((key) => {
    groups[key].forEach((a) => rows.push({ ...a, [groupLabel]: key }));
  });
  return rows;
}

// Resolve o nome do Setor de um ativo (sector_id -> Sector.name). Ativos sem
// sector_id mas com o cost_center legado preenchido caem num bucket "legado"
// separado (nao some do relatorio, so fica marcado como pendente de migracao
// pro novo modelo). Mesmo padrao de lookup client-side ja usado em bens_por_grupo.
function resolveSectorLabel(asset, sectors) {
  if (asset.sector_id) {
    const sector = sectors.find((s) => s.id === asset.sector_id);
    return sector ? sector.name : 'Setor removido';
  }
  if ((asset.cost_center || '').trim()) {
    return `(sem setor — centro de custo legado: ${asset.cost_center.trim()})`;
  }
  return 'Sem setor';
}

function groupBySector(assets, sectors) {
  const groups = {};
  assets.forEach((a) => {
    const key = resolveSectorLabel(a, sectors);
    if (!groups[key]) groups[key] = [];
    groups[key].push(a);
  });
  return groups;
}

/**
 * Catálogo de relatórios — inspirado no menu real do PatPro (lista fornecida
 * pelo usuário). Cada entrada usa o mesmo dataset já carregado em Reports.jsx
 * (nenhuma query nova); `build(ctx)` retorna {columns, rows} prontos para
 * generateTablePDF. Fora do catálogo, por decisão do usuário: "Consolidado -
 * Escolas Estaduais MG" (customização de cliente do concorrente, não é
 * arquitetura de produto) e o módulo de Locação (roadmap Onda 8).
 */
export const REPORT_CATALOG = [
  {
    id: 'relacao_geral',
    group: 'Cadastro',
    title: 'Relação Geral',
    description: 'Todos os ativos, com valores contábeis',
    build: ({ assets }) => ({
      columns: [...ASSET_COLS_BASE, { label: 'Local', width: 1.8, get: (a) => a.location || '' }, ...assetValueCols()],
      rows: assets,
    }),
  },
  {
    id: 'bens_por_setor',
    group: 'Cadastro',
    title: 'Bens por Setor',
    description: 'Agrupado por setor cadastrado (ativos ainda sem setor aparecem à parte, com o centro de custo legado se houver)',
    build: ({ assets, sectors = [] }) => ({
      columns: [
        { label: 'Setor', width: 2, get: (a) => a.setor },
        ...ASSET_COLS_BASE,
        ...assetValueCols(),
      ],
      rows: flattenGrouped(groupBySector(assets, sectors), 'setor'),
    }),
  },
  {
    id: 'bens_por_categoria',
    group: 'Cadastro',
    title: 'Bens por Categoria',
    description: 'Agrupado por categoria de patrimônio',
    build: ({ assets }) => ({
      columns: [
        { label: 'Categoria', width: 2, get: (a) => a.categoriaGrupo },
        { label: 'Ativo', width: 3, get: (a) => a.name },
        { label: 'Plaqueta', width: 1.4, get: (a) => a.plaqueta || '' },
        ...assetValueCols(),
      ],
      rows: flattenGrouped(groupByField(assets, 'category', 'Sem categoria'), 'categoriaGrupo'),
    }),
  },
  {
    id: 'bens_por_grupo',
    group: 'Cadastro',
    title: 'Bens por Grupo (Filial)',
    description: 'Agrupado por filial/unidade',
    build: ({ assets, branches }) => {
      const branchName = (id) => branches.find((b) => b.id === id)?.name || 'Sem filial';
      const withGroup = assets.map((a) => ({ ...a, grupo: branchName(a.branch_id) }));
      return {
        columns: [
          { label: 'Grupo (Filial)', width: 2, get: (a) => a.grupo },
          ...ASSET_COLS_BASE,
          ...assetValueCols(),
        ],
        rows: withGroup.sort((a, b) => a.grupo.localeCompare(b.grupo)),
      };
    },
  },
  {
    id: 'bens_por_localizacao',
    group: 'Cadastro',
    title: 'Bens por Localização',
    description: 'Agrupado por localização física',
    build: ({ assets }) => ({
      columns: [
        { label: 'Localização', width: 2, get: (a) => a.localizacaoGrupo },
        ...ASSET_COLS_BASE,
        ...assetValueCols(),
      ],
      rows: flattenGrouped(groupByField(assets, 'location', 'Sem localização'), 'localizacaoGrupo'),
    }),
  },
  {
    id: 'bens_por_funcionario',
    group: 'Cadastro',
    title: 'Bens por Funcionário',
    description: 'Ativos atribuídos, por colaborador responsável (termo de responsabilidade ativo)',
    build: ({ assets, assignments }) => {
      // AssetAssignment já guarda collaborator_name denormalizado — sem join extra.
      const activeByAsset = {};
      assignments.filter((x) => x.status === 'Ativo').forEach((x) => { activeByAsset[x.asset_id] = x; });
      const rows = assets.map((a) => ({
        ...a,
        funcionario: activeByAsset[a.id]?.collaborator_name || 'Não atribuído',
      }));
      return {
        columns: [
          { label: 'Funcionário', width: 2, get: (a) => a.funcionario },
          ...ASSET_COLS_BASE,
        ],
        rows: rows.sort((a, b) => a.funcionario.localeCompare(b.funcionario)),
      };
    },
  },
  {
    id: 'depreciacao_acumulada',
    group: 'Fiscal & Contábil',
    title: 'Depreciação Acumulada',
    description: 'Todos os ativos, ordenados pela depreciação acumulada',
    build: ({ assets }) => {
      const withDep = assets.map((a) => ({ ...a, dep: getAssetDepreciation(a) }));
      withDep.sort((a, b) => b.dep.accumulated - a.dep.accumulated);
      return {
        columns: [
          ...ASSET_COLS_BASE,
          { label: 'Vlr. Aquisição', width: 1.6, get: (a) => formatCurrency(a.acquisition_value) },
          { label: 'Dep. Acumulada', width: 1.6, get: (a) => formatCurrency(a.dep.accumulated) },
          { label: 'Valor Atual', width: 1.6, get: (a) => formatCurrency(a.dep.currentValue) },
          { label: '% Depreciado', width: 1.2, get: (a) => `${a.dep.depPct.toFixed(1)}%` },
        ],
        rows: withDep,
      };
    },
  },
  {
    id: 'reavaliacoes',
    group: 'Fiscal & Contábil',
    title: 'Reavaliações',
    description: 'Histórico de reavaliações de valor',
    build: ({ revaluations }) => ({
      columns: [
        { label: 'Data', width: 1.2, get: (r) => moment(r.revaluation_date).format('DD/MM/YYYY') },
        { label: 'Ativo', width: 2.4, get: (r) => r.asset_name },
        { label: 'Valor Anterior', width: 1.6, get: (r) => formatCurrency(r.previous_value) },
        { label: 'Valor Avaliado', width: 1.6, get: (r) => formatCurrency(r.appraised_value) },
        { label: 'Ganho', width: 1.4, get: (r) => r.gain_amount ? formatCurrency(r.gain_amount) : '-' },
        { label: 'Perda', width: 1.4, get: (r) => r.loss_amount ? formatCurrency(r.loss_amount) : '-' },
      ],
      rows: revaluations,
    }),
  },
  {
    id: 'baixa_alienacao',
    group: 'Baixa & Alienação',
    title: 'Baixa / Alienação de Patrimônio',
    description: 'Todas as saídas de patrimônio registradas',
    build: ({ disposals }) => ({
      columns: [
        { label: 'Data', width: 1.2, get: (d) => moment(d.disposal_date).format('DD/MM/YYYY') },
        { label: 'Ativo', width: 2.4, get: (d) => d.asset_name },
        { label: 'Tipo', width: 1.2, get: (d) => (d.disposal_type === 'alienacao' ? 'Alienação' : 'Baixa') },
        { label: 'Motivo / Comprador', width: 2.2, get: (d) => d.disposal_type === 'alienacao' ? (d.buyer_name || '') : (d.reason || '') },
        { label: 'Valor de Venda', width: 1.4, get: (d) => d.sale_value ? formatCurrency(d.sale_value) : '-' },
      ],
      rows: disposals,
    }),
  },
  {
    id: 'candidatos_baixa',
    group: 'Baixa & Alienação',
    title: 'Relação de Bens para Baixa',
    description: 'Ativos totalmente depreciados, ainda ativos (candidatos)',
    build: ({ assets }) => {
      const candidates = assets.filter((a) => a.status === 'Ativo' && getAssetDepreciation(a).depPct >= 100);
      return {
        columns: [
          ...ASSET_COLS_BASE,
          { label: 'Valor Residual', width: 1.6, get: (a) => formatCurrency(a.residual_value || 0) },
          { label: 'Data Aquisição', width: 1.4, get: (a) => a.purchase_date ? moment(a.purchase_date).format('DD/MM/YYYY') : '' },
        ],
        rows: candidates,
      };
    },
  },
  {
    id: 'emprestimos',
    group: 'Operação',
    title: 'Empréstimos',
    description: 'Empréstimos temporários de ativos',
    build: ({ loans }) => ({
      columns: [
        { label: 'Ativo', width: 2.2, get: (l) => l.asset_name },
        { label: 'Tomador', width: 2, get: (l) => l.borrower_name },
        { label: 'Data', width: 1.2, get: (l) => moment(l.loan_date).format('DD/MM/YYYY') },
        { label: 'Previsão Devolução', width: 1.4, get: (l) => moment(l.expected_return_date).format('DD/MM/YYYY') },
        { label: 'Situação', width: 1.2, get: (l) => ({ emprestado: 'Emprestado', devolvido: 'Devolvido', atrasado: 'Atrasado' }[l.status] || l.status) },
      ],
      rows: loans,
    }),
  },
  {
    id: 'centros_custo',
    group: 'Cadastro',
    title: 'Relação de Setores',
    description: 'Setores cadastrados e quantidade de ativos vinculados',
    build: ({ assets, sectors = [] }) => {
      const groups = groupBySector(assets, sectors);
      const rows = Object.keys(groups).sort().map((key) => ({
        setor: key,
        qtd: groups[key].length,
        valor: groups[key].reduce((s, a) => s + (a.acquisition_value || 0), 0),
      }));
      return {
        columns: [
          { label: 'Setor', width: 3, get: (r) => r.setor },
          { label: 'Qtd. de Ativos', width: 1.4, get: (r) => r.qtd },
          { label: 'Valor Total', width: 1.6, get: (r) => formatCurrency(r.valor) },
        ],
        rows,
      };
    },
  },
  {
    id: 'inventario_localizados',
    group: 'Inventário',
    title: 'Inventário — Bens Localizados',
    description: 'Itens já conferidos e encontrados nas contagens (inclui divergentes)',
    build: ({ inventoryItems }) => ({
      columns: [
        { label: 'Ativo', width: 2.4, get: (i) => i.asset_name },
        { label: 'Plaqueta', width: 1.4, get: (i) => i.plaqueta || '' },
        { label: 'Local Esperado', width: 1.8, get: (i) => i.expected_location || '' },
        { label: 'Local Encontrado', width: 1.8, get: (i) => i.found_location || i.expected_location || '' },
        { label: 'Conferido em', width: 1.2, get: (i) => i.counted_at ? moment(i.counted_at).format('DD/MM/YYYY') : '' },
      ],
      rows: inventoryItems.filter((i) => i.status === 'encontrado' || i.status === 'divergente'),
    }),
  },
  {
    id: 'inventario_nao_localizados',
    group: 'Inventário',
    title: 'Inventário — Bens Não Localizados',
    description: 'Itens ainda pendentes de conferência ou não encontrados',
    build: ({ inventoryItems }) => ({
      columns: [
        { label: 'Ativo', width: 2.4, get: (i) => i.asset_name },
        { label: 'Plaqueta', width: 1.4, get: (i) => i.plaqueta || '' },
        { label: 'Local Esperado', width: 2, get: (i) => i.expected_location || '' },
        { label: 'Situação', width: 1.4, get: (i) => ({ pendente: 'Pendente', nao_encontrado: 'Não encontrado' }[i.status] || i.status) },
      ],
      rows: inventoryItems.filter((i) => i.status === 'pendente' || i.status === 'nao_encontrado'),
    }),
  },
];

export const REPORT_GROUPS = ['Cadastro', 'Fiscal & Contábil', 'Baixa & Alienação', 'Operação', 'Inventário'];
