import { useAuthUserStore } from "@/store/authUser.store";
import axios from "axios";
import { signOut, useSession } from "next-auth/react";
import { useEffect } from "react";
import toast from "react-hot-toast";

const useAuthUser = () => {
  const { user, setUser } = useAuthUserStore();
  const { data: session } = useSession();

  const getUserDetails = async () => {
    const URL = process.env.NEXT_PUBLIC_API_URL + "/user/admin";
    let refreshToken = session?.user.refreshToken;
    try {
      const { data } = await axios.post(URL, {
        refreshToken,
      });

      if (data.role !== "admin") {
        toast.error("You are not authorized to access this page");
        signOut();
      }

      setUser(data);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    if (session && !user) getUserDetails();
  }, [session, user]);

  return { user };
};

export default useAuthUser;
