import React from 'react';
import { View, Text,  StyleSheet, Pressable } from 'react-native';
import { colors } from '../constants/colors';
import { formatCurrency } from '../utils/formatters';

interface NetBalanceCardProps {
  balance: number;
  onSettleUp: () => void;
  showSettlementButton: boolean
}

export const NetBalanceCard: React.FC<NetBalanceCardProps> = ({
  balance,
  onSettleUp,
  showSettlementButton
}) => {
  const isPositive = balance > 0;
  const isZero = balance === 0;

  const getStatusText = () => {
    if (isZero) return 'Баланс в норме';
    if (isPositive) return 'Тебе должны';
    return 'Ты должен';
  };

  const getBackgroundColor = () => {
    if (isZero) return colors.surfaceSecondary;
    if (isPositive) return colors.success;
    return colors.error;
  };

  return (
    <View style={[styles.container, { backgroundColor: getBackgroundColor() }]}>
      <View style={styles.content}>
        <Text style={[styles.label, isZero && styles.labelNeutral]}>
          {getStatusText()}
        </Text>
        <Text style={[styles.amount, isZero && styles.amountNeutral]}>
          {formatCurrency(Math.abs(balance))}
        </Text>
      </View>
      {!isZero && showSettlementButton && (
        <Pressable style={styles.settleButton} onPress={onSettleUp}>
          <Text style={styles.settleButtonText}>Рассчитаться</Text>
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 20,
  },
  content: {
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 4,
  },
  labelNeutral: {
    color: colors.textSecondary,
  },
  amount: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  amountNeutral: {
    color: colors.textPrimary,
  },
  settleButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  settleButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
