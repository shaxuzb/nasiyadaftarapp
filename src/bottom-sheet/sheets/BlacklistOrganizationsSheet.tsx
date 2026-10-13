import React, { memo, useMemo } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../hooks/useTheme";
import { formatLocalizedDate, useTranslation } from "../../i18n";
import { useClientBlacklist } from "../../modules/clients/hooks/useClientBlacklist";
import type { BlacklistedOrganization } from "../../modules/clients/types";
import { radius, spacing, typography } from "../../theme";
import { AppTheme } from "../../types";
import { parseDateOnly } from "../../utils/dateOnly";
import type { SheetRenderProps } from "../types";

/**
 * Where a customer is blacklisted: each organization, the day it happened and
 * that organization's own limit. The badge beside a customer only says
 * "blacklisted"; this is what a seller needs before deciding whether to sell
 * on credit.
 *
 * It opens from the customer list, the SMS list and the profile. Only the
 * profile already has the organizations; from the lists the sheet reads the
 * customer's record itself, so it opens at once and fills in a moment later.
 *
 * Amounts are deliberately not shown here, only where and since when.
 */
export function BlacklistOrganizationsSheet({
  closeSheet,
  props,
}: SheetRenderProps<"blacklistOrganizations">) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { currentOrganization } = useAuth();
  const { customerId, customerName } = props;
  const { organizations, isLoading, isError, retry } = useClientBlacklist(
    customerId,
    props.organizations,
  );

  return (
    <BottomSheetScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[
        styles.container,
        // Android reserves the strip along the bottom for its navigation bar
        // or gesture handle. Without this the last line sits underneath it.
        { paddingBottom: Math.max(insets.bottom, 12) + spacing.sm },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.titleWrap}>
          <View style={styles.iconWrap}>
            <Ionicons name="warning-outline" size={22} color={theme.dangerColor} />
          </View>
          <View style={styles.titleCopy}>
            <Text style={styles.title}>{t("customers.blacklistSheetTitle")}</Text>
            <Text style={styles.subtitle} numberOfLines={2}>
              {customerName}
            </Text>
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("common.close")}
          onPress={() => closeSheet()}
          style={styles.closeButton}
        >
          <Ionicons name="close" size={21} color={theme.textSecondary} />
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.state}>
          <ActivityIndicator color={theme.primary} />
          <Text style={styles.stateText}>{t("common.loading")}</Text>
        </View>
      ) : isError ? (
        <View style={styles.state}>
          <Text style={styles.stateText}>
            {t("customers.blacklistSheetLoadError")}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={retry}
            style={({ pressed }) => [styles.retry, pressed && styles.pressed]}
          >
            <Text style={styles.retryText}>{t("customers.retry")}</Text>
          </Pressable>
        </View>
      ) : organizations.length === 0 ? (
        <View style={styles.state}>
          <Text style={styles.stateText}>
            {t("customers.blacklistSheetEmpty")}
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.summary}>
            <Text style={styles.summaryLabel}>
              {t("customers.blacklistSheetCount", {
                count: organizations.length,
              })}
            </Text>
          </View>

          <View style={styles.list}>
            {organizations.map((organization, index) => (
              <OrganizationCard
                key={organization.id ?? `${organization.name}-${index}`}
                organization={organization}
                isOwn={
                  organization.id !== undefined &&
                  organization.id === currentOrganization?.id
                }
              />
            ))}
          </View>

          <Text style={styles.hint}>{t("customers.blacklistLimitHint")}</Text>
        </>
      )}
    </BottomSheetScrollView>
  );
}

const OrganizationCard = memo(function OrganizationCard({
  organization,
  isOwn,
}: {
  organization: BlacklistedOrganization;
  isOwn: boolean;
}) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { locale, t } = useTranslation();
  const since = organization.blacklistedSince
    ? parseDateOnly(organization.blacklistedSince)
    : null;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardIcon}>
          <Ionicons name="business-outline" size={18} color={theme.primary} />
        </View>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {organization.name}
        </Text>
        {isOwn ? (
          <View style={styles.ownChip}>
            <Text style={styles.ownChipText} numberOfLines={1}>
              {t("customers.blacklistOwnOrganization")}
            </Text>
          </View>
        ) : null}
      </View>

      {since ? (
        <DetailRow
          label={t("customers.blacklistSince")}
          value={formatLocalizedDate(since, locale)}
        />
      ) : null}
      {organization.blacklistAfterDays !== undefined ? (
        <DetailRow
          label={t("customers.blacklistLimit")}
          value={t("customers.blacklistLimitValue", {
            days: organization.blacklistAfterDays,
          })}
        />
      ) : null}
    </View>
  );
});

function DetailRow({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${value}`}
      style={styles.detailRow}
    >
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
      gap: spacing.md,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.sm,
    },
    titleWrap: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
    },
    iconWrap: {
      width: 42,
      height: 42,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 14,
      backgroundColor: theme.debtBg,
    },
    titleCopy: { flex: 1, gap: 2 },
    title: { ...typography.headingMedium, color: theme.text },
    subtitle: { ...typography.caption, color: theme.textSecondary },
    closeButton: {
      width: 42,
      height: 42,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: radius.full,
      backgroundColor: theme.inputBackground,
    },
    summary: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm + 4,
      borderRadius: radius.lg,
      backgroundColor: theme.debtBg,
    },
    summaryLabel: {
      ...typography.bodyMedium,
      color: theme.dangerColor,
      fontWeight: "700",
    },
    list: { gap: spacing.sm },
    // Tall enough that the sheet does not jump when the list arrives.
    state: {
      minHeight: 140,
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
    },
    stateText: {
      ...typography.bodyMedium,
      color: theme.textSecondary,
      textAlign: "center",
    },
    retry: {
      minHeight: 40,
      justifyContent: "center",
      paddingHorizontal: spacing.md,
      borderRadius: radius.full,
      backgroundColor: theme.primaryLight,
    },
    retryText: {
      ...typography.bodyMedium,
      color: theme.primary,
      fontWeight: "700",
    },
    pressed: { opacity: 0.7 },
    card: {
      gap: spacing.sm,
      padding: spacing.sm + 4,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.surface,
    },
    cardHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
    },
    cardIcon: {
      width: 34,
      height: 34,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 11,
      backgroundColor: theme.primaryLight,
    },
    cardTitle: {
      flex: 1,
      ...typography.bodyMedium,
      color: theme.text,
      fontWeight: "700",
    },
    ownChip: {
      flexShrink: 0,
      paddingHorizontal: spacing.sm,
      paddingVertical: 3,
      borderRadius: radius.full,
      backgroundColor: theme.primaryLight,
    },
    ownChipText: {
      color: theme.primary,
      fontSize: 11,
      lineHeight: 14,
      fontWeight: "700",
    },
    detailRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.sm,
    },
    detailLabel: {
      flex: 1,
      ...typography.caption,
      color: theme.textSecondary,
    },
    detailValue: {
      ...typography.bodyMedium,
      color: theme.text,
      fontWeight: "600",
      fontVariant: ["tabular-nums"],
    },
    hint: { ...typography.caption, color: theme.textMuted },
  });
