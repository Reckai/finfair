import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ExpenseByCategory } from '../services/analytics';
import { colors } from '../constants/colors';

interface ExpenseCategoryListProps {
  categories: ExpenseByCategory[];
  total: number;
}

function formatAmount(value: number): string {
  return `${Math.round(value).toLocaleString()} ₴`;
}

export const ExpenseCategoryList: React.FC<ExpenseCategoryListProps> = ({
  categories,
  total,
}) => {
  if (!categories.length) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>Немає витрат</Text>
      </View>
    );
  }

  const sorted = [...categories].sort((a, b) => b.total - a.total);

  return (
    <View style={styles.container}>
      {sorted.map((cat, index) => (
        <View
          key={cat.categoryId}
          style={[
            styles.row,
            index < sorted.length - 1 && styles.rowBorder,
          ]}
        >
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons
              name={cat.iconName as any}
              size={22}
              color={cat.color}
            />
          </View>
          <View style={styles.info}>
            <View style={styles.topRow}>
              <Text style={styles.name} numberOfLines={1}>
                {cat.name}
              </Text>
              <Text style={styles.amount}>{formatAmount(cat.total)}</Text>
              <Text style={styles.percent}>{Math.round(cat.percent)}%</Text>
            </View>
            <View style={styles.barBackground}>
              <View
                style={[
                  styles.barFill,
                  {
                    width: `${Math.min(cat.percent, 100)}%`,
                    backgroundColor: cat.color,
                  },
                ]}
              />
            </View>
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    overflow: 'hidden',
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 40,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    gap: 6,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  amount: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  percent: {
    fontSize: 12,
    color: colors.textSecondary,
    minWidth: 32,
    textAlign: 'right',
  },
  barBackground: {
    height: 6,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
});
