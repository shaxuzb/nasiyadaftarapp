import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";

import { PrimaryButton } from "../components/PrimaryButton";
import { useConfirmDialog } from "../context/ConfirmDialogContext";
import { useToast } from "../context/ToastContext";
import { useTheme } from "../hooks/useTheme";
import { formatLocalizedDate, getLocalizedApiErrorMessage, useTranslation } from "../i18n";
import { getApiErrorUserMessage } from "../i18n/apiErrors";
import { PhoneNumberInput } from "../modules/phone/components/PhoneNumberInput";
import {
  emptyPhone,
  formatPhoneForDisplay,
  isPhoneValid,
  toE164,
  type PhoneValue,
} from "../modules/phone/utils/phoneNumber";
import { useStaffList, useStaffMutations } from "../modules/staff/hooks/useStaff";
import type { StaffInvite, StaffMember } from "../modules/staff/utils/staffParsing";
import { radius, spacing, typography } from "../theme";
import type { AppTheme, RootStackParamList } from "../types";
import { getInitials } from "../utils";
import { hapticError, hapticTap } from "../utils/haptics";

type Navigation = NativeStackNavigationProp<RootStackParamList>;

/**
 * The owner's "Xodimlar": who works in this shop, numbers waiting for their
 * first sign-in, and adding someone by phone number. One shop at a time: the
 * one that is open.
 */
