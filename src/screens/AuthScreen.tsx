import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/colors';
import { authService } from '../services/auth';
import { useAppStore } from '../store/useAppStore';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Auth'>;

export const AuthScreen: React.FC<Props> = ({ route }) => {
  const setUser = useAppStore((s) => s.setUser);
  const token = route.params?.token;
  const [manualToken, setManualToken] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleTelegramLogin = async () => {
    try {
      await authService.loginWithTelegram();
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  const handleManualLogin = async () => {
    if (!manualToken.trim()) {
      Alert.alert('Ошибка', 'Введите токен');
      return;
    }

    setLoading(true);
    try {
      const result = await authService.loginWithToken(manualToken.trim());
      if (result) {
        setUser(result.user);
      } else {
        Alert.alert('Ошибка', 'Неверный токен');
      }
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось войти');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <Ionicons name="wallet" size={48} color={colors.primary} />
          </View>
          <Text style={styles.title}>FinFair</Text>
          <Text style={styles.subtitle}>Учёт расходов для пар</Text>
        </View>

        <View style={styles.content}>
          <Text style={styles.description}>
            Ведите совместный учёт расходов и следите за балансом между партнёрами
          </Text>

          <Pressable style={styles.telegramButton} onPress={handleTelegramLogin}>
            <Ionicons name="paper-plane" size={24} color="#FFFFFF" />
            <Text style={styles.telegramButtonText}>Войти через Telegram</Text>
          </Pressable>

          {/* Ручной ввод токена из бота */}
          {showManualInput ? (
            <View style={styles.manualInputContainer}>
              <TextInput
                value={manualToken}
                onChangeText={setManualToken}
                placeholder="Вставьте токен из бота"
                placeholderTextColor={colors.textSecondary}
                style={styles.tokenInput}
                autoCapitalize="none"
              />
              <Pressable style={styles.loginButton} onPress={handleManualLogin} disabled={loading}>
                <Text style={styles.loginButtonText}>{loading ? 'Вход...' : 'Войти'}</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable style={styles.manualLink} onPress={() => setShowManualInput(true)}>
              <Text style={styles.manualLinkText}>Ввести токен вручную</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  content: {
    alignItems: 'center',
  },
  description: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  telegramButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0088cc',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    gap: 12,
  },
  telegramButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  manualInputContainer: {
    width: '100%',
    marginTop: 24,
    gap: 12,
  },
  tokenInput: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  loginButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  manualLink: {
    marginTop: 24,
    padding: 12,
  },
  manualLinkText: {
    color: colors.textSecondary,
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});
