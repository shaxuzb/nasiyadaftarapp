import React, { useMemo, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { radius, spacing, typography } from '../theme';
import { APP_NAME } from '../constants';

interface Props {
  onFinish: () => void;
}

const STEPS = [
  {
    title: "1-qadam: Mijoz qo'shish",
    desc: "Avval mijozni kiriting. Telefon raqami bilan topish oson bo'ladi.",
    icon: 'person-add-outline',
  },
  {
    title: '2-qadam: Qarz yozish',
    desc: "Kartadagi '+ Qarz' ni bosing va summani kiriting.",
    icon: 'add-circle-outline',
  },
  {
    title: "3-qadam: To'lov oldim",
    desc: "Mijoz to'laganda '+ To'lov' tugmasi bilan qayd qiling.",
    icon: 'checkmark-done-circle-outline',
  },
] as const;

export function OnboardingScreen({ onFinish }: Props) {
  const theme = useTheme();
  const [index, setIndex] = useState(0);
  const step = STEPS[index];
  const isLast = index === STEPS.length - 1;

  const progress = useMemo(() => ((index + 1) / STEPS.length) * 100, [index]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]} edges={['top','bottom']}>
      <View style={styles.wrap}>
        <Text style={[typography.headingLarge, { color: theme.text }]}>Xush kelibsiz</Text>
        <Text style={[typography.bodyMedium, { color: theme.textSecondary, marginTop: 6 }]}>
          {APP_NAME} ni 1 daqiqada o'rganib olamiz
        </Text>

        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={[styles.iconWrap, { backgroundColor: theme.primaryLight }]}>
            <Ionicons name={step.icon} size={28} color={theme.primary} />
          </View>
          <Text style={[typography.headingMedium, { color: theme.text, marginTop: spacing.md }]}>
            {step.title}
          </Text>
          <Text style={[typography.bodyMedium, { color: theme.textSecondary, marginTop: spacing.sm }]}>
            {step.desc}
          </Text>

          <View style={[styles.demoBox, { backgroundColor: theme.inputBackground }]}>
            <Text style={[typography.label, { color: theme.text }]}>Demo misol</Text>
            <Text style={[typography.bodySmall, { color: theme.textSecondary, marginTop: 4 }]}>
              Ali Valiyev, 200 000 so'm qarz, 50 000 so'm to'lov
            </Text>
          </View>
        </View>

        <View style={[styles.progressBg, { backgroundColor: theme.border }]}>
          <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: theme.primary }]} />
        </View>

        <View style={styles.actions}>
          <TouchableOpacity onPress={onFinish} style={styles.linkBtn}>
            <Text style={[typography.label, { color: theme.textMuted }]}>O'tkazib yuborish</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => (isLast ? onFinish() : setIndex((prev) => prev + 1))}
            style={[styles.mainBtn, { backgroundColor: theme.primary }]}
          >
            <Text style={[typography.label, { color: '#fff' }]}>
              {isLast ? 'Boshlash' : 'Davom etish'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  wrap: {
    flex: 1,
    padding: spacing.lg,
  },
  card: {
    marginTop: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: spacing.lg,
  },
  iconWrap: {
    width: 54,
    height: 54,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  demoBox: {
    marginTop: spacing.md,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  progressBg: {
    height: 8,
    borderRadius: 4,
    marginTop: spacing.lg,
    overflow: 'hidden',
  },
  progressFill: {
    height: 8,
    borderRadius: 4,
  },
  actions: {
    marginTop: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  linkBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  mainBtn: {
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
  },
});

