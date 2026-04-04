import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { Transaction } from '../types';
import { formatCurrency, formatDate } from '../utils';
import { spacing, radius, typography } from '../theme';

interface Props {
  transaction: Transaction;
  showCustomerName?: string;
}

export function TransactionItem({ transaction, showCustomerName }: Props) {
  const theme   = useTheme();
  const isDebt  = transaction.type === 'debt';

  const color  = isDebt ? theme.debtColor  : theme.paymentColor;
  const bgColor = isDebt ? theme.debtBg     : theme.paymentBg;
  const icon    = isDebt ? 'arrow-down-circle' : 'arrow-up-circle';
  const prefix  = isDebt ? '+' : '−';
  const label   = isDebt ? 'Nasiya' : 'To\'lov';

  return (
    <View
      style={[
        styles.row,
        {
          backgroundColor: theme.surface,
          borderBottomColor: theme.border,
        },
      ]}
    >
      {/* Icon */}
      <View style={[styles.iconWrap, { backgroundColor: bgColor }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.topRow}>
          <View style={[styles.badge, { backgroundColor: bgColor }]}>
            <Text style={[typography.labelSmall, { color }]}>{label}</Text>
          </View>
          <Text style={[typography.mono, { color }]}>
            {prefix} {formatCurrency(transaction.amount)}
          </Text>
        </View>

        <View style={styles.bottomRow}>
          <Text style={[typography.caption, { color: theme.textSecondary, flex: 1 }]} numberOfLines={1}>
            {showCustomerName ? `${showCustomerName} · ` : ''}
            {transaction.note || '—'}
          </Text>
          <Text style={[typography.caption, { color: theme.textMuted }]}>
            {formatDate(transaction.date)}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection:    'row',
    alignItems:       'center',
    paddingVertical:  spacing.md,
    borderBottomWidth: 1,
  },
  iconWrap: {
    width:         40,
    height:        40,
    borderRadius:  radius.md,
    alignItems:    'center',
    justifyContent:'center',
    marginRight:   spacing.md,
  },
  content: {
    flex: 1,
  },
  topRow: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    marginBottom:   4,
  },
  badge: {
    borderRadius:      radius.full,
    paddingHorizontal: 8,
    paddingVertical:   2,
  },
  bottomRow: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
  },
});