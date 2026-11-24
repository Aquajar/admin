import { useRef } from "react";
import { getSession, signOut, useSession } from "next-auth/react";
import axios, { AxiosInstance, AxiosError } from "axios";

type Tokens = { accessToken: string; refreshToken: string };

// One refresh at a time for the whole tab. The API rotates the refresh token on
// every refresh, so several 401s at once (a page loading many lists) must share a
// single refresh; a second concurrent one would fail.
let inFlight: Promise<Tokens> | null = null;
// Newest token pair from a refresh, used until the next-auth session catches up.
let latest: Tokens | null = null;
// Each axios instance gets the interceptors once and keeps them, so a request still
// in flight when the page re-renders is covered.
const wired = new WeakSet<AxiosInstance>();

const tokensNow = async (): Promise<Partial<Tokens>> => {
  if (latest) return latest;
  const s = await getSession();
  return { accessToken: s?.user.accessToken, refreshToken: s?.user.refreshToken };
};

const useRefreshTokenRotation = (axiosInstance: AxiosInstance) => {
  const { data: session, update } = useSession();
  const sessionRef = useRef(session);
  sessionRef.current = session;
  const updateRef = useRef(update);
  updateRef.current = update;

  // Wired during render, not in an effect: child components run their effects first and
  // may send requests with this instance before a parent's effect would have attached it.
  if (!wired.has(axiosInstance)) {
    wired.add(axiosInstance);

    // Pages often fire requests on mount, before useSession has loaded, so the instance
    // was built with "Bearer undefined". Send the real token instead, waiting for the
    // session if needed; after a refresh, always send the newest one.
    axiosInstance.interceptors.request.use(async (config) => {
      const auth = String(config.headers.Authorization || "");
      if (latest || !auth || auth === "Bearer undefined") {
        const { accessToken } = await tokensNow();
        if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
      }
      return config;
    });

    axiosInstance.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as (typeof error.config & { _retry?: boolean }) | undefined;
        if (error.response?.status !== 401 || !originalRequest || originalRequest._retry) {
          return Promise.reject(error);
        }
        originalRequest._retry = true;

        const used = await tokensNow();
        // Not signed in (or the session is gone): nothing to refresh, and no reason to sign out.
        if (!used.refreshToken) return Promise.reject(error);

        try {
          inFlight ??= axios
            .post(process.env.NEXT_PUBLIC_API_URL + "/auth/refresh-token", { refreshToken: used.refreshToken })
            .then(({ data }) => {
              latest = { accessToken: data.accessToken, refreshToken: data.refreshToken };
              updateRef.current({ ...sessionRef.current, user: latest });
              return latest;
            })
            .finally(() => {
              inFlight = null;
            });
          const { accessToken } = await inFlight;
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return axiosInstance(originalRequest);
        } catch (refreshError) {
          const status = (refreshError as AxiosError).response?.status;
          // Network or server trouble says nothing about the login: keep the session.
          if (status !== 400 && status !== 401) return Promise.reject(error);

          // Another tab may have rotated the token first; the shared session cookie has its pair.
          const s = await getSession();
          if (s?.user.refreshToken && s.user.refreshToken !== used.refreshToken) {
            latest = { accessToken: s.user.accessToken, refreshToken: s.user.refreshToken };
            originalRequest.headers.Authorization = `Bearer ${latest.accessToken}`;
            return axiosInstance(originalRequest);
          }
          // The refresh token really is dead (expired, or replaced by a login elsewhere). No server
          // logout call: the API would reject this dead token anyway, so it could only add noise.
          latest = null;
          signOut();
          return Promise.reject(error);
        }
      }
    );
  }
};

export default useRefreshTokenRotation;
