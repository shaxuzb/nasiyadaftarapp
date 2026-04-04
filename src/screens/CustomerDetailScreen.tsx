import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  useNavigation,
  useRoute,
  RouteProp,
} from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { useApp }          from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { useTheme }        from '../hooks/useTheme';
import { AppHeader }       from '../components/AppHeader';
import { BalanceBadge }    from '../components/BalanceBadge';
import { TransactionItem } from '../components/TransactionItem';
import { SectionHeader }   from '../components/SectionHeader';
import { EmptyState }      from '../components/EmptyState';

import {
  getFullName,
  getInitials,
  formatCurrency,
  getTotalDebt,
  getTotalPayments,
  getBalance,
  getCustomerRisk,
} from '../utils';
import { spacing, radius, typography } from '../theme';
import { RootStackParamList } from '../types';

type Nav   = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'CustomerDetail'>;

export function CustomerDetailScreen() {
  const theme      = useTheme();
  const navigation = useNavigation<Nav>();
  const { showToast } = useToast();
  const route      = useRoute<Route>();
  const { customerId } = route.params;

  const { getCustomerById, getTransactionsForCustomer, transactions } = useApp();

  const customer = getCustomerById(customerId);
  const txs      = getTransactionsForCustomer(customerId);
  const balance  = getBalance(customerId, transactions);
  const totalDebt = getTotalDebt(customerId, transactions);
  const totalPaid = getTotalPayments(customerId, transactions);
  const risk = getCustomerRisk(customerId, transactions);
  const riskColor = risk === 'yuqori' ? theme.dangerColor : risk === 'orta' ? theme.warningColor : theme.successColor;
  const riskLabel = risk === 'yuqori' ? 'Yuqori risk' : risk === 'orta' ? "O'rta risk" : 'Past risk';

  async function shareToWhatsApp() {
    if (!customer) return;
    const text = `${getFullName(customer)}\nJoriy qoldiq: ${formatCurrency(balance)}\nJami qarz: ${formatCurrency(totalDebt)}\nJami to'lov: ${formatCurrency(totalPaid)}`;
    const encoded = encodeURIComponent(text);
    const whatsappUrl = `whatsapp://send?text=${encoded}`;
    const fallbackUrl = `https://wa.me/?text=${encoded}`;
    const canOpenWhatsApp = await Linking.canOpenURL(whatsappUrl);
    await Linking.openURL(canOpenWhatsApp ? whatsappUrl : fallbackUrl);
    showToast("WhatsApp uchun xabar tayyorlandi", 'success');
  }

  if (!customer) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <Text style={{ color: theme.text }}>Mijoz topilmadi</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]} edges={['top']}>
      <AppHeader
        title={getFullName(customer)}
        subtitle={customer.phone}
        showBack
        onBack={() => navigation.goBack()}
        right={(
          <TouchableOpacity onPress={shareToWhatsApp} style={styles.shareBtn}>
            <Ionicons name="logo-whatsapp" size={18} color={theme.successColor} />
          </TouchableOpacity>
        )}
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── Profile Card ── */}
        <View style={[styles.profileCard, { backgroundColor: theme.surface, shadowColor: theme.cardShadow }]}>
          <View style={[styles.avatar, { backgroundColor: theme.primaryLight }]}>
            <Text style={[typography.displayMedium, { color: theme.primary }]}>
              {getInitials(customer)}
            </Text>
          </View>
          <Text style={[typography.headingLarge, { color: theme.text, marginTop: spacing.md }]}>
            {getFullName(customer)}
          </Text>
          <Text style={[typography.bodyMedium, { color: theme.textSecondary, marginTop: 4 }]}>
            {customer.phone}
          </Text>
          {customer.note ? (
            <View style={[styles.noteBadge, { backgroundColor: theme.inputBackground }]}>
              <Text style={[typography.bodySmall, { color: theme.textSecondary }]}>
                {customer.note}
              </Text>
            </View>
          ) : null}

          {/* Balance */}
          <View style={styles.balanceWrap}>
            <BalanceBadge balance={balance} large />
          </View>
          <View style={[styles.riskBadge, { backgroundColor: `${riskColor}22` }]}>
            <Text style={[typography.labelSmall, { color: riskColor }]}>{riskLabel}</Text>
          </View>
        </View>

        {/* ── Stats Row ── */}
        <View style={styles.statsRow}>
          <View style={[styles.statBox, { backgroundColor: theme.debtBg }]}>
            <Text style={[typography.caption, { color: theme.debtColor }]}>Jami nasiya</Text>
            <Text style={[typography.mono, { color: theme.debtColor }]}>
              {formatCurrency(totalDebt)}
            </Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: theme.paymentBg }]}>
            <Text style={[typography.caption, { color: theme.paymentColor }]}>Jami to'lov</Text>
            <Text style={[typography.mono, { color: theme.paymentColor }]}>
              {formatCurrency(totalPaid)}
            </Text>
          </View>
        </View>

        {/* ── Quick Actions ── */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: theme.debtBg, flex: 1 }]}
            onPress={() => navigation.navigate('AddTransaction', { customerId, type: 'debt' })}
            activeOpacity={0.8}
          >
            <Ionicons name="add-circle" size={22} color={theme.debtColor} />
            <Text style={[typography.label, styles.actionLabel, { color: theme.debtColor }]}>
              Qarz yozish
            </Text>
          </TouchableOpacity>

          <View style={{ width: spacing.sm }} />

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: theme.paymentBg, flex: 1 }]}
            onPress={() => navigation.navigate('AddTransaction', { customerId, type: 'payment' })}
            activeOpacity={0.8}
          >
            <Ionicons name="checkmark-circle" size={22} color={theme.paymentColor} />
            <Text style={[typography.label, styles.actionLabel, { color: theme.paymentColor }]}>
              To'lov oldim
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Transactions ── */}
        <SectionHeader title="Tranzaksiyalar tarixi" />

        {txs.length === 0 ? (
          <EmptyState
            iconName="receipt-outline"
            title="Tranzaksiyalar yo'q"
            description="Bu mijoz uchun hali hech qanday nasiya yoki to'lov kiritilmagan."
          />
        ) : (
          <View style={[styles.txCard, { backgroundColor: theme.surface, shadowColor: theme.cardShadow }]}>
            {txs.map((tx) => (
              <TransactionItem key={tx.id} transaction={tx} />
            ))}
          </View>
        )}

        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1 },
  scroll:  { padding: spacing.md },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  shareBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },

  profileCard: {
    borderRadius:  radius.xl,
    padding:       spacing.lg,
    alignItems:    'center',
    marginBottom:  spacing.md,
    shadowOffset:  { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius:  8,
    elevation:     3,
  },
  avatar: {
    width:         72,
    height:        72,
    borderRadius:  36,
    alignItems:    'center',
    justifyContent:'center',
  },
  noteBadge: {
    borderRadius:      radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical:   spacing.xs,
    marginTop:         spacing.sm,
  },
  balanceWrap: {
    marginTop: spacing.md,
    width: '100%',
  },
  riskBadge: {
    marginTop: spacing.sm,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
  },

  statsRow: {
    flexDirection: 'row',
    gap:           spacing.sm,
    marginBottom:  spacing.md,
  },
  statBox: {
    flex:         1,
    borderRadius: radius.lg,
    padding:      spacing.md,
  },

  actionsRow: {
    flexDirection: 'row',
    marginBottom:  spacing.lg,
  },
  actionBtn: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius:   radius.lg,
  },
  actionLabel: {
    marginLeft: spacing.xs,
  },

  txCard: {
    borderRadius:  radius.lg,
    paddingHorizontal: spacing.md,
    shadowOffset:  { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius:  6,
    elevation:     2,
    overflow:      'hidden',
  },
});
