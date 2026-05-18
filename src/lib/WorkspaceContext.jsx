import { createContext, useContext, useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const WorkspaceContext = createContext(null);

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

      // 1) Se o user já tem workspace_id salvo, carrega direto
      if (me.workspace_id) {
        const workspaces = await base44.entities.Workspace.list();
        const ws = workspaces.find(w => w.id === me.workspace_id);
        if (ws) {
          setWorkspace(ws);
          setWorkspaceId(ws.id);
          // Garante role admin se for o dono
          if (ws.owner_email === me.email && me.role !== 'admin') {
            await base44.auth.updateMe({ role: 'admin' });
          }
          setLoading(false);
          return;
        }
      }

      // 2) Busca workspaces onde o usuário é EXPLICITAMENTE dono ou membro
      const all = await base44.entities.Workspace.list();
      const found = all.find(w =>
        w.owner_email === me.email ||
        (Array.isArray(w.member_emails) && w.member_emails.includes(me.email))
      );

      if (found) {
        setWorkspace(found);
        setWorkspaceId(found.id);
        // Persiste workspace_id no perfil do usuário para próximos logins
        // Se for o dono do workspace, garante role admin
        const updateData = { workspace_id: found.id };
        if (found.owner_email === me.email && me.role !== 'admin') {
          updateData.role = 'admin';
        }
        await base44.auth.updateMe(updateData);
      }
      // else: sem workspace → WorkspaceSetup será exibido
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const createWorkspace = async (data) => {
    const me = await base44.auth.me();
    const ws = await base44.entities.Workspace.create({
      ...data,
      owner_email: me.email,
      member_emails: [],
    });
    await base44.auth.updateMe({ workspace_id: ws.id, role: 'admin' });
    setWorkspace(ws);
    setWorkspaceId(ws.id);
    return ws;
  };

  const refreshWorkspace = async () => {
    if (!workspaceId) return;
    const all = await base44.entities.Workspace.list();
    const ws = all.find(w => w.id === workspaceId);
    if (ws) setWorkspace(ws);
  };

  // Convida membro e já adiciona ao member_emails do workspace
  const inviteMember = async (email, role = 'user') => {
    if (!workspace) return;
    // Convida via plataforma
    await base44.users.inviteUser(email, role);
    // Adiciona ao member_emails para que o RLS permita acesso
    const currentMembers = workspace.member_emails || [];
    if (!currentMembers.includes(email)) {
      const updated = await base44.entities.Workspace.update(workspace.id, {
        member_emails: [...currentMembers, email],
      });
      setWorkspace(updated);
    }
  };

  return (
    <WorkspaceContext.Provider value={{ workspace, workspaceId, loading, user, createWorkspace, refreshWorkspace, inviteMember, init }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  return useContext(WorkspaceContext);
}