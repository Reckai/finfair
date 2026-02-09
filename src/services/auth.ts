import * as Linking from 'expo-linking';
import { api } from './api';
import { User } from '../types';

const TELEGRAM_BOT_URL = 'https://t.me/ParallelAccs_bot'; // TODO: Replace with actual bot username

interface AuthResponse {
  user: User;
  accessToken: string;
}

export const authService = {
  /**
   * Open Telegram bot for authentication
   */
  async loginWithTelegram(): Promise<void> {
    const startParam = 'auth';

    // Используем HTTPS формат - он надежнее передает параметры
    const telegramUrl = `https://t.me/ParallelAccs_bot?start=${startParam}`;

    await Linking.openURL(telegramUrl);
  },

  /**
   * Login with token from Telegram bot
   */
  async loginWithToken(token: string): Promise<AuthResponse | null> {
    const response = await api.post<AuthResponse>('/auth/telegram', { token });
    if (response.success && response.data) {
      await api.setToken(response.data.accessToken);
      return response.data;
    }

    return null;
  },

  /**
   * Handle deep link callback from Telegram auth
   */
  async handleAuthCallback(url: string): Promise<AuthResponse | null> {
    const { queryParams } = Linking.parse(url);

    if (!queryParams?.token) {
      return null;
    }

    const token = queryParams.token as string;

    const response = await api.post<AuthResponse>('/auth/telegram', { token });

    if (response.success && response.data) {
      await api.setToken(response.data.accessToken);
      return response.data;
    }

    return null;
  },

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const token = await api.getToken();
    return !!token;
  },

  /**
   * Get current user
   */
  async getCurrentUser(): Promise<User | null> {
    const response = await api.get<{user:User}>('/auth/me');
    return response.success ? response.data?.user || null : null;
  },

  /**
   * Logout
   */
  async logout(): Promise<void> {
    await api.clearToken();
  },
};
