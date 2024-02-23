import axios from "axios";
import { Session } from "next-auth";

const useAxiosInstance = (session: Session | null) => {
  const instance = axios.create({
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session?.user.accessToken}`,
    },
  });

  return instance;
};

export default useAxiosInstance;
