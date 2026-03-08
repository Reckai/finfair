import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AnalyticsSummary } from '../services/analytics';
import { colors } from '../constants/colors';

interface BucketData {
  target: number;
  actual: number;
  percent: number;
  targetPercent: number;
  status: 'UNDER' | 'OVER' | 'OK';
}

interface BudgetRule503020Props {
  rule503020: AnalyticsSummary['rule503020'] | null | undefined;
}

const BUCKETS: { key: 'need' | 'want' | 'saving'; label: string }[] = [
  { key: 'need', label: 'Необхідне 50%' },
  { key: 'want', label: 'Бажане 30%' },
  { key: 'saving', label: 'Накопичення 20%' },
];

function formatAmount(value: number): string {
  return `${Math.round(value).toLocaleString()} ₴`;
}

function BucketRow({ label, data }: { label: string; data: BucketData }) {
  const ratio = data.target > 0 ? Math.min(data.actual / data.target, 1) : 0;
  const barColor = data.status === 'OVER' ? '#F44336' : '#4CAF50';

  return (
    <View style={styles.bucketRow}>
      <View style={styles.bucketHeader}>
        <Text style={styles.bucketLabel}>{label}</Text>
        <Text style={styles.bucketAmount}>
          {formatAmount(data.actual)} / {formatAmount(data.target)}
        </Text>
      </View>
      <View style={styles.barBackground}>
        <View style={[styles.barFill, { width: `${ratio * 100}%`, backgroundColor: barColor }]} />
      </View>
    </View>
  );
}

export const BudgetRule503020: React.FC<BudgetRule503020Props> = ({ rule503020 }) => {
  if (!rule503020) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>Немає даних</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {BUCKETS.map(({ key, label }) => (
        <BucketRow key={key} label={label} data={rule503020[key]} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    gap: 16,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 40,
  },
  bucketRow: {
    gap: 6,
  },
  bucketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bucketLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  bucketAmount: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  barBackground: {
    height: 8,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
});
