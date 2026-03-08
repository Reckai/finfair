import React, { useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { colors } from '../constants/colors';
import { PeriodSelector } from '../components/PeriodSelector';
import { SankeyChart } from '../components/SankeyChart';
import { BudgetRule503020 } from '../components/BudgetRule503020';
import { ExpenseCategoryList } from '../components/ExpenseCategoryList';
import { TrendChart } from '../components/TrendChart';
import {
  useAnalyticsSummary,
  useExpensesByCategory,
  useSankeyData,
  useTrend,
} from '../hooks/useAnalytics';

function getDefaultPeriod(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  return `${year}-${String(month).padStart(2, '0')}`;
}

export const AnalyticsScreen: React.FC = () => {
  const [period, setPeriod] = useState(getDefaultPeriod);

  const summary = useAnalyticsSummary(period);
  const expenses = useExpensesByCategory(period);
  const sankey = useSankeyData(period);
  const trend = useTrend(6);
  const isLoading = summary.isLoading || expenses.isLoading || sankey.isLoading || trend.isLoading;

  return (
    <View style={styles.container}>
      <PeriodSelector period={period} onPeriodChange={setPeriod} />
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.sectionTitle}>Потік грошей</Text>
          <SankeyChart data={sankey.data ?? { nodes: [], links: [] }} />

          <Text style={styles.sectionTitle}>Правило 50/30/20</Text>
          <BudgetRule503020 rule503020={summary.data?.rule503020 ?? null} />

          <Text style={styles.sectionTitle}>Витрати за категоріями</Text>
          <ExpenseCategoryList
            categories={expenses.data?.expensesByCategory ?? []}
            total={expenses.data?.total ?? 0}
          />

          <Text style={styles.sectionTitle}>Тренд</Text>
          <TrendChart data={trend.data ?? []} />
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 12,
    marginTop: 8,
  },
});
