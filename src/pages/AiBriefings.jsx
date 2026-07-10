import { useEffect, useMemo, useState } from 'react';
import moment from 'moment';
import { useWorkspaceEntity } from '@/lib/useWorkspaceData';
import BriefingCard from '@/components/briefings/BriefingCard';
import { Newspaper, Package, ClipboardList, Wrench, Calculator, FolderOpen, ShieldCheck } from 'lucide-react';

// Domain catalog: the 6 supervisors, in reading order. Mirrors the enum in
// AiBriefing.jsonc and AGENT_BY_DOMAIN in generateDailyBriefings.
const DOMAINS = [
  { key: 'assets_docs', label: 'Ativos & Documentação', icon: Package },
  { key: 'field_ops', label: 'Operação de Campo', icon: ClipboardList },
  { key: 'maintenance_contracts', label: 'Manutenção & Contratos', icon: Wrench },
  { key: 'fiscal_accounting', label: 'Fiscal & Contábil', icon: Calculator },
  { key: 'registries_structure', label: 'Cadastros & Estrutura', icon: FolderOpen },
  { key: 'governance_admin', label: 'Administração & Governança', icon: ShieldCheck },
];

export default function AiBriefings() {
  const BriefingEntity = useWorkspaceEntity('AiBriefing');
  const { workspaceId } = BriefingEntity;
  const [briefings, setBriefings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!workspaceId) return;
    setLoading(true);
    // Pull the latest rows (6 domains × a few days of history is small); keep the
    // most recent per domain below. 60 is a comfortable ceiling.
    BriefingEntity.list('-computed_at', 60).then((data) => {
      setBriefings(data);
      setLoading(false);
    });
  }, [workspaceId]);

  // Most recent briefing per domain.
  const latestByDomain = useMemo(() => {
    const map = {};
    for (const b of briefings) {
      if (!map[b.domain]) map[b.domain] = b; // list is already sorted -computed_at
    }
    return map;
  }, [briefings]);

  // Freshest generation timestamp across all domains (for the corner stamp).
  const lastUpdated = useMemo(() => {
    let max = null;
    for (const b of briefings) {
      const t = b.computed_at ? new Date(b.computed_at).getTime() : 0;
      if (t && (!max || t > max)) max = t;
    }
    return max;
  }, [briefings]);

  const cards = DOMAINS.map((d) => ({ ...d, briefing: latestByDomain[d.key] || null }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Masthead */}
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
            <Newspaper className="h-6 w-6 text-primary" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Diário do Patrimônio</h1>
            <p className="text-sm text-muted-foreground">6 supervisores de IA analisam seu sistema todo dia</p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          {lastUpdated
            ? `Edição de ${moment(lastUpdated).format('DD/MM/YYYY')} · atualizado às ${moment(lastUpdated).format('HH:mm')}`
            : 'Primeira edição ainda não gerada'}
        </p>
      </div>

      {/* Mosaic */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card) => (
          <BriefingCard key={card.key} domain={card} />
        ))}
      </div>
    </div>
  );
}
