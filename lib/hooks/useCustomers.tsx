import { useCustomersStore } from "@/store/customers.store";
import { AxiosInstance } from "axios";
import { Session } from "next-auth";
import { useEffect } from "react";

const useCustomers = (
  axiosInstance: AxiosInstance,
  session: Session | null
) => {
  const { customers, setCustomers } = useCustomersStore();

  // Fetch customers
  const getCustomers = async () => {
    try {
      const { data } = await axiosInstance.get(
        process.env.NEXT_PUBLIC_API_URL + "/user/all"
      );
      if (data?.users.length === 0) return setCustomers(null);
      setCustomers(data?.users);
    } catch (error) {
      setCustomers(null);
      console.log(error);
    }
  };

  // Fetch customers on page load
  useEffect(() => {
    if (session && customers === undefined) getCustomers();
  }, [session, customers]);
};


export default useCustomers;