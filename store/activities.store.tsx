import { Activity } from "@/types/types";
import React, { createContext, useContext, useState } from "react";

// Define the type for your store data
type StoreData = {
  activities: Activity[] | null | undefined;
  setActivities: React.Dispatch<
    React.SetStateAction<Activity[] | null | undefined>
  >;
};

// Create a context for your store
const StoreContext = createContext<StoreData | undefined>(undefined);

// Create a custom hook to access the store
export const useActivityStore = (): StoreData => {
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
  const [activities, setActivities] = useState<Activity[] | null | undefined>(
    undefined
  );

  const store: StoreData = {
    activities,
    setActivities,
  };

  return (
    <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
  );
};
