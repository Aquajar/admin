import { useAuthUserStore } from "@/store/authUser.store";
import axios from "axios";
import { getCookie, setCookie } from "cookies-next";
import { signOut, useSession } from "next-auth/react";
import { useEffect } from "react";
import toast from "react-hot-toast";
import { decryptData, encryptData } from "../helpers";

const useAuthUser = () => {
  const { user, setUser } = useAuthUserStore();
  const { data: session } = useSession();

  const getUserDetails = async () => {
    const secretKey = process.env.NEXT_PUBLIC_ENCRYPTED_TOKEN_SECRET!;

    const URL = process.env.NEXT_PUBLIC_API_URL + "/user/admin";
    let refreshToken = session?.user.refreshToken;

    let encryptedData = getCookie("_u");

    if (encryptedData) {
      const decryptedData = decryptData(encryptedData, secretKey);
      setUser(JSON.parse(decryptedData));
    } else {
      try {
        const { data } = await axios.post(URL, {
          refreshToken,
        });

        if (data.role !== "admin") {
          toast.error("You are not authorized to access this page");
          signOut();
        }

        const encryptedData = encryptData(JSON.stringify(data), secretKey);

        setCookie("_u", encryptedData, {
          maxAge: 30,
        });

        setUser(data);
      } catch (error) {
        console.log(error);
      }
    }
  };

  useEffect(() => {
    if (session && !user) getUserDetails();
  }, [session, user]);

  return { user };
};

export default useAuthUser;
