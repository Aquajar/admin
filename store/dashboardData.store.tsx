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
  setData: React.Dispatch<React.SetStateAction<DashBoardData>>;
  setCurrDay: React.Dispatch<React.SetStateAction<string | undefined>>;
  setCurrMonth: React.Dispatch<React.SetStateAction<string>>;
  setCurrDayIndex: React.Dispatch<React.SetStateAction<number>>;
  setCurrMonthIndex: React.Dispatch<React.SetStateAction<number>>;
  data: null | undefined | DashBoardData;
  currDay: string | undefined;
  currMonth: string;
  currDayIndex: number;
  currMonthIndex: number;
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
  const [currDay, setCurrDay] = useState<string | undefined>("");
  const [currMonth, setCurrMonth] = useState("");
  const [currDayIndex, setCurrDayIndex] = useState<number>(0);
  const [currMonthIndex, setCurrMonthIndex] = useState<number>(0);

  const store: StoreData = {
    data,
    currDay,
    currMonth,
    currDayIndex,
    currMonthIndex,
    setData,
    setCurrDay,
    setCurrMonth,
    setCurrDayIndex,
    setCurrMonthIndex,
  };

  return (
    <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
  );
};
