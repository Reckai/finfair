import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Transaction } from '../types';
import { getCategoryById } from '../constants/categories';
import { colors } from '../constants/colors';
import { formatCurrency, formatRelativeTime } from '../utils/formatters';
import { useAppStore } from '../store/useAppStore';

interface TransactionCardProps {
  transaction: Transaction;
}

export const TransactionCard: React.FC<TransactionCardProps> = React.memo(function TransactionCard({
  transaction,
}) {
  const storeCategories = useAppStore((s) => s.categories);
  const category = transaction.category || getCategoryById(transaction.categoryId, storeCategories);
  const iconName = category?.iconName || 'help-circle';

  const iconContainerDynamicStyle = useMemo(
    () => [styles.iconContainer, { backgroundColor: (category?.color || colors.textMuted) + '20' }],
    [category?.color, colors.textMuted],
  );

  return (
    <View style={styles.container}>
      <View style={iconContainerDynamicStyle}>
        <MaterialCommunityIcons
          name={iconName as keyof typeof MaterialCommunityIcons.glyphMap}
          size={24}
          color={category?.color || colors.textMuted}
        />
      </View>
      <View style={styles.content}>
        <Text style={styles.categoryName}>{category?.name || 'Неизвестно'}</Text>
        {transaction.description && (
          <Text style={styles.description} numberOfLines={1}>
            {transaction.description}
          </Text>
        )}
        <Text style={styles.time}>{formatRelativeTime(transaction.createdAt)}</Text>
      </View>
      <Text style={styles.amount}>-{formatCurrency(transaction.amount)}</Text>
      {transaction._pendingOutBoxId && (
        <Ionicons name="cloud-upload-outline" size={16} color="#F59E0B" style={{ marginLeft: 6 }} />
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    marginLeft: 12,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  description: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  time: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
  },
  amount: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.error,
  },
});
