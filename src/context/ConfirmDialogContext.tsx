import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTheme } from "../hooks/useTheme";
import { radius, spacing, typography } from "../theme";
import { useTranslation } from "../i18n";

type ConfirmVariant = "default" | "danger";

interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
}

interface ConfirmState extends ConfirmOptions {
  visible: boolean;
}

interface ConfirmDialogContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmDialogContext = createContext<ConfirmDialogContextValue | undefined>(
  undefined,
);

export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const resolverRef = useRef<((value: boolean) => void) | null>(null);
  const [dialog, setDialog] = useState<ConfirmState>({
    visible: false,
    title: "",
    message: "",
    confirmText: "",
    cancelText: "",
    variant: "default",
  });

  const closeWith = useCallback((value: boolean) => {
    setDialog((prev) => ({ ...prev, visible: false }));
    resolverRef.current?.(value);
    resolverRef.current = null;
  }, []);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setDialog({
        visible: true,
        title: options.title,
        message: options.message,
        confirmText: options.confirmText ?? t("common.confirm"),
        cancelText: options.cancelText ?? t("common.cancel"),
        variant: options.variant ?? "default",
      });
    });
  }, []);

  const value = useMemo<ConfirmDialogContextValue>(
    () => ({ confirm }),
    [confirm, t],
  );

  const confirmColor =
    dialog.variant === "danger" ? theme.dangerColor : theme.primary;

  return (
    <ConfirmDialogContext.Provider value={value}>
      {children}
      <Modal
        visible={dialog.visible}
        transparent
        animationType="fade"
        presentationStyle="overFullScreen"
        onRequestClose={() => closeWith(false)}
      >
        <View style={styles.backdrop}>
          <View
            style={[
              styles.card,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
              },
            ]}
          >
            <Text style={[typography.headingMedium, { color: theme.text }]}>
              {dialog.title}
            </Text>
            <Text
              style={[
                typography.bodySmall,
                { color: theme.textSecondary, marginTop: spacing.xs },
              ]}
            >
              {dialog.message}
            </Text>

            <View style={styles.actions}>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => closeWith(false)}
                style={[
                  styles.button,
                  {
                    borderColor: theme.border,
                    backgroundColor: theme.inputBackground,
                  },
                ]}
              >
                <Text style={[typography.label, { color: theme.textSecondary }]}>
                  {dialog.cancelText}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => closeWith(true)}
                style={[
                  styles.button,
                  {
                    borderColor: confirmColor,
                    backgroundColor: `${confirmColor}22`,
                  },
                ]}
              >
                <Text style={[typography.label, { color: confirmColor }]}>
                  {dialog.confirmText}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ConfirmDialogContext.Provider>
  );
}

export function useConfirmDialog() {
  const ctx = useContext(ConfirmDialogContext);
  if (!ctx) {
    throw new Error("useConfirmDialog must be used inside ConfirmDialogProvider");
  }
  return ctx;
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.36)",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  card: {
    width: "100%",
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
  },
  actions: {
    marginTop: spacing.md,
    flexDirection: "row",
    gap: spacing.sm,
  },
  button: {
    flex: 1,
    minHeight: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
