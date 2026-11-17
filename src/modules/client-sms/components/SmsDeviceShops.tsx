import React, { useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Switch, Text, View } from "react-native";

import { useAuth } from "../../../context/AuthContext";
import { useToast } from "../../../context/ToastContext";
import { useTheme } from "../../../hooks/useTheme";
import { getLocalizedApiErrorMessage, useTranslation } from "../../../i18n";
import type { AppTheme } from "../../../types";
import { normalizeOrganizationRole } from "../../organization/utils/organizationRole";
import { useToggleSmsDeviceOrganization } from "../hooks/useSmsDevices";
import type { SmsDevice } from "../types/devices";

/**
 * Under a connected phone: the owner's shops, each with a switch, so one
 * phone can send the SMS of several shops. The open shop is always on here
 * (taking the phone off it is the "disconnect" button). Shown only when the
 * server shares phones and the owner has more than one shop.
 */
export function SmsDeviceShops({ device }: { device: SmsDevice }) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { organizations, currentOrganization } = useAuth();
  const toggle = useToggleSmsDeviceOrganization();
  const [pendingId, setPendingId] = useState<number | null>(null);

  const ownShops = organizations.filter(
    (organization) => normalizeOrganizationRole(organization.role) !== "staff",
  );
  if (!device.organizations || ownShops.length < 2) return null;

  const linked = new Map(device.organizations.map((item) => [item.organizationId, item]));
  const dailyLimit = device.sims[0]?.dailyLimit ?? 0;

  const onToggle = (organizationId: number, on: boolean) => {
    setPendingId(organizationId);
    toggle.mutate(
      { code: device.deviceCode, organizationId, on },
      {
        onError: (error) =>
          showToast(getLocalizedApiErrorMessage(error, "staff.deviceToggleError", t), "error"),
        onSettled: () => setPendingId(null),
      },
    );
  };

  return (
    <View style={styles.block}>
      <Text style={styles.title}>{t("staff.deviceShops")}</Text>
      {ownShops.map((shop) => {
        const link = linked.get(shop.id);
        const isCurrent = shop.id === currentOrganization?.id;
        const busy = pendingId === shop.id;
        return (
          <View key={shop.id} style={styles.row}>
            <Text style={styles.name} numberOfLines={1}>
              {shop.name}
              {link?.isPrimary ? (
                <Text style={styles.primary}>{` · ${t("staff.devicePrimary")}`}</Text>
              ) : null}
            </Text>
            {busy ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : (
              <Switch
                accessibilityLabel={shop.name}
                value={Boolean(link) || isCurrent}
                disabled={isCurrent || pendingId !== null}
                onValueChange={(on) => onToggle(shop.id, on)}
                trackColor={{ true: theme.primary, false: theme.border }}
                thumbColor="#FFFFFF"
              />
            )}
          </View>
        );
      })}
      {dailyLimit > 0 ? (
        <Text style={styles.hint}>{t("staff.deviceShared", { limit: dailyLimit })}</Text>
      ) : null}
    </View>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    block: {
      gap: 4,
      paddingTop: 10,
      marginTop: 4,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    title: { color: theme.textSecondary, fontSize: 13, fontWeight: "700", marginBottom: 2 },
    row: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: 10 },
    name: { flex: 1, color: theme.text, fontSize: 14, fontWeight: "600" },
    primary: { color: theme.textMuted, fontWeight: "400" },
    hint: { color: theme.textMuted, fontSize: 12, lineHeight: 16, marginTop: 2 },
  });
