import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import { APP_NAME } from "../constants";
import { useApp } from "../context/AppContext";
import { useAuth } from "../context/AuthContext";
import { useConfirmDialog } from "../context/ConfirmDialogContext";
import { useToast } from "../context/ToastContext";
import { getDashboardStats } from "../modules/reports/utils/reportCalculations";
import { formatCurrency } from "../utils";
import { useTheme } from "../hooks/useTheme";
import { ThemeMode, useThemeContext } from "../context/ThemeContext";
import { AppTheme } from "../types";
import { getApiErrorMessage } from "../utils/apiError";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

const PREF = {
  general: "notif_general_v1",
  overdue: "notif_overdue_v1",
  daily: "notif_daily_v1",
} as const;

const THEME_OPTIONS: ReadonlyArray<{
  mode: ThemeMode;
  label: string;
  icon: IconName;
}> = [
  { mode: "system", label: "Tizim", icon: "phone-portrait-outline" },
  { mode: "light", label: "Yorug'", icon: "sunny-outline" },
  { mode: "dark", label: "Qorong'u", icon: "moon-outline" },
];

interface SectionTitleProps {
  icon: IconName;
  title: string;
  description?: string;
}

function SectionTitle({ icon, title, description }: SectionTitleProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionIcon}>
        <Ionicons name={icon} size={17} color={theme.primary} />
      </View>
      <View style={styles.sectionHeaderText}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {description ? (
          <Text style={styles.sectionDescription}>{description}</Text>
        ) : null}
      </View>
    </View>
  );
}

interface ToggleRowProps {
  icon: IconName;
  iconColor: string;
  iconBackground: string;
  title: string;
  description: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  isLast?: boolean;
}

function ToggleRow({
  icon,
  iconColor,
  iconBackground,
  title,
  description,
  value,
  onValueChange,
  isLast = false,
}: ToggleRowProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <View style={[styles.settingRow, !isLast && styles.rowBorder]}>
      <View style={[styles.rowIcon, { backgroundColor: iconBackground }]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <View style={styles.rowContent}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowDescription}>{description}</Text>
      </View>
      <Switch
        accessibilityLabel={title}
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: theme.border, true: theme.primary }}
        thumbColor="#FFFFFF"
        ios_backgroundColor={theme.border}
      />
    </View>
  );
}

interface InfoRowProps {
  icon: IconName;
  iconColor: string;
  iconBackground: string;
  label: string;
  value?: string;
  isLast?: boolean;
}

