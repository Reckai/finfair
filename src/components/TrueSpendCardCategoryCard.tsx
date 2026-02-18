import React, { useMemo } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { formatCurrency } from '../utils/formatters';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/colors';

export interface TrueSpendCardCategoryCardProps {
  iconName: string;
  color: string;
  amount: number;
}

export const TrueSpendCardCategoryCard = (props: TrueSpendCardCategoryCardProps) => {
  const { iconName, color, amount } = props;
  const iconDynamicStyle = useMemo(
    () => [[styles.categoryIcon, { backgroundColor: color + '20' }]],
    [],
  );
  return (
    <View style={styles.categoryItem}>
      <View style={iconDynamicStyle}>
        <Ionicons name={iconName as keyof typeof Ionicons.glyphMap} size={18} color={color} />
      </View>
      <Text style={styles.categoryAmount}>{formatCurrency(amount)}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  categoryItem: {
    width: '47%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  categoryIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryAmount: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
});
