import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../../context/AuthContext";
import { queryKeys } from "../../../core/query/queryKeys";
import { getClientById, updateClient } from "../services/clientsService";
import { getClientHistory } from "../../transactions/services/transactionsService";
import type { ClientUpdateRequest, Customer } from "../types";

export function useClientDetail(id: number) {
  const { user } = useAuth();
  const scope = user?.organizationId ?? user?.id ?? "anonymous";
  const queryClient = useQueryClient();
  const detailKey = queryKeys.client(scope, id);
  const listKey = queryKeys.clients(scope);
  const detail = useQuery({
    queryKey: detailKey,
    queryFn: ({ signal }) => getClientById(id, signal),
    enabled: Boolean(user),
    initialData: () =>
      queryClient
        .getQueryData<Customer[]>(listKey)
        ?.find((item) => item.id === id),
    initialDataUpdatedAt: 0,
    staleTime: 30_000,
  });
  const history = useQuery({
    queryKey: queryKeys.transactionHistory(scope, id),
    queryFn: ({ signal }) => getClientHistory(id, signal),
    enabled: Boolean(user),
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
      void queryClient.invalidateQueries({ queryKey: listKey });
      void queryClient.invalidateQueries({ queryKey: detailKey });
      void queryClient.invalidateQueries({ queryKey: ["reports", scope] });
    },
  });
  return { detail, history, update };
}
