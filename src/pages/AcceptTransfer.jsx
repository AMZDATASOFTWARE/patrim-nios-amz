import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeftRight, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import AppFooter from '@/components/AppFooter';

export default function AcceptTransfer() {
  const token = new URLSearchParams(window.location.search).get('token');
  const [transfer, setTransfer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(null); // 'aceito' | 'recusado'

  useEffect(() => {
    if (!token) { setError('Link inválido.'); setLoading(false); return; }
    base44.functions.invoke('getPublicTransferInfo', { token })
      .then((res) => {
        if (res?.data?.ok) setTransfer(res.data.transfer);
        else setError(res?.data?.error || 'Não foi possível carregar a transferência.');
      })
      .catch(() => setError('Não foi possível carregar a transferência.'))
      .finally(() => setLoading(false));
  }, [token]);

  const respond = async (decision) => {
    setSubmitting(true);
    try {
      const res = await base44.functions.invoke('respondAssetTransfer', { token, decision, notes });
      if (!res?.data?.ok) throw new Error(res?.data?.error || 'Falha ao registrar sua resposta.');
      setDone(decision);
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || 'Não foi possível registrar sua resposta.');
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        <div className="bg-slate-800 p-6 text-white text-center">
          <ArrowLeftRight className="h-10 w-10 mx-auto mb-2 opacity-90" />
          <h1 className="text-xl font-bold">Transferência de Patrimônio</h1>
        </div>
        <div className="p-8 space-y-5">
          {loading ? (
            <div className="flex justify-center py-6"><div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" /></div>
          ) : error ? (
            <div className="text-center space-y-2">
              <AlertCircle className="h-10 w-10 mx-auto text-red-500" />
              <p className="text-slate-700">{error}</p>
            </div>
          ) : done ? (
            <div className="text-center space-y-2">
              {done === 'aceito' ? <CheckCircle2 className="h-12 w-12 mx-auto text-emerald-500" /> : <XCircle className="h-12 w-12 mx-auto text-red-500" />}
              <p className="text-lg font-semibold text-slate-800">{done === 'aceito' ? 'Transferência aceita!' : 'Transferência recusada.'}</p>
              <p className="text-sm text-slate-500">Você já pode fechar esta página.</p>
            </div>
          ) : transfer?.status && transfer.status !== 'pendente' ? (
            <div className="text-center space-y-2">
              <AlertCircle className="h-10 w-10 mx-auto text-amber-500" />
              <p className="text-slate-700">Esta transferência já foi respondida.</p>
            </div>
          ) : transfer?.expired ? (
            <div className="text-center space-y-2">
              <AlertCircle className="h-10 w-10 mx-auto text-amber-500" />
              <p className="text-slate-700">Este link expirou. Solicite uma nova transferência.</p>
            </div>
          ) : (
            <>
              <div className="space-y-2 text-sm">
                <p className="text-slate-600"><span className="font-semibold">{transfer.requested_by_name}</span> solicitou a transferência do ativo abaixo para você:</p>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-1">
                  <p className="font-semibold text-slate-800">{transfer.asset_name}</p>
                  {transfer.from_location && <p className="text-xs text-slate-500">De: {transfer.from_location}</p>}
                  {transfer.to_location && <p className="text-xs text-slate-500">Para: {transfer.to_location}</p>}
                  {transfer.reason && <p className="text-xs text-slate-500 mt-1">Motivo: {transfer.reason}</p>}
                </div>
              </div>
              <Textarea placeholder="Observações (opcional)" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
              <div className="flex flex-col gap-2">
                <Button onClick={() => respond('aceito')} disabled={submitting} className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700">
                  <CheckCircle2 className="h-4 w-4" /> Aceitar transferência
                </Button>
                <Button onClick={() => respond('recusado')} disabled={submitting} variant="outline" className="w-full gap-2 text-red-600 border-red-200">
                  <XCircle className="h-4 w-4" /> Recusar
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
      <div className="mt-6"><AppFooter variant="onDark" /></div>
    </div>
  );
}
