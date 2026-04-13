import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle2, XCircle, Clock, CreditCard } from 'lucide-react';
import moment from 'moment';
import { PLANS } from '@/lib/plans';

const statusConfig = {
  pending:   { label: 'Aguardando',  color: 'bg-amber-100 text-amber-700',  icon: Clock },
  confirmed: { label: 'Confirmado',  color: 'bg-green-100 text-green-700',  icon: CheckCircle2 },
  rejected:  { label: 'Rejeitado',   color: 'bg-red-100 text-red-700',      icon: XCircle },
};

export default function AdminPayments() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [adminNote, setAdminNote] = useState('');
  const [acting, setActing] = useState(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    const data = await base44.entities.PaymentRequest.list('-created_date', 100);
    setRequests(data);
    setLoading(false);
  };

  const handleConfirm = async (req) => {
    setActing(req.id);
    // Update payment request
    await base44.entities.PaymentRequest.update(req.id, { status: 'confirmed', admin_notes: adminNote });
    // Update workspace plan
    const workspaces = await base44.entities.Workspace.filter({ id: req.workspace_id });
    if (workspaces.length > 0) {
      await base44.entities.Workspace.update(req.workspace_id, {
        plan: req.plan,
        plan_status: 'active',
        plan_expires_at: moment().add(1, 'month').format('YYYY-MM-DD'),
      });
    }
    // Notify user
    await base44.integrations.Core.SendEmail({
      to: req.owner_email,
      subject: `✅ Pagamento confirmado — Plano ${PLANS[req.plan]?.name || req.plan} ativado!`,
      body: `Olá!\n\nSeu pagamento foi confirmado e o Plano ${PLANS[req.plan]?.name || req.plan} já está ativo na sua conta.\n\nAcesse o sistema: ${window.location.origin}\n\n${adminNote ? `Observação: ${adminNote}\n\n` : ''}Atenciosamente,\nEquipe PatrimônioApp`,
    });
    setAdminNote('');
    setExpanded(null);
    setActing(null);
    load();
  };

  const handleReject = async (req) => {
    setActing(req.id);
    await base44.entities.PaymentRequest.update(req.id, { status: 'rejected', admin_notes: adminNote });
    await base44.integrations.Core.SendEmail({
      to: req.owner_email,
      subject: `❌ Solicitação de pagamento não confirmada — PatrimônioApp`,
      body: `Olá!\n\nNão conseguimos confirmar o seu pagamento para o Plano ${PLANS[req.plan]?.name || req.plan}.\n\n${adminNote ? `Motivo: ${adminNote}\n\n` : ''}Em caso de dúvidas, responda este e-mail.\n\nAtenciosamente,\nEquipe PatrimônioApp`,
    });
    setAdminNote('');
    setExpanded(null);
    setActing(null);
    load();
  };

  const pending = requests.filter(r => r.status === 'pending');
  const others = requests.filter(r => r.status !== 'pending');

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Confirmação de Pagamentos</h1>
        <p className="text-muted-foreground mt-1">Confirme manualmente os pagamentos via PIX/Boleto dos clientes</p>
      </div>

      {pending.length === 0 && (
        <div className="bg-card rounded-xl border border-border p-10 text-center text-muted-foreground">
          <CreditCard className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p>Nenhuma solicitação pendente</p>
        </div>
      )}

      {/* Pending */}
      {pending.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold text-foreground">⏳ Aguardando confirmação ({pending.length})</h2>
          {pending.map(req => (
            <RequestCard
              key={req.id}
              req={req}
              expanded={expanded === req.id}
              onToggle={() => setExpanded(expanded === req.id ? null : req.id)}
              adminNote={adminNote}
              setAdminNote={setAdminNote}
              onConfirm={() => handleConfirm(req)}
              onReject={() => handleReject(req)}
              acting={acting === req.id}
            />
          ))}
        </div>
      )}

      {/* History */}
      {others.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold text-foreground text-sm text-muted-foreground">Histórico</h2>
          {others.map(req => (
            <RequestCard key={req.id} req={req} expanded={false} onToggle={() => {}} adminNote="" setAdminNote={() => {}} acting={false} readonly />
          ))}
        </div>
      )}
    </div>
  );
}

function RequestCard({ req, expanded, onToggle, adminNote, setAdminNote, onConfirm, onReject, acting, readonly }) {
  const plan = PLANS[req.plan];
  const StatusIcon = statusConfig[req.status]?.icon || Clock;
  const statusCfg = statusConfig[req.status] || statusConfig.pending;

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
      <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors" onClick={onToggle}>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
            {(req.workspace_name || req.owner_email).charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-medium text-card-foreground">{req.workspace_name}</p>
            <p className="text-xs text-muted-foreground">{req.owner_email} · {moment(req.created_date).format('DD/MM/YYYY HH:mm')}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="font-bold text-sm">{plan?.name || req.plan}</p>
            <p className="text-xs text-muted-foreground">{req.payment_method} · R$ {req.amount?.toLocaleString('pt-BR')}/mês</p>
          </div>
          <span className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${statusCfg.color}`}>
            <StatusIcon className="h-3 w-3" /> {statusCfg.label}
          </span>
        </div>
      </div>

      {expanded && !readonly && (
        <div className="px-4 pb-4 border-t border-border pt-4 space-y-4">
          {req.proof_notes && (
            <div className="bg-muted rounded-lg p-3">
              <p className="text-xs font-semibold text-muted-foreground mb-1">Comprovante / Observações do cliente:</p>
              <p className="text-sm">{req.proof_notes}</p>
            </div>
          )}
          <div>
            <label className="text-sm font-medium mb-2 block">Nota para o cliente (opcional)</label>
            <Textarea
              placeholder="Ex: Pagamento confirmado, obrigado!"
              value={adminNote}
              onChange={e => setAdminNote(e.target.value)}
              rows={2}
            />
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onReject} disabled={acting} className="flex-1 border-red-200 text-red-600 hover:bg-red-50">
              <XCircle className="h-4 w-4 mr-1" /> {acting ? '...' : 'Rejeitar'}
            </Button>
            <Button onClick={onConfirm} disabled={acting} className="flex-1 bg-green-600 hover:bg-green-700">
              <CheckCircle2 className="h-4 w-4 mr-1" /> {acting ? 'Confirmando...' : 'Confirmar Pagamento'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}