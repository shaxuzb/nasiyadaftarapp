import { useCallback } from "react";
import { Linking } from "react-native";
import * as Contacts from "expo-contacts";
import { KeyboardController } from "react-native-keyboard-controller";

import { useToast } from "../../../context/ToastContext";
import { useTranslation } from "../../../i18n";
import { hapticError } from "../../../utils/haptics";

export interface PickedContact {
  /** The contact's name, single-spaced; empty when the contact has none. */
  fullName: string;
  /** The contact's first number as written in the address book; the phone
   * field's own rule turns it into +998 digits. Empty when it has none. */
  phone: string;
}

/**
 * Picks a customer from the phone's contacts, for adding one and editing one
 * alike: asks for access first, says what to do when it is refused (and opens
 * the settings when it can no longer be asked), and reports a contact with
 * nothing to take. Resolves with null whenever nothing was picked.
 */
export function useContactPicker() {
  const { t } = useTranslation();
  const { showToast } = useToast();

  return useCallback(async (): Promise<PickedContact | null> => {
    try {
      await KeyboardController.dismiss();
      const existingPermission = await Contacts.getPermissionsAsync();
      const permission =
        existingPermission.status === "granted"
          ? existingPermission
          : await Contacts.requestPermissionsAsync();

      if (permission.status !== "granted") {
        hapticError();
        if (permission.canAskAgain === false) {
          showToast(t("customers.contactsPermissionBlocked"), "error");
          void Linking.openSettings();
        } else {
          showToast(t("customers.contactsPermissionDenied"), "error");
        }
        return null;
      }

      const contact = await Contacts.presentContactPickerAsync();
      if (!contact) return null;

      const fullName = (
        contact.name?.trim() ||
        [contact.firstName, contact.lastName].filter(Boolean).join(" ").trim()
      ).replace(/\s+/g, " ");
      const phone = contact.phoneNumbers?.[0]?.number ?? "";

      if (!fullName && !phone) {
        showToast(t("customers.contactsMissing"), "error");
        return null;
      }
      return { fullName, phone };
    } catch {
      hapticError();
      showToast(t("customers.contactsOpenError"), "error");
      return null;
    }
  }, [showToast, t]);
}
