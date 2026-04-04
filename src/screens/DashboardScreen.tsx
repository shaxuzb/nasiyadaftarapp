import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { useApp }          from '../context/AppContext';
import { useTheme }        from '../hooks/useTheme';
import { SummaryCard }     from '../components/SummaryCard';
import { StatCard }        from '../components/StatCard';
import { TransactionItem } from '../components/TransactionItem';
import { SectionHeader }   from '../components/SectionHeader';
import { EmptyState }      from '../components/EmptyState';

import {
  getDashboardStats,
  getTopDebtors,
  getRecentTransactions,
  formatCurrency,
  getFullName,
} from '../utils';
import { spacing, radius, typography } from '../theme';
import { APP_NAME } from '../constants';
import { RootStackParamList } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function DashboardScreen() {
  const theme      = useTheme();
  const navigation = useNavigation<Nav>();
  const { customers, transactions } = useApp();

  const stats    = useMemo(() => getDashboardStats(customers, transactions), [customers, transactions]);
  const topDebtors = useMemo(() => getTopDebtors(customers, transactions, 5), [customers, transactions]);
  const recent     = useMemo(() => getRecentTransactions(transactions, 6), [transactions]);

  const payPercent = stats.totalDebt > 0
    ? Math.round((stats.totalPaid / stats.totalDebt) * 100)
    : 0;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── Header ── */}
        <View style={styles.headerRow}>
          <View>
            <Text style={[typography.caption, { color: theme.textMuted }]}>
              Xush kelibsiz 👋
            </Text>
            <Text style={[typography.headingLarge, { color: theme.text }]}>
              {APP_NAME}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => navigation.navigate('AddCustomer')}
            style={[styles.addBtn, { backgroundColor: theme.primary }]}
          >
            <Ionicons name="person-add" size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* ── Hero Card: Remaining Balance ── */}
        <View style={[styles.heroCard, { backgroundColor: theme.primary }]}>
          <Text style={[typography.label, styles.heroLabel]}>Umumiy qoldiq nasiya</Text>
          <Text style={[typography.displayLarge, styles.heroAmount]}>
            {formatCurrency(stats.remainingBalance)}
          </Text>
          <View style={styles.progressBarBg}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${payPercent}%`, backgroundColor: '#fff' },
              ]}
            />
          </View>
          <Text style={[typography.caption, styles.heroSub]}>
            {payPercent}% to'langan · {stats.activeDebtorsCount} faol nasiyachi
          </Text>
        </View>

        {/* ── Summary Row ── */}
        <View style={styles.summaryRow}>
          <SummaryCard
            label="Jami nasiya"
            value={formatCurrency(stats.totalDebt)}
            iconName="arrow-down-circle"
            color={theme.debtColor}
            bgColor={theme.debtBg}
            flex={1}
          />
          <View style={{ width: spacing.sm }} />
          <SummaryCard
            label="Jami to'lov"
            value={formatCurrency(stats.totalPaid)}
            iconName="arrow-up-circle"
            color={theme.paymentColor}
            bgColor={theme.paymentBg}
            flex={1}
          />
        </View>

        {/* ── Stat Row ── */}
        <View style={styles.statRow}>
          <StatCard
            label="Jami mijozlar"
            value={String(stats.totalCustomers)}
            accent={theme.primary}
          />
          <View style={{ width: spacing.sm }} />
          <StatCard
            label="Faol nasiyachilar"
            value={String(stats.activeDebtorsCount)}
            accent={theme.dangerColor}
          />
        </View>

        {/* ── Top Debtors ── */}
        <SectionHeader title="Eng ko'p qarzdorlar" />
        {topDebtors.length === 0 ? (
          <EmptyState iconName="happy" title="Hech qanday qarzdor yo'q!" />
        ) : (
          <View style={[styles.card, { backgroundColor: theme.surface, shadowColor: theme.cardShadow }]}>
            {topDebtors.map((entry, idx) => (
              <TouchableOpacity
                key={entry.customer.id}
                onPress={() => navigation.navigate('CustomerDetail', { customerId: entry.customer.id })}
                style={[
                  styles.debtorRow,
                  idx < topDebtors.length - 1 && { borderBottomColor: theme.border, borderBottomWidth: 1 },
                ]}
                activeOpacity={0.75}
              >
                <View style={[styles.debtorRank, { backgroundColor: theme.primaryLight }]}>
                  <Text style={[typography.label, { color: theme.primary }]}>#{idx + 1}</Text>
                </View>
                <Text style={[typography.headingSmall, { flex: 1, color: theme.text }]} numberOfLines={1}>
                  {getFullName(entry.customer)}
                </Text>
                <Text style={[typography.mono, { color: theme.debtColor }]}>
                  {formatCurrency(entry.balance)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* ── Recent Transactions ── */}
        <SectionHeader title="So'nggi tranzaksiyalar" />
        {recent.length === 0 ? (
          <EmptyState iconName="receipt-outline" title="Tranzaksiyalar yo'q" />
        ) : (
          <View style={[styles.card, { backgroundColor: theme.surface, shadowColor: theme.cardShadow }]}>
            {recent.map((tx) => {
              const customer = customers.find((c) => c.id === tx.customerId);
              return (
                <TransactionItem
                  key={tx.id}
                  transaction={tx}
                  showCustomerName={customer ? getFullName(customer) : undefined}
                />
              );
            })}
          </View>
        )}

        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1 },
  scroll: { padding: spacing.md },

  headerRow: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    marginBottom:   spacing.lg,
  },
  addBtn: {
    width:          42,
    height:         42,
    borderRadius:   radius.md,
    alignItems:     'center',
    justifyContent: 'center',
  },

  heroCard: {
    borderRadius:     radius.xl,
    padding:          spacing.lg,
    marginBottom:     spacing.md,
  },
  heroLabel: {
    color:        'rgba(255,255,255,0.75)',
    marginBottom: spacing.xs,
  },
  heroAmount: {
    color:        '#fff',
    marginBottom: spacing.md,
  },
  progressBarBg: {
    height:       6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginBottom: spacing.xs,
    overflow: 'hidden',
  },
  progressBarFill: {
    height:       6,
    borderRadius: 3,
  },
  heroSub: {
    color: 'rgba(255,255,255,0.75)',
    marginTop: spacing.xs,
  },

  summaryRow: {
    flexDirection:  'row',
    marginBottom:   spacing.sm,
  },
  statRow: {
    flexDirection:  'row',
    marginBottom:   spacing.lg,
    marginTop:      spacing.xs,
  },

  card: {
    borderRadius:  radius.lg,
    marginBottom:  spacing.lg,
    shadowOffset:  { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius:  8,
    elevation:     3,
    overflow:      'hidden',
  },

  debtorRow: {
    flexDirection:  'row',
    alignItems:     'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  debtorRank: {
    width:          32,
    height:         32,
    borderRadius:   radius.sm,
    alignItems:     'center',
    justifyContent: 'center',
    marginRight:    spacing.md,
  },
});