function InfoRow({
  icon,
  iconColor,
  iconBackground,
  label,
  value,
  isLast = false,
}: InfoRowProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <View style={[styles.infoRow, !isLast && styles.rowBorder]}>
      <View style={[styles.rowIcon, { backgroundColor: iconBackground }]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <View style={styles.rowContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text selectable style={styles.infoValue} numberOfLines={1}>
          {value || "—"}
        </Text>
      </View>
    </View>
  );
}

export function SettingsScreen() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { mode, resolvedScheme, setMode } = useThemeContext();
  const { user, currentOrganization, logout } = useAuth();
  const { customers, transactions, seedDemoData } = useApp();
  const { confirm } = useConfirmDialog();
  const { showToast } = useToast();

  const [notifGeneral, setNotifGeneral] = useState(false);
  const [notifOverdue, setNotifOverdue] = useState(true);
  const [notifDaily, setNotifDaily] = useState(false);
  const [seedLoading, setSeedLoading] = useState(false);
  const [seedStatus, setSeedStatus] = useState("");

  const stats = useMemo(
    () => getDashboardStats(customers, transactions),
    [customers, transactions],
  );
  const remainingBalance = Math.max(stats.remainingBalance, 0);

  useEffect(() => {
    let active = true;

    async function loadPreferences() {
      try {
        const pairs = await AsyncStorage.multiGet([
          PREF.general,
          PREF.overdue,
          PREF.daily,
        ]);
        if (!active) return;

        for (const [key, storedValue] of pairs) {
          if (storedValue === null) continue;
          const enabled = storedValue === "1";
          if (key === PREF.general) setNotifGeneral(enabled);
          if (key === PREF.overdue) setNotifOverdue(enabled);
          if (key === PREF.daily) setNotifDaily(enabled);
        }
      } catch {
        if (active) {
          showToast("Sozlamalarni yuklab bo'lmadi", "error");
        }
      }
    }

    void loadPreferences();
    return () => {
      active = false;
    };
  }, [showToast]);

  async function saveNotificationPreference(
    key: string,
    value: boolean,
    setter: React.Dispatch<React.SetStateAction<boolean>>,
  ) {
    setter(value);
    try {
      await AsyncStorage.setItem(key, value ? "1" : "0");
      if (value) showToast("Bildirishnoma yoqildi", "success");
    } catch {
      setter(!value);
      showToast("Sozlamani saqlab bo'lmadi", "error");
    }
  }

  async function handleSeedData() {
    const accepted = await confirm({
      title: "Demo ma'lumotlar",
      message: "7 ta namunali mijoz va tranzaksiyalar qo'shiladi.",
      confirmText: "Qo'shish",
      cancelText: "Bekor qilish",
      variant: "default",
    });
    if (!accepted) return;

    setSeedLoading(true);
    setSeedStatus("Tayyorlanmoqda...");
    try {
      const { added, skipped } = await seedDemoData(setSeedStatus);
      const skippedMessage =
        skipped > 0 ? `, ${skipped} ta o'tkazib yuborildi` : "";
      showToast(`${added} ta mijoz qo'shildi${skippedMessage}`, "success");
    } catch (error) {
      showToast(
        getApiErrorMessage(error, "Xatolik. Internetni tekshiring."),
        "error",
      );
    } finally {
      setSeedLoading(false);
      setSeedStatus("");
    }
  }

  async function handleLogout() {
    const accepted = await confirm({
      title: "Hisobdan chiqish",
      message: "Rostdan ham tizimdan chiqmoqchimisiz?",
      confirmText: "Chiqish",
      cancelText: "Bekor qilish",
      variant: "danger",
    });
    if (!accepted) return;

    try {
      await logout();
      showToast("Tizimdan chiqildi", "success");
    } catch (error) {
      showToast(
        getApiErrorMessage(error, "Hisobdan chiqib bo'lmadi"),
        "error",
      );
    }
  }

  const initials = (user?.fullName ?? "U")
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0] ?? "")
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.screenTitle}>Sozlamalar</Text>
        <Text style={styles.screenSubtitle}>
          Hisob va ilova parametrlarini boshqaring
        </Text>
      </View>

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        <View style={styles.profileCard}>
          <View style={styles.profileTop}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View style={styles.profileIdentity}>
              <Text style={styles.profileName} numberOfLines={1}>
                {user?.fullName ?? "Foydalanuvchi"}
              </Text>
              <Text style={styles.organizationName} numberOfLines={1}>
                {currentOrganization?.name ?? "Tashkilot biriktirilmagan"}
              </Text>
            </View>
            <View style={styles.activeBadge}>
              <View style={styles.activeDot} />
              <Text style={styles.activeText}>Faol</Text>
            </View>
          </View>

          <View style={styles.contactRow}>
            {user?.phoneNumber ? (
              <View style={styles.contactChip}>
                <Ionicons name="call-outline" size={13} color="#FFFFFF" />
                <Text
                  selectable
                  style={styles.contactChipText}
                  numberOfLines={1}
                >
                  {user.phoneNumber}
                </Text>
              </View>
            ) : null}
            {user?.userName ? (
              <View style={styles.contactChip}>
                <Ionicons name="at-outline" size={13} color="#FFFFFF" />
                <Text
                  selectable
                  style={styles.contactChipText}
                  numberOfLines={1}
                >
                  {user.userName}
                </Text>
              </View>
            ) : null}
          </View>

          <View style={styles.profileDivider} />
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text selectable style={styles.statValue}>
                {stats.totalCustomers}
              </Text>
              <Text style={styles.statLabel}>Mijozlar</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text selectable style={styles.statValue}>
                {stats.activeDebtorsCount}
              </Text>
              <Text style={styles.statLabel}>Qarzdorlar</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItemWide}>
              <Text
                selectable
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
                style={styles.statValue}
              >
                {formatCurrency(remainingBalance)}
              </Text>
              <Text style={styles.statLabel}>Qoldiq qarz</Text>
            </View>
          </View>
        </View>

        {/* <SectionTitle
          icon="notifications-outline"
          title="Bildirishnomalar"
          description="Muhim o'zgarishlardan xabardor bo'ling"
        />
        <View style={styles.card}>
          <ToggleRow
            icon="notifications-outline"
            iconColor={theme.primary}
            iconBackground={theme.primaryLight}
            title="Umumiy bildirishnomalar"
            description="Yangi qarz va to'lovlar haqida"
            value={notifGeneral}
            onValueChange={(value) =>
              void saveNotificationPreference(
                PREF.general,
                value,
                setNotifGeneral,
              )
            }
          />
          <ToggleRow
            icon="warning-outline"
            iconColor={theme.debtColor}
            iconBackground={theme.debtBg}
            title="Muddati o'tgan qarzlar"
            description="30 kun harakat bo'lmasa eslatish"
            value={notifOverdue}
            onValueChange={(value) =>
              void saveNotificationPreference(
                PREF.overdue,
                value,
                setNotifOverdue,
              )
            }
          />
          <ToggleRow
            icon="bar-chart-outline"
            iconColor={theme.paymentColor}
            iconBackground={theme.paymentBg}
            title="Kunlik hisobot"
            description="Har kuni soat 09:00 da qisqa xulosa"
            value={notifDaily}
            onValueChange={(value) =>
              void saveNotificationPreference(PREF.daily, value, setNotifDaily)
            }
            isLast
          />
        </View> */}

        <SectionTitle
          icon="business-outline"
          title="Tashkilot"
          description="Joriy ish muhiti"
        />
        <View style={styles.card}>
          <InfoRow
            icon="business-outline"
            iconColor={theme.primary}
            iconBackground={theme.primaryLight}
            label="Tashkilot nomi"
            value={currentOrganization?.name}
            isLast
          />
        </View>

        <SectionTitle
          icon="color-palette-outline"
          title="Ko'rinish"
          description="Ilova mavzusini tanlang"
        />
        <View style={styles.themeSelector}>
          {THEME_OPTIONS.map((option) => {
            const active = mode === option.mode;
            return (
              <Pressable
                key={option.mode}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => setMode(option.mode)}
                style={({ pressed }) => [
                  styles.themeOption,
                  active && styles.themeOptionActive,
                  pressed && styles.pressed,
                ]}
              >
                <Ionicons
                  name={option.icon}
                  size={19}
                  color={active ? theme.primary : theme.textSecondary}
                />
                <Text
                  style={[
                    styles.themeOptionText,
                    active && styles.themeOptionTextActive,
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* <SectionTitle
          icon="phone-portrait-outline"
          title="Ilova haqida"
          description="Tizim ma'lumotlari"
        />
        <View style={styles.card}>
          <InfoRow
            icon="apps-outline"
            iconColor={theme.primary}
            iconBackground={theme.primaryLight}
            label="Ilova nomi"
            value={APP_NAME}
          />
          <InfoRow
            icon={resolvedScheme === "dark" ? "moon-outline" : "sunny-outline"}
            iconColor={theme.secondary}
            iconBackground={theme.inputBackground}
            label="Tizim mavzusi"
            value={resolvedScheme === "dark" ? "Qorong'u" : "Yorug'"}
          />
          <InfoRow
            icon="code-slash-outline"
            iconColor={theme.paymentColor}
            iconBackground={theme.paymentBg}
            label="Versiya"
            value="1.0.0"
            isLast
          />
        </View> */}

        {/* <SectionTitle
          icon="flask-outline"
          title="Sinov vositalari"
          description="Demo ma'lumotlar bilan ishlash"
        /> */}
        {/* <View style={styles.demoCard}>
          <View style={styles.demoTop}>
            <View style={[styles.rowIcon, styles.demoIcon]}>
              <Ionicons name="flask-outline" size={19} color={theme.primary} />
            </View>
            <View style={styles.rowContent}>
              <Text style={styles.rowTitle}>Namunali ma'lumotlar</Text>
              <Text style={styles.rowDescription} numberOfLines={2}>
                {seedLoading
                  ? seedStatus
                  : "7 ta sinov mijozi va tranzaksiyalarni qo'shing"}
              </Text>
            </View>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Demo ma'lumotlarni yuklash"
            disabled={seedLoading}
            onPress={() => {
              void handleSeedData();
            }}
            style={({ pressed }) => [
              styles.demoButton,
              pressed && styles.pressed,
              seedLoading && styles.disabled,
            ]}
          >
            {seedLoading ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : (
              <Ionicons
                name="download-outline"
                size={18}
                color={theme.primary}
              />
            )}
            <Text style={styles.demoButtonText}>
              {seedLoading ? "Yuklanmoqda..." : "Demo ma'lumot yuklash"}
            </Text>
          </Pressable>
        </View> */}

        <View style={styles.securityCard}>
          <View style={styles.securityIcon}>
            <Ionicons
              name="shield-checkmark-outline"
              size={20}
              color={theme.textSecondary}
            />
          </View>
          <View style={styles.securityContent}>
            <Text style={styles.securityTitle}>Hisob xavfsizligi</Text>
            <Text style={styles.securityDescription}>
              Chiqishdan oldin kiritilgan ma'lumotlar saqlanganiga ishonch hosil
              qiling.
            </Text>
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Hisobdan chiqish"
          onPress={() => {
            void handleLogout();
          }}
          style={({ pressed }) => [
            styles.logoutButton,
            pressed && styles.logoutPressed,
          ]}
        >
          <Ionicons
            name="log-out-outline"
            size={20}
            color={theme.dangerColor}
          />
          <Text style={styles.logoutText}>Hisobdan chiqish</Text>
        </Pressable>

        <View style={styles.footerSpace} />
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 10,
      gap: 2,
    },
    screenTitle: {
      color: theme.text,
      fontSize: 32,
      lineHeight: 39,
      fontWeight: "800",
      letterSpacing: -0.8,
    },
    screenSubtitle: {
      color: theme.textSecondary,
      fontSize: 15,
      lineHeight: 21,
    },
    scroll: {
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 28,
      gap: 12,
    },
    profileCard: {
      overflow: "hidden",
      padding: 16,
      gap: 12,
      backgroundColor: theme.primary,
      borderRadius: 22,
      borderCurve: "continuous",
      boxShadow: theme.cardShadow,
    },
    profileTop: {
      flexDirection: "row",
      alignItems: "center",
      gap: 11,
    },
    avatar: {
      width: 54,
      height: 54,
      borderRadius: 27,
      flexShrink: 0,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(255,255,255,0.18)",
      borderWidth: 1.5,
      borderColor: "rgba(255,255,255,0.32)",
    },
    avatarText: {
      color: "#FFFFFF",
      fontSize: 19,
      lineHeight: 24,
      fontWeight: "800",
      letterSpacing: 0.4,
    },
    profileIdentity: {
      minWidth: 0,
      flex: 1,
      gap: 2,
    },
    profileName: {
      color: "#FFFFFF",
      fontSize: 18,
      lineHeight: 23,
      fontWeight: "800",
    },
    organizationName: {
      color: "rgba(255,255,255,0.76)",
      fontSize: 12,
      lineHeight: 17,
    },
    activeBadge: {
      minHeight: 27,
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingHorizontal: 9,
      borderRadius: 999,
      backgroundColor: "rgba(255,255,255,0.14)",
    },
    activeDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: theme.paymentColor,
    },
    activeText: {
      color: "#FFFFFF",
      fontSize: 10,
      lineHeight: 14,
      fontWeight: "700",
    },
    contactRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 7,
    },
    contactChip: {
      maxWidth: "100%",
      minHeight: 28,
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingHorizontal: 9,
      borderRadius: 999,
      backgroundColor: "rgba(255,255,255,0.13)",
    },
    contactChipText: {
      color: "#FFFFFF",
      fontSize: 10,
      lineHeight: 14,
      fontWeight: "600",
    },
    profileDivider: {
      height: 1,
      backgroundColor: "rgba(255,255,255,0.20)",
    },
    statsRow: {
      minHeight: 43,
      flexDirection: "row",
      alignItems: "center",
    },
    statItem: {
      flex: 0.8,
      alignItems: "center",
      gap: 1,
    },
    statItemWide: {
      minWidth: 0,
      flex: 1.4,
      alignItems: "center",
      gap: 1,
    },
    statValue: {
      width: "100%",
      color: "#FFFFFF",
      fontSize: 15,
      lineHeight: 20,
      textAlign: "center",
      fontWeight: "800",
      fontVariant: ["tabular-nums"],
    },
    statLabel: {
      color: "rgba(255,255,255,0.68)",
      fontSize: 9,
      lineHeight: 13,
      fontWeight: "600",
    },
    statDivider: {
      width: 1,
      height: 31,
      backgroundColor: "rgba(255,255,255,0.20)",
    },
    sectionHeader: {
      minHeight: 42,
      flexDirection: "row",
      alignItems: "center",
      gap: 9,
      paddingTop: 3,
    },
    sectionIcon: {
      width: 34,
      height: 34,
      borderRadius: 11,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.primaryLight,
    },
    sectionHeaderText: {
      minWidth: 0,
      flex: 1,
      gap: 1,
    },
    sectionTitle: {
      color: theme.text,
      fontSize: 16,
      lineHeight: 21,
      fontWeight: "800",
    },
    sectionDescription: {
      color: theme.textMuted,
      fontSize: 10,
      lineHeight: 14,
    },
    card: {
      overflow: "hidden",
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 18,
      borderCurve: "continuous",
      boxShadow: theme.cardShadow,
    },
    themeSelector: {
      flexDirection: "row",
      gap: 8,
      padding: 6,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 18,
      borderCurve: "continuous",
      boxShadow: theme.cardShadow,
    },
    themeOption: {
      minHeight: 52,
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 4,
      borderWidth: 1,
      borderColor: "transparent",
      borderRadius: 13,
      borderCurve: "continuous",
    },
    themeOptionActive: {
      backgroundColor: theme.primaryLight,
      borderColor: theme.primary,
    },
    themeOptionText: {
      color: theme.textSecondary,
      fontSize: 11,
      lineHeight: 15,
      fontWeight: "700",
    },
    themeOptionTextActive: {
      color: theme.primary,
    },
    settingRow: {
      minHeight: 67,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingHorizontal: 13,
      paddingVertical: 10,
    },
    infoRow: {
      minHeight: 62,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingHorizontal: 13,
      paddingVertical: 9,
    },
    rowBorder: {
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    rowIcon: {
      width: 38,
      height: 38,
      borderRadius: 13,
      flexShrink: 0,
      alignItems: "center",
      justifyContent: "center",
    },
    rowContent: {
      minWidth: 0,
      flex: 1,
      gap: 2,
    },
    rowTitle: {
      color: theme.text,
      fontSize: 13,
      lineHeight: 18,
      fontWeight: "700",
    },
    rowDescription: {
      color: theme.textMuted,
      fontSize: 10,
      lineHeight: 14,
    },
    infoLabel: {
      color: theme.textMuted,
      fontSize: 10,
      lineHeight: 14,
    },
    infoValue: {
      color: theme.text,
      fontSize: 13,
      lineHeight: 18,
      fontWeight: "700",
    },
    demoCard: {
      padding: 13,
      gap: 12,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 18,
      borderCurve: "continuous",
      boxShadow: theme.cardShadow,
    },
    demoTop: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    demoIcon: {
      backgroundColor: theme.primaryLight,
    },
    demoButton: {
      minHeight: 46,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingHorizontal: 14,
      borderWidth: 1,
      borderColor: theme.primary,
      borderRadius: 14,
      borderCurve: "continuous",
      backgroundColor: theme.primaryLight,
    },
    demoButtonText: {
      color: theme.primary,
      fontSize: 13,
      lineHeight: 18,
      fontWeight: "800",
    },
    securityCard: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
      padding: 13,
      backgroundColor: theme.inputBackground,
      borderRadius: 15,
      borderCurve: "continuous",
    },
    securityIcon: {
      width: 34,
      height: 34,
      borderRadius: 11,
      flexShrink: 0,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.surface,
    },
    securityContent: {
      minWidth: 0,
      flex: 1,
      gap: 2,
    },
    securityTitle: {
      color: theme.textSecondary,
      fontSize: 12,
      lineHeight: 17,
      fontWeight: "700",
    },
    securityDescription: {
      color: theme.textMuted,
      fontSize: 10,
      lineHeight: 15,
    },
    logoutButton: {
      minHeight: 52,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingHorizontal: 16,
      backgroundColor: theme.debtBg,
      borderWidth: 1,
      borderColor: theme.dangerColor,
      borderRadius: 15,
      borderCurve: "continuous",
    },
    logoutText: {
      color: theme.dangerColor,
      fontSize: 14,
      lineHeight: 19,
      fontWeight: "800",
    },
    pressed: {
      opacity: 0.72,
    },
    logoutPressed: {
      opacity: 0.7,
    },
    disabled: {
      opacity: 0.55,
    },
    footerSpace: {
      height: 10,
    },
  });
