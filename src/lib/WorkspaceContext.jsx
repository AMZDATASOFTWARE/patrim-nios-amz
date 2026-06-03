import { createContext, useContext, useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const WorkspaceContext = createContext(null);

// ID fixo do workspace central — criado automaticamente na primeira vez
const CENTRAL_WORKSPACE_KEY = 'central_workspace_id';

export function WorkspaceProvider({ children }) {
  const [workspace, setWorkspace] = useState(null);
  const [workspaceId, setWorkspaceId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    try {
      const me = await base44.auth.me();
      setUser(me);

      // Busca o workspace central (primeiro disponível ou cria um)
      const all = await base44.entities.Workspace.list();

      let ws = null;
      if (all.length > 0) {
        // Usa o primeiro workspace encontrado (workspace central)
        ws = all[0];
      } else {
        // Cria o workspace central automaticamente
        ws = await base44.entities.Workspace.create({
          name: 'Patrimônio',
          owner_email: me.email,
          plan: 'starter',
          plan_status: 'trial',
          member_emails: [],
        });
      }

      setWorkspace(ws);
      setWorkspaceId(ws.id);

      // Garante que o usuário tem workspace_id e role correto
      const updates = {};
      if (me.workspace_id !== ws.id) updates.workspace_id = ws.id;
      if (ws.owner_email === me.email && me.role !== 'admin') updates.role = 'admin';
      if (Object.keys(updates).length > 0) await base44.auth.updateMe(updates);

    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const refreshWorkspace = async () => {
    if (!workspaceId) return;
    const all = await base44.entities.Workspace.list();
    const ws = all.find(w => w.id === workspaceId);
    if (ws) setWorkspace(ws);
  };

  const inviteMember = async (email, role = 'user') => {
    if (!workspace) return;
    await base44.users.inviteUser(email, role);
    const currentMembers = workspace.member_emails || [];
    if (!currentMembers.includes(email)) {
      const updated = await base44.entities.Workspace.update(workspace.id, {
        member_emails: [...currentMembers, email],
      });
      setWorkspace(updated);
    }
  };

  return (
    <WorkspaceContext.Provider value={{ workspace, workspaceId, loading, user, refreshWorkspace, inviteMember, init }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  return useContext(WorkspaceContext);
}