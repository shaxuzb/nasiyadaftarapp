import { apiClient } from "../../../services/axiosService";
import { buildPushBody, parseChangesResponse, parsePushResponse } from "./syncParsing";
import type { ChangesPage, OutboxOperation, PushResult } from "./syncTypes";

/** The largest page the server gives; fewer round trips on the first, full load. */
const CHANGES_PAGE_SIZE = 1000;

/** The queued writes, in order; one answer per write. At most 100 a call. */
export async function pushOperations(
  deviceId: string | null | undefined,
  operations: readonly OutboxOperation[],
): Promise<PushResult[]> {
  const { data } = await apiClient.post<unknown>("/sync/push", buildPushBody(deviceId, operations));
  return parsePushResponse(data);
}

/** What changed in the organization since `cursor`; everything without one. */
export async function fetchChanges(cursor: string | null, organizationId: number): Promise<ChangesPage> {
  const { data } = await apiClient.get<unknown>("/sync/changes", {
    params: {
      ...(cursor ? { cursor } : {}),
      limit: CHANGES_PAGE_SIZE,
      organizationId,
    },
  });
  return parseChangesResponse(data);
}
