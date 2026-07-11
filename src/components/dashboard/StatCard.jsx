import { cn } from '@/lib/utils';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import Sparkline from './Sparkline';

// Props opcionais adicionadas (retrocompatível com os usos em AdminCredits.jsx):
//  accent        → variante de destaque (gradiente + ring) para o card principal
//  delta         → { value:number, up:boolean } badge de variação vs período anterior
//  sparklineData → array de números; renderiza um sparkline no rodapé
export default function StatCard({ title, value, subtitle, icon: Icon, trend, trendUp, className, accent, delta, sparklineData }) {
  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-xl border p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md',
        accent
          ? 'border-primary/30 bg-gradient-to-br from-primary/[0.07] via-card to-card ring-1 ring-primary/10'
          : 'border-border bg-card',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className="flex items-center gap-2">
            <p className="text-3xl font-bold tracking-tight text-card-foreground">{value}</p>
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
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
          {trend && (
            <p className={cn('text-sm font-medium', trendUp ? 'text-emerald-600' : 'text-red-500')}>
              {trendUp ? '↑' : '↓'} {trend}
            </p>
          )}
        </div>
        {Icon && (
          <div
            className={cn(
              'flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl transition-colors',
              accent ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary'
            )}
          >
            <Icon className="h-6 w-6" />
          </div>
        )}
      </div>
      {sparklineData && sparklineData.length > 1 && (
        <div className="mt-3 -mb-1">
          <Sparkline data={sparklineData} width={220} height={40} />
        </div>
      )}
    </div>
  );
}
