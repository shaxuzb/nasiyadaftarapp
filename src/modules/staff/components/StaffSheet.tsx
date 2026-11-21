import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AndroidSheetKeyboardBridge } from "../../../bottom-sheet/AndroidSheetKeyboardBridge";
import type { SheetRenderProps } from "../../../bottom-sheet/types";
import { PrimaryButton } from "../../../components/PrimaryButton";
import { useAuth } from "../../../context/AuthContext";
import { useConfirmDialog } from "../../../context/ConfirmDialogContext";
import { useToast } from "../../../context/ToastContext";
import { useTheme } from "../../../hooks/useTheme";
import { getLocalizedApiErrorMessage, useTranslation } from "../../../i18n";
import { getApiErrorUserMessage } from "../../../i18n/apiErrors";
import { navigationRef } from "../../../navigation/navigationRef";
import type { AppTheme } from "../../../types";
import { getInitials } from "../../../utils";
import { hapticError, hapticSuccess, hapticTap } from "../../../utils/haptics";
import { useOrganizationAccess } from "../../organization/hooks/useOrganizationAccess";
import { PhoneNumberInput } from "../../phone/components/PhoneNumberInput";
import {
  emptyPhone,
  formatPhoneForDisplay,
  isPhoneValid,
  toE164,
  type PhoneValue,
} from "../../phone/utils/phoneNumber";
import { useStaffList, useStaffMutations } from "../hooks/useStaff";
import type { StaffInvite, StaffMember } from "../utils/staffParsing";

/**
 * The owner's staff, at a glance, from the home menu or Profile: who works in
 * the open shop, numbers waiting for their first sign-in, and adding someone
 * by phone number. Adding happens in this same sheet (a sheet over a sheet
 * would close the list), and always says which shop it is for.
 */