export function StaffScreen() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const navigation = useNavigation<Navigation>();
  const { locale, t } = useTranslation();
  const { confirm } = useConfirmDialog();
  const { showToast } = useToast();
  const query = useStaffList();
  const { add, remove, cancelInvite } = useStaffMutations();
  const staff = query.data;

  const [adding, setAdding] = useState(false);
  const [phone, setPhone] = useState<PhoneValue>(() => emptyPhone("UZ"));
  const [phoneError, setPhoneError] = useState<string | undefined>();
  const [busyId, setBusyId] = useState<string | null>(null);

  const used = staff ? staff.members.length + staff.invites.length : 0;
  const canOpenPlans = navigation.getState()?.routeNames.includes("Subscription") ?? false;

  const submit = async () => {
    if (!isPhoneValid(phone)) {
      setPhoneError(t("customers.phoneInvalid"));
      void hapticError();
      return;
    }
    setPhoneError(undefined);
    const number = toE164(phone);
    try {
      const result = await add.mutateAsync(number);
      const member = result.staff.members.find((item) => item.phoneNumber === number);
      showToast(
        result.status === "added"
          ? t("staff.added", { name: member?.fullName || formatPhoneForDisplay(number) })
          : t("staff.invited", { phone: formatPhoneForDisplay(number) }),
        "success",
      );
      setPhone(emptyPhone(phone.country));
      setAdding(false);
    } catch (error) {
      // Own number, already added, limit reached: the server's sentence,
      // under the field where it was typed.
      setPhoneError(getApiErrorUserMessage(error) ?? t("staff.addError"));
      void hapticError();
    }
  };

  const removeMember = async (member: StaffMember) => {
    const name = member.fullName || formatPhoneForDisplay(member.phoneNumber);
    const accepted = await confirm({
      title: t("staff.removeTitle"),
      message: t("staff.removeMessage", { name }),
      confirmText: t("staff.removeConfirm"),
      variant: "danger",
    });
    if (!accepted) return;
    setBusyId(`m${member.userId}`);
    try {
      await remove.mutateAsync(member.userId);
      showToast(t("staff.removed"), "success");
    } catch (error) {
      showToast(getLocalizedApiErrorMessage(error, "staff.removeError", t), "error");
    } finally {
      setBusyId(null);
    }
  };

  const removeInvite = async (invite: StaffInvite) => {
    const accepted = await confirm({
      title: t("staff.cancelInviteTitle"),
      message: t("staff.cancelInviteMessage", { phone: formatPhoneForDisplay(invite.phoneNumber) }),
      confirmText: t("staff.removeConfirm"),
      variant: "danger",
    });
    if (!accepted) return;
    setBusyId(`i${invite.id}`);
    try {
      await cancelInvite.mutateAsync(invite.id);
      showToast(t("staff.removed"), "success");
    } catch (error) {
      showToast(getLocalizedApiErrorMessage(error, "staff.removeError", t), "error");
    } finally {
      setBusyId(null);
    }
  };

  let body: React.ReactNode;
  if (!staff) {
    body = query.isError ? (
      <View style={styles.center}>
        <Text style={styles.message}>
          {getLocalizedApiErrorMessage(query.error, "staff.loadError", t)}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => void query.refetch()}
          style={({ pressed }) => [styles.retry, pressed && styles.pressed]}
        >
          <Text style={styles.retryText}>{t("common.retry")}</Text>
        </Pressable>
      </View>
    ) : (
      <ActivityIndicator style={styles.loading} color={theme.primary} />
    );
  } else if (!staff.planAllowsStaff) {
    body = (
      <View style={styles.premium}>
        <View style={styles.premiumIcon}>
          <Ionicons name="people-outline" size={28} color={theme.primary} />
        </View>
        <Text style={styles.premiumTitle}>{t("staff.premiumOnly")}</Text>
        <Text style={styles.premiumText}>{t("staff.premiumHint")}</Text>
        {canOpenPlans ? (
          <PrimaryButton
            label={t("staff.premiumAction")}
            onPress={() => navigation.navigate("Subscription")}
            style={styles.premiumButton}
          />
        ) : null}
      </View>
    );
  } else {
    const empty = staff.members.length === 0 && staff.invites.length === 0;
    body = (
      <>
        {adding ? (
          <View style={styles.form}>
            <Text style={styles.formTitle}>{t("staff.addTitle")}</Text>
            <Text style={styles.formHint}>{t("staff.addHint")}</Text>
            <PhoneNumberInput
              value={phone}
              onChange={(value) => {
                setPhone(value);
                if (phoneError) setPhoneError(undefined);
              }}
              label={t("staff.phoneLabel")}
              error={phoneError}
              autoFocus
              editable={!add.isPending}
              returnKeyType="done"
              onSubmitEditing={() => void submit()}
            />
            <View style={styles.formActions}>
              <Pressable
                accessibilityRole="button"
                disabled={add.isPending}
                onPress={() => {
                  setAdding(false);
                  setPhoneError(undefined);
                }}
                style={({ pressed }) => [styles.cancel, pressed && styles.pressed]}
              >
                <Text style={styles.cancelText}>{t("common.cancel")}</Text>
              </Pressable>
              <PrimaryButton
                label={t("staff.addSubmit")}
                onPress={() => void submit()}
                loading={add.isPending}
                style={styles.formSubmit}
              />
            </View>
          </View>
        ) : staff.canAdd ? (
          <PrimaryButton
            label={t("staff.add")}
            onPress={() => {
              void hapticTap();
              setAdding(true);
            }}
          />
        ) : (
          <View style={styles.limit}>
            <Ionicons name="information-circle-outline" size={18} color={theme.textSecondary} />
            <Text style={styles.limitText}>{t("staff.limitReached", { limit: staff.limit })}</Text>
          </View>
        )}

        {empty ? (
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={34} color={theme.textMuted} />
            <Text style={styles.emptyTitle}>{t("staff.empty")}</Text>
            <Text style={styles.emptyText}>{t("staff.emptyHint")}</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {staff.members.map((member, index) => {
              const name = member.fullName || formatPhoneForDisplay(member.phoneNumber);
              return (
                <View key={`m${member.userId}`} style={[styles.row, index > 0 && styles.rowBorder]}>
                  <View style={styles.avatar}>
                    <Text style={styles.initials}>
                      {getInitials({ id: member.userId, fullName: name, phone: member.phoneNumber })}
                    </Text>
                  </View>
                  <View style={styles.copy}>
                    <Text style={styles.name} numberOfLines={1}>
                      {name}
                    </Text>
                    {member.fullName ? (
                      <Text style={styles.meta} numberOfLines={1}>
                        {formatPhoneForDisplay(member.phoneNumber)}
                      </Text>
                    ) : null}
                    {member.addedDate ? (
                      <Text style={styles.meta} numberOfLines={1}>
                        {t("staff.addedOn", { date: formatLocalizedDate(member.addedDate, locale) })}
                      </Text>
                    ) : null}
                  </View>
                  <RemoveButton
                    label={t("staff.removeA11y", { name })}
                    busy={busyId === `m${member.userId}`}
                    disabled={busyId !== null}
                    onPress={() => void removeMember(member)}
                    theme={theme}
                    styles={styles}
                  />
                </View>
              );
            })}
            {staff.invites.map((invite, index) => {
              const number = formatPhoneForDisplay(invite.phoneNumber);
              return (
                <View
                  key={`i${invite.id}`}
                  style={[styles.row, (staff.members.length > 0 || index > 0) && styles.rowBorder]}
                >
                  <View style={[styles.avatar, styles.avatarWaiting]}>
                    <Ionicons name="hourglass-outline" size={18} color={theme.warningColor} />
                  </View>
                  <View style={styles.copy}>
                    <Text style={styles.name} numberOfLines={1}>
                      {number}
                    </Text>
                    <Text style={[styles.meta, styles.waiting]} numberOfLines={2}>
                      {`${t("staff.pending")}: ${t("staff.pendingHint").toLowerCase()}`}
                    </Text>
                  </View>
                  <RemoveButton
                    label={t("staff.removeA11y", { name: number })}
                    busy={busyId === `i${invite.id}`}
                    disabled={busyId !== null}
                    onPress={() => void removeInvite(invite)}
                    theme={theme}
                    styles={styles}
                  />
                </View>
              );
            })}
          </View>
        )}
      </>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("common.back")}
          onPress={() => navigation.goBack()}
          style={styles.back}
        >
          <Ionicons name="arrow-back" size={23} color={theme.text} />
        </Pressable>
        <Text style={styles.title}>{t("staff.title")}</Text>
        <View style={styles.back}>
          {staff?.planAllowsStaff && staff.limit > 0 ? (
            <Text style={styles.counter}>{`${used}/${staff.limit}`}</Text>
          ) : null}
        </View>
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={query.isRefetching}
            onRefresh={() => void query.refetch()}
            tintColor={theme.primary}
            colors={[theme.primary]}
          />
        }
      >
        <View style={styles.intro}>
          <Ionicons name="shield-checkmark-outline" size={18} color={theme.primary} />
          <Text style={styles.introText}>{t("staff.intro")}</Text>
        </View>
        {body}
      </ScrollView>
    </SafeAreaView>
  );
}

