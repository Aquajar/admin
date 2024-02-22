import { Invoice } from "@/types/types";
import React, { createContext, useContext, useState } from "react";

// Define the type for your store data
type StoreData = {
  invoices: null | undefined | Invoice[];
  setInvoices: React.Dispatch<
    React.SetStateAction<Invoice[] | null | undefined>
  >;
};

// Create a context for your store
const StoreContext = createContext<StoreData | undefined>(undefined);

// Create a custom hook to access the store
export const useInvoicesStore = (): StoreData => {
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
  const [invoices, setInvoices] = useState<Invoice[] | null | undefined>(
    undefined
  );

  const store: StoreData = {
    invoices,
    setInvoices,
  };

  return (
    <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
  );
};
