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

      if (me.workspace_id) {
        // Try to load existing workspace
        const workspaces = await base44.entities.Workspace.list();
        const ws = workspaces.find(w => w.id === me.workspace_id);
        if (ws) {
          setWorkspace(ws);
          setWorkspaceId(ws.id);
          setLoading(false);
          return;
        }
      }

      // Check if user is a member of any workspace
      const all = await base44.entities.Workspace.list();
      const found = all.find(w =>
        w.owner_email === me.email ||
        (w.member_emails && w.member_emails.includes(me.email))
      );

      if (found) {
        setWorkspace(found);
        setWorkspaceId(found.id);
        await base44.auth.updateMe({ workspace_id: found.id });
      }
      // else: no workspace yet → WorkspaceSetup will be shown
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const createWorkspace = async (data) => {
    const ws = await base44.entities.Workspace.create({
      ...data,
      owner_email: user.email,
      member_emails: [],
    });
    await base44.auth.updateMe({ workspace_id: ws.id });
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

  return (
    <WorkspaceContext.Provider value={{ workspace, workspaceId, loading, user, createWorkspace, refreshWorkspace }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  return useContext(WorkspaceContext);
}