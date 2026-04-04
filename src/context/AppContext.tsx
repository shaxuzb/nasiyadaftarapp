import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import { Customer, Transaction } from '../types';
import customersData    from '../data/customers.json';
import transactionsData from '../data/transactions.json';
import {
  getBalance,
  getCustomerTransactions,
  generateId,
} from '../utils';

// ─── Types ────────────────────────────────────────────────────────

interface AppContextValue {
  customers:    Customer[];
  transactions: Transaction[];

  addCustomer:    (data: Omit<Customer, 'id' | 'createdAt'>) => Customer;
  addTransaction: (data: Omit<Transaction, 'id'>) => Transaction;

  getCustomerById:          (id: number) => Customer | undefined;
  getCustomerBalance:       (customerId: number) => number;
  getTransactionsForCustomer: (customerId: number) => Transaction[];
}

// ─── Context ──────────────────────────────────────────────────────

const AppContext = createContext<AppContextValue | undefined>(undefined);

// ─── Provider ─────────────────────────────────────────────────────

export function AppProvider({ children }: { children: ReactNode }) {
  const [customers, setCustomers] = useState<Customer[]>(
    customersData as Customer[]
  );
  const [transactions, setTransactions] = useState<Transaction[]>(
    transactionsData as Transaction[]
  );

  const addCustomer = useCallback(
    (data: Omit<Customer, 'id' | 'createdAt'>): Customer => {
      const newCustomer: Customer = {
        ...data,
        id:        generateId(customers),
        createdAt: new Date().toISOString().split('T')[0],
      };
      setCustomers((prev) => [...prev, newCustomer]);
      return newCustomer;
    },
    [customers]
  );

  const addTransaction = useCallback(
    (data: Omit<Transaction, 'id'>): Transaction => {
      const newTx: Transaction = {
        ...data,
        id: generateId(transactions),
      };
      setTransactions((prev) => [...prev, newTx]);
      return newTx;
    },
    [transactions]
  );

  const getCustomerById = useCallback(
    (id: number) => customers.find((c) => c.id === id),
    [customers]
  );

  const getCustomerBalance = useCallback(
    (customerId: number) => getBalance(customerId, transactions),
    [transactions]
  );

  const getTransactionsForCustomer = useCallback(
    (customerId: number) => getCustomerTransactions(customerId, transactions),
    [transactions]
  );

  return (
    <AppContext.Provider
      value={{
        customers,
        transactions,
        addCustomer,
        addTransaction,
        getCustomerById,
        getCustomerBalance,
        getTransactionsForCustomer,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}