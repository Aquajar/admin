import { useEffect, useRef } from "react";
import { signOut, useSession } from "next-auth/react";
import axios, { AxiosInstance, AxiosError } from "axios";

type Tokens = { accessToken: string; refreshToken: string };

// One refresh at a time for the whole tab. The API rotates the refresh token on
// every refresh, so several 401s at once (a page loading many lists) must share a
// single refresh; a second concurrent one would fail and sign the admin out.
let inFlight: Promise<Tokens> | null = null;
// Newest refresh token, used until the next-auth session catches up.
let latestRefreshToken: string | null = null;
// Each axios instance gets the interceptor once and keeps it, so a request still in
// flight when the page re-renders is covered.
const wired = new WeakSet<AxiosInstance>();

const useRefreshTokenRotation = (axiosInstance: AxiosInstance) => {
  const { data: session, update } = useSession();
  const sessionRef = useRef(session);
  sessionRef.current = session;
  const updateRef = useRef(update);
  updateRef.current = update;

  useEffect(() => {
    if (wired.has(axiosInstance)) return;
    wired.add(axiosInstance);

    axiosInstance.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as (typeof error.config & { _retry?: boolean }) | undefined;
        if (error.response?.status !== 401 || !originalRequest || originalRequest._retry) {
          return Promise.reject(error);
        }
        originalRequest._retry = true;
        try {
          if (!inFlight) {
            const refreshToken = latestRefreshToken || sessionRef.current?.user.refreshToken;
            inFlight = axios
              .post(process.env.NEXT_PUBLIC_API_URL + "/auth/refresh-token", { refreshToken })
              .then(({ data }) => {
                latestRefreshToken = data.refreshToken;
                // Update the session with the new token
                updateRef.current({
                  ...sessionRef.current,
                  user: { accessToken: data.accessToken, refreshToken: data.refreshToken },
                });
                return data as Tokens;
              })
              .finally(() => {
                inFlight = null;
              });
          }
          const { accessToken } = await inFlight;
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return axiosInstance(originalRequest);
        } catch (signInError) {
          try {
            await axios.delete(process.env.NEXT_PUBLIC_API_URL + "/auth/logout", {
              data: { refreshToken: latestRefreshToken || sessionRef.current?.user.refreshToken },
            });
          } catch (e) {
            console.error("Error while logging out", e);
          }
          signOut();
          throw signInError;
        }
      }
    );
  }, [axiosInstance]);
};

export default useRefreshTokenRotation;
