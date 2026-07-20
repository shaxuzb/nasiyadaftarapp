import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Customer, Transaction } from "../types";
import { queryKeys } from "../core/query/queryKeys";
import { useClientQueries } from "../modules/clients/hooks/useClientQueries";
import { createCustomerMap } from "../modules/clients/utils/clientCalculations";
import { useTransactionQueries } from "../modules/transactions/hooks/useTransactionQueries";
import { useAuth } from "./AuthContext";
import { seedDemoData as runSeedDemoData } from "../modules/clients/utils/seedDemoData";

interface AppContextValue {
  customers: Customer[];
  transactions: Transaction[];
  isLoadingCustomers: boolean;
  isLoadingData: boolean;

  refreshCustomers: (search?: string) => Promise<void>;
  addCustomer: (data: Omit<Customer, "id" | "createdAt">) => Promise<Customer>;
  deleteCustomer: (customerId: number) => Promise<void>;

  loadCustomerDetail: (id: number) => Promise<Customer | undefined>;
  loadCustomerHistory: (customerId: number) => Promise<Transaction[]>;

  getCustomerById: (id: number) => Customer | undefined;

  seedDemoData: (
    onProgress?: (msg: string) => void,
  ) => Promise<{ added: number; skipped: number }>;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const scope = user?.organizationId ?? user?.id ?? "anonymous";
  const enabled = Boolean(user);

  const clientState = useClientQueries(scope, enabled);
  const {
    customers: clientCustomers,
    isLoading: isLoadingCustomers,
    addCustomer: addClient,
    deleteCustomer: deleteClient,
    loadCustomerDetail,
  } = clientState;
  const clientIds = useMemo(
    () => clientCustomers.map((customer) => customer.id),
    [clientCustomers],
  );
  const transactionState = useTransactionQueries(scope, clientIds, enabled);
  const {
    transactions: transactionItems,
    isLoading: isLoadingTransactions,
    loadCustomerHistory,
  } = transactionState;

  const customers = clientCustomers as Customer[];
  const transactions = transactionItems as Transaction[];
  const customerMap = useMemo(() => createCustomerMap(customers), [customers]);

  const invalidateClientRelatedQueries = useCallback(
    async (clientId?: number) => {
      const keys = [
        queryClient.invalidateQueries({ queryKey: queryKeys.clients(scope) }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.transactions(scope),
        }),
      ];

      if (typeof clientId === "number") {
        keys.push(
          queryClient.invalidateQueries({
            queryKey: queryKeys.client(scope, clientId),
          }),
          queryClient.invalidateQueries({
            queryKey: queryKeys.transactionHistory(scope, clientId),
          }),
        );
      }

      await Promise.all(keys);
    },
    [queryClient, scope],
  );

  const refreshCustomers = useCallback(async () => {
    await invalidateClientRelatedQueries();
  }, [invalidateClientRelatedQueries]);

  const addCustomer = useCallback(
    async (data: Omit<Customer, "id" | "createdAt">) =>
      addClient(data),
    [addClient],
  );

  const deleteCustomer = useCallback(
    async (customerId: number) => deleteClient(customerId),
    [deleteClient],
  );

  const getCustomerById = useCallback(
    (id: number) => customerMap.get(id),
    [customerMap],
  );

  const seedDemoData = useCallback(
    async (onProgress?: (msg: string) => void) => {
      const result = await runSeedDemoData(onProgress);
      await invalidateClientRelatedQueries();
      return result;
    },
    [invalidateClientRelatedQueries],
  );

  const value = useMemo<AppContextValue>(
    () => ({
      customers,
      transactions,
      isLoadingCustomers,
      isLoadingData: isLoadingCustomers || isLoadingTransactions,
      refreshCustomers,
      addCustomer,
      deleteCustomer,
      loadCustomerDetail,
      loadCustomerHistory,
      getCustomerById,
      seedDemoData,
    }),
    [
      addCustomer,
      customers,
      deleteCustomer,
      getCustomerById,
      isLoadingCustomers,
      isLoadingTransactions,
      loadCustomerDetail,
      loadCustomerHistory,
      refreshCustomers,
      seedDemoData,
      transactions,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within AppProvider");
  return context;
}
