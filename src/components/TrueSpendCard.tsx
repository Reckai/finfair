import React, { useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/colors';
import { resolveIconName, getCategoryById } from '../constants/categories';
import { formatCurrency } from '../utils/formatters';
import { CategorySpend } from '../utils/categoryCalculator';
import { useAppStore } from '../store/useAppStore';
import { TrueSpendCardCategoryCard } from './TrueSpendCardCategoryCard';

interface TrueSpendCardProps {
  trueSpend: number;
  totalFromCard: number;
  partnerSpend: number;
  categoryBreakdown: CategorySpend[];
}

export const TrueSpendCard: React.FC<TrueSpendCardProps> = ({
  trueSpend,
  totalFromCard,
  partnerSpend,
  categoryBreakdown,
}) => {
  const storeCategories = useAppStore((s) => s.categories);

 
  const chartData = categoryBreakdown.map((item) => {
    const category = getCategoryById(item.categoryId, storeCategories);
    return {
      value: item.amount,
      color: category?.color || colors.categoryOther,
    };
  });

  const hasData = chartData.length > 0 && trueSpend > 0;
  const centralLabel = useCallback(() => (
    <View style={styles.centerLabel}>
      <Text style={styles.centerAmount}>{formatCurrency(trueSpend)}</Text>
      <Text style={styles.centerText}>ваші витрати</Text>
    </View>
  ), [trueSpend]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIcon}>
            <Ionicons name="wallet-outline" size={20} color={colors.primary} />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Моя Економіка</Text>
            <Text style={styles.headerSubtitle}>Реальна картина ваших фінансів</Text>
          </View>
        </View>
      </View>

      <View style={styles.chartSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Справжні витрати</Text>
        </View>

        <View style={styles.chartContainer}>
          {hasData ? (
            <PieChart
              data={chartData}
              donut
              radius={100}
              innerRadius={70}
              centerLabelComponent={centralLabel}
            />
          ) : (
            <View style={styles.emptyChart}>
              <View style={styles.emptyChartInner}>
                <Text style={styles.centerAmount}>{formatCurrency(0)}</Text>
                <Text style={styles.centerText}>ваші витрати</Text>
              </View>
            </View>
          )}
        </View>
      </View>

      <View style={styles.infoBar}>
        <Text style={styles.infoText}>
          З картки витрачено <Text style={styles.infoHighlight}>{formatCurrency(totalFromCard)}</Text>
        </Text>
        <Text style={styles.infoText}>
          З них покупки партнера: <Text style={styles.infoHighlight}>{formatCurrency(partnerSpend)}</Text>
        </Text>
      </View>

     
      {categoryBreakdown.length > 0 && (
        <View style={styles.categoriesGrid}>
          {categoryBreakdown.map((item) => {
            const category = getCategoryById(item.categoryId, storeCategories);
            if (!category) return null;
            const iconName = resolveIconName(category.iconName);

            return (
             <TrueSpendCardCategoryCard iconName={iconName} color={category.color} amount={item.amount} />
            );
          })}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primaryLight + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '600',
  },
  headerSubtitle: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  chartSection: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  badge: {
    backgroundColor: colors.surfaceSecondary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
  chartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  centerLabel: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerAmount: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
  },
  centerText: {
    color: colors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  emptyChart: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 30,
    borderColor: colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyChartInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoBar: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  infoText: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 22,
  },
  infoHighlight: {
    color: colors.primary,
    fontWeight: '600',
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
 

});
