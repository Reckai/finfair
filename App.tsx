import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import { AppNavigator } from './src/navigation/AppNavigator';
import { authService } from './src/services/auth';
import { useAppStore } from './src/store/useAppStore';
import { SplashScreen } from './src/components/SplashScreen';
import { pairsApi } from './src/services/pairs';
import { categoriesApi } from './src/services/categories';

export default function App() {
  const isLoading = useAppStore((s) => s.isLoading);
  const setUser = useAppStore((s) => s.setUser);
  const setLoading = useAppStore((s) => s.setLoading);
  const setPairId = useAppStore((s) => s.setPairId);
const setCategories = useAppStore((s) => s.setCategories);

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

  useEffect(() => {
    const handleDeepLink = async (event: { url: string }) => {
      const result = await authService.handleAuthCallback(event.url);
      if (result) {
        setUser(result.user);
        const pairRes = await pairsApi.me();
        if (pairRes.success && pairRes.data) {
          setPairId(pairRes.data.pair ?? null);
        }
        const categories = await categoriesApi.getAll();
        if (categories.length > 0) {
          setCategories(categories);
        }
      }
    };

    const subscription = Linking.addEventListener('url', handleDeepLink);

    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink({ url });
      }
    });

    return () => {
      subscription.remove();
    };
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
