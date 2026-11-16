import { useCallback, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Crypto from "expo-crypto";
import { useAuth } from "../../../context/AuthContext";
import { invalidateClientDomain } from "../../../core/query/clientInvalidation";
import { queryKeys, QueryScope } from "../../../core/query/queryKeys";
import { getQueryLoadingState } from "../../../core/query/queryLoading";
import {
  createClient,
  deleteClient,
  getClientById,
  getClients,
} from "../services/clientsService";
import type { Customer, NewCustomerInput } from "../types";
import {
  loadCustomer,
  loadCustomers,
  saveCustomer,
  saveCustomers,
} from "../../offline/db/savedDataRepository";
import { useSeedFromSaved } from "../../offline/hooks/useSeedFromSaved";
import { reportSavedDataShown, reportServerAnswered } from "../../offline/state/savedDataStatus";
import { withSavedDataFallback } from "../../offline/utils/savedData";
import { isServerDown } from "../../offline/state/serverStatus";
import { useOutbox } from "../../offline/db/outboxRepository";
import { applyPendingToCustomers } from "../../offline/sync/pendingOverlay";
import { isUnreachableWrite, queueClientCreate, shouldQueueRightAway } from "../../offline/sync/offlineWrites";

const EMPTY_CUSTOMERS: Customer[] = [];

export function useClientQueries(scope: QueryScope, enabled: boolean) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const organizationId = typeof scope === "number" ? scope : null;
  // Kept on the phone, so the list opens at once and still opens with the
  // server down: see modules/offline.
  useSeedFromSaved(queryKeys.clients(scope), () => loadCustomers(scope), enabled);
  const clientsQuery = useQuery({
    queryKey: queryKeys.clients(scope),
    queryFn: ({ signal }) =>
      withSavedDataFallback({
        serverDown: isServerDown(),
        fetch: () => getClients(undefined, signal),
        save: (customers) => saveCustomers(scope, customers),
        load: () => loadCustomers(scope),
        onFresh: reportServerAnswered,
        onSaved: reportSavedDataShown,
      }),
    enabled,
    staleTime: 30_000,
  });

  const addCustomerMutation = useMutation({
    mutationFn: async (data: NewCustomerInput): Promise<Customer> => {
      // Made once and kept: the same customer is never created twice, whether
      // this request is repeated or the write goes to the queue below.
      const uuid = Crypto.randomUUID();
      const request = {
        fullName: data.fullName,
        phoneNumber: data.phone,
        note: data.note ?? "",
        ...(data.initialBalance
          ? {
              initialBalance: data.initialBalance,
              initialBalanceDate: data.initialBalanceDate,
            }
          : {}),
      };
      const queue = () => {
        if (!user || organizationId === null) throw new Error("Cannot queue the customer");
        return queueClientCreate({
          userId: user.id,
          organizationId,
          data: { uuid, ...request, initialBalanceDate: request.initialBalanceDate ?? null },
        });
      };
      // Known to be down: kept on the phone at once, sent when it is back.
      if (shouldQueueRightAway() && user && organizationId !== null) return queue();
      try {
        return await createClient({ ...request, uuid });
      } catch (error) {
        // The server did not answer: kept on the phone and sent when it does.
        if (!isUnreachableWrite(error) || !user || organizationId === null) throw error;
        return queue();
      }
    },
    onSuccess: (created, data) => {
      // Queued: the list shows it from the queue; the server has nothing new.
      if (created.pendingSync) return;
      queryClient.setQueryData<Customer[]>(queryKeys.clients(scope), (prev = []) => [
        created,
        ...prev,
      ]);
      // The backend stores an initial balance as the customer's first
      // transaction, so anything built from transactions has to refetch too.
      void invalidateClientDomain(
        queryClient,
        scope,
        data.initialBalance ? "transaction" : "created",
        created.id,
      );
    },
  });

  const deleteCustomerMutation = useMutation({
    mutationFn: (customerId: number) => deleteClient(customerId),
    onSuccess: (_, customerId) => {
      queryClient.setQueryData<Customer[]>(queryKeys.clients(scope), (prev = []) =>
        prev.filter((customer) => customer.id !== customerId),
      );
      queryClient.removeQueries({
        queryKey: queryKeys.transactionHistory(scope, customerId),
      });
      queryClient.removeQueries({
        queryKey: queryKeys.client(scope, customerId),
      });
      void invalidateClientDomain(queryClient, scope, "deleted", customerId);
    },
  });

  const loadCustomerDetail = useCallback(
    (id: number) =>
      queryClient.fetchQuery({
        queryKey: queryKeys.client(scope, id),
        queryFn: async () => {
          const customer = await withSavedDataFallback({
            serverDown: isServerDown(),
            fetch: () => getClientById(id),
            save: (fresh) => saveCustomer(scope, fresh),
            load: () => loadCustomer(scope, id),
            onFresh: reportServerAnswered,
            onSaved: reportSavedDataShown,
          });
          queryClient.setQueryData<Customer[]>(
            queryKeys.clients(scope),
            (current = []) =>
              current.map((item) => (item.id === customer.id ? customer : item)),
          );
          return customer;
        },
        staleTime: 30_000,
      }),
    [queryClient, scope],
  );

  const addCustomer = useCallback(
    (data: NewCustomerInput) => addCustomerMutation.mutateAsync(data),
    [addCustomerMutation],
  );

  const deleteCustomer = useCallback(
    (customerId: number) => deleteCustomerMutation.mutateAsync(customerId),
    [deleteCustomerMutation],
  );

  const clientsLoading = getQueryLoadingState(
    clientsQuery.isPending,
    clientsQuery.isFetching,
  );

  // What was written offline and not yet sent, laid over the server's list.
  const outbox = useOutbox();
  const customers = useMemo(
    () =>
      applyPendingToCustomers(
        clientsQuery.data ?? EMPTY_CUSTOMERS,
        outbox.filter((operation) => operation.organizationId === organizationId),
      ),
    [clientsQuery.data, organizationId, outbox],
  );

  return {
    customers,
    isLoading: clientsLoading.isLoading,
    isRefreshing: clientsLoading.isRefreshing,
    error: clientsQuery.error,
    addCustomer,
    deleteCustomer,
    loadCustomerDetail,
  };
}
