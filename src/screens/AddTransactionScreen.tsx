import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Pressable,
} from 'react-native';

import { colors } from '../constants/colors';
import { CategoryGrid } from '../components/CategoryGrid';
import { IncomeCategoryGrid } from '../components/IncomeCategoryGrid';
import { SplitModeToggle } from '../components/OwnerToggle';
import { MainTabParamList, SplitMode } from '../types';
import { useAppStore } from '../store/useAppStore';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useCreateTransaction } from '../hooks/useCreateTransaction';
import { useCreateIncome } from '../hooks/useCreateIncome';

type Props = BottomTabScreenProps<MainTabParamList, 'AddTransaction'>;
type EntryMode = 'expense' | 'income';

export const AddTransactionScreen: React.FC<Props> = () => {
  const [mode, setMode] = useState<EntryMode>('expense');
  const [amount, setAmount] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [description, setDescription] = useState('');
  const [splitMode, setSplitMode] = useState<SplitMode>('HALF');
  const [isFocused, setIsFocused] = useState(false);
  const { mutate: createTransaction, isPending: isSubmittingExpense } = useCreateTransaction();
  const { mutate: createIncome, isPending: isSubmittingIncome } = useCreateIncome();
  const isSubmitting = isSubmittingExpense || isSubmittingIncome;
  const partnerName = useAppStore((s) => s.settings.partnerName);
  const pairId = useAppStore((s) => s.pairId);
  const scrollRef = useRef<ScrollView>(null);

  const handleScrollUp = () => {
    scrollRef.current?.scrollTo({
      y: 0,
      animated: true,
    });
  };

  const handleModeChange = (newMode: EntryMode) => {
    if (newMode !== mode) {
      setMode(newMode);
      setSelectedCategory(null);
    }
  };

  const handleSubmit = async () => {
    if (!amount || !selectedCategory || isSubmitting) {
      return;
    }

    if (mode === 'expense') {
      createTransaction(
        {
          amount: parseFloat(amount),
          categoryId: selectedCategory,
          splitMode,
          description: description || undefined,
          pairId: pairId || undefined,
        },
        {
          onSuccess: () => {
            setAmount('');
            setSelectedCategory(null);
            setDescription('');
            setSplitMode('HALF');
            setIsFocused(false);
            handleScrollUp();
          },
          onError: () => {
            Alert.alert('Ошибка', 'Не удалось создать транзакцию');
          },
        },
      );
    } else {
      createIncome(
        {
          amount: parseFloat(amount),
          incomeCategoryId: selectedCategory,
          description: description || undefined,
        },
        {
          onSuccess: () => {
            setAmount('');
            setSelectedCategory(null);
            setDescription('');
            setIsFocused(false);
            handleScrollUp();
          },
          onError: () => {
            Alert.alert('Ошибка', 'Не удалось добавить доход');
          },
        },
      );
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView ref={scrollRef} contentContainerStyle={styles.content}>
        <View style={styles.modeToggleContainer}>
          <Pressable
            style={[styles.modeToggleButton, mode === 'expense' && styles.modeToggleButtonActive]}
            onPress={() => handleModeChange('expense')}
          >
            <Text
              style={[styles.modeToggleText, mode === 'expense' && styles.modeToggleTextActive]}
            >
              Расход
            </Text>
          </Pressable>
          <Pressable
            style={[styles.modeToggleButton, mode === 'income' && styles.modeToggleButtonActive]}
            onPress={() => handleModeChange('income')}
          >
            <Text
              style={[styles.modeToggleText, mode === 'income' && styles.modeToggleTextActive]}
            >
              Доход
            </Text>
          </Pressable>
        </View>

        <View style={styles.amountContainer}>
          <Text style={styles.currencySymbol}>₴</Text>

          <View style={styles.inputWrapper}>
            {!isFocused && !amount && (
              <Text style={styles.overlayPlaceholder} pointerEvents="none">
                0
              </Text>
            )}

            <TextInput
              style={styles.amountInput}
              value={amount}
              onChangeText={setAmount}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
            />
          </View>
        </View>

        {mode === 'expense' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>За кого?</Text>
            <SplitModeToggle value={splitMode} onChange={setSplitMode} partnerName={partnerName} />
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Категория</Text>
          {mode === 'expense' ? (
            <CategoryGrid
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
            />
          ) : (
            <IncomeCategoryGrid
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
            />
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Описание (необязательно)</Text>
          <TextInput
            style={styles.descriptionInput}
            value={description}
            onChangeText={setDescription}
            placeholder="Добавьте описание..."
            placeholderTextColor={colors.textMuted}
            multiline
          />
        </View>

        <Pressable
          style={[
            styles.submitButton,
            (!amount || !selectedCategory || isSubmitting) && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={!amount || !selectedCategory || isSubmitting}
        >
          <Text style={styles.submitButtonText}>{isSubmitting ? 'Добавление...' : 'Добавить'}</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
  },
  modeToggleContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  modeToggleButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  modeToggleButtonActive: {
    backgroundColor: colors.primary,
  },
  modeToggleText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textMuted,
  },
  modeToggleTextActive: {
    color: '#FFFFFF',
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
  },
  currencySymbol: {
    fontSize: 36,
    fontWeight: '600',
    color: colors.textSecondary,
    marginRight: 8,
  },
  inputWrapper: {
    position: 'relative',
    minWidth: 100,
    justifyContent: 'center',
  },
  amountInput: {
    fontSize: 48,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    minWidth: 100,
    padding: 0,
    margin: 0,
    zIndex: 2,
  },
  overlayPlaceholder: {
    position: 'absolute',
    width: '100%',
    textAlign: 'center',
    fontSize: 48,
    fontWeight: '700',
    color: colors.textMuted,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  descriptionInput: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: colors.textPrimary,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    backgroundColor: colors.textMuted,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
