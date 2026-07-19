import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { useWorkspace } from '@/lib/WorkspaceContext';
import { can } from '@/lib/permissions';
import { useWorkspaceEntity } from '@/lib/useWorkspaceData';

/**
 * Transfers waiting for the current user's acceptance — same criteria as the
 * "aguardando meu aceite" list in Transfers.jsx, so badge and page never diverge.
 * One shared react-query cache entry feeds Sidebar and MobileTabBar (single poll).
 */
export function usePendingTransfersCount() {
  const { user } = useAuth();
  const { workspace } = useWorkspace();
  const TransferEntity = useWorkspaceEntity('AssetTransfer');
  const myEmail = (user?.email || '').toLowerCase();

  const { data } = useQuery({
    queryKey: ['transfers', 'pending-count', workspace?.id, myEmail],
    enabled: !!workspace?.id && !!myEmail && can(user, 'view_transfers'),
    queryFn: async () => {
      // Badge caps visually at "9+", so a small page is enough.
      const rows = await TransferEntity.filterAll({ status: 'pendente' }, '-requested_at');
      return rows.filter((t) => (t.recipient_email || '').toLowerCase() === myEmail).length;
    },
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    staleTime: 30_000,
  });

  return data ?? 0;
}
