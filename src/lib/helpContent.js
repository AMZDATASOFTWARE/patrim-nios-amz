import {
  Rocket, Package, Wrench, Calculator, Sparkles, UserCog, CreditCard,
} from 'lucide-react';

/**
 * Conteúdo estático da Central de Ajuda (v1 — hardcoded, sem entidade Base44).
 * Editar aqui para atualizar FAQ/guias; não requer mudança de RLS/backend.
 */
export const FAQ_CATEGORIES = [
  {
    id: 'primeiros-passos',
    label: 'Primeiros Passos',
    icon: Rocket,
    items: [
      {
        q: 'Como convido outras pessoas da minha empresa para o sistema?',
        a: 'Vá em Cadastros → Usuários e clique em "Convidar". A pessoa recebe um e-mail e, ao aceitar, é automaticamente vinculada ao seu workspace com o papel que você escolher. O número de usuários incluídos depende do seu plano (3 no Starter, 15 no Professional, ilimitado no Enterprise).',
      },
      {
        q: 'Preciso cadastrar filiais antes de começar?',
        a: 'Não. Filiais são opcionais e só aparecem no cadastro de ativos se você tiver criado alguma em Cadastros → Filiais (recurso do plano Enterprise). Setores (Cadastros → Setores), por outro lado, são gratuitos em todos os planos e não dependem de nenhuma filial cadastrada.',
      },
      {
        q: 'Como configuro os dados da minha empresa (CNPJ, logo)?',
        a: 'Em Cadastros → Empresa você edita razão social, CNPJ, endereço e logo. Esses dados aparecem nos relatórios, no termo de responsabilidade e na página pública de scan dos seus ativos.',
      },
    ],
  },
  {
    id: 'ativos-inventario',
    label: 'Ativos & Inventário',
    icon: Package,
    items: [
      {
        q: 'Como cadastro um ativo?',
        a: 'Em Patrimônio → Ativos, clique em "Novo Ativo". Preencha nome, categoria, valor, data de compra e, se quiser, anexe fotos e documentos. O sistema já calcula a depreciação automaticamente a partir do cadastro.',
      },
      {
        q: 'Como funciona a etiqueta com QR Code?',
        a: 'Cada ativo cadastrado ganha um código único. Em Patrimônio → Etiquetas/QR você gera e imprime a etiqueta. Ao escanear, abre uma página pública segura com os dados do ativo — sem precisar de login.',
      },
      {
        q: 'Como faço inventário físico dos ativos?',
        a: 'Em Patrimônio → Inventário, inicie uma contagem e use a câmera do celular para ler QR Codes ou códigos de barras. Sem sinal de internet, os itens ficam numa fila local e sincronizam automaticamente quando a conexão voltar. Leitores RFID em modo teclado (HID) também funcionam — basta apontar e o código entra sozinho no campo de leitura.',
      },
      {
        q: 'Como transfiro um ativo de responsável ou local?',
        a: 'Em Patrimônio → Transferências, abra uma solicitação. O destinatário recebe um e-mail e precisa aceitar formalmente (chain-of-custody) antes da transferência valer — o histórico de localização é atualizado automaticamente após o aceite.',
      },
      {
        q: 'O que é o termo de responsabilidade com assinatura?',
        a: 'Ao atribuir um ativo a um colaborador, você pode gerar um termo em PDF com assinatura eletrônica coletada na tela (desenho + hash SHA-256, não é certificado ICP-Brasil). O termo fica anexado ao histórico do ativo.',
      },
    ],
  },
  {
    id: 'manutencao-contratos',
    label: 'Manutenção & Contratos',
    icon: Wrench,
    items: [
      {
        q: 'Como registro uma manutenção?',
        a: 'Em Manutenção & Contratos → Manutenções, registre o tipo (preventiva/corretiva), técnico responsável, peças usadas e um checklist simples. O ativo fica marcado como "em manutenção" até você concluir o registro.',
      },
      {
        q: 'O sistema avisa quando um contrato ou garantia está vencendo?',
        a: 'Sim. Alertas automáticos por e-mail são enviados em 30, 15, 7 e 1 dia antes do vencimento de garantias, revisões, IPVA e contratos — sem precisar configurar nada.',
      },
    ],
  },
  {
    id: 'fiscal-contabil',
    label: 'Fiscal & Contábil',
    icon: Calculator,
    items: [
      {
        q: 'Como funciona a depreciação em dois livros?',
        a: 'O sistema calcula a depreciação societária e a fiscal em paralelo (taxas e datas podem divergir). Em Fiscal & Contábil → Depreciação você vê as duas colunas e uma aba "Diferença" mostrando onde elas não batem — útil para o fechamento contábil.',
      },
      {
        q: 'O que são os Créditos CIAP?',
        a: 'CIAP é o crédito de ICMS sobre ativo imobilizado, apropriado em 1/48 por mês. Em Fiscal & Contábil → Créditos CIAP o sistema calcula e registra a apropriação mensal automaticamente, com exportação em CSV. Os percentuais padrão são uma simplificação — revise com seu contador antes de uma apuração real.',
      },
      {
        q: 'Como exporto os lançamentos contábeis para o meu ERP?',
        a: 'Em Fiscal & Contábil → Exportação Contábil, configure as regras de conta débito/crédito por categoria e setor. O sistema gera um CSV com os lançamentos de depreciação do período, pronto para importar em qualquer ERP.',
      },
    ],
  },
  {
    id: 'assistente-ia',
    label: 'Assistente de IA',
    icon: Sparkles,
    items: [
      {
        q: 'O que o Assistente Patrimonial faz?',
        a: 'Você conversa em português, pelo chat do sistema ou pelo WhatsApp, e ele executa: cadastra ativos, consulta contratos, agenda manutenções e responde dúvidas sobre seus dados — respeitando os limites do seu plano e as permissões do seu papel.',
      },
      {
        q: 'O que é o Diário do Patrimônio?',
        a: 'Todos os dias, 6 supervisores de IA (um por área: Ativos, Operação de Campo, Manutenção & Contratos, Fiscal & Contábil, Cadastros e Governança) publicam uma manchete, uma análise e os KPIs mais relevantes daquele domínio. Acesse em Visão Geral → Diário do Patrimônio.',
      },
      {
        q: 'A IA vê dados de outras empresas?',
        a: 'Não. Cada workspace é isolado — a IA só enxerga os dados da sua própria empresa, nunca de outro cliente do sistema. O Assistente está incluído em todos os planos, sem cobrança extra por mensagem.',
      },
    ],
  },
  {
    id: 'conta-permissoes',
    label: 'Conta & Permissões',
    icon: UserCog,
    items: [
      {
        q: 'Quais são os papéis de usuário disponíveis?',
        a: 'Administrador (acesso total), Gerente (gerencia ativos e operação, não gerencia usuários/cobrança), Visualizador (leitura de tudo) e Usuário (vê só os ativos atribuídos a si). Você define o papel de cada pessoa ao convidar ou depois, em Cadastros → Usuários.',
      },
      {
        q: 'Um usuário comum consegue ver os dados de todos os colaboradores?',
        a: 'Não. O papel "Usuário" só enxerga os próprios registros (inclusive CPF), por segurança e privacidade (LGPD). Administradores, gerentes e visualizadores continuam com visão completa da empresa.',
      },
      {
        q: 'Como altero minha senha ou dados de login?',
        a: 'O login é gerenciado pela plataforma de autenticação do sistema — use a opção "Esqueci minha senha" na tela de login para redefinir o acesso.',
      },
    ],
  },
  {
    id: 'plano-cobranca',
    label: 'Plano & Cobrança',
    icon: CreditCard,
    items: [
      {
        q: 'Como faço upgrade ou downgrade do meu plano?',
        a: 'Em Administração → Plano & Cobrança, clique em "Gerenciar assinatura" para abrir o portal seguro do Stripe, onde você troca de plano, muda a forma de pagamento ou visualiza faturas anteriores.',
      },
      {
        q: 'Como cancelo minha assinatura?',
        a: 'Pelo mesmo portal do Stripe (Plano & Cobrança → Gerenciar assinatura) — sem precisar falar com ninguém. O acesso continua ativo até o fim do período já pago.',
      },
      {
        q: 'O que acontece se o pagamento falhar?',
        a: 'Você recebe um e-mail avisando e tem uma janela para regularizar antes da conta ser suspensa. Durante a suspensão, os dados continuam seguros — só a escrita fica bloqueada até o pagamento ser resolvido.',
      },
    ],
  },
];

