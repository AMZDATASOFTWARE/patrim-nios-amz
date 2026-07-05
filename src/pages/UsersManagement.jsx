import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useWorkspace } from '@/lib/WorkspaceContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { Users, UserPlus, Mail, Trash2, Search } from 'lucide-react';
import { toast } from 'sonner';
import { getPlan } from '@/lib/plans';

const roleLabels = {
  admin: { label: 'Admin', color: 'bg-red-100 text-red-700 border-red-200' },
  manager: { label: 'Gerente', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  user: { label: 'Usuário', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  viewer: { label: 'Visualizador', color: 'bg-gray-100 text-gray-600 border-gray-200' },
};

// Papéis que um admin pode atribuir a um membro existente.
const assignableRoles = ['admin', 'manager', 'viewer', 'user'];

export default function UsersManagement() {
  const { user } = useAuth();
  const { workspace, inviteMember } = useWorkspace();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('user');
  const [inviting, setInviting] = useState(false);
  const [savingId, setSavingId] = useState(null);

  const canInvite = user?.role === 'admin' || user?.role === 'manager';
  const canManage = user?.role === 'admin';
  const ownerEmail = workspace?.owner_email;

  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = async () => {
    setLoading(true);
    try {
      // Lista apenas os membros do próprio workspace (function com service-role).
      const res = await base44.functions.invoke('workspaceMembers', { action: 'list' });
      setMembers(res?.data?.members || []);
    } catch (e) {
      toast.error('Não foi possível carregar os membros.');
    }
    setLoading(false);
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    // Aplica o limite de usuários do plano (considera membros já convidados).
    const limit = getPlan(workspace?.plan).limits.users;
    const used = Math.max(members.length, workspace?.member_emails?.length || 0);
    if (Number.isFinite(limit) && used >= limit) {
      toast.error(`Seu plano permite até ${limit} usuários. Faça upgrade em Plano & Cobrança para adicionar mais.`);
      return;
    }
    setInviting(true);
    try {
      // Passa pelo inviteMember (function endurecida): valida papel no servidor e
      // popula member_emails, permitindo o auto-vínculo via acceptWorkspaceInvite.
      await inviteMember(inviteEmail.trim(), inviteRole);
      toast.success(`Convite enviado para ${inviteEmail}`);
      setInviteEmail('');
      await loadMembers();
    } catch (e) {
      toast.error(e?.message || 'Não foi possível convidar este membro.');
    }
    setInviting(false);
  };

  const handleRoleChange = async (member, role) => {
    if (role === member.role) return;
    setSavingId(member.id);
    try {
      const res = await base44.functions.invoke('workspaceMembers', { action: 'setRole', userId: member.id, role });
      if (!res?.data?.ok) throw new Error(res?.data?.error);
      toast.success('Papel atualizado.');
      await loadMembers();
    } catch (e) {
      toast.error(e?.message || 'Não foi possível alterar o papel.');
    }
    setSavingId(null);
  };

  const handleRemove = async (member) => {
    setSavingId(member.id);
    try {
      const res = await base44.functions.invoke('workspaceMembers', { action: 'remove', userId: member.id });
      if (!res?.data?.ok) throw new Error(res?.data?.error);
      toast.success('Membro removido do workspace.');
      await loadMembers();
    } catch (e) {
      toast.error(e?.message || 'Não foi possível remover o membro.');
    }
    setSavingId(null);
  };

  const filtered = members.filter(m =>
    !search ||
    m.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    m.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Gerenciar Usuários</h1>
        <p className="text-muted-foreground mt-1">Membros vinculados a {workspace?.name || 'sua empresa'}</p>
      </div>

      {/* Invite section */}
      {canInvite && (
        <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <UserPlus className="h-5 w-5" /> Convidar Novo Membro
          </h2>
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              placeholder="E-mail do usuário"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              className="flex-1"
            />
            <Select value={inviteRole} onValueChange={setInviteRole}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">Usuário</SelectItem>
                <SelectItem value="viewer">Visualizador</SelectItem>
                <SelectItem value="manager">Gerente</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleInvite} disabled={inviting || !inviteEmail.trim()} className="gap-2">
              {inviting ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Mail className="h-4 w-4" />
              )}
              Convidar
            </Button>
          </div>
        </div>
      )}

      {/* Members list */}
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-muted-foreground" />
            <span className="font-semibold text-foreground">Membros ({members.length})</span>
          </div>
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Carregando membros...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>Nenhum membro encontrado.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map(member => {
              const role = roleLabels[member.role] || roleLabels.user;
              const isOwner = ownerEmail && member.email === ownerEmail;
              const isSelf = member.id === user?.id;
              const locked = isOwner || isSelf;
              return (
                <div key={member.id} className="flex items-center justify-between gap-3 p-4 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-primary text-sm shrink-0">
                      {member.full_name?.charAt(0)?.toUpperCase() || member.email?.charAt(0)?.toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate">{member.full_name || '—'}</p>
                      <p className="text-sm text-muted-foreground truncate">{member.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {isOwner && (
                      <span className="text-xs text-muted-foreground font-medium px-2 py-0.5 bg-muted rounded-full border border-border">
                        Proprietário
                      </span>
                    )}
                    {canManage && !locked ? (
                      <Select
                        value={member.role || 'user'}
                        onValueChange={(v) => handleRoleChange(member, v)}
                        disabled={savingId === member.id}
                      >
                        <SelectTrigger className="w-36 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {assignableRoles.map(r => (
                            <SelectItem key={r} value={r}>{roleLabels[r].label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${role.color}`}>
                        {role.label}
                      </span>
                    )}
                    {canManage && !locked && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            disabled={savingId === member.id}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remover membro?</AlertDialogTitle>
                            <AlertDialogDescription>
                              {member.full_name || member.email} perderá o acesso a esta empresa. Esta ação pode ser refeita reenviando um convite.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleRemove(member)}>Remover</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
