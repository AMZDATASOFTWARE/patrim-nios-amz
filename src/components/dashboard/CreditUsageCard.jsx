import { useState, useEffect } from 'react';
import { useWorkspaceEntity } from '@/lib/useWorkspaceData';
import { formatCurrency } from '@/lib/depreciation';
import { Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

// Consumo de créditos de IA do workspace do usuário (mês corrente + total).
export default function CreditUsageCard() {
  const CreditEntity = useWorkspaceEntity('CreditUsage');
  const { workspaceId } = CreditEntity;
  const [usage, setUsage] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!workspaceId) return;
    CreditEntity.list('-created_date', 1000).then((data) => {
      setUsage(data);
      setLoading(false);
    });
  }, [workspaceId]);

  const now = new Date();
  const monthUsage = usage.filter((u) => {
    const d = new Date(u.created_date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  // Registros antigos sem credit_type contam como mensagem.
  const monthMessages = monthUsage.filter((u) => u.credit_type !== 'integration').reduce((s, u) => s + (u.credits_used || 0), 0);
  const monthIntegrations = monthUsage.filter((u) => u.credit_type === 'integration').reduce((s, u) => s + (u.credits_used || 0), 0);
  const monthValue = monthUsage.reduce((s, u) => s + (u.price_to_client || 0), 0);
  const totalCredits = usage.reduce((s, u) => s + (u.credits_used || 0), 0);

  return (
    <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-card-foreground">Consumo de IA</h2>
        </div>
        <Link to="/Assistant" className="text-sm text-primary hover:underline">Abrir assistente</Link>
      </div>
      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <p className="text-2xl font-bold text-card-foreground">{monthMessages}</p>
            <p className="text-xs text-muted-foreground mt-1">Mensagens no mês</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-card-foreground">{monthIntegrations}</p>
            <p className="text-xs text-muted-foreground mt-1">Integrações no mês</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-card-foreground">{formatCurrency(monthValue)}</p>
            <p className="text-xs text-muted-foreground mt-1">Valor no mês</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-card-foreground">{totalCredits}</p>
            <p className="text-xs text-muted-foreground mt-1">Créditos totais</p>
          </div>
        </div>
      )}
    </div>
  );
}