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
import { SplitModeToggle } from '../components/OwnerToggle';
import { MainTabParamList, SplitMode } from '../types';
import { useAppStore } from '../store/useAppStore';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useCreateTransaction } from '../hooks/useCreateTransaction';

type Props = BottomTabScreenProps<MainTabParamList, 'AddTransaction'>;

export const AddTransactionScreen: React.FC<Props> = () => {
  const [amount, setAmount] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [description, setDescription] = useState('');
  const [splitMode, setSplitMode] = useState<SplitMode>('HALF');
  const [isFocused, setIsFocused] = useState(false);
  const { mutate: createTransaction, isPending: isSubmitting } = useCreateTransaction();
  const partnerName = useAppStore((s) => s.settings.partnerName);
  const pairId = useAppStore((s) => s.pairId);
  const scrollRef = useRef<ScrollView>(null);
  const handleScrollUp = () => {
    scrollRef.current?.scrollTo({
      y: 0,
      animated: true,
    });
  };
  const handleSubmit = async () => {
    if (!amount || !selectedCategory || isSubmitting) {
      return;
    }

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
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView ref={scrollRef} contentContainerStyle={styles.content}>
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

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>За кого?</Text>
          <SplitModeToggle value={splitMode} onChange={setSplitMode} partnerName={partnerName} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Категория</Text>
          <CategoryGrid
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
          />
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
