import { useInvoicesStore } from "@/store/invoices.store";
import { Invoice } from "@/types/types";
import { useEffect } from "react";
import { Session } from "next-auth";
import { AxiosInstance } from "axios";

const useInvoice = (axiosInstance: AxiosInstance, session: Session | null) => {
  const { invoices, setInvoices } = useInvoicesStore();
  // Fetch invoices
  const getInvoices = async () => {
    // 3 months ago
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 10);

    const endDate = new Date();

    try {
      const URL =
        process.env.NEXT_PUBLIC_API_URL +
        `/invoice/filter?startDate=${+startDate}&endDate=${+endDate}`;
      const { data } = await axiosInstance.get(URL);
      //   filter invoices by latest at the top
      const filteredInvoices = data.invoices.sort(
        (a: Invoice, b: Invoice) =>
          new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime()
      );

      if (data.invoices) setInvoices(filteredInvoices);
    } catch (error) {
      console.log(error);
    }
  };

  // Fetch customers on page load
  useEffect(() => {
    if (session && invoices === undefined) getInvoices();
  }, [session, invoices]);
};

export default useInvoice;
