import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../constants/colors';
import { TransactionCard } from '../components/TransactionCard';
import { TrueSpendCard } from '../components/TrueSpendCard';
import { NetBalanceCard } from '../components/NetBalanceCard';
import { SettleUpModal } from '../components/SettleUpModal';
import { useAppStore } from '../store/useAppStore';
import { dashboardApi } from '../services/dashboard';
import { settlementsApi } from '../services/settlements';
import { apiToTransaction } from '../utils/transactionAdapter';
import { ApiDashboardStats } from '../types/api';

export const DashboardScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [settleModalVisible, setSettleModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<ApiDashboardStats | null>(null);

  const addSettlement = useAppStore((s) => s.addSettlement);

  const loadData = useCallback(async () => {
    const data = await dashboardApi.getStats();
    if (data) {
      setStats(data);
    }
  }, []);
  console.log(stats)
  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const partnerId = stats?.partner?.id ?? null;

  const handleSettleUp = () => {
    setSettleModalVisible(true);
  };

  const handleSettle = async (amount: number) => {
    if (!partnerId) return;

    const settlement = await settlementsApi.create({
      amount,
      payeeId: partnerId,
    });
    if (settlement) {
      addSettlement(settlement);
      await loadData();
    }
  };

  const balance = stats?.balance ?? { netBalance: 0, trueSpend: 0, partnerSpend: 0, totalPaid: 0 };
  const categoryBreakdown = stats?.categoryBreakdown ?? [];
  const recentTransactions = (stats?.recentTransactions ?? []).map(apiToTransaction);

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.greeting}>Привіт!</Text>
        </View>

        <View style={styles.section}>
          <TrueSpendCard
            trueSpend={balance.trueSpend}
            totalFromCard={balance.totalPaid}
            partnerSpend={balance.partnerSpend}
            categoryBreakdown={categoryBreakdown}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Відносини</Text>
          <NetBalanceCard
            showSettlementButton={!!partnerId}
            balance={balance.netBalance}
            onSettleUp={handleSettleUp}
          />
        </View>

        <View style={styles.transactionsSection}>
          <Text style={styles.sectionTitle}>Останні операції</Text>
          {recentTransactions.map((transaction) => (
            <TransactionCard key={transaction.id} transaction={transaction} />
          ))}
        </View>
      </ScrollView>

      <SettleUpModal
        visible={settleModalVisible}
        currentBalance={balance.netBalance}
        onClose={() => setSettleModalVisible(false)}
        onSettle={handleSettle}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  transactionsSection: {
    marginBottom: 24,
  },
});
