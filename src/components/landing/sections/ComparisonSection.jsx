import { Check, Minus, X } from 'lucide-react';
import SectionTag from '../SectionTag';
import { display, dim, dimmer } from '../landingTheme';

// mark: 'yes' | 'partial' | 'no' — cada célula é [marca, texto]
const ROWS = [
  { criterio: 'IA que executa tarefas (não só responde)', nos: ['yes', 'Cadastra, consulta e atualiza — inclusive no WhatsApp'], br: ['no', 'IA só no discurso do ERP'], global: ['partial', 'Busca e autofill assistidos'] },
  { criterio: 'Relatório diário automático por IA', nos: ['yes', 'Diário do Patrimônio, todo dia'], br: ['no', 'Relatórios manuais sob demanda'], global: ['partial', 'Relatórios agendados, sem narrativa'] },
  { criterio: 'Fiscal brasileiro (CIAP, PIS/COFINS)', nos: ['yes', 'Nativo'], br: ['yes', 'Ponto forte deles'], global: ['no', 'Não conhecem a legislação BR'] },
  { criterio: 'Depreciação em 2 livros', nos: ['yes', 'Societária + fiscal, com diferença'], br: ['partial', 'Só em sistemas complexos/caros'], global: ['no', 'Livro único, sem regra BR'] },
  { criterio: 'Preço público + trial self-service', nos: ['yes', 'Preço na página, sem vendedor'], br: ['no', 'Venda 100% consultiva'], global: ['partial', 'Trial, mas preço sob cotação/dólar'] },
  { criterio: 'Inventário pelo celular, sem coletor proprietário', nos: ['yes', 'Qualquer smartphone'], br: ['partial', 'App atrelado a projeto/serviço'], global: ['yes', 'Mobile-first'] },
  { criterio: 'Comece hoje, pelo navegador', nos: ['yes', 'Sem implantação'], br: ['no', 'Projeto de semanas/meses'], global: ['partial', 'Onboarding de dias'] },
  { criterio: 'Assinatura eletrônica no termo', nos: ['yes', 'Dentro do sistema, com hash'], br: ['no', 'Termo é só um relatório para imprimir'], global: ['no', 'Conceito não existe'] },
  { criterio: 'Estrutura organizacional nativa (setor + filiais em hierarquia)', nos: ['yes', 'Setor e filiais com hierarquia infinita, colaborador em várias ao mesmo tempo'], br: ['partial', 'Filial e centro de custo como campos, sem hierarquia nem vínculo múltiplo'], global: ['partial', 'Só via configuração manual de campos custom'] },
];

const MARKS = {
  yes: { icon: Check, color: 'hsl(160 84% 55%)' },
  partial: { icon: Minus, color: 'hsl(38 92% 55%)' },
  no: { icon: X, color: 'hsl(0 84% 60% / 0.8)' },
};

function Cell({ mark, text, highlight }) {
  const M = MARKS[mark];
  return (
    <td style={{ padding: '14px 16px', verticalAlign: 'top', borderTop: '1px solid var(--landing-line)', background: highlight ? 'var(--landing-cyan-soft)' : 'transparent' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <M.icon style={{ width: 16, height: 16, color: M.color, flexShrink: 0, marginTop: 2 }} strokeWidth={2.5} />
        <span style={{ fontSize: 13, color: highlight ? 'var(--landing-steam)' : dim, lineHeight: 1.5 }}>{text}</span>
      </div>
    </td>
  );
}

export default function ComparisonSection() {
  const th = { ...display, padding: '14px 16px', fontSize: 13, fontWeight: 700, textAlign: 'left', color: 'var(--landing-steam)' };
  return (
    <section id="comparativo" style={{ padding: '84px 0', borderTop: '1px solid var(--landing-line)' }}>
      <div className="max-w-6xl mx-auto px-4">
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <SectionTag style={{ marginBottom: 20 }}>Comparativo</SectionTag>
          <h2 style={{ ...display, fontSize: 'clamp(26px, 4vw, 36px)', fontWeight: 700, margin: '0 0 12px', color: 'var(--landing-steam)' }}>
            Software que espera comando vs. equipe que trabalha sozinha
          </h2>
          <p style={{ fontSize: 16, color: dim, maxWidth: 560, margin: '0 auto' }}>
            Onde os sistemas tradicionais brasileiros e as plataformas globais deixam a desejar.
          </p>
        </div>

        <div style={{ overflowX: 'auto', border: '1px solid var(--landing-line)', borderRadius: 'var(--radius-2xl)', background: 'var(--landing-bg-2)' }}>
          <table style={{ width: '100%', minWidth: 720, borderCollapse: 'collapse', fontFamily: 'var(--font-sans)' }}>
            <thead>
              <tr>
                <th style={{ ...th, width: '28%' }}>Critério</th>
                <th style={{ ...th, color: 'var(--landing-cyan)' }}>Patrimônios AMZ</th>
                <th style={th}>Tradicionais BR</th>
                <th style={th}>Plataformas globais</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((r) => (
                <tr key={r.criterio}>
                  <td style={{ padding: '14px 16px', verticalAlign: 'top', borderTop: '1px solid var(--landing-line)', fontSize: 13, fontWeight: 600, color: 'var(--landing-steam)' }}>
                    {r.criterio}
                  </td>
                  <Cell mark={r.nos[0]} text={r.nos[1]} highlight />
                  <Cell mark={r.br[0]} text={r.br[1]} />
                  <Cell mark={r.global[0]} text={r.global[1]} />
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p style={{ textAlign: 'center', fontSize: 12, color: dimmer, marginTop: 16 }}>
          Comparativo por categoria, com base em pesquisa pública de mercado (jul/2026). Não representa endosso de terceiros.
        </p>
      </div>
    </section>
  );
}
