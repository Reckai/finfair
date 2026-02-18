import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  
  TextInput,
  StyleSheet,
  Pressable,
} from 'react-native';
import { colors } from '../constants/colors';
import { formatCurrency } from '../utils/formatters';

interface SettleUpModalProps {
  visible: boolean;
  currentBalance: number;
  onClose: () => void;
  onSettle: (amount: number) => void;
}

export const SettleUpModal: React.FC<SettleUpModalProps> = ({
  visible,
  currentBalance,
  onClose,
  onSettle,
}) => {
  const [amount, setAmount] = useState(Math.abs(currentBalance).toString());
  const isOwed = currentBalance > 0;
  
 useEffect(() => {
    if (visible) {
      setAmount(Math.abs(currentBalance).toString());
    }
  }, [visible, currentBalance]);

  const handleSettle = () => {
    const settleAmount = parseFloat(amount);
    if (settleAmount > 0) {
      onSettle(settleAmount);
      onClose();
    }
  };

  const handleSettleFull = () => {
    onSettle(Math.abs(currentBalance));
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.content}>
          <Text style={styles.title}>Рассчитаться</Text>

          <View style={styles.balanceInfo}>
            <Text style={styles.balanceLabel}>
              {isOwed ? 'Тебе должны' : 'Ты должен'}
            </Text>
            <Text style={[styles.balanceAmount, isOwed ? styles.positive : styles.negative]}>
              {formatCurrency(Math.abs(currentBalance))}
            </Text>
          </View>

          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Сумма погашения</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.currencySymbol}>₴</Text>
              <TextInput
                style={styles.input}
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={colors.textMuted}
              />
            </View>
          </View>

          <View style={styles.buttons}>
            <Pressable style={styles.fullButton} onPress={handleSettleFull}>
              <Text style={styles.fullButtonText}>Погасить полностью</Text>
            </Pressable>

            <View style={styles.buttonRow}>
              <Pressable style={styles.cancelButton} onPress={onClose}>
                <Text style={styles.cancelButtonText}>Отмена</Text>
              </Pressable>
              <Pressable style={styles.confirmButton} onPress={handleSettle}>
                <Text style={styles.confirmButtonText}>Подтвердить</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 24,
  },
  balanceInfo: {
    alignItems: 'center',
    marginBottom: 24,
  },
  balanceLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: '700',
  },
  positive: {
    color: colors.success,
  },
  negative: {
    color: colors.error,
  },
  inputSection: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.textSecondary,
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 24,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  buttons: {
    gap: 12,
  },
  fullButton: {
    backgroundColor: colors.primaryLight,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  fullButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
