import { PLANS } from '@/lib/plans';
import { COMPANY } from '@/lib/company';
import { FAQS } from './sections/FaqSection';

// Dados estruturados (schema.org JSON-LD) para SEO e GEO (Generative Engine
// Optimization). Todo o conteúdo aqui espelha exatamente o que já é exibido
// na página — nada é inventado, apenas reformatado para leitura por máquina
// (buscadores tradicionais e crawlers de IA como GPTBot, ClaudeBot, PerplexityBot).
// Fica dentro do bundle React (CSR): ajuda buscadores que executam JS (Googlebot)
// e qualquer crawler de IA que também renderize JS, mas não substitui a
// necessidade de pré-renderização estática para os que não executam JS.

const SITE_URL = 'https://patrimoni-asset-flow.base44.app';

function planOffer(plan) {
  if (plan.price == null) {
    return {
      '@type': 'Offer',
      name: plan.name,
      description: plan.description,
      availability: 'https://schema.org/InStock',
    };
  }
  return {
    '@type': 'Offer',
    name: plan.name,
    description: plan.description,
    price: String(plan.price),
    priceCurrency: 'BRL',
    priceValidUntil: '2027-12-31',
    availability: 'https://schema.org/InStock',
    url: `${SITE_URL}/landing#precos`,
  };
}

const schema = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      name: COMPANY.legalName,
      url: `${SITE_URL}/landing`,
      email: COMPANY.email,
    },
    {
      '@type': 'SoftwareApplication',
      name: 'Patrimônios AMZ',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      url: `${SITE_URL}/landing`,
      description:
        'Sistema de gestão patrimonial multiempresa com IA: controle de ativos, depreciação em dois livros (societário e fiscal), apropriação de créditos de CIAP e etiquetas QR Code.',
      offers: Object.values(PLANS).map(planOffer),
    },
    {
      '@type': 'FAQPage',
      mainEntity: FAQS.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: {
          '@type': 'Answer',
          text: f.a,
        },
      })),
    },
  ],
};

// JSON.stringify não escapa "</", então fazemos isso manualmente para nunca
// fechar a tag <script> prematuramente caso algum texto contenha esse trecho.
const json = JSON.stringify(schema).replace(/<\//g, '<\\/');

export default function LandingSchema() {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
