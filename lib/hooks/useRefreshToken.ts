import { useEffect, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import axios, { AxiosInstance, AxiosError } from "axios";

const useRefreshTokenRotation = (axiosInstance: AxiosInstance) => {
  const [hasRunned, setHasRunned] = useState(false);
  const { data: session, update } = useSession();

  useEffect(() => {
    if (hasRunned) return;

    const responseInterceptor = axiosInstance.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config;
        // @ts-ignore
        if (error.response?.status === 401 && !originalRequest._retry) {
          // @ts-ignore
          originalRequest._retry = true;
          try {
            console.log("Refreshing token");
            // Send a request to refresh the token
            const { data } = await axios.post(
              process.env.NEXT_PUBLIC_API_URL + "/auth/refresh-token",
              {
                refreshToken: session?.user.refreshToken,
              }
            );
            // Update the session with the new token
            update({
              ...session,
              user: {
                accessToken: data.accessToken,
                refreshToken: data.refreshToken,
              },
            }).then(() => {
              console.log("Token refreshed");
            });
            setHasRunned(true);
            // @ts-ignore
            originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
            // @ts-ignore
            return axiosInstance(originalRequest);
          } catch (signInError) {
            try {
              await axios.delete(
                process.env.NEXT_PUBLIC_API_URL + "/auth/logout",
                {
                  data: {
                    refreshToken: session?.user.refreshToken,
                  },
                }
              );
            } catch (e) {
              console.error("Error while logging out", e);
            }
            signOut();
            throw signInError;
          }
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axiosInstance.interceptors.response.eject(responseInterceptor);
    };
  });
};

export default useRefreshTokenRotation;
