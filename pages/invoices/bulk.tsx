import Wrapper from "@/components/Wrapper";
import useAxiosInstance from "@/lib/hooks/useAxiosInstance";
import useCustomers from "@/lib/hooks/useCustomers";
import useInvoice from "@/lib/hooks/useInvoice";
import useRefreshTokenRotation from "@/lib/hooks/useRefreshToken";
import { useCustomersStore } from "@/store/customers.store";
import { useInvoicesStore } from "@/store/invoices.store";
import { Invoice } from "@/types/types";
import { useSession } from "next-auth/react";
import React, { useState } from "react";

const Bulk = () => {
  const { data: session } = useSession();
  const { invoices, setInvoices } = useInvoicesStore();
  const { customers } = useCustomersStore();

  // Create axios instance
  const axiosInstance = useAxiosInstance(session);

  // Hooks
  useRefreshTokenRotation(axiosInstance);
  useInvoice(axiosInstance, session);
  useCustomers(axiosInstance, session);

  // Remove invoice
  const removeInvoice = async (invoice: Invoice) => {
    try {
      const URL =
        process.env.NEXT_PUBLIC_API_URL + `/invoice/delete/${invoice._id}`;
      await axiosInstance.delete(URL);
      setInvoices((invoices) => {
        if (!invoices) return [];
        return invoices.filter((inv) => inv.invoiceID !== invoice.invoiceID);
      });
      //   closeDeleteModal();
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <Wrapper>
      {/*
       * TABLE
       */}
      <div className="relative overflow-x-auto shadow-md sm:rounded-lg mt-5 md:mt-2">
        <table className="w-full text-sm text-left text-gray-500 ">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50">
            <tr className="">
              <th scope="col" className="px-6 py-3">
                Invoice ID
              </th>
              <th scope="col" className="px-6 py-3">
                Customer Name
              </th>
              <th scope="col" className="px-6 py-3">
                Invoice Date
              </th>
              <th scope="col" className="px-6 py-3">
                Total Amount
              </th>
              <th scope="col" className="px-6 py-3">
                Status
              </th>
              <th scope="col" className="px-6 py-3">
                Due Amount
              </th>
              <th scope="col" className="px-6 py-3">
                Payment Date
              </th>
              <th scope="col" className="px-6 py-3">
                Total Jar
              </th>
            </tr>
          </thead>
          <tbody>
            {invoices &&
              invoices
                .filter(
                  (invoice) =>
                    invoice.isBulkOrder === true ||
                    invoice.products.filter(
                      (product) =>
                        product.id === "65c1271bd78bb1922f9b1a63" &&
                        product.quantity >= 8
                    ).length > 0
                )
                .map((invoice: Invoice) => {
                  return (
                    <tr
                      key={invoice.invoiceID}
                      className="bg-white  border-b  hover:bg-gray-50"
                    >
                      <th scope="row" className="px-6 py-4 font-normal">
                        {invoice.invoiceID}
                      </th>
                      <td className="px-6 py-4 text-gray-900 font-medium">
                        {
                          customers?.find(
                            (customer) => customer._id === invoice.customerID
                          )?.name
                        }
                      </td>
                      <td className="px-6 py-4 ">
                        {new Date(invoice.invoiceDate!).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-gray-900 font-medium">
                        {invoice.total}
                      </td>
                      <td className="px-6 py-4">{invoice.status}</td>
                      <td className="px-6 py-4 text-md text-gray-900 font-medium">
                        {invoice.due === 0
                          ? "---"
                          : invoice.due === undefined
                          ? "---"
                          : invoice.due}
                      </td>
                      <td className="px-6 py-4">
                        {invoice.paymentDate
                          ? new Date(invoice.paymentDate).toLocaleDateString()
                          : "---"}
                      </td>
                      <td className="flex items-center text-gray-900 px-6 py-4">
                        {invoice.products.reduce(
                          (acc, product) => acc + product.quantity,

                          0
                        )}
                      </td>
                    </tr>
                  );
                })}
          </tbody>
        </table>
      </div>
    </Wrapper>
  );
};

export default Bulk;
