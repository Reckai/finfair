import { useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '../store/useAppStore';
import { useEffect, useRef } from 'react';
import { performSync } from '../sync/syncEngine';
import { AppState, AppStateStatus } from 'react-native';

export function useSyncOnReconnect() {
  const isOnline = useAppStore((s) => s.isOnline);
  const queryClient = useQueryClient();
  const wasOffline = useRef(false);

  useEffect(() => {
    if (!isOnline) {
      wasOffline.current = true;
      return;
    }

    if (wasOffline.current) {
      wasOffline.current = false;
      performSync(queryClient);
    }
  }, [isOnline, queryClient]);

  useEffect(() => {
    const handleAppStateChange = (state: AppStateStatus) => {
      if (state === 'active' && isOnline) {
        performSync(queryClient);
      }
    };
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [isOnline, queryClient]);
}
