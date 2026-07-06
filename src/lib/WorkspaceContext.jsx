import { createContext, useContext, useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const WorkspaceContext = createContext(null);

export function WorkspaceProvider({ children }) {
  const [workspace, setWorkspace] = useState(null);
  const [workspaceId, setWorkspaceId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [needsSetup, setNeedsSetup] = useState(false);

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    try {
      const me = await base44.auth.me();
      setUser(me);

      if (me.workspace_id) {
        const wsList = await base44.entities.Workspace.filter({ id: me.workspace_id });
        if (wsList.length > 0) {
          setWorkspace(wsList[0]);
          setWorkspaceId(wsList[0].id);
        }
        setLoading(false);
        return;
      }

      // No workspace yet — try to auto-associate with a pending invite (email already
      // present in some workspace's member_emails). This never creates a new workspace.
      const inviteResult = await base44.functions.invoke('acceptWorkspaceInvite', {});
      if (inviteResult?.data?.ok && inviteResult.data.workspace) {
        setWorkspace(inviteResult.data.workspace);
        setWorkspaceId(inviteResult.data.workspace.id);
        const freshMe = await base44.auth.me();
        setUser(freshMe);
      } else {
        // Genuinely a brand-new user — App.jsx should route them to WorkspaceSetup.
        setNeedsSetup(true);
      }
    } catch (_) {
      // Falha ao inicializar o workspace — a UI trata o estado de carregamento/erro.
    }
    setLoading(false);
  };

  const refreshWorkspace = async () => {
    if (!workspaceId) return;
    const wsList = await base44.entities.Workspace.filter({ id: workspaceId });
    if (wsList.length > 0) setWorkspace(wsList[0]);
  };

  const createWorkspace = async (data) => {
    const res = await base44.functions.invoke('createWorkspace', data);
    if (!res?.data?.ok) {
      throw new Error(res?.data?.error || 'Não foi possível criar o workspace.');
    }
    setWorkspace(res.data.workspace);
    setWorkspaceId(res.data.workspace.id);
    setNeedsSetup(false);
    const freshMe = await base44.auth.me();
    setUser(freshMe);
    return res.data.workspace;
  };

  const inviteMember = async (email, role = 'user') => {
    const res = await base44.functions.invoke('inviteMember', { email, role });
    if (!res?.data?.ok) {
      throw new Error(res?.data?.error || 'Não foi possível convidar este membro.');
    }
    await refreshWorkspace();
  };

  return (
    <WorkspaceContext.Provider
      value={{ workspace, workspaceId, loading, user, needsSetup, refreshWorkspace, inviteMember, createWorkspace, init }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  return useContext(WorkspaceContext);
}
