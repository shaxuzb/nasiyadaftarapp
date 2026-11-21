import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { marked } from "marked";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView, type WebViewNavigation } from "react-native-webview";

import { PRIVACY_POLICY_URL, TERMS_OF_SERVICE_URL } from "../../config/legalLinks";
import { useToast } from "../../context/ToastContext";
import { useTheme } from "../../hooks/useTheme";
import { useTranslation } from "../../i18n";
import { spacing, typography } from "../../theme";
import type { AppTheme } from "../../types";
import { openExternalLink } from "../support/services/appLinksService";
import { getLegalDocument } from "./services/legalService";
import {
  legalDocumentPage,
  legalLanguage,
  type LegalDocument,
  type LegalDocumentKind,
} from "./utils/legalDocument";

interface LegalDocumentContextValue {
  /** Shows the offer or the privacy policy. */
  openLegalDocument: (kind: LegalDocumentKind) => void;
}

const LegalDocumentContext = createContext<LegalDocumentContextValue | null>(null);

const SITE_URL: Record<LegalDocumentKind, string> = {
  offer: TERMS_OF_SERVICE_URL,
  privacy: PRIVACY_POLICY_URL,
};

const legalQueryKey = (kind: LegalDocumentKind, language: string) =>
  ["legal", kind, language] as const;

/**
 * The offer and the privacy policy, read inside the app, from the text the
 * admin publishes. Until one is published (the server answers 404) the fixed
 * page on the site opens in the browser, as it always did.
 *
 * A full-screen modal rather than a screen: it is opened from places outside
 * the main navigator too (the offer gate, the first shop's setup).
 */
export function LegalDocumentProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { locale } = useTranslation();
  const language = legalLanguage(locale);
  const [kind, setKind] = useState<LegalDocumentKind | null>(null);

  const openLegalDocument = useCallback(
    (next: LegalDocumentKind) => {
      // Known to be unpublished: straight to the site, no empty modal first.
      if (queryClient.getQueryData(legalQueryKey(next, language)) === null) {
        void openExternalLink(SITE_URL[next]).catch(() => undefined);
        return;
      }
      setKind(next);
    },
    [language, queryClient],
  );
  const value = useMemo(() => ({ openLegalDocument }), [openLegalDocument]);

  return (
    <LegalDocumentContext.Provider value={value}>
      {children}
      {kind ? (
        <LegalDocumentModal kind={kind} language={language} onClose={() => setKind(null)} />
      ) : null}
    </LegalDocumentContext.Provider>
  );
}

export function useLegalDocument(): LegalDocumentContextValue {
  const value = useContext(LegalDocumentContext);
  if (!value) throw new Error("useLegalDocument must be used inside LegalDocumentProvider");
  return value;
}

function LegalDocumentModal({
  kind,
  language,
  onClose,
}: {
  kind: LegalDocumentKind;
  language: "uz" | "ru";
  onClose: () => void;
}) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const { showToast } = useToast();
  const query = useQuery({
    queryKey: legalQueryKey(kind, language),
    queryFn: ({ signal }) => getLegalDocument(kind, language, signal),
    staleTime: 10 * 60_000,
    retry: 1,
  });
  const document: LegalDocument | null | undefined = query.data;

  const openSite = useCallback(() => {
    onClose();
    void openExternalLink(SITE_URL[kind]).catch(() =>
      showToast(t("support.linkOpenError"), "error"),
    );
  }, [kind, onClose, showToast, t]);

  // Not published yet: the site, as before.
  useEffect(() => {
    if (document === null) openSite();
  }, [document, openSite]);

  const html = useMemo(() => {
    if (!document) return null;
    const body = marked.parse(document.body, { async: false, gfm: true, breaks: true });
    return legalDocumentPage(body, {
      text: theme.text,
      muted: theme.textSecondary,
      link: theme.primary,
      border: theme.border,
      background: theme.background,
      surface: theme.inputBackground,
    });
  }, [document, theme]);

  // Links in the text leave for the browser; the page itself never navigates.
  const onNavigate = useCallback((request: WebViewNavigation) => {
    const url = request.url;
    if (!url || url.startsWith("about:") || url.startsWith("data:")) return true;
    if (/^(https?:|mailto:|tel:)/i.test(url)) {
      void openExternalLink(url).catch(() => undefined);
    }
    return false;
  }, []);

  const title =
    document?.title ?? (kind === "offer" ? t("legal.terms.title") : t("legal.privacy.title"));

  return (
    <Modal visible animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("common.close")}
            hitSlop={8}
            onPress={onClose}
            style={({ pressed }) => [styles.close, pressed && styles.pressed]}
          >
            <Ionicons name="close" size={24} color={theme.text} />
          </Pressable>
        </View>

        {html ? (
          <WebView
            source={{ html }}
            originWhitelist={["*"]}
            javaScriptEnabled={false}
            onShouldStartLoadWithRequest={onNavigate}
            setSupportMultipleWindows={false}
            style={styles.web}
            containerStyle={styles.web}
            startInLoadingState
            renderLoading={() => (
              <View style={styles.center}>
                <ActivityIndicator color={theme.primary} />
              </View>
            )}
          />
        ) : query.isError ? (
          <View style={styles.center}>
            <Ionicons name="document-text-outline" size={36} color={theme.textMuted} />
            <Text style={styles.message}>{t("legal.loadError")}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => void query.refetch()}
              style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
            >
              <Text style={styles.primaryText}>{t("common.retry")}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={openSite}
              hitSlop={8}
              style={({ pressed }) => [styles.link, pressed && styles.pressed]}
            >
              <Text style={styles.linkText}>{t("legal.openWebsite")}</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.center}>
            <ActivityIndicator color={theme.primary} />
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.background },
    header: {
      minHeight: 56,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      paddingLeft: spacing.md + 2,
      paddingRight: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    title: { flex: 1, ...typography.headingMedium, color: theme.text },
    close: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
    web: { flex: 1, backgroundColor: theme.background },
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.md,
      padding: spacing.lg,
      backgroundColor: theme.background,
    },
    message: { ...typography.bodyMedium, color: theme.textSecondary, textAlign: "center" },
    primary: {
      minHeight: 44,
      minWidth: 160,
      paddingHorizontal: spacing.lg,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 12,
      backgroundColor: theme.primary,
    },
    primaryText: { ...typography.bodySmall, color: theme.surface, fontWeight: "800" },
    link: { minHeight: 40, justifyContent: "center" },
    linkText: { ...typography.bodySmall, color: theme.primary, fontWeight: "700" },
    pressed: { opacity: 0.72 },
  });