export const GUIDES = [
  {
    id: 'primeiro-ativo',
    title: 'Como cadastrar seu primeiro ativo',
    desc: 'Do zero até o ativo aparecer no dashboard, com depreciação calculada.',
    icon: Package,
    steps: [
      'Vá em Patrimônio → Ativos e clique em "Novo Ativo".',
      'Preencha nome, categoria, valor de compra e data de aquisição.',
      'Opcional: anexe fotos, documentos e defina o responsável.',
      'Salve — o sistema já calcula a depreciação e gera um token de QR Code automaticamente.',
    ],
    ctaLabel: 'Ir para Ativos',
    ctaHref: '/Assets',
  },
  {
    id: 'etiquetas-qr',
    title: 'Como gerar e imprimir etiquetas QR',
    desc: 'Etiquetas profissionais para identificar e rastrear seus ativos fisicamente.',
    icon: Package,
    steps: [
      'Vá em Patrimônio → Etiquetas/QR.',
      'Selecione os ativos que deseja etiquetar (ou todos).',
      'Escolha o modelo de etiqueta e clique em "Imprimir".',
      'Cole a etiqueta no ativo — escanear o QR abre uma página pública com os dados dele.',
    ],
    ctaLabel: 'Ir para Etiquetas',
    ctaHref: '/AssetLabel',
  },
  {
    id: 'transferencia-aceite',
    title: 'Como transferir um ativo com aceite formal',
    desc: 'Cadeia de custódia: o novo responsável precisa aceitar antes de a transferência valer.',
    icon: Wrench,
    steps: [
      'Vá em Patrimônio → Transferências e clique em "Nova Transferência".',
      'Selecione o ativo, o novo responsável e/ou local de destino.',
      'O destinatário recebe um e-mail com um link para aceitar ou recusar.',
      'Após o aceite, o histórico de localização e o responsável são atualizados automaticamente.',
    ],
    ctaLabel: 'Ir para Transferências',
    ctaHref: '/Transfers',
  },
  {
    id: 'inventario-celular',
    title: 'Como fazer inventário pelo celular',
    desc: 'Conte ativos com a câmera do celular, mesmo sem internet.',
    icon: Package,
    steps: [
      'Vá em Patrimônio → Inventário e inicie uma nova contagem.',
      'Toque no botão de câmera e aponte para o QR Code ou código de barras do ativo.',
      'Sem sinal, os itens ficam numa fila local e sincronizam sozinhos ao reconectar.',
      'Feche a contagem para gerar o relatório de divergências (itens não encontrados ou fora do local).',
    ],
    ctaLabel: 'Ir para Inventário',
    ctaHref: '/Inventory',
  },
  {
    id: 'depreciacao-2-livros',
    title: 'Como funciona a depreciação em 2 livros',
    desc: 'Societária e fiscal calculadas em paralelo, com a diferença destacada.',
    icon: Calculator,
    steps: [
      'Vá em Fiscal & Contábil → Depreciação.',
      'Veja as colunas "Societária" e "Fiscal" lado a lado para cada ativo.',
      'Se as taxas/datas fiscais divergirem das societárias, configure-as no cadastro do ativo (seção opcional).',
      'Use a aba "Diferença" para identificar rapidamente onde os dois livros não coincidem.',
    ],
    ctaLabel: 'Ir para Depreciação',
    ctaHref: '/Depreciation',
  },
  {
    id: 'assistente-whatsapp',
    title: 'Como usar o Assistente de IA',
    desc: 'Converse pelo chat do sistema ou pelo WhatsApp para executar tarefas.',
    icon: Sparkles,
    steps: [
      'Vá em Visão Geral → Assistente IA para abrir o chat dentro do sistema.',
      'Ou conecte o WhatsApp pelo botão de conexão dentro do chat (número próprio, sem configuração).',
      'Peça em português: "cadastre um notebook Dell de R$ 4.500 na categoria Informática".',
      'O assistente confirma os dados antes de executar e você pode continuar a conversa normalmente.',
    ],
    ctaLabel: 'Ir para o Assistente',
    ctaHref: '/Assistant',
  },
];
