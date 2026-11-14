import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../../context/AuthContext";
import { invalidateClientDomain } from "../../../core/query/clientInvalidation";
import { getOrganizationQueryScope } from "../../../core/query/organizationScope";
import { queryKeys } from "../../../core/query/queryKeys";
import { getClientById, updateClient } from "../services/clientsService";
import { getClientHistory } from "../../transactions/services/transactionsService";
import type { ClientUpdateRequest, Customer } from "../types";
import {
  loadCustomer,
  loadHistory,
  saveCustomer,
  saveHistory,
} from "../../offline/db/savedDataRepository";
import { useSeedFromSaved } from "../../offline/hooks/useSeedFromSaved";
import { reportSavedDataShown, reportServerAnswered } from "../../offline/state/savedDataStatus";
import { withSavedDataFallback } from "../../offline/utils/savedData";
import { isServerDown } from "../../offline/state/serverStatus";
import { useOutbox } from "../../offline/db/outboxRepository";
import { useClientAlias } from "../../offline/hooks/useClientAlias";
import {
  applyPendingToCustomer,
  applyPendingToHistory,
  customerFromOperation,
} from "../../offline/sync/pendingOverlay";

/**
 * A customer and their history. `requestedId` may be a stand-in (negative)
 * for a customer added offline: until the server has it, both come from the
 * phone's queue; once it has, from the server under its real id, on the same
 * screen.
 */
export function useClientDetail(requestedId: number) {
  const { user, currentOrganization } = useAuth();
  const { scope, enabled: organizationReady } = getOrganizationQueryScope(
    user?.id,
    currentOrganization?.id,
  );
  const queryClient = useQueryClient();
  const outbox = useOutbox();
  const operations = useMemo(
    () => outbox.filter((operation) => operation.organizationId === currentOrganization?.id),
    [currentOrganization?.id, outbox],
  );
  const alias = useClientAlias(scope, requestedId, outbox);
  const id = requestedId < 0 ? alias?.serverId ?? requestedId : requestedId;
  const queued = id < 0
    ? operations.find((operation) => operation.type === "client.create" && operation.meta.tempId === id)
    : undefined;
  // A customer only the phone has yet: nothing to ask the server for.
  const enabled = organizationReady && id > 0;
  const detailKey = queryKeys.client(scope, id);
  const listKey = queryKeys.clients(scope);
  const detail = useQuery({
    queryKey: detailKey,
    queryFn: ({ signal }) =>
      withSavedDataFallback({
        serverDown: isServerDown(),
        fetch: () => getClientById(id, signal),
        save: (customer) => saveCustomer(scope, customer),
        load: () => loadCustomer(scope, id),
        onFresh: reportServerAnswered,
        onSaved: reportSavedDataShown,
      }),
    enabled,
    initialData: () =>
      queryClient
        .getQueryData<Customer[]>(listKey)
        ?.find((item) => item.id === id),
    initialDataUpdatedAt: 0,
    staleTime: 30_000,
  });
  // The history kept on the phone shows at once, and with the server down.
  useSeedFromSaved(queryKeys.transactionHistory(scope, id), () => loadHistory(scope, id), enabled);
  const history = useQuery({
    queryKey: queryKeys.transactionHistory(scope, id),
    queryFn: ({ signal }) =>
      withSavedDataFallback({
        serverDown: isServerDown(),
        fetch: () => getClientHistory(id, signal),
        save: (transactions) => saveHistory(scope, id, transactions),
        load: () => loadHistory(scope, id),
        onFresh: reportServerAnswered,
        onSaved: reportSavedDataShown,
      }),
    enabled,
    staleTime: 30_000,
  });
  const update = useMutation({
    mutationFn: (payload: ClientUpdateRequest) => updateClient(id, payload),
    onSuccess: async (_, payload) => {
      // Stop earlier reads from overwriting the newly accepted profile fields.
      await Promise.all([
        queryClient.cancelQueries({ queryKey: detailKey, exact: true }),
        queryClient.cancelQueries({ queryKey: listKey }),
      ]);
      const merge = (customer: Customer): Customer => ({
        ...customer,
        fullName: payload.fullName,
        phone: payload.phoneNumber,
        note: payload.note,
      });
      queryClient.setQueryData<Customer>(detailKey, (previous) =>
        previous ? merge(previous) : previous,
      );
      queryClient.setQueryData<Customer[]>(listKey, (previous) =>
        previous?.map((customer) =>
          customer.id === id ? merge(customer) : customer,
        ),
      );
      void invalidateClientDomain(queryClient, scope, "updated", id);
    },
  });
  // What was written offline and not yet sent, laid over what the server has.
  const detailData = useMemo(() => {
    if (id < 0) return queued ? applyPendingToCustomer(customerFromOperation(queued), operations) : undefined;
    return detail.data ? applyPendingToCustomer(detail.data, operations) : undefined;
  }, [detail.data, id, operations, queued]);
  const historyData = useMemo(() => {
    if (id < 0) return queued ? applyPendingToHistory([], operations, { id, uuid: detailData?.uuid }) : undefined;
    return history.data
      ? applyPendingToHistory(history.data, operations, { id, uuid: detailData?.uuid ?? detail.data?.uuid })
      : undefined;
  }, [detail.data?.uuid, detailData?.uuid, history.data, id, operations, queued]);
  const onlyOnPhone = id < 0;

  return {
    detail: {
      ...detail,
      data: detailData,
      ...(onlyOnPhone ? { isPending: false, isError: false, isFetching: false } : {}),
    },
    history: {
      ...history,
      data: historyData,
      ...(onlyOnPhone ? { isPending: false, isError: false, isFetching: false } : {}),
    },
    update,
    /** The customer's id as the server knows it; negative while only the phone has it. */
    resolvedId: id,
  };
}
