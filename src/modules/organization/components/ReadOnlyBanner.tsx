import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { useTheme } from "../../../hooks/useTheme";
import { useTranslation } from "../../../i18n";
import type { AppTheme, RootStackParamList } from "../../../types";
import { useOrganizationAccess } from "../hooks/useOrganizationAccess";
import { useOrganizationRole } from "../hooks/useOrganizationRole";

/**
 * Over a shop in "faqat ko'rish" mode: why nothing can be written here, and the
 * way out. The owner gets "Premium" (the plans screen); staff are told it is the
 * owner's plan. Nothing at all in a shop that works.
 */
export function ReadOnlyBanner({ style }: { style?: StyleProp<ViewStyle> }) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { readOnly } = useOrganizationAccess();
  const { isOwner } = useOrganizationRole();
  if (!readOnly) return null;

  const canOpenPlans =
    isOwner && (navigation.getState()?.routeNames.includes("Subscription") ?? false);
  const text = isOwner ? t("readOnly.ownerText") : t("readOnly.staffText");

  return (
    <View
      accessibilityRole="alert"
      accessibilityLabel={`${t("readOnly.title")}. ${text}`}
      style={[styles.banner, style]}
    >
      <View style={styles.icon}>
        <Ionicons name="lock-closed" size={18} color={theme.warningColor} />
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>{t("readOnly.title")}</Text>
        <Text style={styles.text}>{text}</Text>
      </View>
      {canOpenPlans ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.navigate("Subscription")}
          hitSlop={6}
          style={({ pressed }) => [styles.action, pressed && styles.pressed]}
        >
          <Ionicons name="diamond-outline" size={14} color="#FFFFFF" />
          <Text style={styles.actionText}>{t("readOnly.action")}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    banner: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginHorizontal: 16,
      marginBottom: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: `${theme.warningColor}66`,
      backgroundColor: `${theme.warningColor}14`,
    },
    icon: {
      width: 34,
      height: 34,
      flexShrink: 0,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 11,
      backgroundColor: `${theme.warningColor}22`,
    },
    copy: { flex: 1, minWidth: 0, gap: 1 },
    title: { color: theme.text, fontSize: 13, lineHeight: 17, fontWeight: "800" },
    text: { color: theme.textSecondary, fontSize: 12, lineHeight: 16 },
    action: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      minHeight: 34,
      paddingHorizontal: 11,
      borderRadius: 11,
      backgroundColor: theme.primary,
    },
    actionText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },
    pressed: { opacity: 0.75 },
  });
