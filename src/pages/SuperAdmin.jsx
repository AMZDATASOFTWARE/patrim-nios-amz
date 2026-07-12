import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { getPlan } from '@/lib/plans';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Building2, Users, Package, Crown, Search,
  ChevronDown, ChevronUp, AlertTriangle, CheckCircle2,
  Clock, XCircle, Zap, Star, RefreshCw
} from 'lucide-react';
import moment from 'moment';
import { toast } from 'sonner';

const statusConfig = {
  trial:     { label: 'Trial', color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: Clock },
  active:    { label: 'Ativo', color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle2 },
  suspended: { label: 'Suspenso', color: 'bg-red-100 text-red-700 border-red-200', icon: XCircle },
  cancelled: { label: 'Cancelado', color: 'bg-gray-100 text-gray-600 border-gray-200', icon: XCircle },
};

const planIcons = { starter: Zap, professional: Star, enterprise: Crown };

export default function SuperAdmin() {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [expanded, setExpanded] = useState(null);
  const [updating, setUpdating] = useState(null);

  useEffect(() => { if (user?.is_platform_admin) load(); }, [user]);

  if (user && !user.is_platform_admin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-3" />
          <h2 className="text-xl font-bold text-foreground">Acesso Negado</h2>
          <p className="text-muted-foreground mt-1">Esta área é restrita a administradores do sistema.</p>
        </div>
      </div>
    );
  }

  const load = async () => {
    setLoading(true);
    // Listagem cross-workspace só via função backend (validada por is_platform_admin no servidor).
    const res = await base44.functions.invoke('adminApi', { action: 'listWorkspaces' });
    setWorkspaces(res?.data?.workspaces || []);
    setLoading(false);
  };

  const handleStatusUpdate = async (wsId, newStatus, planId) => {
    setUpdating(wsId);
    await base44.functions.invoke('adminApi', {
      action: 'updateWorkspacePlan',
      workspaceId: wsId,
      plan_status: newStatus,
      plan: newStatus === 'active' ? planId || undefined : undefined,
    });
    toast.success('Workspace atualizado!');
    setUpdating(null);
    load();
  };

  const filtered = workspaces.filter(ws => {
    const matchSearch = !search ||
      ws.name?.toLowerCase().includes(search.toLowerCase()) ||
      ws.owner_email?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || ws.plan_status === filterStatus;
    return matchSearch && matchStatus;
  });

  // Stats
  const stats = {
    total: workspaces.length,
    active: workspaces.filter(w => w.plan_status === 'active').length,
    trial: workspaces.filter(w => w.plan_status === 'trial').length,
    suspended: workspaces.filter(w => w.plan_status === 'suspended' || w.plan_status === 'cancelled').length,
    mrr: workspaces
      .filter(w => w.plan_status === 'active')
      .reduce((acc, w) => acc + (getPlan(w.plan)?.price || 0), 0),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Painel Super Admin</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Visão geral de todos os workspaces e clientes</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} className="gap-2">
          <RefreshCw className="h-4 w-4" /> Atualizar
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total de Workspaces', value: stats.total, color: 'text-foreground', icon: Building2 },
          { label: 'Ativos (pagantes)', value: stats.active, color: 'text-green-600', icon: CheckCircle2 },
          { label: 'Em Trial', value: stats.trial, color: 'text-yellow-600', icon: Clock },
          { label: 'Suspensos', value: stats.suspended, color: 'text-red-600', icon: XCircle },
          { label: 'MRR Estimado', value: `R$ ${stats.mrr.toLocaleString('pt-BR')}`, color: 'text-primary', icon: Crown },
        ].map(s => (
          <div key={s.label} className="bg-card rounded-xl border border-border p-3 sm:p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <s.icon className={`h-4 w-4 ${s.color}`} />
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por nome ou e-mail..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="trial">Trial</SelectItem>
            <SelectItem value="active">Ativo</SelectItem>
            <SelectItem value="suspended">Suspenso</SelectItem>
            <SelectItem value="cancelled">Cancelado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Workspaces list */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando workspaces...</div>
      ) : (
        <div className="space-y-3">
          {filtered.map(ws => {
            const plan = getPlan(ws.plan);
            const PlanIcon = planIcons[ws.plan] || Zap;
            const status = statusConfig[ws.plan_status] || statusConfig.trial;
            const StatusIcon = status.icon;
            const isExpanded = expanded === ws.id;
            const trialDaysLeft = ws.trial_ends_at
              ? Math.max(0, moment(ws.trial_ends_at).diff(moment(), 'days'))
              : null;

            return (
              <div key={ws.id} className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => setExpanded(isExpanded ? null : ws.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-card-foreground">{ws.name}</p>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${status.color}`}>
                          <StatusIcon className="h-3 w-3" /> {status.label}
                          {ws.plan_status === 'trial' && trialDaysLeft !== null && ` (${trialDaysLeft}d)`}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{ws.owner_email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="hidden sm:flex items-center gap-1.5 text-sm text-muted-foreground">
                      <PlanIcon className="h-4 w-4" />
                      <span className="font-medium">{plan.name}</span>
                    </div>
                    <div className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground">
                      <Users className="h-3.5 w-3.5" />
                      {(ws.member_emails?.length || 0) + 1}
                    </div>
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-border pt-4 space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground text-xs mb-0.5">Criado em</p>
                        <p className="font-medium">{moment(ws.created_date).format('DD/MM/YYYY')}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs mb-0.5">Plano</p>
                        <p className="font-medium capitalize">{plan.name}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs mb-0.5">Membros</p>
                        <p className="font-medium">{(ws.member_emails?.length || 0) + 1}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs mb-0.5">
                          {ws.plan_status === 'trial' ? 'Trial expira em' : 'Plano expira em'}
                        </p>
                        <p className="font-medium">
                          {ws.plan_status === 'trial'
                            ? (ws.trial_ends_at ? moment(ws.trial_ends_at).format('DD/MM/YYYY') : '—')
                            : (ws.plan_expires_at ? moment(ws.plan_expires_at).format('DD/MM/YYYY') : '—')}
                        </p>
                      </div>
                    </div>

                    {/* Ações administrativas */}
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                      <p className="text-xs text-muted-foreground w-full mb-1 font-medium">Ações administrativas:</p>
                      {ws.plan_status !== 'active' && (
                        <>
                          {['starter', 'professional'].map(planId => (
                            <Button
                              key={planId}
                              size="sm"
                              variant="outline"
                              className="gap-1 text-xs"
                              disabled={updating === ws.id}
                              onClick={() => handleStatusUpdate(ws.id, 'active', planId)}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                              Ativar como {planId === 'starter' ? 'Starter' : 'Professional'}
                            </Button>
                          ))}
                        </>
                      )}
                      {ws.plan_status === 'active' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 text-xs"
                          disabled={updating === ws.id}
                          onClick={() => handleStatusUpdate(ws.id, 'suspended', null)}
                        >
                          <XCircle className="h-3.5 w-3.5 text-red-600" />
                          Suspender
                        </Button>
                      )}
                      {(ws.plan_status === 'suspended' || ws.plan_status === 'cancelled') && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 text-xs"
                          disabled={updating === ws.id}
                          onClick={() => handleStatusUpdate(ws.id, 'active', ws.plan)}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                          Reativar
                        </Button>
                      )}
                      {ws.plan_status === 'trial' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 text-xs"
                          disabled={updating === ws.id}
                          onClick={async () => {
                            setUpdating(ws.id);
                            await base44.functions.invoke('adminApi', {
                              action: 'updateWorkspacePlan',
                              workspaceId: ws.id,
                              extendTrialDays: 14,
                            });
                            toast.success('Trial estendido por 14 dias!');
                            setUpdating(null);
                            load();
                          }}
                        >
                          <Clock className="h-3.5 w-3.5 text-yellow-600" />
                          Estender trial (+14 dias)
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {filtered.length === 0 && !loading && (
            <div className="text-center py-12 text-muted-foreground">
              <Building2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>Nenhum workspace encontrado.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}