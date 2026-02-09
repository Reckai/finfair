import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Share,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';

import { colors } from '../constants/colors';
import { useAppStore } from '../store/useAppStore';
import { pairsApi } from '../services/pairs';

export const SettingsScreen: React.FC = () => {
  const pairId = useAppStore((s) => s.pairId);
  const setPairId = useAppStore((s) => s.setPairId);
  const partnerName = useAppStore((s) => s.settings.partnerName);
  const setPartnerName = useAppStore((s) => s.setPartnerName);

  const [name, setName] = useState(partnerName);
  const [saved, setSaved] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);

  // Sync pair status on mount
  useEffect(() => {
    const fetchPairStatus = async () => {
      const res = await pairsApi.me();
      if (res.success && res.data) {
        setPairId(res.data.pair ?? null);
      }
      setStatusLoading(false);
    };
    fetchPairStatus();
  }, []);

  const handleSavePartnerName = () => {
    if (name.trim()) {
      setPartnerName(name.trim());
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const handleCreatePair = async () => {
    setLoading(true);
    const res = await pairsApi.create();
    if (res.success && res.data) {
      setInviteCode(res.data.inviteCode);
      setPairId(res.data.pair.id);
    } else {
      Alert.alert('Ошибка', res.error || 'Не удалось создать пару');
    }
    setLoading(false);
  };

  const handleCopyCode = async () => {
    if (inviteCode) {
      await Clipboard.setStringAsync(inviteCode);
      Alert.alert('Скопировано', 'Код приглашения скопирован в буфер обмена');
    }
  };

  const handleShareCode = async () => {
    if (inviteCode) {
      await Share.share({
        message: `Присоединяйся ко мне в FinFair! Код приглашения: ${inviteCode}`,
      });
    }
  };

  const handleJoinPair = async () => {
    if (joinCode.trim().length !== 8) {
      Alert.alert('Ошибка', 'Код должен содержать 8 символов');
      return;
    }
    setLoading(true);
    const res = await pairsApi.join(joinCode.trim());
    if (res.success && res.data) {
      setPairId(res.data.pair.id);
      setJoinCode('');
      Alert.alert('Успешно', 'Вы присоединились к паре!');
    } else {
      Alert.alert('Ошибка', res.error || 'Не удалось присоединиться');
    }
    setLoading(false);
  };

  const handleLeavePair = () => {
    Alert.alert(
      'Выйти из пары',
      'Вы уверены, что хотите выйти из пары? Это действие нельзя отменить.',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Выйти',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            const res = await pairsApi.leave();
            if (res.success) {
              setPairId(null);
              setInviteCode(null);
            } else {
              Alert.alert('Ошибка', res.error || 'Не удалось выйти из пары');
            }
            setLoading(false);
          },
        },
      ],
    );
  };

  if (statusLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {pairId ? (
          <>
            {/* Paired state */}
            <View style={styles.pairedBanner}>
              <Text style={styles.pairedIcon}>🤝</Text>
              <Text style={styles.pairedText}>Вы в паре</Text>
            </View>

            {/* Invite code display (if just created) */}
            {inviteCode && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Код приглашения</Text>
                <Text style={styles.sectionDescription}>
                  Отправьте этот код партнёру для присоединения
                </Text>
                <Text style={styles.codeDisplay}>{inviteCode}</Text>
                <View style={styles.codeActions}>
                  <TouchableOpacity
                    style={styles.codeButton}
                    onPress={handleCopyCode}
                  >
                    <Text style={styles.codeButtonText}>Скопировать</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.codeButton, styles.shareButton]}
                    onPress={handleShareCode}
                  >
                    <Text style={styles.codeButtonText}>Поделиться</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Partner name */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Имя партнёра</Text>
              <Text style={styles.sectionDescription}>
                Это имя будет использоваться в интерфейсе
              </Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Введите имя"
                placeholderTextColor={colors.textMuted}
              />
              <TouchableOpacity
                style={[
                  styles.saveButton,
                  !name.trim() && styles.saveButtonDisabled,
                ]}
                onPress={handleSavePartnerName}
                disabled={!name.trim()}
              >
                <Text style={styles.saveButtonText}>
                  {saved ? 'Сохранено!' : 'Сохранить'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Leave pair */}
            <TouchableOpacity
              style={styles.dangerButton}
              onPress={handleLeavePair}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.dangerButtonText}>Выйти из пары</Text>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <>
            {/* Create pair */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Создать пару</Text>
              <Text style={styles.sectionDescription}>
                Создайте пару и отправьте код приглашения партнёру
              </Text>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleCreatePair}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryButtonText}>Создать пару</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Invite code display (after creation) */}
            {inviteCode && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Код приглашения</Text>
                <Text style={styles.codeDisplay}>{inviteCode}</Text>
                <View style={styles.codeActions}>
                  <TouchableOpacity
                    style={styles.codeButton}
                    onPress={handleCopyCode}
                  >
                    <Text style={styles.codeButtonText}>Скопировать</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.codeButton, styles.shareButton]}
                    onPress={handleShareCode}
                  >
                    <Text style={styles.codeButtonText}>Поделиться</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Join pair */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Присоединиться к паре</Text>
              <Text style={styles.sectionDescription}>
                Введите код приглашения от партнёра
              </Text>
              <TextInput
                style={styles.input}
                value={joinCode}
                onChangeText={(text) =>
                  setJoinCode(text.replace(/[^0-9a-fA-F]/g, '').slice(0, 8))
                }
                placeholder="Введите код (8 символов)"
                placeholderTextColor={colors.textMuted}
                maxLength={8}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  { marginTop: 12 },
                  joinCode.length !== 8 && styles.saveButtonDisabled,
                ]}
                onPress={handleJoinPair}
                disabled={joinCode.length !== 8 || loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryButtonText}>Присоединиться</Text>
                )}
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pairedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  pairedIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  pairedText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#065F46',
  },
  codeDisplay: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.primary,
    textAlign: 'center',
    letterSpacing: 4,
    paddingVertical: 16,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 12,
    overflow: 'hidden',
  },
  codeActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  codeButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  shareButton: {
    backgroundColor: colors.primaryDark,
  },
  codeButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  saveButtonDisabled: {
    backgroundColor: colors.textMuted,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  dangerButton: {
    backgroundColor: colors.error,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  dangerButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
