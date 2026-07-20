import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys, QueryScope } from "../../../core/query/queryKeys";
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
    queryFn: () => getClients(),
    enabled,
  });

  const addCustomerMutation = useMutation({
    mutationFn: (data: Omit<Customer, "id" | "createdAt">) =>
      createClient({
        firstName: data.firstName,
        lastName: data.lastName,
        phoneNumber: data.phone,
        note: data.note ?? "",
      }),
    onSuccess: (created) => {
      queryClient.setQueryData<Customer[]>(queryKeys.clients(scope), (prev = []) => [
        created,
        ...prev,
      ]);
    },
  });

  const deleteCustomerMutation = useMutation({
    mutationFn: (customerId: number) => deleteClient(customerId),
    onSuccess: (_, customerId) => {
      queryClient.setQueryData<Customer[]>(queryKeys.clients(scope), (prev = []) =>
        prev.filter((customer) => customer.id !== customerId),
      );
      void queryClient.removeQueries({
        queryKey: queryKeys.transactionHistory(scope, customerId),
      });
      void queryClient.removeQueries({
        queryKey: queryKeys.client(scope, customerId),
      });
    },
  });

  const loadCustomerDetail = useCallback(
    (id: number) =>
      queryClient.fetchQuery({
        queryKey: queryKeys.client(scope, id),
        queryFn: () => getClientById(id),
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

  return {
    customers: clientsQuery.data ?? EMPTY_CUSTOMERS,
    isLoading: clientsQuery.isPending || clientsQuery.isFetching,
    addCustomer,
    deleteCustomer,
    loadCustomerDetail,
  };
}
