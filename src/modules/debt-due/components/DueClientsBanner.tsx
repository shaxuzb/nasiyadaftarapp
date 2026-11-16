import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { useTheme } from "../../../hooks/useTheme";
import { useTranslation } from "../../../i18n";
import type { AppTheme, RootStackParamList } from "../../../types";
import { todayDateOnly } from "../../../utils/dateOnly";
import { useMoney } from "../../currency/hooks/useMoney";
import { useDueClients } from "../hooks/useDueClients";

/**
 * Above the customer list while someone's debt is due today and still owed:
 * the push can be missed or turned off, this cannot.
 */
export function DueClientsBanner() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const money = useMoney();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { clients } = useDueClients(todayDateOnly());
  if (!clients.length) return null;

  const total = clients.reduce((sum, client) => sum + client.dueAmount, 0);
  const title = t("dueClients.banner", { count: clients.length });

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={() => navigation.navigate("DueClients", undefined)}
      style={({ pressed }) => [styles.banner, pressed && styles.pressed]}
    >
      <View style={styles.icon}>
        <Ionicons name="alarm-outline" size={19} color={theme.dangerColor} />
      </View>
      <View style={styles.copy}>
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {`${t("dueClients.total")}: ${money.format(total)}`}
        </Text>
      </View>
      <View style={styles.action}>
        <Text style={styles.actionText}>{t("dueClients.bannerAction")}</Text>
        <Ionicons name="chevron-forward" size={17} color={theme.dangerColor} />
      </View>
    </Pressable>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    banner: {
      minHeight: 58,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginHorizontal: 16,
      marginBottom: 8,
      paddingHorizontal: 11,
      paddingVertical: 8,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.dangerColor,
      backgroundColor: theme.surface,
    },
    icon: {
      width: 36,
      height: 36,
      flexShrink: 0,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 12,
      backgroundColor: theme.inputBackground,
    },
    copy: { minWidth: 0, flex: 1, gap: 1 },
    title: { color: theme.text, fontSize: 13, lineHeight: 17, fontWeight: "800" },
    subtitle: { color: theme.textSecondary, fontSize: 12, lineHeight: 16 },
    action: { flexDirection: "row", alignItems: "center", gap: 2 },
    actionText: { color: theme.dangerColor, fontSize: 13, fontWeight: "800" },
    pressed: { opacity: 0.72 },
  });
