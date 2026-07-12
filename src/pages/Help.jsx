import { useMemo, useState } from 'react';
import { Search, HelpCircle, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import GuideCard from '@/components/help/GuideCard';
import HelpSearchResults from '@/components/help/HelpSearchResults';
import ContactSupportCard from '@/components/help/ContactSupportCard';
import { FAQ_CATEGORIES, GUIDES } from '@/lib/helpContent';

function normalize(text) {
  return text.toLowerCase();
}

function useHelpSearch(query) {
  return useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return { faqMatches: [], guideMatches: [] };

    const faqMatches = [];
    FAQ_CATEGORIES.forEach((cat) => {
      cat.items.forEach((item) => {
        if (normalize(item.q).includes(q) || normalize(item.a).includes(q)) {
          faqMatches.push({ item, categoryLabel: cat.label });
        }
      });
    });

    const guideMatches = GUIDES.filter(
      (g) => normalize(g.title).includes(q) || normalize(g.desc).includes(q)
    );

    return { faqMatches, guideMatches };
  }, [query]);
}

export default function Help() {
  const [query, setQuery] = useState('');
  const { faqMatches, guideMatches } = useHelpSearch(query);
  const isSearching = query.trim().length > 0;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <HelpCircle className="h-7 w-7 text-primary" />
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Central de Ajuda</h1>
        </div>
        <p className="text-sm text-muted-foreground mt-0.5">
          Perguntas frequentes, guias passo a passo e como falar com o suporte.
        </p>
      </div>

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por assunto (ex: depreciação, transferência, QR Code...)"
          className="pl-9 pr-9 h-11"
        />
        {isSearching && (
          <button
            type="button"
            onClick={() => setQuery('')}
            aria-label="Limpar busca"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {isSearching ? (
        <HelpSearchResults faqMatches={faqMatches} guideMatches={guideMatches} query={query.trim()} />
      ) : (
        <>
          {/* Guias em destaque */}
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-1">Guias em destaque</h2>
            <p className="text-sm text-muted-foreground mb-4">Passo a passo das funcionalidades mais usadas.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {GUIDES.map((guide) => <GuideCard key={guide.id} guide={guide} />)}
            </div>
          </div>

          {/* FAQ por categoria */}
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-4">Perguntas frequentes</h2>
            <Tabs defaultValue={FAQ_CATEGORIES[0].id}>
              <div className="w-full overflow-x-auto">
                <TabsList className="inline-flex w-max">
                  {FAQ_CATEGORIES.map((cat) => (
                    <TabsTrigger key={cat.id} value={cat.id} className="gap-1.5">
                      <cat.icon className="h-4 w-4" />
                      {cat.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>
              {FAQ_CATEGORIES.map((cat) => (
                <TabsContent key={cat.id} value={cat.id}>
                  <Accordion type="single" collapsible className="w-full bg-card border border-border rounded-xl px-4">
                    {cat.items.map((item, i) => (
                      <AccordionItem key={i} value={`${cat.id}-${i}`}>
                        <AccordionTrigger className="text-left font-medium text-foreground">
                          {item.q}
                        </AccordionTrigger>
                        <AccordionContent>
                          <p className="text-sm text-muted-foreground leading-relaxed">{item.a}</p>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </TabsContent>
              ))}
            </Tabs>
          </div>
        </>
      )}

      {/* Contato/Suporte — sempre visível, com ou sem busca ativa */}
      <ContactSupportCard />
    </div>
  );
}
