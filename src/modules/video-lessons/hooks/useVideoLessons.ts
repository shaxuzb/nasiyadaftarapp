import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../../context/AuthContext";
import { fetchVideoLessons } from "../services/videoLessonService";
export function useVideoLessons() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["video-lessons", user?.id ?? "anonymous"],
    queryFn: ({ signal }) => fetchVideoLessons(signal),
    enabled: Boolean(user),
    staleTime: 5 * 60_000,
  });
}
