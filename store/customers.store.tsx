import { Customer } from "@/types/types";
import React, { createContext, useContext, useState } from "react";

// Define the type for your store data
type StoreData = {
  customers: Customer[] | null | undefined;
  setCustomers: React.Dispatch<
    React.SetStateAction<Customer[] | null | undefined>
  >;
  customersState: Customer[] | null | undefined;
  setCustomersState: React.Dispatch<
    React.SetStateAction<Customer[] | null | undefined>
  >;
  // Search/browse state kept here (not local to the page) so it survives
  // navigating into /customers/{id} and back: the searched results, the search
  // mode flag, and the query stay put instead of being refetched/overwritten.
  autoLoad: boolean;
  setAutoLoad: React.Dispatch<React.SetStateAction<boolean>>;
  searchTerm: string;
  setSearchTerm: React.Dispatch<React.SetStateAction<string>>;
  searchBy: "id" | "name";
  setSearchBy: React.Dispatch<React.SetStateAction<"id" | "name">>;
};

// Create a context for your store
const StoreContext = createContext<StoreData | undefined>(undefined);

// Create a custom hook to access the store
export const useCustomersStore = (): StoreData => {
  const store = useContext(StoreContext);
  if (!store) {
    throw new Error("useStore must be used within a StoreProvider");
  }
  return store;
};

interface StoreProviderProps {
  children: React.ReactNode;
}

// Create a provider component to wrap your app with the store
export const StoreProvider: React.FC<StoreProviderProps> = ({ children }) => {
  const [customers, setCustomers] = useState<Customer[] | null | undefined>(
    undefined
  );
  const [customersState, setCustomersState] = useState<Customer[] | null | undefined>(
    undefined
  );
  const [autoLoad, setAutoLoad] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [searchBy, setSearchBy] = useState<"id" | "name">("name");

  const store: StoreData = {
    customers,
    setCustomers,
    customersState,
    setCustomersState,
    autoLoad,
    setAutoLoad,
    searchTerm,
    setSearchTerm,
    searchBy,
    setSearchBy,
  };

  return (
    <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
  );
};
