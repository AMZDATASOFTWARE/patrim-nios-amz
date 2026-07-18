import {
  Accordion, AccordionItem, AccordionTrigger, AccordionContent,
} from '@/components/ui/accordion';
import SectionTag from '../SectionTag';
import { display, dim } from '../landingTheme';

// Exportado para ser reaproveitado no schema.org FAQPage (LandingSchema.jsx) —
// mesma fonte de verdade, sem duplicar conteúdo.
export const FAQS = [
  {
    q: 'Preciso de cartão de crédito para testar?',
    a: 'Não. O teste de 14 dias é liberado sem cartão. Você só informa uma forma de pagamento se decidir continuar depois do período gratuito.',
  },
  {
    q: 'Já tenho meus ativos numa planilha. Consigo importar?',
    a: 'Sim. A importação por CSV traz seus ativos de uma vez, com os campos por categoria (imóveis, veículos e outros). A exportação também é CSV, então seus dados nunca ficam presos.',
  },
  {
    q: 'Como a IA acessa os meus dados? É seguro?',
    a: 'Cada empresa tem seu espaço isolado (isolamento por workspace, aplicado no servidor). A IA só enxerga os dados da sua conta — nunca de outra empresa — e as permissões de cada usuário são respeitadas. Tudo em conformidade com a LGPD.',
  },
  {
    q: 'Funciona junto com o meu contador e o meu ERP?',
    a: 'Funciona. A depreciação sai nos dois livros (societária e fiscal) e a exportação contábil gera lançamentos em CSV com as contas de débito/crédito que você configurar — pronto para importar em qualquer ERP e entregar ao contador.',
  },
  {
    q: 'Como imprimo as etiquetas com QR Code?',
    a: 'O sistema gera etiquetas profissionais com QR na tela de Etiquetas. Ao escanear, abre uma página pública segura (com token não-enumerável) que mostra os dados do ativo e registra a localização.',
  },
  {
    q: 'A IA está em todos os planos?',
    a: 'Sim. O Assistente Patrimonial e os 6 supervisores do Diário do Patrimônio estão inclusos do Starter ao Enterprise, sem cobrança extra por mensagem.',
  },
  {
    q: 'Posso ter vários usuários com acessos diferentes?',
    a: 'Pode. São 4 papéis (administrador, gerente, visualizador e usuário) com permissões próprias. O número de usuários inclusos varia por plano (3 no Starter, 15 no Professional, ilimitado no Enterprise).',
  },
  {
    q: 'Como funciona a estrutura de filiais e setores?',
    a: 'Filiais (opcional, plano Enterprise) podem ter sub-filiais em hierarquia infinita. Setores são gratuitos em todos os planos, podem ficar na Sede ou numa filial específica, e cada colaborador pode ser vinculado a várias filiais e setores ao mesmo tempo — direto em Cadastros → Setores e Cadastros → Colaboradores.',
  },
  {
    q: 'E se eu quiser cancelar?',
    a: 'O cancelamento é feito por você mesmo, direto no painel de assinatura — sem ligação de retenção. Seus dados continuam exportáveis em CSV a qualquer momento.',
  },
];

export default function FaqSection() {
  return (
    <section id="faq" style={{ padding: '84px 0', borderTop: '1px solid var(--landing-line)' }}>
      <div className="max-w-3xl mx-auto px-4">
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <SectionTag style={{ marginBottom: 20 }}>FAQ</SectionTag>
          <h2 style={{ ...display, fontSize: 'clamp(26px, 4vw, 36px)', fontWeight: 700, margin: 0, color: 'var(--landing-steam)' }}>
            Perguntas de quem está prestes a contratar
          </h2>
        </div>

        <Accordion type="single" collapsible className="w-full">
          {FAQS.map((f, i) => (
            <AccordionItem key={i} value={`item-${i}`} style={{ borderBottom: '1px solid var(--landing-line)' }}>
              <AccordionTrigger style={{ ...display, color: 'var(--landing-steam)', fontSize: 16, fontWeight: 600 }}>
                {f.q}
              </AccordionTrigger>
              <AccordionContent>
                <p style={{ fontSize: 14, color: dim, lineHeight: 1.7, margin: 0 }}>{f.a}</p>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
