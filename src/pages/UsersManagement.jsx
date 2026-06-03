import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useWorkspace } from '@/lib/WorkspaceContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, UserPlus, Mail, Shield, Trash2, Search } from 'lucide-react';
import { toast } from 'sonner';

const roleLabels = {
  admin: { label: 'Admin', color: 'bg-red-100 text-red-700 border-red-200' },
  manager: { label: 'Gerente', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  user: { label: 'Usuário', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  viewer: { label: 'Visualizador', color: 'bg-gray-100 text-gray-600 border-gray-200' },
};

export default function UsersManagement() {
  const { user } = useAuth();
  const { workspace, refreshWorkspace } = useWorkspace();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('user');
  const [inviting, setInviting] = useState(false);

  const isAdmin = user?.role === 'admin' || user?.role === 'manager';

  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = async () => {
    setLoading(true);
    const allUsers = await base44.entities.User.list();
    setMembers(allUsers);
    setLoading(false);
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    await base44.users.inviteUser(inviteEmail.trim(), inviteRole);
    toast.success(`Convite enviado para ${inviteEmail}`);
    setInviteEmail('');
    setInviting(false);
    await loadMembers();
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
        <p className="text-muted-foreground mt-1">Todos os usuários do sistema</p>
      </div>

      {/* Invite section */}
      {isAdmin && (
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
              const isOwner = member.role === 'admin';
              return (
                <div key={member.id} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-primary text-sm">
                      {member.full_name?.charAt(0)?.toUpperCase() || member.email?.charAt(0)?.toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{member.full_name || '—'}</p>
                      <p className="text-sm text-muted-foreground">{member.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isOwner && (
                      <span className="text-xs text-muted-foreground font-medium px-2 py-0.5 bg-muted rounded-full border border-border">
                        Proprietário
                      </span>
                    )}
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${role.color}`}>
                      {role.label}
                    </span>
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