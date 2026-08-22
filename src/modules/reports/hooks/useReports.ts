import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../../context/AuthContext";
import { queryKeys } from "../../../core/query/queryKeys";
import { getReports } from "../services/reportsService";
import { ReportsQueryParams } from "../types";

export const DEFAULT_REPORTS_QUERY: ReportsQueryParams = {
  months: 6,
  topDebtorsLimit: 5,
};

export function useReports(
  params: ReportsQueryParams = DEFAULT_REPORTS_QUERY,
) {
  const { user } = useAuth();
  const scope = user?.organizationId ?? user?.id ?? "anonymous";
  const enabled = Boolean(user);

  const query = useQuery({
    queryKey: queryKeys.reports(scope, params),
    queryFn: () => getReports(params),
    enabled,
    staleTime: 60_000,
    refetchOnMount: "always",
  });

  return {
    report: query.data,
    error: query.error,
    isLoading: query.isPending,
    isRefreshing: query.isFetching && !query.isPending,
    refetch: query.refetch,
  };
}
