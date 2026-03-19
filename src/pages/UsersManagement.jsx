import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Users, Shield, ShieldCheck, UserCheck, Mail, Search, ChevronDown, ChevronUp } from 'lucide-react';

const roleConfig = {
  admin: { label: 'Administrador', color: 'bg-red-100 text-red-700', icon: Shield },
  manager: { label: 'Gerente', color: 'bg-blue-100 text-blue-700', icon: ShieldCheck },
  user: { label: 'Usuário', color: 'bg-gray-100 text-gray-600', icon: UserCheck },
};

const rolePermissions = {
  admin: ['Dashboard completo', 'Gestão de ativos (criar/editar/excluir)', 'Relatórios e exportação', 'Gestão de fornecedores', 'Gestão de usuários', 'Mapa de ativos', 'Termos de responsabilidade', 'Configurações do sistema'],
  manager: ['Dashboard completo', 'Gestão de ativos (criar/editar)', 'Relatórios e exportação', 'Ver fornecedores', 'Mapa de ativos', 'Termos de responsabilidade'],
  user: ['Visualizar ativos atribuídos', 'Mapa de ativos (leitura)', 'Escanear QR codes'],
};

export default function UsersManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('user');
  const [inviting, setInviting] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    const data = await base44.entities.User.list();
    setUsers(data);
    setLoading(false);
  };

  const handleRoleChange = async (userId, newRole) => {
    await base44.entities.User.update(userId, { role: newRole });
    load();
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    setInviting(true);
    await base44.users.inviteUser(inviteEmail, inviteRole);
    setInviteEmail('');
    setInviting(false);
    load();
  };

  const filtered = users.filter(u =>
    !search ||
    (u.full_name && u.full_name.toLowerCase().includes(search.toLowerCase())) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Usuários</h1>
        <p className="text-muted-foreground mt-1">Gerencie acessos e permissões do sistema</p>
      </div>

      {/* Permission summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Object.entries(roleConfig).map(([role, cfg]) => (
          <div key={role} className="bg-card rounded-xl border border-border p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <cfg.icon className="h-5 w-5 text-primary" />
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>{cfg.label}</span>
              <span className="text-xs text-muted-foreground ml-auto">{users.filter(u => (u.role || 'user') === role).length} usuário(s)</span>
            </div>
            <ul className="space-y-1">
              {rolePermissions[role].map(p => (
                <li key={p} className="text-xs text-muted-foreground flex items-start gap-1">
                  <span className="text-emerald-500 mt-0.5">✓</span> {p}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Invite */}
      <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
        <h2 className="font-semibold text-card-foreground mb-3">Convidar Novo Usuário</h2>
        <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="email" required
              placeholder="email@empresa.com"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={inviteRole} onValueChange={setInviteRole}>
            <SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(roleConfig).map(([r, c]) => (
                <SelectItem key={r} value={r}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="submit" disabled={inviting} className="gap-2">
            <Users className="h-4 w-4" /> {inviting ? 'Enviando...' : 'Convidar'}
          </Button>
        </form>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar usuários..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
      </div>

      {/* Users list */}
      <div className="space-y-3">
        {filtered.map(user => {
          const role = user.role || 'user';
          const cfg = roleConfig[role] || roleConfig.user;
          const Icon = cfg.icon;
          return (
            <div key={user.id} className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => setExpanded(expanded === user.id ? null : user.id)}
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-primary">
                    {(user.full_name || user.email).charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-card-foreground">{user.full_name || '—'}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 ${cfg.color}`}>
                    <Icon className="h-3 w-3" /> {cfg.label}
                  </span>
                  {expanded === user.id ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </div>
              </div>

              {expanded === user.id && (
                <div className="px-4 pb-4 border-t border-border pt-4 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Membro desde</p>
                      <p className="text-sm font-medium">{new Date(user.created_date).toLocaleDateString('pt-BR')}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Alterar Perfil de Acesso</p>
                      <Select value={role} onValueChange={v => handleRoleChange(user.id, v)}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(roleConfig).map(([r, c]) => (
                            <SelectItem key={r} value={r}>{c.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Permissões deste perfil</p>
                    <div className="flex flex-wrap gap-2">
                      {rolePermissions[role].map(p => (
                        <span key={p} className="px-2 py-1 bg-muted rounded-md text-xs text-muted-foreground">{p}</span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}