import React, { Dispatch, createContext, useContext, useState } from "react";

interface User {
  role: "admin" | "customer";
  name: string;
  phone: string;
  profilePicture: string;
}

// Define the type for your store data
type StoreData = {
  user: User | null | undefined;
  setUser: Dispatch<React.SetStateAction<User | null | undefined>>;
};

// Create a context for your store
const StoreContext = createContext<StoreData | undefined>(undefined);

// Create a custom hook to access the store
export const useAuthUserStore = (): StoreData => {
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
  const [user, setUser] = useState<User | null | undefined>(undefined);

  const store: StoreData = {
    user,
    setUser,
  };

  return (
    <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
  );
};