function RemoveButton({
  label,
  busy,
  disabled,
  onPress,
  theme,
  styles,
}: {
  label: string;
  busy: boolean;
  disabled: boolean;
  onPress: () => void;
  theme: AppTheme;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [styles.remove, pressed && styles.pressed, disabled && !busy && styles.dimmed]}
    >
      {busy ? (
        <ActivityIndicator size="small" color={theme.dangerColor} />
      ) : (
        <Ionicons name="close" size={20} color={theme.dangerColor} />
      )}
    </Pressable>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.background },
    header: {
      minHeight: 56,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: spacing.sm,
    },
    back: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
    title: { flex: 1, textAlign: "center", ...typography.headingLarge, color: theme.text },
    counter: { color: theme.textSecondary, fontSize: 14, fontWeight: "800" },
    content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl },
    intro: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: spacing.sm,
      padding: spacing.sm + 2,
      borderRadius: radius.md,
      backgroundColor: theme.primaryLight,
    },
    introText: { flex: 1, color: theme.text, fontSize: 13, lineHeight: 19 },
    form: {
      gap: spacing.sm,
      padding: spacing.md,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: theme.primary,
      backgroundColor: theme.surface,
    },
    formTitle: { color: theme.text, fontSize: 16, fontWeight: "800" },
    formHint: { color: theme.textSecondary, fontSize: 13, lineHeight: 18 },
    formActions: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginTop: spacing.xs },
    cancel: { minHeight: 44, paddingHorizontal: spacing.sm, justifyContent: "center" },
    cancelText: { color: theme.textSecondary, fontSize: 14, fontWeight: "700" },
    formSubmit: { flex: 1 },
    limit: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: spacing.sm,
      padding: spacing.sm + 2,
      borderRadius: radius.md,
      backgroundColor: theme.inputBackground,
    },
    limitText: { flex: 1, color: theme.textSecondary, fontSize: 13, lineHeight: 18 },
    list: {
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.surface,
      paddingHorizontal: spacing.md,
    },
    row: { minHeight: 68, flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: spacing.sm },
    rowBorder: { borderTopWidth: 1, borderTopColor: theme.border },
    avatar: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.primaryLight,
    },
    avatarWaiting: { backgroundColor: theme.inputBackground },
    initials: { color: theme.primary, fontWeight: "800", fontSize: 15 },
    copy: { flex: 1, minWidth: 0, gap: 1 },
    name: { color: theme.text, fontSize: 15, fontWeight: "700" },
    meta: { color: theme.textSecondary, fontSize: 12, lineHeight: 16 },
    waiting: { color: theme.warningColor, fontWeight: "600" },
    remove: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
    empty: { alignItems: "center", gap: spacing.xs, paddingVertical: spacing.xl, paddingHorizontal: spacing.lg },
    emptyTitle: { color: theme.text, fontSize: 16, fontWeight: "800", marginTop: spacing.xs },
    emptyText: { color: theme.textSecondary, fontSize: 13, lineHeight: 19, textAlign: "center" },
    premium: {
      alignItems: "center",
      gap: spacing.sm,
      padding: spacing.lg,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.surface,
    },
    premiumIcon: {
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.primaryLight,
    },
    premiumTitle: { color: theme.text, fontSize: 16, fontWeight: "800", textAlign: "center" },
    premiumText: { color: theme.textSecondary, fontSize: 13, lineHeight: 19, textAlign: "center" },
    premiumButton: { alignSelf: "stretch", marginTop: spacing.xs },
    loading: { marginTop: spacing.xl },
    center: { alignItems: "center", gap: spacing.sm, paddingVertical: spacing.xl },
    message: { ...typography.bodyMedium, color: theme.textSecondary, textAlign: "center" },
    retry: {
      minHeight: 42,
      paddingHorizontal: spacing.lg,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 12,
      backgroundColor: theme.primary,
    },
    retryText: { ...typography.bodySmall, color: theme.surface, fontWeight: "800" },
    pressed: { opacity: 0.72 },
    dimmed: { opacity: 0.45 },
  });
