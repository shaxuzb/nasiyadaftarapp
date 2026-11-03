import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Animated,
  AppState,
  Image,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";

import { EmptyState } from "../components/EmptyState";
import { PrimaryButton } from "../components/PrimaryButton";
import { useToast } from "../context/ToastContext";
import { useTheme } from "../hooks/useTheme";
import { getLocalizedApiErrorMessage, useTranslation } from "../i18n";
import { YouTubePlayer } from "../modules/video-lessons/components/YouTubePlayer";
import {
  getVideoThumbnailUrl,
} from "../modules/video-lessons/utils/videoLessons";
import { radius, spacing, typography } from "../theme";
import { useVideoLessons } from "../modules/video-lessons/hooks/useVideoLessons";
import type { ApiVideoLesson } from "../modules/video-lessons/services/videoLessonService";
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

  const lessonsQuery = useVideoLessons();
  const lessons = lessonsQuery.data ?? [];
  const requestedId = route.params?.lessonId;
  const [selectedId, setSelectedId] = useState<string | undefined>(requestedId);
  const [playback, setPlayback] = useState<Playback>("idle");
  const selected = lessons.find((lesson) => lesson.id === selectedId || lesson.code === selectedId) ?? lessons[0];
  const selectedNumber = selected ? lessons.indexOf(selected) + 1 : 0;
  const posterUri = selected ? getPosterUri(selected) : undefined;
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);

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

  const play = useCallback((lesson: ApiVideoLesson) => {
    setSelectedId(lesson.id);
    setPlayback("playing");
    listRef.current?.scrollTo({ y: 0, animated: true });
  }, []);

  const { refetch } = lessonsQuery;
  const refresh = useCallback(async () => {
    setIsPullRefreshing(true);
    try {
      const result = await refetch();
      // With lessons on screen the failure has nowhere else to show.
      if (result.error && result.data?.length) {
        showToast(getLocalizedApiErrorMessage(result.error, "videoLessons.loadError", t), "error");
      }
    } finally {
      setIsPullRefreshing(false);
    }
  }, [refetch, showToast, t]);

  const handlePlayerError = useCallback(() => setPlayback("error"), []);
  const handleEnded = useCallback(() => setPlayback("idle"), []);

  const openInYouTube = useCallback(async () => {
    if (!selected) return;
    // Two players talking at once helps nobody.
    setPlayback("idle");
    try {
      await Linking.openURL(selected.videoUrl);
    } catch {
      showToast(t("videoLessons.openError"), "error");
    }
  }, [selected, showToast, t]);

  return (
    // Top and bottom both. With only the top, the last lesson ended up under
    // the home indicator on an iPhone and under the navigation bar on Android.
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
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
            {playback === "playing" && selected.youtubeId ? (
              <YouTubePlayer
                // A new video is a new page; remounting is simpler and safer
                // than steering the old one.
                key={selected.id}
                youtubeId={selected.youtubeId}
                posterUri={posterUri}
                onEnded={handleEnded}
                onError={handlePlayerError}
              />
            ) : playback === "error" ? (
              <View style={styles.fill}>
                {posterUri ? (
                  <Image source={{ uri: posterUri }} resizeMode="cover" style={styles.fill} />
                ) : null}
                <View style={[styles.fill, styles.errorShade]}>
                  <View style={styles.errorIcon}>
                    <Ionicons name="alert-circle-outline" size={24} color="#FFFFFF" />
                  </View>
                  <Text style={styles.errorTitle}>{t("videoLessons.playerError")}</Text>
                  <Text style={styles.errorHint}>{t("videoLessons.playerErrorHint")}</Text>
                  <View style={styles.errorActions}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={t("videoLessons.retry")}
                      hitSlop={4}
                      onPress={() => setPlayback("playing")}
                      style={({ pressed }) => [styles.errorButton, styles.errorButtonPrimary, pressed && styles.pressed]}
                    >
                      <Ionicons name="refresh" size={16} color="#111111" />
                      <Text style={[styles.errorButtonText, styles.errorButtonPrimaryText]}>
                        {t("videoLessons.retry")}
                      </Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="link"
                      accessibilityLabel={t("videoLessons.openInYouTube")}
                      hitSlop={4}
                      onPress={() => void openInYouTube()}
                      style={({ pressed }) => [styles.errorButton, pressed && styles.pressed]}
                    >
                      <Ionicons name="logo-youtube" size={16} color="#FFFFFF" />
                      <Text style={styles.errorButtonText}>YouTube</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            ) : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("videoLessons.play")}
                onPress={() => setPlayback("playing")}
                style={styles.fill}
              >
                {posterUri ? (
                  <Image source={{ uri: posterUri }} resizeMode="cover" style={styles.fill} />
                ) : null}
                <View style={[styles.fill, styles.posterShade]}>
                  <View style={styles.playButton}>
                    <Ionicons name="play" size={30} color="#FFFFFF" />
                  </View>
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
                {selected.title}
              </Text>
              <Text style={styles.nowPlayingDescription} numberOfLines={2}>
                {selected.description}
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
      ) : lessonsQuery.isPending ? (
        <StageSkeleton />
      ) : null}

      <ScrollView
        ref={listRef}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          lessonsQuery.isPending ? undefined : (
            <RefreshControl
              refreshing={isPullRefreshing}
              onRefresh={() => void refresh()}
              tintColor={theme.primary}
              colors={[theme.primary]}
            />
          )
        }
      >
        {lessonsQuery.isPending ? (
          <RowsSkeleton />
        ) : lessons.length === 0 ? (
          // A failed refresh with lessons already on screen keeps them; only
          // an empty screen explains itself.
          lessonsQuery.isError ? (
            <EmptyState
              iconName="cloud-offline-outline"
              title={t("videoLessons.loadError")}
              description={getLocalizedApiErrorMessage(lessonsQuery.error, "videoLessons.loadErrorHint", t)}
              action={
                <PrimaryButton
                  label={t("videoLessons.retry")}
                  loading={lessonsQuery.isFetching}
                  onPress={() => void lessonsQuery.refetch()}
                />
              }
            />
          ) : (
            <EmptyState
              iconName="videocam-outline"
              title={t("videoLessons.empty")}
              description={t("videoLessons.emptyHint")}
            />
          )
        ) : (
          <Text style={styles.sectionTitle}>{t("videoLessons.allLessons")}</Text>
        )}
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
  lesson: ApiVideoLesson;
  number: number;
  active: boolean;
  onPress: (lesson: ApiVideoLesson) => void;
}) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const title = lesson.title;
  const poster = getPosterUri(lesson);

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
        {/* Under the picture, so a slow or missing one still looks meant. */}
        <Ionicons name="videocam-outline" size={22} color={theme.textMuted} />
        {poster ? <Image source={{ uri: poster }} resizeMode="cover" style={styles.fill} /> : null}
        <View style={styles.thumbnailBadge}>
          <Text style={styles.thumbnailBadgeText}>{number}</Text>
        </View>
      </View>
      <View style={styles.rowCopy}>
        <Text style={styles.rowTitle} numberOfLines={2}>
          {title}
        </Text>
        <Text style={styles.rowDescription} numberOfLines={2}>
          {lesson.description}
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

