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

  return null;
































}