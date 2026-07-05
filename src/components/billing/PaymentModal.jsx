import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useWorkspace } from '@/lib/WorkspaceContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Copy, CheckCircle2, Clock } from 'lucide-react';

const PIX_KEY = '91981342990'; // Celular

export default function PaymentModal({ plan, onClose, onSuccess }) {
  const { workspace, user } = useWorkspace();
  const [method, setMethod] = useState('PIX');
  const [notes, setNotes] = useState('');
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyPix = () => {
    navigator.clipboard.writeText(PIX_KEY);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async () => {
    setSending(true);
    // Criação do PaymentRequest e notificação do admin ocorrem no backend
    // (identidade carimbada pela sessão; destinatário/template fixos no servidor).
    await base44.functions.invoke('notifyBilling', {
      action: 'requestPayment',
      plan: plan.id,
      amount: plan.price,
      payment_method: method,
      proof_notes: notes,
    });
    setSending(false);
    setDone(true);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Solicitar Plano {plan.name}</DialogTitle>
        </DialogHeader>

        {done ? (
          <div className="text-center py-6 space-y-3">
            <CheckCircle2 className="h-14 w-14 text-green-500 mx-auto" />
            <p className="font-semibold text-lg">Solicitação enviada!</p>
            <p className="text-sm text-muted-foreground">Nossa equipe irá confirmar o pagamento em até 1 dia útil. Você receberá um e-mail de confirmação.</p>
            <Button onClick={onClose} className="w-full mt-2">Fechar</Button>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Price */}
            <div className="bg-muted rounded-xl p-4 text-center">
              <p className="text-sm text-muted-foreground mb-1">Valor do Plano {plan.name}</p>
              <p className="text-3xl font-bold text-foreground">R$ {plan.price?.toLocaleString('pt-BR')}<span className="text-sm font-normal text-muted-foreground">/mês</span></p>
            </div>

            {/* Method */}
            <div>
              <label className="text-sm font-medium mb-2 block">Forma de Pagamento</label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PIX">PIX</SelectItem>
                  <SelectItem value="Boleto">Boleto Bancário</SelectItem>
                  <SelectItem value="Transferência">Transferência Bancária</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* PIX instructions */}
            {method === 'PIX' && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-3">
                <p className="text-sm font-semibold text-green-800">Chave PIX</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-sm bg-white border border-green-200 rounded-lg px-3 py-2 text-green-900">{PIX_KEY}</code>
                  <Button size="sm" variant="outline" onClick={copyPix} className="flex-shrink-0">
                    {copied ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-green-700">Envie o valor exato de <strong>R$ {plan.price?.toLocaleString('pt-BR')}</strong> e informe o comprovante abaixo.</p>
              </div>
            )}

            {method === 'Boleto' && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-sm font-semibold text-blue-800 mb-1">Boleto Bancário</p>
                <p className="text-xs text-blue-700">Após enviar a solicitação, nossa equipe entrará em contato em até 1 dia útil com o boleto no valor de <strong>R$ {plan.price?.toLocaleString('pt-BR')}</strong>.</p>
              </div>
            )}

            {method === 'Transferência' && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-1">
                <p className="text-sm font-semibold text-slate-800 mb-2">Dados Bancários</p>
                <p className="text-xs text-slate-600">Banco: <strong>Nu Pagamentos S.A — 260</strong></p>
                <p className="text-xs text-slate-600">Agência: <strong>0001</strong></p>
                <p className="text-xs text-slate-600">Conta: <strong>47508654-4</strong></p>
                <p className="text-xs text-slate-600">Titular: <strong>Mateus</strong></p>
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="text-sm font-medium mb-2 block">Comprovante / Observações <span className="text-muted-foreground font-normal">(opcional)</span></label>
              <Textarea
                placeholder="Cole o ID do PIX, número do recibo ou qualquer observação..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted rounded-lg px-3 py-2">
              <Clock className="h-4 w-4 flex-shrink-0" />
              Confirmação em até 1 dia útil após o pagamento
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={onClose} className="flex-1">Cancelar</Button>
              <Button onClick={handleSubmit} disabled={sending} className="flex-1">
                {sending ? 'Enviando...' : 'Enviar Solicitação'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}