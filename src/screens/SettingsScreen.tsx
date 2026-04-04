import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';

import { useTheme }    from '../hooks/useTheme';
import { AppInput }    from '../components/AppInput';
import { SectionHeader } from '../components/SectionHeader';
import { spacing, radius, typography } from '../theme';
import { APP_NAME, CURRENCY } from '../constants';

interface SettingRowProps {
  iconName:   keyof typeof Ionicons.glyphMap;
  label:      string;
  value?:     string;
  right?:     React.ReactNode;
  accent?:    string;
}

function SettingRow({ iconName, label, value, right, accent }: SettingRowProps) {
  const theme = useTheme();
  return (
    <View style={[styles.settingRow, { borderBottomColor: theme.border }]}>
      <View style={[styles.settingIcon, { backgroundColor: theme.primaryLight }]}>
        <Ionicons name={iconName} size={18} color={accent ?? theme.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[typography.bodyMedium, { color: theme.text }]}>{label}</Text>
        {value ? (
          <Text style={[typography.caption, { color: theme.textMuted, marginTop: 1 }]}>{value}</Text>
        ) : null}
      </View>
      {right ?? null}
    </View>
  );
}

export function SettingsScreen() {
  const theme      = useTheme();
  const scheme     = useColorScheme();

  const [storeName, setStoreName] = useState("Mening do'konim");
  const [currency,  setCurrency]  = useState(CURRENCY);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={[styles.topBar, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <Text style={[typography.headingLarge, { color: theme.text }]}>Sozlamalar</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── Store Info ── */}
        <SectionHeader title="Do'kon ma'lumotlari" />
        <View style={[styles.card, { backgroundColor: theme.surface, shadowColor: theme.cardShadow }]}>
          <View style={styles.cardInner}>
            <AppInput
              label="Do'kon nomi"
              value={storeName}
              onChangeText={setStoreName}
              placeholder="Do'kon nomini kiriting"
              iconName="storefront-outline"
            />
            <AppInput
              label="Valyuta"
              value={currency}
              onChangeText={setCurrency}
              placeholder="so'm"
              iconName="cash-outline"
            />
          </View>
        </View>

        {/* ── Appearance ── */}
        <SectionHeader title="Ko'rinish" />
        <View style={[styles.card, { backgroundColor: theme.surface, shadowColor: theme.cardShadow }]}>
          <SettingRow
            iconName="moon-outline"
            label="Mavzu"
            value={`Hozirgi: ${scheme === 'dark' ? 'Qorong\'u' : 'Yorug\''} (tizimga bog'liq)`}
          />
          <SettingRow
            iconName="phone-portrait-outline"
            label="Tizim mavzusidan foydalanish"
            value="Qurilma sozlamalariga bog'liq"
            right={
              <View style={[styles.badge, { backgroundColor: theme.primaryLight }]}>
                <Text style={[typography.labelSmall, { color: theme.primary }]}>Avtomatik</Text>
              </View>
            }
          />
        </View>

        {/* ── About ── */}
        <SectionHeader title="Ilova haqida" />
        <View style={[styles.card, { backgroundColor: theme.surface, shadowColor: theme.cardShadow }]}>
          <SettingRow
            iconName="information-circle-outline"
            label="Ilova nomi"
            value={APP_NAME}
          />
          <SettingRow
            iconName="code-slash-outline"
            label="Versiya"
            value="1.0.0 (MVP)"
          />
          <SettingRow
            iconName="shield-checkmark-outline"
            label="Ma'lumotlar xavfsizligi"
            value="Barcha ma'lumotlar qurilmada saqlanadi"
            accent={theme.successColor}
          />
          <SettingRow
            iconName="cloud-offline-outline"
            label="Oflayn rejim"
            value="Internet talab etilmaydi"
            accent={theme.primary}
          />
        </View>

        {/* ── Future ── */}
        <SectionHeader title="Kelgusida" />
        <View style={[styles.card, { backgroundColor: theme.surface, shadowColor: theme.cardShadow }]}>
          <SettingRow
            iconName="cloud-upload-outline"
            label="Ma'lumotlarni zaxiralash"
            value="Tez kunda..."
            accent={theme.textMuted}
          />
          <SettingRow
            iconName="notifications-outline"
            label="Bildirishnomalar"
            value="Tez kunda..."
            accent={theme.textMuted}
          />
          <SettingRow
            iconName="document-text-outline"
            label="Excel eksport"
            value="Tez kunda..."
            accent={theme.textMuted}
          />
        </View>

        <View style={{ height: spacing.xxl }} />
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
  card: {
    borderRadius:  radius.lg,
    marginBottom:  spacing.lg,
    shadowOffset:  { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius:  6,
    elevation:     2,
    overflow:      'hidden',
  },
  cardInner: {
    padding: spacing.md,
  },
  settingRow: {
    flexDirection:    'row',
    alignItems:       'center',
    paddingVertical:  spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
  },
  settingIcon: {
    width:         36,
    height:        36,
    borderRadius:  radius.sm,
    alignItems:    'center',
    justifyContent:'center',
    marginRight:   spacing.md,
  },
  badge: {
    borderRadius:      radius.full,
    paddingHorizontal: 10,
    paddingVertical:   4,
  },
});