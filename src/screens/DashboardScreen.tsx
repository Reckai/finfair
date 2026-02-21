import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { colors } from '../constants/colors';
import { TransactionCard } from '../components/TransactionCard';
import { TrueSpendCard } from '../components/TrueSpendCard';
import { NetBalanceCard } from '../components/NetBalanceCard';
import { SettleUpModal } from '../components/SettleUpModal';
import { apiToTransaction } from '../utils/transactionAdapter';
import { MainTabParamList } from '../types';
import { useDashboardStats } from '../hooks/useDashboardStats';
import { useCreateSettlement } from '../hooks/useCreateSettlement';
import { useManualSync } from '../hooks/useManualSync';
type Props = BottomTabScreenProps<MainTabParamList, 'Dashboard'>;

export const DashboardScreen: React.FC<Props> = () => {
  const insets = useSafeAreaInsets();
  const [settleModalVisible, setSettleModalVisible] = useState(false);
  const { data: stats } = useDashboardStats();
  const { sync, isSyncing } = useManualSync();
  const onRefresh = useCallback(async () => {
    await sync();
  }, [sync]);
  const addSettlement = useCreateSettlement();
  const partnerId = stats?.partner?.id ?? null;

  const handleSettleUp = () => {
    setSettleModalVisible(true);
  };

  const handleSettle = async (amount: number) => {
    if (!partnerId) return;

    addSettlement.mutate({
      amount,
      payeeId: partnerId,
    });
  };

  const handleCloseSettleModal = useCallback(() => setSettleModalVisible(false), []);

  const balance = stats?.balance ?? { netBalance: 0, trueSpend: 0, partnerSpend: 0, totalPaid: 0 };
  const categoryBreakdown = stats?.categoryBreakdown ?? [];
  const recentTransactions = (stats?.recentTransactions ?? []).map(apiToTransaction);

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}
        refreshControl={<RefreshControl refreshing={isSyncing} onRefresh={onRefresh} />}
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
          {recentTransactions
            .map((transaction) => (
              <TransactionCard key={transaction.id} transaction={transaction} />
            ))
            .slice(0, 5)}
        </View>
      </ScrollView>

      <SettleUpModal
        visible={settleModalVisible}
        currentBalance={balance.netBalance}
        onClose={handleCloseSettleModal}
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
