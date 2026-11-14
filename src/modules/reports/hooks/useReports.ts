import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useApp } from "../../../context/AppContext";
import { useAuth } from "../../../context/AuthContext";
import { getOrganizationQueryScope } from "../../../core/query/organizationScope";
import { queryKeys } from "../../../core/query/queryKeys";
import { useRefetchInvalidatedOnFocus } from "../../../hooks/useRefetchInvalidatedOnFocus";
import { loadCustomers, loadSnapshot, saveSnapshot } from "../../offline/db/savedDataRepository";
import { reportFromSavedCustomers } from "../utils/phoneReport";
import { useSeedFromSaved } from "../../offline/hooks/useSeedFromSaved";
import { reportSavedDataShown, reportServerAnswered } from "../../offline/state/savedDataStatus";
import { withSavedDataFallback } from "../../offline/utils/savedData";
import { isServerDown } from "../../offline/state/serverStatus";
import { useOutbox } from "../../offline/db/outboxRepository";
import { applyPendingToReport } from "../../offline/sync/pendingOverlay";
import { getReports } from "../services/reportsService";
import { ReportsQueryParams } from "../types";

export const DEFAULT_REPORTS_QUERY: ReportsQueryParams = {
  months: 6,
  topDebtorsLimit: 10,
};

export function useReports(
  params: ReportsQueryParams = DEFAULT_REPORTS_QUERY,
) {
  const { user, currentOrganization } = useAuth();
  const { scope, enabled } = getOrganizationQueryScope(
    user?.id,
    currentOrganization?.id,
  );

  const queryKey = queryKeys.reports(scope, params);
  // Payments and customers change it from other tabs; see clientInvalidation.
  useRefetchInvalidatedOnFocus(queryKey);
  // The last report kept on the phone: shown at once, and with the server down.
  const snapshotKey = `reports:${params.months}:${params.topDebtorsLimit}`;
  const loadSaved = () => loadSnapshot<Awaited<ReturnType<typeof getReports>>>(scope, snapshotKey);
  useSeedFromSaved(queryKey, loadSaved, enabled);
  // Server down: the total owed, from every customer sync brought to the
  // phone (fresher than the last report kept); that report only when the
  // phone has no customers saved yet.
  const loadWhileDown = async () => {
    const customers = await loadCustomers(scope);
    if (customers) return { data: reportFromSavedCustomers(customers.data), savedAt: customers.savedAt };
    return loadSaved();
  };
  const query = useQuery({
    queryKey,
    queryFn: ({ signal }) =>
      withSavedDataFallback({
        serverDown: isServerDown(),
        fetch: () => getReports(params, signal),
        save: (report) => saveSnapshot(scope, snapshotKey, report),
        load: loadWhileDown,
        onFresh: reportServerAnswered,
        onSaved: reportSavedDataShown,
      }),
    placeholderData: (previousData) => previousData,
    enabled,
    staleTime: 60_000,
  });

  // What was written offline and not yet sent counts in the report too: the
  // remaining balance and the top debtors, from the phone's balances. The
  // server's report replaces it once the writes are sent.
  const outbox = useOutbox();
  const { customers } = useApp();
  const organizationId = currentOrganization?.id;
  const report = useMemo(
    () =>
      query.data
        ? applyPendingToReport(
            query.data,
            outbox.filter((operation) => operation.organizationId === organizationId),
            customers,
            params.topDebtorsLimit,
          )
        : undefined,
    [customers, organizationId, outbox, params.topDebtorsLimit, query.data],
  );

  return {
    report,
    error: query.error,
    isLoading: query.isPending,
    isRefreshing: query.isFetching && !query.isPending,
    isFetching: query.isFetching,
    refetch: query.refetch,
  };
}
