import { apiClient } from "../../../services/axiosService";
import {
  parseOfferInfo,
  parseOfferStatus,
  type OfferInfo,
  type OfferStatus,
  type OfferVersion,
} from "../utils/offer";

export async function getOffer(signal?: AbortSignal): Promise<OfferInfo> {
  const response = await apiClient.get("/offer", { signal });
  return parseOfferInfo(response.data);
}

export async function getOfferStatus(
  signal?: AbortSignal,
): Promise<OfferStatus> {
  const response = await apiClient.get("/offer/status", { signal });
  return parseOfferStatus(response.data);
}

/**
 * Accepts the version the user was shown. The answer is the new status; if it
 * cannot be read, null, and the caller asks for the status instead.
 */
export async function acceptOffer(
  version: OfferVersion | null,
): Promise<OfferStatus | null> {
  const response = await apiClient.post(
    "/offer/accept",
    version === null ? {} : { version },
  );
  try {
    return parseOfferStatus(response.data);
  } catch {
    return null;
  }
}
