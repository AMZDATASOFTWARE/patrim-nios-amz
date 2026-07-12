import { cn } from '@/lib/utils';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import Sparkline from './Sparkline';

// 3 tamanhos por importância (grande/médio/pequeno). Sparkline só renderiza em
// 'lg' (economiza altura nos cards médios/pequenos da linha-herói).
// Mobile-first: cada classe carrega o valor compacto (<640px) primeiro e o
// valor atual de desktop via `sm:` — breakpoint >=640px fica idêntico ao de antes.
const SIZE = {
  lg: { pad: 'p-4 sm:p-6', icon: 'h-10 w-10 sm:h-12 sm:w-12', iconSvg: 'h-5 w-5 sm:h-6 sm:w-6', value: 'text-2xl sm:text-3xl', title: 'text-xs sm:text-sm', subtitle: 'text-xs sm:text-sm' },
  md: { pad: 'p-3 sm:p-4', icon: 'h-8 w-8 sm:h-10 sm:w-10', iconSvg: 'h-4 w-4 sm:h-5 sm:w-5', value: 'text-xl sm:text-2xl', title: 'text-xs', subtitle: 'text-xs' },
  sm: { pad: 'p-2.5 sm:p-3', icon: 'h-7 w-7 sm:h-8 sm:w-8', iconSvg: 'h-4 w-4', value: 'text-lg sm:text-xl', title: 'text-xs', subtitle: 'text-xs' },
};

// Props opcionais (retrocompatível com os usos em AdminCredits.jsx, que não
// passam `size` e caem no default 'md'):
//  size          → 'lg' | 'md' | 'sm' (default 'md')
//  accent        → variante de destaque (gradiente + ring) para o card principal
//  delta         → { value:number, up:boolean } badge de variação vs período anterior
//  sparklineData → array de números; renderiza um sparkline no rodapé (só em size='lg')
export default function StatCard({ title, value, subtitle, icon: Icon, trend, trendUp, className, accent, delta, sparklineData, size = 'md' }) {
  const s = SIZE[size] || SIZE.md;
  const showSparkline = size === 'lg' && sparklineData && sparklineData.length > 1;

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-xl border shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md',
        s.pad,
        accent
          ? 'border-primary/30 bg-gradient-to-br from-primary/[0.07] via-card to-card ring-1 ring-primary/10'
          : 'border-border bg-card',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-0.5">
          <p className={cn('font-medium text-muted-foreground', s.title)}>{title}</p>
          <div className="flex items-center gap-2">
            <p className={cn('font-bold tracking-tight text-card-foreground', s.value)}>{value}</p>
            {delta && (
              <span
                className={cn(
                  'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-semibold',
                  delta.up ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
                )}
              >
                {delta.up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {Math.abs(delta.value)}%
              </span>
            )}
          </div>
          {subtitle && <p className={cn('text-muted-foreground truncate', s.subtitle)}>{subtitle}</p>}
          {trend && (
            <p className={cn('text-sm font-medium', trendUp ? 'text-emerald-600' : 'text-red-500')}>
              {trendUp ? '↑' : '↓'} {trend}
            </p>
          )}
        </div>
        {Icon && (
          <div
            className={cn(
              'flex flex-shrink-0 items-center justify-center rounded-xl transition-colors',
              s.icon,
              accent ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary'
            )}
          >
            <Icon className={s.iconSvg} />
          </div>
        )}
      </div>
      {showSparkline && (
        <div className="mt-3 -mb-1">
          <Sparkline data={sparklineData} width={220} height={36} />
        </div>
      )}
    </div>
  );
}
