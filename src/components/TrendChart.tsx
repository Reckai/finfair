import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { TrendEntry } from '../services/analytics';
import { colors } from '../constants/colors';

const MONTH_ABBR_UK = [
  'Січ', 'Лют', 'Бер', 'Кві', 'Тра', 'Чер',
  'Лип', 'Сер', 'Вер', 'Жов', 'Лис', 'Гру',
];

interface TrendChartProps {
  data: TrendEntry[];
}

function formatYAxis(value: number): string {
  if (value >= 1000) {
    return `${Math.round(value / 1000)}K`;
  }
  return String(Math.round(value));
}

function getMonthLabel(period: string): string {
  const monthStr = period.split('-')[1];
  const monthIndex = parseInt(monthStr, 10) - 1;
  return MONTH_ABBR_UK[monthIndex] ?? '';
}

export const TrendChart: React.FC<TrendChartProps> = ({ data }) => {
  if (!data.length) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>Немає даних</Text>
      </View>
    );
  }

  const { incomeData, expenseData, maxValue } = useMemo(() => {
    let max = 0;
    const income = data.map((entry) => {
      if (entry.income > max) max = entry.income;
      if (entry.expense > max) max = entry.expense;
      return {
        value: entry.income,
        label: getMonthLabel(entry.period),
      };
    });
    const expense = data.map((entry) => ({
      value: entry.expense,
    }));
    return { incomeData: income, expenseData: expense, maxValue: max };
  }, [data]);

  return (
    <View style={styles.container}>
      <LineChart
        data={incomeData}
        data2={expenseData}
        height={180}
        spacing={50}
        color1="#4CAF50"
        color2="#F44336"
        dataPointsColor1="#4CAF50"
        dataPointsColor2="#F44336"
        thickness={2}
        noOfSections={4}
        maxValue={maxValue * 1.1 || 100}
        yAxisTextStyle={styles.axisText}
        xAxisLabelTextStyle={styles.axisText}
        formatYLabel={formatYAxis}
        hideRules={false}
        rulesColor={colors.borderLight}
        yAxisColor={colors.border}
        xAxisColor={colors.border}
        curved
      />
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#4CAF50' }]} />
          <Text style={styles.legendText}>Доходи</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#F44336' }]} />
          <Text style={styles.legendText}>Витрати</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 40,
  },
  axisText: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginTop: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
});
