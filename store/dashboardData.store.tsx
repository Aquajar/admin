import { DashBoardData } from "@/types/types";
import React, { createContext, useContext, useState } from "react";

const initalState: DashBoardData = {
  customers: {
    total: 0,
    regular: 0,
    new: [],
    top: [],
  },
  iat: "0",
  summary: {
    monthly: [],
    last7Days: {
      refilling: [],
    },
    total: {
      sales: 0,
      jars: 0,
      collected: 0,
      due: 0,
    },
  },
};

// Define the type for your store data
type StoreData = {
  data: null | undefined | DashBoardData;
  setData: React.Dispatch<React.SetStateAction<DashBoardData>>;
};

// Create a context for your store
const StoreContext = createContext<StoreData | undefined>(undefined);

// Create a custom hook to access the store
export const useDashboardStore = (): StoreData => {
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
  const [data, setData] = useState<DashBoardData>(initalState);

  const store: StoreData = {
    data,
    setData,
  };

  return (
    <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
  );
};
