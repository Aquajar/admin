import axios from "axios";
import { Session } from "next-auth";
import { useMemo } from "react";
import useRefreshTokenRotation from "./useRefreshToken";

// API client with the signed-in admin's token. Every instance gets the shared token
// handling (waits for the session on early requests, refreshes on 401), so pages
// don't have to remember to add it.
const useAxiosInstance = (session: Session | null) => {
  const token = session?.user.accessToken;
  const instance = useMemo(
    () =>
      axios.create({
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }),
    [token]
  );
  useRefreshTokenRotation(instance);
  return instance;
};

export default useAxiosInstance;
