import { Link } from 'react-router-dom';
import { Mail, Sparkles, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { COMPANY } from '@/lib/company';

/** Seção final de contato/suporte: e-mail e atalho para o Assistente de IA. */
export default function ContactSupportCard() {
  return (
    <Card>
      <CardContent className="p-6">
        <h2 className="text-lg font-semibold text-card-foreground mb-1">Não encontrou o que precisava?</h2>
        <p className="text-sm text-muted-foreground mb-5">
          O Assistente de IA responde na hora, 24 horas por dia. Para questões que exigem uma pessoa, fale com o nosso suporte.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link to="/Assistant">
            <Button className="w-full gap-2 justify-center">
              <Sparkles className="h-4 w-4" />
              Perguntar ao Assistente de IA
            </Button>
          </Link>
          <a href={`mailto:${COMPANY.email}?subject=Suporte Patrimônios AMZ`}>
            <Button variant="outline" className="w-full gap-2 justify-center">
              <Mail className="h-4 w-4" />
              Falar com o suporte
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
