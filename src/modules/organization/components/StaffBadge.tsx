import React, { useCallback, useMemo } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useConfirmDialog } from "../../../context/ConfirmDialogContext";
import { useTheme } from "../../../hooks/useTheme";
import { useTranslation } from "../../../i18n";
import type { AppTheme } from "../../../types";
import { useOrganizationRole } from "../hooks/useOrganizationRole";

/** Explains, in a few lines, whose shop this is and what staff can do in it. */
export function useStaffInfo() {
  const { confirm } = useConfirmDialog();
  const { t } = useTranslation();
  const { ownerName, organizationName } = useOrganizationRole();
  return useCallback(() => {
    void confirm({
      title: t("staff.infoTitle"),
      message: t("staff.infoMessage", {
        shop: organizationName ?? "",
        owner: ownerName ?? t("staff.ownerUnknown"),
      }),
      confirmText: t("staff.ok"),
      hideCancel: true,
    });
  }, [confirm, organizationName, ownerName, t]);
}

/**
 * "Xodim", where staff look first: on top of the customer list. Short, so the
 * header stays tidy; tapping it says whose shop it is and what staff can do.
 * Nothing for the owner.
 */
export function StaffBadge() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const { isStaff, organizationName } = useOrganizationRole();
  const showInfo = useStaffInfo();
  if (!isStaff) return null;

  const name = organizationName ?? "";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t("staff.badgeA11y", { name })}
      onPress={showInfo}
      hitSlop={6}
      style={({ pressed }) => [styles.badge, pressed && styles.pressed]}
    >
      <Ionicons name="person-outline" size={15} color={theme.primary} />
      <Text style={styles.text} numberOfLines={1}>
        {t("staff.badgeShort")}
      </Text>
    </Pressable>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    badge: {
      flexShrink: 1,
      maxWidth: 140,
      height: 36,
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingHorizontal: 10,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: `${theme.primary}55`,
      backgroundColor: theme.primaryLight,
    },
    text: { flexShrink: 1, color: theme.primary, fontSize: 12, fontWeight: "800" },
    pressed: { opacity: 0.72 },
  });
