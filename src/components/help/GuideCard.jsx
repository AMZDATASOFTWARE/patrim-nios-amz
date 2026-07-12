import { Link } from 'react-router-dom';
import { ChevronDown, ArrowRight } from 'lucide-react';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

/** Card de guia passo a passo, com steps colapsáveis e CTA para a página real da funcionalidade. */
export default function GuideCard({ guide }) {
  const { title, desc, icon: Icon, steps, ctaLabel, ctaHref } = guide;

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <CardTitle className="text-base leading-snug">{title}</CardTitle>
            <CardDescription className="mt-1">{desc}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 mt-auto space-y-3">
        <Collapsible>
          <CollapsibleTrigger className="flex w-full items-center justify-between text-sm font-medium text-primary hover:underline [&[data-state=open]>svg]:rotate-180">
            Ver passo a passo
            <ChevronDown className="h-4 w-4 transition-transform duration-200" />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <ol className="mt-3 space-y-2 border-l-2 border-border pl-4">
              {steps.map((step, i) => (
                <li key={i} className="text-sm text-muted-foreground leading-relaxed">
                  <span className="font-semibold text-foreground">{i + 1}.</span> {step}
                </li>
              ))}
            </ol>
          </CollapsibleContent>
        </Collapsible>

        <Link to={ctaHref}>
          <Button variant="outline" size="sm" className="w-full gap-1.5 justify-center">
            {ctaLabel} <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
