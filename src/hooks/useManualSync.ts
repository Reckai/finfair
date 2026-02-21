import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { performSync } from '../sync/syncEngine';
import { useAppStore } from '../store/useAppStore';

export function useManualSync() {
  const queryClient = useQueryClient();
  const isOnline = useAppStore((s) => s.isOnline);
  const [isSyncing, setIsSyncing] = useState(false);

  const sync = useCallback(async () => {
    setIsSyncing(true);
    try {
      if (isOnline) {
        await performSync(queryClient);
      }
    } finally {
      setIsSyncing(false);
    }
  }, [queryClient, isOnline]);

  return { sync, isSyncing };
}
