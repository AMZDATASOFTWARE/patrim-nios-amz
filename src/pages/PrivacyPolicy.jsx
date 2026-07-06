import { Link } from 'react-router-dom';
import { Building2, ArrowLeft } from 'lucide-react';

// Public LGPD privacy policy. Grounded in what the app actually collects.
// Legal placeholders in [colchetes] must be filled/reviewed by the controller.
const CONTROLLER = 'AMZ Data Software';
const CNPJ = '[preencher CNPJ]';
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

export default function PrivacyPolicy() {
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
          <h1 className="text-3xl font-extrabold text-slate-900">Política de Privacidade</h1>
          <p className="text-sm text-slate-500">Última atualização: {LAST_UPDATE}</p>
        </header>

        <Section title="1. Quem somos (Controlador)">
          <p>
            Esta política descreve como <strong>{CONTROLLER}</strong> (CNPJ {CNPJ}), responsável pelo
            sistema <strong>Patrimônios AMZ</strong>, trata dados pessoais em conformidade com a Lei
            Geral de Proteção de Dados (Lei nº 13.709/2018 — LGPD).
          </p>
          <p>
            Encarregado / contato para assuntos de privacidade: <a href={`mailto:${CONTACT_EMAIL}`} className="text-blue-700 underline">{CONTACT_EMAIL}</a>.
          </p>
        </Section>

        <Section title="2. Dados que coletamos">
          <p>O sistema é uma ferramenta de gestão patrimonial usada por empresas. Tratamos:</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li><strong>Dados de cadastro da conta:</strong> nome, e-mail, telefone e a empresa/CNPJ informados pelo responsável pela conta.</li>
            <li><strong>Dados de colaboradores</strong> inseridos pelo cliente para termos de responsabilidade: nome, CPF, e-mail, telefone, cargo e departamento.</li>
            <li><strong>Dados de ativos:</strong> descrição, valores, localização, notas fiscais e documentos anexados pelo cliente.</li>
            <li><strong>Dados de acesso via QR Code:</strong> ao escanear a etiqueta de um ativo, registramos data/hora, endereço de rede (IP) e informações básicas do dispositivo. A <strong>localização geográfica (GPS)</strong> só é coletada com a permissão explícita do navegador no momento do acesso.</li>
            <li><strong>Dados de pagamento:</strong> processados diretamente pela <strong>Stripe</strong>. Não armazenamos números de cartão em nossos servidores.</li>
          </ul>
        </Section>

        <Section title="3. Para que usamos os dados (finalidade e base legal)">
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Prestar o serviço de gestão de patrimônio contratado (execução de contrato — Art. 7º, V).</li>
            <li>Registrar termos de responsabilidade e a rastreabilidade de ativos, inclusive scans de QR Code, para proteção do patrimônio do cliente (legítimo interesse — Art. 7º, IX).</li>
            <li>Processar cobranças e gerenciar assinaturas (execução de contrato).</li>
            <li>Cumprir obrigações legais e regulatórias e atender solicitações de autoridades (Art. 7º, II).</li>
          </ul>
          <p>Não vendemos dados pessoais e não os utilizamos para publicidade de terceiros.</p>
        </Section>

        <Section title="4. Compartilhamento e operadores">
          <p>Compartilhamos dados apenas com operadores necessários à prestação do serviço:</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li><strong>Base44</strong> — infraestrutura de hospedagem e banco de dados da aplicação.</li>
            <li><strong>Stripe</strong> — processamento de pagamentos e assinaturas.</li>
            <li><strong>OpenStreetMap / Nominatim</strong> — conversão de coordenadas em endereço (geocodificação reversa) quando o acesso via QR Code ocorre com localização autorizada.</li>
          </ul>
        </Section>

        <Section title="5. Isolamento entre empresas">
          <p>
            Cada empresa (workspace) acessa exclusivamente os seus próprios dados. O sistema aplica
            isolamento por empresa no servidor, de modo que usuários de uma conta não têm acesso aos
            dados de outra.
          </p>
        </Section>

        <Section title="6. Retenção e eliminação">
          <p>
            Mantemos os dados enquanto a conta estiver ativa e pelo prazo necessário ao cumprimento
            de obrigações legais. Dados de acesso via QR Code (IP, dispositivo e localização) são
            mantidos para fins de rastreabilidade do ativo e podem ser anonimizados ou eliminados
            mediante solicitação, respeitados os prazos legais.
          </p>
        </Section>

        <Section title="7. Seus direitos (LGPD Art. 18)">
          <p>Você pode solicitar, a qualquer momento: confirmação de tratamento, acesso, correção, anonimização, portabilidade, eliminação e informações sobre compartilhamento dos seus dados.</p>
          <p>Para exercer esses direitos, escreva para <a href={`mailto:${CONTACT_EMAIL}`} className="text-blue-700 underline">{CONTACT_EMAIL}</a>.</p>
        </Section>

        <Section title="8. Segurança">
          <p>
            Adotamos medidas técnicas e organizacionais para proteger os dados, incluindo controle de
            acesso por empresa e por perfil, tráfego criptografado (HTTPS) e restrição de operações
            sensíveis ao servidor. Nenhum sistema é totalmente imune a incidentes; em caso de violação
            relevante, seguiremos os procedimentos exigidos pela LGPD.
          </p>
        </Section>

        <Section title="9. Alterações">
          <p>Podemos atualizar esta política. A data da última revisão é indicada no topo desta página.</p>
        </Section>

        <footer className="pt-6 border-t border-slate-200 text-sm text-slate-500">
          <Link to="/termos" className="text-blue-700 underline">Termos de Serviço</Link>
        </footer>
      </main>
    </div>
  );
}
