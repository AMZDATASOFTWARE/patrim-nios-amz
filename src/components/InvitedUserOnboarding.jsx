/**
 * Mostrado quando um usuário convidado ainda não tem workspace_id salvo,
 * mas já existe um workspace onde seu email está em member_emails.
 * Garante que o workspace_id seja salvo no perfil do usuário ao fazer login.
 */
import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Building2 } from 'lucide-react';

export default function InvitedUserOnboarding({ onDone }) {
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    associate();
  }, []);

  const associate = async () => {
    try {
      const me = await base44.auth.me();
      const workspaces = await base44.entities.Workspace.list();
      const found = workspaces.find(ws =>
        ws.owner_email === me.email ||
        (ws.member_emails && ws.member_emails.includes(me.email))
      );
      if (found) {
        await base44.auth.updateMe({ workspace_id: found.id });
        setStatus('done');
        onDone?.();
      } else {
        setStatus('notfound');
      }
    } catch (e) {
      setStatus('error');
    }
  };

  if (status === 'loading') {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-primary rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground text-sm">Vinculando sua conta ao workspace...</p>
        </div>
      </div>
    );
  }

  if (status === 'notfound') {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background p-4">
        <div className="bg-card rounded-2xl border border-border shadow-xl max-w-md w-full p-8 text-center space-y-4">
          <Building2 className="h-12 w-12 text-muted-foreground mx-auto" />
          <h2 className="text-xl font-bold text-foreground">Nenhum workspace encontrado</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Seu e-mail não está associado a nenhum workspace. Verifique se você usou o mesmo e-mail do convite,
            ou peça ao administrador que te convide novamente.
          </p>
          <button
            onClick={() => base44.auth.logout()}
            className="text-sm text-primary hover:underline"
          >
            Sair e tentar com outro e-mail
          </button>
        </div>
      </div>
    );
  }

  return null;
}