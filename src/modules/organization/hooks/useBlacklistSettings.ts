import { useMutation } from "@tanstack/react-query";
import { updateBlacklistSettings } from "../services/organizationService";

export function useUpdateBlacklistSettings() {
  return useMutation({ mutationFn: updateBlacklistSettings });
}
