import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../../context/AuthContext";
import { fetchVideoLessons } from "../services/videoLessonService";
export function useVideoLessons() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["video-lessons", user?.id ?? "anonymous"],
    queryFn: ({ signal }) => fetchVideoLessons(signal),
    enabled: Boolean(user),
    // The lesson list changes rarely and its button is on most screens.
    staleTime: 30 * 60_000,
    gcTime: 30 * 60_000,
  });
}
