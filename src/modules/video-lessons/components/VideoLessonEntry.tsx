import React, { memo, useMemo } from "react";
import {
  Pressable,
  StyleProp,
  StyleSheet,
  ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { useTheme } from "../../../hooks/useTheme";
import { useTranslation } from "../../../i18n";
import { radius } from "../../../theme";
import type { AppTheme, RootStackParamList } from "../../../types";
import { useVideoLessons } from "../hooks/useVideoLessons";

type Navigation = NativeStackNavigationProp<RootStackParamList>;

interface Props {
  /** Stable backend video lesson code for this screen. */
  code: string;
  /** Called instead of direct navigation when a bottom sheet must close first. */
  onPress?: () => void;
  /** Size or spacing to match the header it sits in. */
  style?: StyleProp<ViewStyle>;
}

/**
 * A round button for a screen's header that opens the lesson about that screen.
 * The graduation cap says "learn how", where a play triangle or a question mark
 * left people guessing. It looks the same wherever it appears, so it is learnt
 * once, and it sits beside the header's own actions without taking anything
 * from the content.
 */
export const VideoLessonButton = memo(function VideoLessonButton({
  code,
  style,
  onPress,
}: Props) {
  const theme = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation<Navigation>();
  const styles = useMemo(() => createStyles(theme), [theme]);

  // A lesson this platform does not offer gets no button, rather than a
  // button that opens a different lesson.
  const lessons = useVideoLessons();
  const offered = lessons.data?.some((lesson) => lesson.code === code) ?? false;
  if (!offered) return null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t("videoLessons.helpA11y")}
      hitSlop={6}
      onPress={onPress ?? (() => navigation.navigate("VideoLessons", { lessonId: code }))}
      style={({ pressed }) => [styles.button, pressed && styles.pressed, style]}
    >
      <Ionicons name="school-outline" size={19} color={theme.primary} />
    </Pressable>
  );
});

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    button: {
      width: 36,
      height: 36,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: radius.full,
      // Tinted rather than outlined, so it reads as the one "help" control
      // among the plain header buttons around it.
      backgroundColor: theme.primaryLight,
    },
    pressed: { opacity: 0.6 },
  });
