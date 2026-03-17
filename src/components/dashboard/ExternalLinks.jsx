import { ExternalLink } from 'lucide-react';

const links = [
  {
    name: 'Tabela FIPE',
    description: 'Consulte o valor de veículos',
    url: 'https://veiculos.fipe.org.br/',
    category: 'Veículos'
  },
  {
    name: 'Zap Imóveis',
    description: 'Avalie preços de imóveis',
    url: 'https://www.zapimoveis.com.br/',
    category: 'Imóveis'
  },
  {
    name: 'OLX',
    description: 'Consulte preços de equipamentos',
    url: 'https://www.olx.com.br/',
    category: 'Equipamentos'
  },
  {
    name: 'B3',
    description: 'Bolsa de Valores do Brasil',
    url: 'https://www.b3.com.br/',
    category: 'Investimentos'
  },
  {
    name: 'INPI',
    description: 'Instituto Nacional da Propriedade Industrial',
    url: 'https://www.gov.br/inpi/',
    category: 'Intangíveis'
  }
];

export default function ExternalLinks() {
  return (
    <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-card-foreground mb-4">Links de Consulta</h3>
      <div className="space-y-2">
        {links.map((link) => (
          <a
            key={link.name}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors group"
          >
            <div>
              <p className="font-medium text-card-foreground group-hover:text-primary transition-colors">
                {link.name}
              </p>
              <p className="text-sm text-muted-foreground">{link.description}</p>
            </div>
            <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </a>
        ))}
      </div>
    </div>
  );
}