import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { invalidateClientDomain } from "../../../core/query/clientInvalidation";
import { queryKeys, QueryScope } from "../../../core/query/queryKeys";
import { getQueryLoadingState } from "../../../core/query/queryLoading";
import {
  createClient,
  deleteClient,
  getClientById,
  getClients,
} from "../services/clientsService";
import { Customer } from "../types";

const EMPTY_CUSTOMERS: Customer[] = [];

export function useClientQueries(scope: QueryScope, enabled: boolean) {
  const queryClient = useQueryClient();
  const clientsQuery = useQuery({
    queryKey: queryKeys.clients(scope),
    queryFn: ({ signal }) => getClients(undefined, signal),
    enabled,
    staleTime: 30_000,
  });

  const addCustomerMutation = useMutation({
    mutationFn: (data: Omit<Customer, "id" | "createdAt">) =>
      createClient({
        fullName: data.fullName,
        phoneNumber: data.phone,
        note: data.note ?? "",
      }),
    onSuccess: (created) => {
      queryClient.setQueryData<Customer[]>(queryKeys.clients(scope), (prev = []) => [
        created,
        ...prev,
      ]);
      void invalidateClientDomain(queryClient, scope, "created", created.id);
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
          const customer = await getClientById(id);
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
    (data: Omit<Customer, "id" | "createdAt">) =>
      addCustomerMutation.mutateAsync(data),
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

  return {
    customers: clientsQuery.data ?? EMPTY_CUSTOMERS,
    isLoading: clientsLoading.isLoading,
    isRefreshing: clientsLoading.isRefreshing,
    error: clientsQuery.error,
    addCustomer,
    deleteCustomer,
    loadCustomerDetail,
  };
}
