import { Customer } from "@/types/types";
import React, { createContext, useContext, useState } from "react";

// Define the type for your store data
type StoreData = {
  customers: Customer[] | null | undefined;
  setCustomers: React.Dispatch<
    React.SetStateAction<Customer[] | null | undefined>
  >;
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

  const store: StoreData = {
    customers,
    setCustomers,
  };

  return (
    <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
  );
};
