import { Link } from 'react-router-dom';
import { Building2, ArrowLeft } from 'lucide-react';
import AppFooter from '@/components/AppFooter';

// Public Terms of Service. Legal placeholders in [colchetes] must be
// filled/reviewed by counsel before relying on this document.
const PROVIDER = 'AMZ Data Software';
const CNPJ = '53.646.811/0001-20';
const CONTACT_EMAIL = 'ceo@amzdatasoftware.com';
const LAST_UPDATE = '06/07/2026';

function Section({ title, children }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-bold text-slate-900">{title}</h2>
      <div className="space-y-3 text-slate-600 text-sm leading-relaxed">{children}</div>
    </section>
  );
}

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-slate-100">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-blue-700 rounded-lg flex items-center justify-center">
              <Building2 className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-slate-900">Patrimônios AMZ</span>
          </div>
          <Link to="/Dashboard" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Link>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 py-12 space-y-10">
        <header className="space-y-2">
          <h1 className="text-3xl font-extrabold text-slate-900">Termos de Serviço</h1>
          <p className="text-sm text-slate-500">Última atualização: {LAST_UPDATE}</p>
        </header>

        <Section title="1. Aceitação">
          <p>
            Estes Termos regem o uso do sistema <strong>Patrimônios AMZ</strong>, fornecido por
            <strong> {PROVIDER}</strong> (CNPJ {CNPJ}). Ao criar uma conta ou usar o serviço, você
            declara ter lido e concordado com estes Termos e com a <Link to="/privacidade" className="text-blue-700 underline">Política de Privacidade</Link>.
          </p>
        </Section>

        <Section title="2. Descrição do serviço">
          <p>
            O Patrimônios AMZ é uma plataforma de gestão de patrimônio que permite cadastrar ativos,
            calcular depreciação, gerar etiquetas com QR Code, registrar manutenções, gerenciar
            fornecedores e colaboradores e emitir relatórios, conforme o plano contratado.
          </p>
        </Section>

        <Section title="3. Cadastro e responsabilidade da conta">
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Você é responsável pela veracidade dos dados informados e pela guarda das credenciais de acesso.</li>
            <li>O administrador da conta é responsável pelos dados de terceiros (ex.: colaboradores) que inserir, garantindo ter base legal para tanto.</li>
            <li>É proibido usar o serviço para fins ilícitos ou que violem direitos de terceiros.</li>
          </ul>
        </Section>

        <Section title="4. Planos, pagamento e período de avaliação">
          <ul className="list-disc pl-5 space-y-1.5">
            <li>O serviço é oferecido em planos com limites de usuários e de ativos, descritos na página de Planos.</li>
            <li>Novas contas podem contar com um período de avaliação gratuito. Após o término, é necessário assinar um plano para continuar acessando o sistema.</li>
            <li>As cobranças são recorrentes (mensais ou anuais) e processadas pela <strong>Stripe</strong>. A assinatura renova automaticamente até que seja cancelada.</li>
            <li>Você pode cancelar a qualquer momento pelo portal de assinatura; o acesso permanece até o fim do período já pago.</li>
            <li>Alterações de preço serão comunicadas com antecedência razoável e passarão a valer no ciclo de cobrança seguinte.</li>
          </ul>
        </Section>

        <Section title="5. Disponibilidade">
          <p>
            Empregamos esforços para manter o serviço disponível, mas ele é fornecido "no estado em
            que se encontra". Podemos realizar manutenções e atualizações que temporariamente afetem o
            acesso.
          </p>
        </Section>

        <Section title="6. Dados do cliente">
          <p>
            Os dados inseridos pertencem ao cliente. Atuamos como operador para os dados de terceiros
            tratados por sua conta e como controlador para os dados de cadastro e cobrança, conforme a
            <Link to="/privacidade" className="text-blue-700 underline"> Política de Privacidade</Link>.
            Após o encerramento da conta, os dados podem ser eliminados respeitados os prazos legais.
          </p>
        </Section>

        <Section title="7. Limitação de responsabilidade">
          <p>
            Na máxima extensão permitida pela lei, o {PROVIDER} não responde por danos indiretos,
            lucros cessantes ou perda de dados decorrentes do uso ou da impossibilidade de uso do
            serviço. O cliente é responsável por manter cópias e conferências dos seus próprios
            registros contábeis e patrimoniais.
          </p>
        </Section>

        <Section title="8. Rescisão">
          <p>
            Você pode encerrar sua conta a qualquer momento. Podemos suspender ou encerrar o acesso em
            caso de violação destes Termos ou de falta de pagamento, mediante aviso quando cabível.
          </p>
        </Section>

        <Section title="9. Foro e contato">
          <p>
            Estes Termos são regidos pelas leis brasileiras. Fica eleito o foro do domicílio do
            CONTRATANTE, salvo disposição legal em contrário. Dúvidas:
            {' '}<a href={`mailto:${CONTACT_EMAIL}`} className="text-blue-700 underline">{CONTACT_EMAIL}</a>.
          </p>
        </Section>

        <footer className="pt-6 border-t border-slate-200 text-sm text-slate-500">
          <Link to="/privacidade" className="text-blue-700 underline">Política de Privacidade</Link>
        </footer>
      </main>

      <AppFooter variant="band" />
    </div>
  );
}
