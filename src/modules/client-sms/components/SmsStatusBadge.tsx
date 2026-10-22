import React, { memo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../../hooks/useTheme";
import { useTranslation } from "../../../i18n";
import { getSmsStatusAppearance } from "../utils/smsStatusPresentation";

/** Reusable, compact status indicator. Does not affect recipient eligibility. */
export const SmsStatusBadge = memo(function SmsStatusBadge({ status }: {
  status: string | null | undefined;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  if (!status) return null;
  const appearance = getSmsStatusAppearance(status, theme);
  const label = appearance ? t(appearance.labelKey) : status;
  return (
    <View style={[styles.badge, { backgroundColor: appearance?.background ?? theme.inputBackground }]}
      accessible accessibilityLabel={label}>
      {appearance ? <Ionicons name={appearance.icon} size={12} color={appearance.color} /> : null}
      <Text numberOfLines={1} style={[styles.label, { color: appearance?.color ?? theme.textSecondary }]}>
        {label}
      </Text>
    </View>
  );
});
const styles = StyleSheet.create({
  badge: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start",
    gap: 4, borderRadius: 7, paddingHorizontal: 7, minHeight: 21 },
  label: { fontSize: 10, lineHeight: 15, fontWeight: "700" },
});
