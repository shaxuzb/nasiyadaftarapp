import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Image, Linking, StyleSheet, Text, View } from "react-native";
import * as Application from "expo-application";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import type { ShouldStartLoadRequest } from "react-native-webview/lib/WebViewTypes";

import { useTranslation } from "../../../i18n";
import { typography } from "../../../theme";
import {
  buildPlayerHtml,
  getPlayerOrigin,
  getVideoWatchUrl,
  isPlayerInternalUrl,
  parsePlayerMessage,
} from "../utils/videoLessons";

/** No answer from the player in this long means it is not going to load. */
const LOAD_TIMEOUT_MS = 15000;
/** Reported when the page never came up at all, rather than by YouTube. */
const LOAD_FAILED_CODE = -1;

const PLAYER_ORIGIN = getPlayerOrigin(Application.applicationId);

interface Props {
  youtubeId: string;
  /** The lesson's picture, kept on screen until the video itself is up. */
  posterUri?: string;
  onEnded?: () => void;
  onError: (code: number) => void;
}

/**
 * YouTube's own player in a WebView, started as soon as it is ready.
 *
 * Mount it only once the viewer has asked to watch: a WebView is the heaviest
 * thing on the screen, and until then a thumbnail does the job.
 */
export const YouTubePlayer = memo(function YouTubePlayer({
  youtubeId,
  posterUri,
  onEnded,
  onError,
}: Props) {
  const { t } = useTranslation();
  const [ready, setReady] = useState(false);
  const readyRef = useRef(false);
  const source = useMemo(
    () => ({ html: buildPlayerHtml(youtubeId, PLAYER_ORIGIN), baseUrl: PLAYER_ORIGIN }),
    [youtubeId],
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!readyRef.current) onError(LOAD_FAILED_CODE);
    }, LOAD_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [onError, youtubeId]);

  const handleMessage = useCallback(
    (event: WebViewMessageEvent) => {
      const message = parsePlayerMessage(event.nativeEvent.data);
      if (!message) return;
      if (message.type === "ready") {
        readyRef.current = true;
        setReady(true);
      } else if (message.type === "ended") {
        onEnded?.();
      } else {
        onError(message.code);
      }
    },
    [onEnded, onError],
  );

  // A tap on the YouTube logo or a card inside the video tries to take the
  // player somewhere else. That belongs in the YouTube app or the browser, so
  // the player itself never leaves its page.
  const handleShouldStartLoad = useCallback(
    (request: ShouldStartLoadRequest) => {
      if (isPlayerInternalUrl(request.url, PLAYER_ORIGIN)) return true;
      if (request.isTopFrame === false) return true;
      const target = /^https:\/\//i.test(request.url)
        ? request.url
        : getVideoWatchUrl(youtubeId);
      void Linking.openURL(target).catch(() => undefined);
      return false;
    },
    [youtubeId],
  );

  const handleLoadError = useCallback(() => onError(LOAD_FAILED_CODE), [onError]);

  return (
    <View style={styles.fill}>
      <WebView
        source={source}
        style={styles.webView}
        onMessage={handleMessage}
        onShouldStartLoadWithRequest={handleShouldStartLoad}
        onError={handleLoadError}
        javaScriptEnabled
        domStorageEnabled
        allowsInlineMediaPlayback
        allowsFullscreenVideo
        mediaPlaybackRequiresUserAction={false}
        // Android would otherwise open a tapped link in a window of its own,
        // where onShouldStartLoadWithRequest never sees it.
        setSupportMultipleWindows={false}
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
      />
      {/* The picture the viewer tapped stays put, so the wait reads as the
          video starting rather than the screen going black. */}
      {ready ? null : (
        <View
          pointerEvents="none"
          accessibilityRole="progressbar"
          accessibilityLabel={t("videoLessons.loadingVideo")}
          style={[styles.fill, styles.loading]}
        >
          {posterUri ? (
            <Image source={{ uri: posterUri }} resizeMode="cover" style={styles.fill} />
          ) : null}
          <View style={[styles.fill, styles.loadingShade]} />
          <View style={styles.loadingBadge}>
            <ActivityIndicator size="small" color="#FFFFFF" />
            <Text style={styles.loadingText}>{t("videoLessons.loadingVideo")}</Text>
          </View>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  fill: { ...StyleSheet.absoluteFillObject },
  webView: { flex: 1, backgroundColor: "#000000" },
  loading: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#000000",
  },
  loadingShade: { backgroundColor: "rgba(0, 0, 0, 0.55)" },
  loadingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
  },
  loadingText: {
    ...typography.caption,
    color: "#FFFFFF",
    fontWeight: "700",
  },
});
