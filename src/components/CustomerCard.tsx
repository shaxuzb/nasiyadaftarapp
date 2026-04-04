import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { Customer } from '../types';
import { getFullName, getInitials, isHighDebtor } from '../utils';
import { spacing, radius, typography } from '../theme';

interface Props {
  customer: Customer;
  balance:  number;
  risk: 'past' | 'orta' | 'yuqori';
  onPress: () => void;
  onAddDebt: () => void;
  onAddPayment: () => void;
}

export function CustomerCard({ customer, balance, risk, onPress, onAddDebt, onAddPayment }: Props) {
  const theme = useTheme();
  const high = isHighDebtor(balance);
  const settled = balance <= 0;
  const riskColor = risk === 'yuqori' ? theme.dangerColor : risk === 'orta' ? theme.warningColor : theme.successColor;
  const riskLabel = risk === 'yuqori' ? 'Yuqori risk' : risk === 'orta' ? "O'rta risk" : 'Past risk';

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.surface,
          shadowColor:     theme.cardShadow,
          borderLeftColor: high && !settled ? theme.dangerColor : theme.border,
        },
      ]}
    >
      <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={styles.topPress}>
        {/* Avatar */}
        <View style={[styles.avatar, { backgroundColor: theme.primaryLight }]}>
          <Text style={[typography.headingSmall, { color: theme.primary }]}>
            {getInitials(customer)}
          </Text>
        </View>

        {/* Info */}
        <View style={styles.info}>
          <Text style={[typography.headingSmall, { color: theme.text }]} numberOfLines={1}>
            {getFullName(customer)}
          </Text>
          <Text style={[typography.bodySmall, { color: theme.textSecondary, marginTop: 2 }]}>
            {customer.phone}
          </Text>
          {customer.note ? (
            <Text style={[typography.caption, { color: theme.textMuted, marginTop: 2 }]} numberOfLines={1}>
              {customer.note}
            </Text>
          ) : null}
        </View>

        <View style={styles.badges}>
          <View style={[styles.riskBadge, { backgroundColor: `${riskColor}22` }]}>
            <Text style={[styles.riskBadgeText, { color: riskColor }]}>{riskLabel}</Text>
          </View>
          {high && !settled && (
            <View style={[styles.highBadge, { backgroundColor: theme.dangerColor }]}>
              <Text style={styles.highBadgeText}>Yuqori qarz</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>

      <View style={[styles.actionsRow, { borderTopColor: theme.border }]}>
        <TouchableOpacity
          onPress={onAddDebt}
          activeOpacity={0.85}
          style={[styles.actionBtn, { backgroundColor: theme.debtBg }]}
        >
          <Text style={[typography.label, { color: theme.debtColor }]}>+ Qarz</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onAddPayment}
          activeOpacity={0.85}
          style={[styles.actionBtn, { backgroundColor: theme.paymentBg }]}
        >
          <Text style={[typography.label, { color: theme.paymentColor }]}>+ To'lov</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius:    radius.lg,
    marginBottom:    spacing.sm,
    borderLeftWidth: 3,
    shadowOffset:    { width: 0, height: 1 },
    shadowOpacity:   1,
    shadowRadius:    6,
    elevation:       2,
    overflow:        'hidden',
  },
  topPress: {
    flexDirection:   'row',
    alignItems:      'center',
    padding:         spacing.md,
  },
  avatar: {
    width:         44,
    height:        44,
    borderRadius:  radius.full,
    alignItems:    'center',
    justifyContent:'center',
    marginRight:   spacing.md,
  },
  info: {
    flex: 1,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
  },
  badges: {
    alignItems: 'flex-end',
    gap: 4,
  },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    paddingVertical: 10,
  },
  highBadge: {
    borderRadius: radius.full,
    paddingHorizontal: 6,
    paddingVertical:   2,
  },
  riskBadge: {
    borderRadius: radius.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  riskBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  highBadgeText: {
    fontSize:    10,
    fontWeight:  '600',
    color:       '#fff',
  },
});