export function StaffSheet({
  closeSheet,
  setDismissLocked,
}: SheetRenderProps<"staff">) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { currentOrganization } = useAuth();
  const { readOnly } = useOrganizationAccess();
  const { confirm } = useConfirmDialog();
  const { showToast } = useToast();
  const query = useStaffList();
  const { add, remove, cancelInvite } = useStaffMutations();
  const staff = query.data;
  const shopName = currentOrganization?.name ?? "";

  const [adding, setAdding] = useState(false);
  const [phone, setPhone] = useState<PhoneValue>(() => emptyPhone("UZ"));
  const [phoneError, setPhoneError] = useState<string | undefined>();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [keyboardVisible, setKeyboardVisible] = useState(() =>
    Platform.OS === "android" ? Keyboard.isVisible() : false,
  );
  const saving = add.isPending;

  useEffect(() => {
    setDismissLocked(saving);
    return () => setDismissLocked(false);
  }, [saving, setDismissLocked]);

  useEffect(() => {
    if (Platform.OS !== "android") return undefined;
    const show = Keyboard.addListener("keyboardDidShow", () =>
      setKeyboardVisible(true),
    );
    const hide = Keyboard.addListener("keyboardDidHide", () =>
      setKeyboardVisible(false),
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const backToList = () => {
    Keyboard.dismiss();
    setAdding(false);
    setPhone(emptyPhone(phone.country));
    setPhoneError(undefined);
  };

  const submit = async () => {
    if (saving) return;
    if (!isPhoneValid(phone)) {
      setPhoneError(t("customers.phoneInvalid"));
      void hapticError();
      return;
    }
    const number = toE164(phone);
    try {
      const result = await add.mutateAsync(number);
      const member = result.staff.members.find(
        (item) => item.phoneNumber === number,
      );
      void hapticSuccess();
      showToast(
        result.status === "added"
          ? t("staff.added", {
              name: member?.fullName || formatPhoneForDisplay(number),
            })
          : t("staff.invited", { phone: formatPhoneForDisplay(number) }),
        "success",
      );
      backToList();
    } catch (error) {
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
      showToast(
        getLocalizedApiErrorMessage(error, "staff.removeError", t),
        "error",
      );
    } finally {
      setBusyId(null);
    }
  };

  const removeInvite = async (invite: StaffInvite) => {
    const accepted = await confirm({
      title: t("staff.cancelInviteTitle"),
      message: t("staff.cancelInviteMessage", {
        phone: formatPhoneForDisplay(invite.phoneNumber),
      }),
      confirmText: t("staff.removeConfirm"),
      variant: "danger",
    });
    if (!accepted) return;
    setBusyId(`i${invite.id}`);
    try {
      await cancelInvite.mutateAsync(invite.id);
      showToast(t("staff.removed"), "success");
    } catch (error) {
      showToast(
        getLocalizedApiErrorMessage(error, "staff.removeError", t),
        "error",
      );
    } finally {
      setBusyId(null);
    }
  };

  const openPlans = () => {
    closeSheet(() => {
      if (
        navigationRef.isReady() &&
        navigationRef.getRootState().routeNames.includes("Subscription")
      ) {
        navigationRef.navigate("Subscription");
      }
    });
  };

  const used = staff ? staff.members.length + staff.invites.length : 0;
  const canEdit = !readOnly && Boolean(staff?.planAllowsStaff);

  /* ---------- header: the toolbar of both modes ---------- */
  const header = (
    <View style={styles.header}>
      {adding ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("common.back")}
          disabled={saving}
          onPress={backToList}
          hitSlop={6}
          style={({ pressed }) => [
            styles.iconButton,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons name="arrow-back" size={21} color={theme.text} />
        </Pressable>
      ) : (
        <View style={styles.headerIcon}>
          <Ionicons name="people" size={20} color={theme.primary} />
        </View>
      )}
      <View style={styles.headerCopy}>
        <Text style={styles.title} numberOfLines={1}>
          {adding ? t("staff.addTitle") : t("staff.title")}
        </Text>
        {/* Whose shop: an owner of several must never add to the wrong one. */}
        <View style={styles.shopLine}>
          <Ionicons name="storefront-outline" size={13} color={theme.primary} />
          <Text style={styles.shopText} numberOfLines={1}>
            {shopName}
          </Text>
        </View>
      </View>
      {!adding && staff?.planAllowsStaff && staff.limit > 0 ? (
        <Text style={styles.counter}>{`${used}/${staff.limit}`}</Text>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("common.close")}
        disabled={saving}
        onPress={() => closeSheet()}
        hitSlop={6}
        style={({ pressed }) => [
          styles.iconButton,
          styles.closeButton,
          pressed && styles.pressed,
        ]}
      >
        <Ionicons name="close" size={20} color={theme.textSecondary} />
      </Pressable>
    </View>
  );

  let body: React.ReactNode;
  if (adding) {
    body = (
      <>
        <PhoneNumberInput
          variant="sheet"
          label={t("staff.phoneLabel")}
          value={phone}
          onChange={(value) => {
            setPhone(value);
            if (phoneError) setPhoneError(undefined);
          }}
          error={phoneError}
          autoFocus
          editable={!saving}
          onSubmitEditing={() => void submit()}
        />
        <PrimaryButton
          label={t("staff.addSubmit")}
          onPress={() => void submit()}
          loading={saving}
          disabled={saving}
        />
      </>
    );
  } else if (!staff) {
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
      <View style={styles.center}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  } else if (!staff.planAllowsStaff) {
    body = (
      <View style={styles.premium}>
        <Text style={styles.premiumTitle}>{t("staff.premiumOnly")}</Text>
        <Text style={styles.premiumText}>{t("staff.premiumHint")}</Text>
        <PrimaryButton label={t("staff.premiumAction")} onPress={openPlans} />
      </View>
    );
  } else {
    const empty = staff.members.length === 0 && staff.invites.length === 0;
    body = (
      <>
        {empty ? (
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={30} color={theme.textMuted} />
            <Text style={styles.emptyText}>{t("staff.empty")}</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {staff.members.map((member, index) => {
              const name =
                member.fullName || formatPhoneForDisplay(member.phoneNumber);
              return (
                <View
                  key={`m${member.userId}`}
                  style={[styles.row, index > 0 && styles.rowBorder]}
                >
                  <View style={styles.avatar}>
                    <Text style={styles.initials}>
                      {getInitials({
                        id: member.userId,
                        fullName: name,
                        phone: member.phoneNumber,
                      })}
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
                  </View>
                  {canEdit ? (
                    <RemoveButton
                      label={t("staff.removeA11y", { name })}
                      busy={busyId === `m${member.userId}`}
                      disabled={busyId !== null}
                      onPress={() => void removeMember(member)}
                      theme={theme}
                      styles={styles}
                    />
                  ) : null}
                </View>
              );
            })}
            {staff.invites.map((invite, index) => {
              const number = formatPhoneForDisplay(invite.phoneNumber);
              return (
                <View
                  key={`i${invite.id}`}
                  style={[
                    styles.row,
                    (staff.members.length > 0 || index > 0) && styles.rowBorder,
                  ]}
                >
                  <View style={[styles.avatar, styles.avatarWaiting]}>
                    <Ionicons
                      name="hourglass-outline"
                      size={17}
                      color={theme.warningColor}
                    />
                  </View>
                  <View style={styles.copy}>
                    <Text style={styles.name} numberOfLines={1}>
                      {number}
                    </Text>
                    <Text
                      style={[styles.meta, styles.waiting]}
                      numberOfLines={1}
                    >
                      {t("staff.pending")}
                    </Text>
                  </View>
                  {canEdit ? (
                    <RemoveButton
                      label={t("staff.removeA11y", { name: number })}
                      busy={busyId === `i${invite.id}`}
                      disabled={busyId !== null}
                      onPress={() => void removeInvite(invite)}
                      theme={theme}
                      styles={styles}
                    />
                  ) : null}
                </View>
              );
            })}
          </View>
        )}
        {readOnly ? null : staff.canAdd ? (
          <PrimaryButton
            label={t("staff.add")}
            onPress={() => {
              void hapticTap();
              setAdding(true);
            }}
          />
        ) : (
          <Text style={styles.limit}>
            {t("staff.limitReached", { limit: staff.limit })}
          </Text>
        )}
      </>
    );
  }

  return (
    <BottomSheetScrollView
      style={styles.scroll}
      contentContainerStyle={[
        styles.content,
        // Clear of the home indicator / Android navigation bar; the keyboard
        // brings its own room.
        {
          paddingBottom: keyboardVisible ? 12 : Math.max(insets.bottom, 12) + 4,
        },
      ]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      showsVerticalScrollIndicator={false}
      bounces={false}
    >
      <AndroidSheetKeyboardBridge />
      {header}
      {body}
    </BottomSheetScrollView>
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
      style={({ pressed }) => [
        styles.remove,
        pressed && styles.pressed,
        disabled && !busy && styles.dimmed,
      ]}
    >
      {busy ? (
        <ActivityIndicator size="small" color={theme.dangerColor} />
      ) : (
        <Ionicons name="close" size={19} color={theme.dangerColor} />
      )}
    </Pressable>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    scroll: { flexGrow: 0 },
    content: { paddingHorizontal: 16, paddingTop: 4, gap: 12 },
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      minHeight: 48,
    },
    headerIcon: {
      width: 42,
      height: 42,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.primaryLight,
    },
    headerCopy: { flex: 1, minWidth: 0, gap: 2 },
    title: {
      color: theme.text,
      fontSize: 18,
      lineHeight: 23,
      fontWeight: "800",
    },
    shopLine: { flexDirection: "row", alignItems: "center", gap: 4 },
    shopText: {
      flexShrink: 1,
      color: theme.primary,
      fontSize: 12,
      fontWeight: "700",
    },
    counter: {
      paddingHorizontal: 9,
      paddingVertical: 4,
      borderRadius: 999,
      overflow: "hidden",
      backgroundColor: theme.inputBackground,
      color: theme.textSecondary,
      fontSize: 12,
      fontWeight: "800",
    },
    iconButton: {
      width: 42,
      height: 42,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
    },
    closeButton: { backgroundColor: theme.inputBackground },
    list: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.surface,
      paddingHorizontal: 12,
    },
    row: {
      minHeight: 60,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingVertical: 8,
    },
    rowBorder: { borderTopWidth: 1, borderTopColor: theme.border },
    avatar: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.primaryLight,
    },
    avatarWaiting: { backgroundColor: theme.inputBackground },
    initials: { color: theme.primary, fontWeight: "800", fontSize: 14 },
    copy: { flex: 1, minWidth: 0, gap: 1 },
    name: { color: theme.text, fontSize: 15, fontWeight: "700" },
    meta: { color: theme.textSecondary, fontSize: 12, lineHeight: 16 },
    waiting: { color: theme.warningColor, fontWeight: "600" },
    remove: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: "center",
      justifyContent: "center",
    },
    empty: { alignItems: "center", gap: 6, paddingVertical: 20 },
    emptyText: { color: theme.textSecondary, fontSize: 14, fontWeight: "700" },
    limit: {
      color: theme.textSecondary,
      fontSize: 13,
      lineHeight: 18,
      textAlign: "center",
    },
    premium: { gap: 8, paddingVertical: 8 },
    premiumTitle: {
      color: theme.text,
      fontSize: 16,
      fontWeight: "800",
      textAlign: "center",
    },
    premiumText: {
      color: theme.textSecondary,
      fontSize: 13,
      lineHeight: 19,
      textAlign: "center",
      marginBottom: 4,
    },
    center: { alignItems: "center", gap: 10, paddingVertical: 24 },
    message: { color: theme.textSecondary, fontSize: 14, textAlign: "center" },
    retry: {
      minHeight: 40,
      paddingHorizontal: 18,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 12,
      backgroundColor: theme.primary,
    },
    retryText: { color: theme.surface, fontSize: 14, fontWeight: "800" },
    pressed: { opacity: 0.72 },
    dimmed: { opacity: 0.45 },
  });
