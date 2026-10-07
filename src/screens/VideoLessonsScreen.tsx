import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AppState,
  Image,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";

import { useToast } from "../context/ToastContext";
import { useTheme } from "../hooks/useTheme";
import { useTranslation } from "../i18n";
import { YouTubePlayer } from "../modules/video-lessons/components/YouTubePlayer";
import {
  getVideoLessons,
  getVideoThumbnailUrl,
  getVideoWatchUrl,
  resolveVideoLesson,
  type VideoLesson,
} from "../modules/video-lessons/utils/videoLessons";
import { radius, spacing, typography } from "../theme";
import type { AppTheme, RootStackParamList } from "../types";

type Navigation = NativeStackNavigationProp<RootStackParamList>;
type Playback = "idle" | "playing" | "error";

export function VideoLessonsScreen() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const navigation = useNavigation<Navigation>();
  const route = useRoute<RouteProp<RootStackParamList, "VideoLessons">>();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const listRef = useRef<ScrollView>(null);

  const lessons = useMemo(() => getVideoLessons(Platform.OS), []);
  const requestedId = route.params?.lessonId;
  const [selectedId, setSelectedId] = useState(
    () => resolveVideoLesson(lessons, requestedId)?.id,
  );
  const [playback, setPlayback] = useState<Playback>("idle");
  const selected = resolveVideoLesson(lessons, selectedId);
  const selectedNumber = selected ? lessons.indexOf(selected) + 1 : 0;

  // A screen that linked to one particular lesson means "show me this now",
  // so it starts by itself; from the profile the viewer picks first. Starting
  // waits for the screen to finish sliding in, since mounting the player
  // mid-animation makes the transition stutter.
  useEffect(() => {
    if (!requestedId) return;
    return navigation.addListener("transitionEnd", (event) => {
      if (!event.data.closing) {
        setPlayback((current) => (current === "idle" ? "playing" : current));
      }
    });
  }, [navigation, requestedId]);

  // Leaving the app drops the player, so the sound cannot carry on behind it.
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "background") setPlayback("idle");
    });
    return () => subscription.remove();
  }, []);

  const play = useCallback((lesson: VideoLesson) => {
    setSelectedId(lesson.id);
    setPlayback("playing");
    listRef.current?.scrollTo({ y: 0, animated: true });
  }, []);

  const handlePlayerError = useCallback(() => setPlayback("error"), []);
  const handleEnded = useCallback(() => setPlayback("idle"), []);

  const openInYouTube = useCallback(async () => {
    if (!selected) return;
    // Two players talking at once helps nobody.
    setPlayback("idle");
    try {
      await Linking.openURL(getVideoWatchUrl(selected.youtubeId));
    } catch {
      showToast(t("videoLessons.openError"), "error");
    }
  }, [selected, showToast, t]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("common.back")}
          onPress={() => navigation.goBack()}
          style={styles.headerButton}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>
          {t("videoLessons.screenTitle")}
        </Text>
        <View style={styles.headerButton} />
      </View>

      {selected ? (
        <>
          {/* Stays in place while the list scrolls underneath, edge to edge. */}
          <View style={styles.stage}>
            {playback === "playing" ? (
              <YouTubePlayer
                // A new video is a new page; remounting is simpler and safer
                // than steering the old one.
                key={selected.youtubeId}
                youtubeId={selected.youtubeId}
                onEnded={handleEnded}
                onError={handlePlayerError}
              />
            ) : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("videoLessons.play")}
                onPress={() => setPlayback("playing")}
                style={styles.fill}
              >
                <Image
                  source={{ uri: getVideoThumbnailUrl(selected.youtubeId) }}
                  resizeMode="cover"
                  style={styles.fill}
                />
                <View style={[styles.fill, styles.posterShade]}>
                  {playback === "error" ? (
                    <View style={styles.errorBox}>
                      <Text style={styles.errorTitle}>
                        {t("videoLessons.playerError")}
                      </Text>
                      <Text style={styles.errorHint}>
                        {t("videoLessons.playerErrorHint")}
                      </Text>
                      <View style={styles.errorActions}>
                        <View style={styles.errorButton}>
                          <Ionicons name="refresh" size={16} color="#FFFFFF" />
                          <Text style={styles.errorButtonText}>
                            {t("videoLessons.retry")}
                          </Text>
                        </View>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.playButton}>
                      <Ionicons name="play" size={30} color="#FFFFFF" />
                    </View>
                  )}
                </View>
              </Pressable>
            )}
          </View>

          <View style={styles.nowPlaying}>
            <View style={styles.nowPlayingCopy}>
              <Text style={styles.lessonNumber}>
                {t("videoLessons.lessonNumber", { number: selectedNumber })}
              </Text>
              <Text style={styles.nowPlayingTitle} numberOfLines={2}>
                {t(`videoLessons.lessons.${selected.id}.title`)}
              </Text>
              <Text style={styles.nowPlayingDescription} numberOfLines={2}>
                {t(`videoLessons.lessons.${selected.id}.description`)}
              </Text>
            </View>
            <Pressable
              accessibilityRole="link"
              accessibilityLabel={t("videoLessons.openInYouTube")}
              hitSlop={6}
              onPress={() => void openInYouTube()}
              style={({ pressed }) => [
                styles.youtubeButton,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons name="logo-youtube" size={18} color={theme.primary} />
              <Text style={styles.youtubeButtonText}>YouTube</Text>
            </Pressable>
          </View>
        </>
      ) : null}

      <ScrollView
        ref={listRef}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionTitle}>{t("videoLessons.allLessons")}</Text>
        {lessons.map((lesson, index) => (
          <LessonRow
            key={lesson.id}
            lesson={lesson}
            number={index + 1}
            active={lesson.id === selected?.id}
            onPress={play}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const LessonRow = memo(function LessonRow({
  lesson,
  number,
  active,
  onPress,
}: {
  lesson: VideoLesson;
  number: number;
  active: boolean;
  onPress: (lesson: VideoLesson) => void;
}) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const title = t(`videoLessons.lessons.${lesson.id}.title`);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${t("videoLessons.lessonNumber", { number })}. ${title}`}
      accessibilityState={{ selected: active }}
      onPress={() => onPress(lesson)}
      style={({ pressed }) => [
        styles.row,
        active && styles.rowActive,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.thumbnail}>
        <Image
          source={{ uri: getVideoThumbnailUrl(lesson.youtubeId) }}
          resizeMode="cover"
          style={styles.fill}
        />
        <View style={styles.thumbnailBadge}>
          <Text style={styles.thumbnailBadgeText}>{number}</Text>
        </View>
      </View>
      <View style={styles.rowCopy}>
        <Text style={styles.rowTitle} numberOfLines={2}>
          {title}
        </Text>
        <Text style={styles.rowDescription} numberOfLines={2}>
          {t(`videoLessons.lessons.${lesson.id}.description`)}
        </Text>
      </View>
      <Ionicons
        name={active ? "play-circle" : "play-circle-outline"}
        size={26}
        color={active ? theme.primary : theme.textMuted}
      />
    </Pressable>
  );
});

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.background },
    fill: { ...StyleSheet.absoluteFillObject },
    header: {
      minHeight: 54,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: spacing.sm,
    },
    headerButton: {
      width: 44,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
    },
    title: {
      flex: 1,
      textAlign: "center",
      ...typography.headingLarge,
      color: theme.text,
    },
    stage: {
      width: "100%",
      aspectRatio: 16 / 9,
      backgroundColor: "#000000",
    },
    posterShade: {
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(0, 0, 0, 0.35)",
    },
    playButton: {
      width: 68,
      height: 68,
      alignItems: "center",
      justifyContent: "center",
      // The triangle's weight sits left of its box; this centres it by eye.
      paddingLeft: 4,
      borderRadius: radius.full,
      backgroundColor: "rgba(0, 0, 0, 0.6)",
      borderWidth: 2,
      borderColor: "rgba(255, 255, 255, 0.9)",
    },
    errorBox: {
      alignItems: "center",
      gap: spacing.xs,
      paddingHorizontal: spacing.lg,
    },
    errorTitle: {
      ...typography.bodyMedium,
      color: "#FFFFFF",
      fontWeight: "700",
      textAlign: "center",
    },
    errorHint: {
      ...typography.caption,
      color: "rgba(255, 255, 255, 0.85)",
      textAlign: "center",
    },
    errorActions: { marginTop: spacing.sm },
    errorButton: {
      minHeight: 36,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs + 2,
      paddingHorizontal: spacing.md,
      borderRadius: radius.full,
      backgroundColor: "rgba(255, 255, 255, 0.2)",
    },
    errorButtonText: {
      ...typography.caption,
      color: "#FFFFFF",
      fontWeight: "700",
    },
    nowPlaying: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.border,
    },
    nowPlayingCopy: { flex: 1, gap: 2 },
    lessonNumber: {
      ...typography.caption,
      color: theme.primary,
      fontWeight: "700",
    },
    nowPlayingTitle: { ...typography.headingMedium, color: theme.text },
    nowPlayingDescription: {
      ...typography.bodyMedium,
      color: theme.textSecondary,
    },
    youtubeButton: {
      minHeight: 36,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs + 2,
      paddingHorizontal: spacing.sm + 2,
      borderRadius: radius.full,
      backgroundColor: theme.primaryLight,
    },
    youtubeButtonText: {
      ...typography.caption,
      color: theme.primary,
      fontWeight: "700",
    },
    list: { flex: 1 },
    listContent: {
      padding: spacing.md,
      paddingBottom: spacing.xl,
      gap: spacing.sm,
    },
    sectionTitle: {
      ...typography.caption,
      color: theme.textSecondary,
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: 0.4,
      marginBottom: spacing.xs,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm + 4,
      padding: spacing.sm,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.surface,
    },
    rowActive: {
      borderColor: theme.primary,
      backgroundColor: theme.primaryLight,
    },
    thumbnail: {
      width: 112,
      aspectRatio: 16 / 9,
      borderRadius: radius.sm,
      overflow: "hidden",
      backgroundColor: theme.inputBackground,
    },
    thumbnailBadge: {
      position: "absolute",
      left: 4,
      bottom: 4,
      minWidth: 20,
      height: 20,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 5,
      borderRadius: 6,
      backgroundColor: "rgba(0, 0, 0, 0.7)",
    },
    thumbnailBadgeText: {
      color: "#FFFFFF",
      fontSize: 11,
      fontWeight: "800",
    },
    rowCopy: { flex: 1, minWidth: 0, gap: 2 },
    rowTitle: {
      ...typography.bodyMedium,
      color: theme.text,
      fontWeight: "700",
    },
    rowDescription: { ...typography.caption, color: theme.textSecondary },
    pressed: { opacity: 0.7 },
  });
