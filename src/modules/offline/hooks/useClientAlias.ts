import { useEffect, useState } from "react";

import type { QueryScope } from "../../../core/query/queryKeys";
import { loadClientAlias } from "../db/savedDataRepository";

/**
 * The real customer behind a stand-in id (a customer added offline), once the
 * server has it; null before that, and for a real id. Looked up again
 * whenever `version` changes (the queue after a sync).
 */
export function useClientAlias(
  scope: QueryScope,
  tempId: number,
  version: unknown,
): { serverId: number; serverUuid: string } | null {
  const [alias, setAlias] = useState<{ tempId: number; serverId: number; serverUuid: string } | null>(null);

  useEffect(() => {
    if (tempId >= 0) return undefined;
    let active = true;
    void loadClientAlias(scope, tempId).then((found) => {
      if (active) setAlias(found ? { tempId, ...found } : null);
    });
    return () => {
      active = false;
    };
  }, [scope, tempId, version]);

  return alias && alias.tempId === tempId ? alias : null;
}
