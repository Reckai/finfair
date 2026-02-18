import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, RefreshControl, Pressable } from 'react-native';
import { FlashList } from '@shopify/flash-list';

import { colors } from '../constants/colors';
import { TransactionCard } from '../components/TransactionCard';
import { MainTabParamList, Transaction } from '../types';
import { useAppStore } from '../store/useAppStore';
import { transactionsApi } from '../services/transactions';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

type FilterType = 'all' | 'debt';
type Props = BottomTabScreenProps<MainTabParamList, 'History'>;



const isDebtTransaction = (tx: Transaction): boolean => {
  return tx.splitMode === 'HALF' || tx.splitMode === 'PARTNER';
};



export const HistoryScreen: React.FC<Props> = () => {
  const [filter, setFilter] = useState<FilterType>('all');
  const [refreshing, setRefreshing] = useState(false);

  const transactions = useAppStore((s) => s.transactions);
  const pairId = useAppStore((s) => s.pairId);
  const user = useAppStore((s) => s.user);
  const setTransactions = useAppStore((s) => s.setTransactions);

  const currentUserId = user?.id || '';
  
  const loadTransactions = useCallback(async () => {
    const data = pairId
      ? await transactionsApi.getAllPair()
      : await transactionsApi.getAll();
    setTransactions(data);
  }, [pairId, setTransactions]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadTransactions();
    setRefreshing(false);
  }, [loadTransactions]);
  
  const handleFilterAll = useCallback(()=>setFilter('all'),[]);
  const handleFilterDebt = useCallback(()=>setFilter('debt'),[]);

  const filteredTransactions = filter === 'all'
    ? transactions
    : transactions.filter(isDebtTransaction);

  const getSplitLabel =  useCallback((tx: Transaction): string | null => {
    if (tx.splitMode === 'PARTNER') {
      return tx.userId === currentUserId ? 'Подарок' : 'Мне оплатили';
    }
    if (tx.splitMode === 'HALF') {
      return 'Пополам';
    }
    return null;
  }, [currentUserId]);

  const renderItem = useCallback(({ item }: { item: Transaction }) => {
    const label = getSplitLabel(item);
    return (
      <View style={label ? styles.debtTransactionWrapper : undefined}>
        <TransactionCard transaction={item} />
        {label && (
          <View style={styles.debtIndicator}>
            <Text style={styles.debtIndicatorText}>{label}</Text>
          </View>
        )}
      </View>
    );
  }, [getSplitLabel]);

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>Нет транзакций</Text>
      <Text style={styles.emptySubtext}>
        Добавьте первый расход, чтобы начать учёт
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.filterContainer}>
        <Pressable
          style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
          onPress={handleFilterAll}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
            Все
          </Text>
        </Pressable>
        <Pressable
          style={[styles.filterButton, filter === 'debt' && styles.filterButtonActive]}
          onPress={handleFilterDebt}
        >
          <Text style={[styles.filterText, filter === 'debt' && styles.filterTextActive]}>
            Только расчёты
          </Text>
        </Pressable>
      </View>

      <FlashList
        data={filteredTransactions}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={renderEmpty}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 16,
  },
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 12,
    padding: 4,
    marginTop: 16,
    marginBottom: 16,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  list: {
    paddingBottom: 24,
  },
  debtTransactionWrapper: {
    position: 'relative',
  },
  debtIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: colors.categoryEntertainment,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  debtIndicatorText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
