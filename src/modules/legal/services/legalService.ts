import { apiClient } from "../../../services/axiosService";
import { getApiErrorStatus } from "../../../utils/apiError";
import {
  parseLegalDocument,
  type LegalDocument,
  type LegalDocumentKind,
} from "../utils/legalDocument";

/**
 * The published document, or null when there is none to show yet: the server
 * answers 404 until one is published, and then the fixed page on the site is
 * used, as before.
 */
export async function getLegalDocument(
  kind: LegalDocumentKind,
  language: "uz" | "ru",
  signal?: AbortSignal,
): Promise<LegalDocument | null> {
  try {
    const { data } = await apiClient.get<unknown>(
      kind === "offer" ? "/legal/offer" : "/legal/privacy",
      { params: kind === "offer" ? { language } : undefined, signal },
    );
    return parseLegalDocument(data);
  } catch (error) {
    if (getApiErrorStatus(error) === 404) return null;
    throw error;
  }
}