function getPosterUri(lesson: ApiVideoLesson): string | undefined {
  return lesson.thumbnailUrl ?? (lesson.youtubeId ? getVideoThumbnailUrl(lesson.youtubeId) : undefined);
}

/** A soft pulse for placeholders, one animation shared by everything inside. */
function Pulse({ children }: { children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.45, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return <Animated.View style={{ opacity }}>{children}</Animated.View>;
}

/** The player and its caption, in the shape they will have once loaded. */
function StageSkeleton() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  return (
    <View accessible accessibilityRole="progressbar" accessibilityLabel={t("videoLessons.loadingLessons")}>
      <Pulse>
        <View style={[styles.stage, styles.skeletonStage]}>
          <View style={styles.skeletonPlay}>
            <Ionicons name="play" size={26} color={theme.textMuted} />
          </View>
        </View>
        <View style={styles.nowPlaying}>
          <View style={styles.nowPlayingCopy}>
            <View style={[styles.skeletonLine, { width: 56 }]} />
            <View style={[styles.skeletonLine, styles.skeletonHeading, { width: "70%" }]} />
            <View style={[styles.skeletonLine, { width: "90%" }]} />
          </View>
        </View>
      </Pulse>
    </View>
  );
}

const SKELETON_ROWS = [0, 1, 2, 3];

function RowsSkeleton() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <Pulse>
      <View style={[styles.skeletonLine, styles.skeletonSection]} />
      <View style={styles.skeletonRows}>
        {SKELETON_ROWS.map((key) => (
          <View key={key} style={styles.row}>
            <View style={styles.thumbnail} />
            <View style={styles.rowCopy}>
              <View style={[styles.skeletonLine, { width: "80%" }]} />
              <View style={[styles.skeletonLine, { width: "55%" }]} />
            </View>
          </View>
        ))}
      </View>
    </Pulse>
  );
}

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
    errorShade: {
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.xs,
      paddingHorizontal: spacing.lg,
      backgroundColor: "rgba(0, 0, 0, 0.72)",
    },
    errorIcon: {
      width: 44,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 2,
      borderRadius: radius.full,
      backgroundColor: "rgba(255, 255, 255, 0.16)",
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
    errorActions: {
      flexDirection: "row",
      gap: spacing.sm,
      marginTop: spacing.sm,
    },
    errorButton: {
      minHeight: 38,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs + 2,
      paddingHorizontal: spacing.md,
      borderRadius: radius.full,
      backgroundColor: "rgba(255, 255, 255, 0.18)",
    },
    errorButtonPrimary: { backgroundColor: "#FFFFFF" },
    errorButtonText: {
      ...typography.caption,
      color: "#FFFFFF",
      fontWeight: "700",
    },
    errorButtonPrimaryText: { color: "#111111" },
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
      // Lets an empty or failed list centre its message in the space left.
      flexGrow: 1,
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
      alignItems: "center",
      justifyContent: "center",
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
    skeletonStage: {
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.inputBackground,
    },
    skeletonPlay: {
      width: 60,
      height: 60,
      alignItems: "center",
      justifyContent: "center",
      paddingLeft: 3,
      borderRadius: radius.full,
      backgroundColor: theme.surface,
    },
    skeletonLine: {
      height: 12,
      borderRadius: 6,
      backgroundColor: theme.inputBackground,
    },
    skeletonHeading: { height: 18, marginVertical: 4 },
    skeletonSection: { width: 110, marginBottom: spacing.sm + 4 },
    skeletonRows: { gap: spacing.sm },
  });
