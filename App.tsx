import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppNavigator } from './src/navigation/AppNavigator';
import { authService } from './src/services/auth';
import { useAppStore } from './src/store/useAppStore';
import { SplashScreen } from './src/components/SplashScreen';
import { pairsApi } from './src/services/pairs';
import { categoriesApi } from './src/services/categories';
import { useShallow } from 'zustand/react/shallow';

export default function App() {
  const { setUser, setLoading, setPairId, setCategories, isLoading } = useAppStore(
    useShallow((s) => ({
      setUser: s.setUser,
      setLoading: s.setLoading,
      setPairId: s.setPairId,
      setCategories: s.setCategories,
      isLoading: s.isLoading,
    })),
  );
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const authenticated = await authService.isAuthenticated();
        if (authenticated) {
          const user = await authService.getCurrentUser();
          if (user) {
            setUser(user);
          } else {
            await authService.logout();
            return;
          }
          const pairRes = await pairsApi.me();

          if (pairRes.success && pairRes.data) {
            setPairId(pairRes.data.pair ?? null);
          }
          const categories = await categoriesApi.getAll();
          if (categories.length > 0) {
            setCategories(categories);
          }
        }
      } catch (e) {
        console.error('Auth check failed:', e);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  if (isLoading) {
    return <SplashScreen />;
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <AppNavigator />
    </SafeAreaProvider>
  );
}
