import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/colors';

const MONTH_NAMES_UK: string[] = [
  'Січень', 'Лютий', 'Березень', 'Квітень',
  'Травень', 'Червень', 'Липень', 'Серпень',
  'Вересень', 'Жовтень', 'Листопад', 'Грудень',
];

interface PeriodSelectorProps {
  period: string;
  onPeriodChange: (period: string) => void;
}

export const PeriodSelector: React.FC<PeriodSelectorProps> = ({
  period,
  onPeriodChange,
}) => {
  const isYearMode = useMemo(() => !period.includes('-'), [period]);

  const displayText = useMemo(() => {
    if (isYearMode) {
      return period;
    }
    const [yearStr, monthStr] = period.split('-');
    const monthIndex = parseInt(monthStr, 10) - 1;
    return `${MONTH_NAMES_UK[monthIndex]} ${yearStr}`;
  }, [period, isYearMode]);

  const goToPreviousMonth = useCallback(() => {
    const [yearStr, monthStr] = period.split('-');
    let year = parseInt(yearStr, 10);
    let month = parseInt(monthStr, 10) - 1;
    if (month === 0) {
      month = 12;
      year -= 1;
    }
    onPeriodChange(`${year}-${String(month).padStart(2, '0')}`);
  }, [period, onPeriodChange]);

  const goToNextMonth = useCallback(() => {
    const [yearStr, monthStr] = period.split('-');
    let year = parseInt(yearStr, 10);
    let month = parseInt(monthStr, 10) + 1;
    if (month === 13) {
      month = 1;
      year += 1;
    }
    onPeriodChange(`${year}-${String(month).padStart(2, '0')}`);
  }, [period, onPeriodChange]);

  const toggleYearMode = useCallback(() => {
    if (isYearMode) {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      onPeriodChange(`${year}-${String(month).padStart(2, '0')}`);
    } else {
      const yearStr = period.split('-')[0];
      onPeriodChange(yearStr);
    }
  }, [isYearMode, period, onPeriodChange]);

  return (
    <View style={styles.container}>
      <View style={styles.navigationRow}>
        {!isYearMode && (
          <TouchableOpacity onPress={goToPreviousMonth} style={styles.arrowButton}>
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        )}
        <Text style={styles.periodText}>{displayText}</Text>
        {!isYearMode && (
          <TouchableOpacity onPress={goToNextMonth} style={styles.arrowButton}>
            <Ionicons name="chevron-forward" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        )}
      </View>
      <TouchableOpacity
        onPress={toggleYearMode}
        style={[styles.yearButton, isYearMode && styles.yearButtonActive]}
      >
        <Text style={[styles.yearButtonText, isYearMode && styles.yearButtonTextActive]}>
          За цей рік
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 12,
  },
  navigationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  arrowButton: {
    padding: 4,
  },
  periodText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    minWidth: 160,
    textAlign: 'center',
  },
  yearButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surfaceSecondary,
  },
  yearButtonActive: {
    backgroundColor: colors.primary,
  },
  yearButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  yearButtonTextActive: {
    color: '#FFFFFF',
  },
});
