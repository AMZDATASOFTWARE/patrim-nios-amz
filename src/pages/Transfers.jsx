import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useWorkspaceEntity } from '@/lib/useWorkspaceData';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { ArrowLeftRight, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment';

const STATUS_META = {
  pendente: { label: 'Aguardando aceite', badge: 'bg-amber-100 text-amber-700 border-amber-200' },
  aceito: { label: 'Aceita', badge: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  recusado: { label: 'Recusada', badge: 'bg-red-100 text-red-700 border-red-200' },
  cancelado: { label: 'Cancelada', badge: 'bg-slate-100 text-slate-600 border-slate-200' },
};

export default function Transfers() {
  const { user } = useAuth();
  const TransferEntity = useWorkspaceEntity('AssetTransfer');
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const data = await TransferEntity.list('-requested_at', 200);
    setTransfers(data);
    setLoading(false);
  };

  const myEmail = (user?.email || '').toLowerCase();
  const pendingForMe = transfers.filter((t) => t.status === 'pendente' && (t.recipient_email || '').toLowerCase() === myEmail);
  const others = transfers.filter((t) => !(t.status === 'pendente' && (t.recipient_email || '').toLowerCase() === myEmail));

  const respond = async (t, decision) => {
    setActingId(t.id);
    try {
      const res = await base44.functions.invoke('respondAssetTransfer', { transfer_id: t.id, decision });
      if (!res?.data?.ok) throw new Error(res?.data?.error || 'Falha ao registrar resposta.');
      toast.success(decision === 'aceito' ? 'Transferência aceita.' : 'Transferência recusada.');
      load();
    } catch (e) {
      toast.error(e?.response?.data?.error || e?.message || 'Não foi possível responder.');
    }
    setActingId(null);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Transferências</h1>
        <p className="text-muted-foreground mt-1">Movimentações de patrimônio com aceite do destinatário</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" /></div>
      ) : (
        <>
          {pendingForMe.length > 0 && (
            <div className="bg-card rounded-xl border border-amber-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-border bg-amber-50">
                <h2 className="font-semibold text-amber-800">Aguardando seu aceite ({pendingForMe.length})</h2>
              </div>
              <div className="divide-y divide-border">
                {pendingForMe.map((t) => (
                  <div key={t.id} className="flex items-center justify-between gap-3 p-4 flex-wrap">
                    <div className="min-w-0">
                      <p className="font-medium text-card-foreground">{t.asset_name}</p>
                      <p className="text-xs text-muted-foreground">
                        De {t.requested_by_name || t.requested_by_email}
                        {t.to_location ? ` → ${t.to_location}` : ''}
                        {t.reason ? ` • ${t.reason}` : ''}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button size="sm" className="gap-1 bg-emerald-600 hover:bg-emerald-700" disabled={actingId === t.id} onClick={() => respond(t, 'aceito')}>
                        <CheckCircle2 className="h-4 w-4" /> Aceitar
                      </Button>
                      <Button size="sm" variant="outline" className="gap-1 text-red-600 border-red-200" disabled={actingId === t.id} onClick={() => respond(t, 'recusado')}>
                        <XCircle className="h-4 w-4" /> Recusar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
            <div className="p-4 border-b border-border">
              <h2 className="font-semibold text-card-foreground">Histórico</h2>
            </div>
            {others.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <ArrowLeftRight className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>Nenhuma transferência registrada</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {others.map((t) => {
                  const meta = STATUS_META[t.status] || STATUS_META.pendente;
                  return (
                    <div key={t.id} className="flex items-center justify-between gap-3 p-4">
                      <div className="min-w-0">
                        <p className="font-medium text-card-foreground truncate">{t.asset_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {t.requested_by_name || t.requested_by_email} → {t.recipient_name || t.recipient_email}
                          {t.requested_at ? ` • ${moment(t.requested_at).format('DD/MM/YYYY')}` : ''}
                        </p>
                      </div>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full border shrink-0 ${meta.badge}`}>{meta.label}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
