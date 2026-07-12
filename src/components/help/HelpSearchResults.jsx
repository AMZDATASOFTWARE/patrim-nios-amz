import { SearchX } from 'lucide-react';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import GuideCard from './GuideCard';

/** Lista plana de FAQ + guias filtrados pela busca (substitui a navegação por abas enquanto há query). */
export default function HelpSearchResults({ faqMatches, guideMatches, query }) {
  const isEmpty = faqMatches.length === 0 && guideMatches.length === 0;

  if (isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <SearchX className="h-10 w-10 text-muted-foreground mb-3" />
        <p className="font-medium text-foreground">Nada encontrado para "{query}"</p>
        <p className="text-sm text-muted-foreground mt-1">Tente outra palavra-chave ou fale com o suporte abaixo.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {guideMatches.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Guias ({guideMatches.length})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {guideMatches.map((guide) => <GuideCard key={guide.id} guide={guide} />)}
          </div>
        </div>
      )}

      {faqMatches.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Perguntas frequentes ({faqMatches.length})
          </h2>
          <Accordion type="single" collapsible className="w-full bg-card border border-border rounded-xl px-4">
            {faqMatches.map(({ item, categoryLabel }, i) => (
              <AccordionItem key={i} value={`result-${i}`}>
                <AccordionTrigger className="text-left">
                  <span className="flex flex-col items-start gap-1.5">
                    <Badge variant="secondary" className="font-normal">{categoryLabel}</Badge>
                    <span className="font-medium text-foreground">{item.q}</span>
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.a}</p>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      )}
    </div>
  );
}
