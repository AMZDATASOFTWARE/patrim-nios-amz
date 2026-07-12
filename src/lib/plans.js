export const PLANS = {
  starter: {
    id: 'starter',
    name: 'Starter',
    description: 'Ideal para pequenas empresas e autônomos',
    price: 97,
    priceAnnual: 970,
    color: 'blue',
    maxUsers: 3,
    maxAssets: 100,
    features: [
      '3 usuários inclusos',
      'Até 100 ativos cadastrados',
      'Depreciação automática',
      'Etiquetas QR Code',
      'Relatórios em PDF e CSV',
      'Suporte por e-mail',
    ],
    limits: {
      users: 3,
      assets: 100,
    },
  },
  professional: {
    id: 'professional',
    name: 'Professional',
    description: 'Para empresas em crescimento com mais ativos',
    price: 247,
    priceAnnual: 2470,
    color: 'purple',
    popular: true,
    maxUsers: 15,
    maxAssets: 1000,
    features: [
      '15 usuários inclusos',
      'Até 1.000 ativos cadastrados',
      'Tudo do Starter',
      'Mapa de localização de ativos',
      'Histórico de localização por QR',
      'Gestão de manutenções',
      'Gestão de fornecedores',
      'Suporte prioritário',
    ],
    limits: {
      users: 15,
      assets: 1000,
    },
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'Para grandes operações sem restrições',
    price: null,
    priceAnnual: null,
    color: 'amber',
    maxUsers: Infinity,
    maxAssets: Infinity,
    features: [
      'Usuários ilimitados',
      'Ativos ilimitados',
      'Tudo do Professional',
      'Múltiplas filiais com hierarquia (sub-filiais)',
      'API de integração (em breve)',
      'Onboarding dedicado',
      'SLA garantido',
      'Gerente de conta exclusivo',
    ],
    limits: {
      users: Infinity,
      assets: Infinity,
    },
  },
};

export function getPlan(planId) {
  return PLANS[planId] || PLANS.starter;
}

export function canAddUser(workspace, currentUserCount) {
  const plan = getPlan(workspace?.plan);
  return currentUserCount < plan.limits.users;
}

export function canAddAsset(workspace, currentAssetCount) {
  const plan = getPlan(workspace?.plan);
  return currentAssetCount < plan.limits.assets;
}

export function isTrialActive(workspace) {
  if (!workspace?.trial_ends_at) return false;
  return new Date(workspace.trial_ends_at) > new Date();
}