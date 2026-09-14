import { useCallback, useState } from "react";

import { useAuth } from "../../../context/AuthContext";
import {
  getCurrentOrganization,
  updateCurrentOrganization,
} from "../services/organizationService";
import type { UpdateCurrentOrganizationRequest } from "../types";
import { normalizeOrganizationProfile } from "../utils/organizationProfile";

export function useOrganizationProfileUpdate() {
  const { refreshOrganizations } = useAuth();
  const [isSaving, setIsSaving] = useState(false);

  const saveOrganizationProfile = useCallback(
    async (payload: UpdateCurrentOrganizationRequest) => {
      const normalized = normalizeOrganizationProfile(payload);
      if (!normalized.ok) {
        const error = new Error("ORGANIZATION_NAME_REQUIRED");
        error.name = "ORGANIZATION_NAME_REQUIRED";
        throw error;
      }

      setIsSaving(true);
      try {
        await updateCurrentOrganization(normalized.value);
        const canonical = await getCurrentOrganization();
        if (!canonical) {
          throw new Error("UPDATED_ORGANIZATION_NOT_FOUND");
        }

        await refreshOrganizations();
        return canonical;
      } finally {
        setIsSaving(false);
      }
    },
    [refreshOrganizations],
  );

  return { saveOrganizationProfile, isSaving };
}
