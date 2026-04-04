import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useApp }        from '../context/AppContext';
import { useTheme }      from '../hooks/useTheme';
import { SectionHeader } from '../components/SectionHeader';
import { StatCard }      from '../components/StatCard';

import {
  getDashboardStats,
  getTopDebtors,
  formatCurrency,
  getFullName,
} from '../utils';
import { spacing, radius, typography } from '../theme';

export function ReportsScreen() {
  const theme = useTheme();
  const { customers, transactions } = useApp();

  const stats      = useMemo(() => getDashboardStats(customers, transactions), [customers, transactions]);
  const topDebtors = useMemo(() => getTopDebtors(customers, transactions), [customers, transactions]);

  const payPercent = stats.totalDebt > 0
    ? Math.round((stats.totalPaid / stats.totalDebt) * 100)
    : 0;

  // Monthly grouping
  const monthlyMap = useMemo(() => {
    const map: Record<string, { debt: number; payment: number }> = {};
    transactions.forEach((tx) => {
      const key = tx.date.substring(0, 7); // YYYY-MM
      if (!map[key]) map[key] = { debt: 0, payment: 0 };
      if (tx.type === 'debt')    map[key].debt    += tx.amount;
      if (tx.type === 'payment') map[key].payment += tx.amount;
    });
    return Object.entries(map)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, 6);
  }, [transactions]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={[styles.topBar, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <Text style={[typography.headingLarge, { color: theme.text }]}>Hisobotlar</Text>
        <Text style={[typography.caption, { color: theme.textMuted, marginTop: 2 }]}>
          Moliyaviy umumiy ko'rinish
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── Summary Cards ── */}
        <View style={styles.statRow}>
          <StatCard label="Jami nasiya"   value={formatCurrency(stats.totalDebt)}          accent={theme.debtColor} />
          <View style={{ width: spacing.sm }} />
          <StatCard label="Jami to'lov"   value={formatCurrency(stats.totalPaid)}           accent={theme.paymentColor} />
        </View>
        <View style={styles.statRow}>
          <StatCard label="Qoldiq nasiya" value={formatCurrency(stats.remainingBalance)}   accent={theme.warningColor} />
          <View style={{ width: spacing.sm }} />
          <StatCard label="Jami mijozlar" value={String(stats.totalCustomers)}             accent={theme.primary} />
        </View>

        {/* ── Progress Bar ── */}
        <View style={[styles.progressCard, { backgroundColor: theme.surface, shadowColor: theme.cardShadow }]}>
          <View style={styles.progressHeader}>
            <Text style={[typography.headingSmall, { color: theme.text }]}>To'lov holati</Text>
            <Text style={[typography.headingMedium, { color: theme.primary }]}>
              {payPercent}%
            </Text>
          </View>
          <View style={[styles.bar, { backgroundColor: theme.border }]}>
            <View
              style={[
                styles.barFill,
                { width: `${payPercent}%`, backgroundColor: theme.primary },
              ]}
            />
          </View>
          <View style={styles.progressLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: theme.paymentColor }]} />
              <Text style={[typography.caption, { color: theme.textSecondary }]}>
                To'langan: {formatCurrency(stats.totalPaid)}
              </Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: theme.debtColor }]} />
              <Text style={[typography.caption, { color: theme.textSecondary }]}>
                Qoldiq: {formatCurrency(stats.remainingBalance)}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Top Debtors ── */}
        <SectionHeader title="Eng ko'p qarzdorlar" />
        <View style={[styles.card, { backgroundColor: theme.surface, shadowColor: theme.cardShadow }]}>
          {topDebtors.length === 0 ? (
            <View style={styles.emptyRow}>
              <Text style={[typography.bodyMedium, { color: theme.textMuted }]}>
                Hech qanday qarzdor yo'q 🎉
              </Text>
            </View>
          ) : (
            topDebtors.map((entry, idx) => (
              <View
                key={entry.customer.id}
                style={[
                  styles.debtorRow,
                  idx < topDebtors.length - 1 && { borderBottomColor: theme.border, borderBottomWidth: 1 },
                ]}
              >
                <Text style={[typography.label, { color: theme.textMuted, width: 28 }]}>
                  #{idx + 1}
                </Text>
                <Text style={[typography.headingSmall, { flex: 1, color: theme.text }]} numberOfLines={1}>
                  {getFullName(entry.customer)}
                </Text>
                <Text style={[typography.mono, { color: theme.debtColor }]}>
                  {formatCurrency(entry.balance)}
                </Text>
              </View>
            ))
          )}
        </View>

        {/* ── Monthly Stats ── */}
        <SectionHeader title="Oylik statistika" />
        <View style={[styles.card, { backgroundColor: theme.surface, shadowColor: theme.cardShadow }]}>
          {monthlyMap.length === 0 ? (
            <View style={styles.emptyRow}>
              <Text style={[typography.bodyMedium, { color: theme.textMuted }]}>
                Ma'lumot yo'q
              </Text>
            </View>
          ) : (
            monthlyMap.map(([month, data], idx) => {
              const [year, m] = month.split('-');
              const label = `${m}-oy ${year}`;
              return (
                <View
                  key={month}
                  style={[
                    styles.monthRow,
                    idx < monthlyMap.length - 1 && { borderBottomColor: theme.border, borderBottomWidth: 1 },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[typography.label, { color: theme.text }]}>{label}</Text>
                    <View style={styles.monthSub}>
                      <View style={[styles.dot, { backgroundColor: theme.debtColor }]} />
                      <Text style={[typography.caption, { color: theme.textSecondary }]}>
                        Nasiya: {formatCurrency(data.debt)}
                      </Text>
                    </View>
                    <View style={styles.monthSub}>
                      <View style={[styles.dot, { backgroundColor: theme.paymentColor }]} />
                      <Text style={[typography.caption, { color: theme.textSecondary }]}>
                        To'lov: {formatCurrency(data.payment)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.monthBalance}>
                    <Text style={[
                      typography.bodySmall,
                      { color: data.debt > data.payment ? theme.debtColor : theme.paymentColor },
                    ]}>
                      {data.debt > data.payment ? '-' : '+'}{formatCurrency(Math.abs(data.debt - data.payment))}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </View>

        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1 },
  topBar: {
    padding:           spacing.md,
    paddingBottom:     spacing.sm,
    borderBottomWidth: 1,
  },
  scroll: { padding: spacing.md },
  statRow: {
    flexDirection: 'row',
    marginBottom:  spacing.sm,
  },
  card: {
    borderRadius:  radius.lg,
    marginBottom:  spacing.lg,
    paddingHorizontal: spacing.md,
    shadowOffset:  { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius:  6,
    elevation:     2,
    overflow:      'hidden',
  },
  progressCard: {
    borderRadius:  radius.lg,
    padding:       spacing.md,
    marginBottom:  spacing.lg,
    shadowOffset:  { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius:  6,
    elevation:     2,
  },
  progressHeader: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    marginBottom:   spacing.sm,
  },
  bar: {
    height:       8,
    borderRadius: 4,
    overflow:     'hidden',
    marginBottom: spacing.sm,
  },
  barFill: {
    height:       8,
    borderRadius: 4,
  },
  progressLegend: {
    flexDirection: 'row',
    gap:           spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           4,
  },
  dot: {
    width:        8,
    height:       8,
    borderRadius: 4,
  },
  debtorRow: {
    flexDirection:   'row',
    alignItems:      'center',
    paddingVertical: spacing.md,
  },
  monthRow: {
    flexDirection:   'row',
    alignItems:      'flex-start',
    paddingVertical: spacing.md,
  },
  monthSub: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           4,
    marginTop:     2,
  },
  monthBalance: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingLeft: spacing.sm,
  },
  emptyRow: {
    paddingVertical: spacing.lg,
    alignItems:      'center',
  },
});