import Wrapper from "@/components/Wrapper";
import useRefreshTokenRotation from "@/lib/hooks/useRefreshToken";
import { useCustomersStore } from "@/store/customers.store";
import { useInvoicesStore } from "@/store/invoices.store";
import { Invoice } from "@/types/types";
import axios from "axios";
import { useSession } from "next-auth/react";
import React, { useEffect } from "react";
import Modal from "react-modal";

Modal.setAppElement("#__next");

const Invoices = () => {
  const { data: session } = useSession();
  const { invoices, setInvoices } = useInvoicesStore();
  const { customers, setCustomers } = useCustomersStore();
  const [selectedInvoice, setSelectedInvoice] = React.useState<Invoice | null>(
    null
  );

  // Create axios instance
  const axiosInstance = axios.create({
    headers: {
      Authorization: `Bearer ${session?.user.accessToken}`,
    },
  });

  useRefreshTokenRotation(axiosInstance);

  const getInvoices = async () => {
    // 3 months ago
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 3);

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

  const [modalIsOpen, setIsOpen] = React.useState(false);

  function openModal() {
    setIsOpen(true);
  }

  function formatDate(dateString: string) {
    // Parse the date string
    var date = new Date(dateString);

    // Extract day, month, and year components
    var day = date.getDate();
    var month = date.getMonth() + 1; // Months are zero-based, so add 1
    var year = date.getFullYear();

    // Format the date as "DD/MM/YYYY"
    var formattedDate =
      (day < 10 ? "0" : "") +
      day +
      "/" +
      (month < 10 ? "0" : "") +
      month +
      "/" +
      year;

    return formattedDate;
  }

  function afterOpenModal() {
    // references are now sync'd and can be accessed.
  }

  function closeModal() {
    setIsOpen(false);
  }

  // Fetch customers on page load
  useEffect(() => {
    if (session && invoices === undefined) getInvoices();
  }, [session, invoices]);

  return (
    <Wrapper name="Invoices">
      {/*
       * MODAL
       */}
      <Modal
        isOpen={modalIsOpen}
        onAfterOpen={afterOpenModal}
        onRequestClose={closeModal}
        contentLabel="Example Modal"
        style={{
          overlay: {
            backgroundColor: "rgba(0, 0, 0, 0.5)",
          },
          content: {
            top: "50%",
            left: "50%",
            right: "auto",
            bottom: "auto",
            marginRight: "-50%",
            padding: "2rem",
            transform: "translate(-50%, -50%)",
            backgroundColor: "white",
            borderRadius: "0.5rem",
            border: "1px solid #ccc",
          },
        }}
      >
        <div className="flex flex-col">
          <h1 className="text-2xl font-bold mb-4">Edit Invoice</h1>
          <form className="grid grid-cols-2 gap-5 items-center justify-center">
            <div className="flex flex-col">
              <label htmlFor="invoiceDate" className="text-sm font-medium">
                Invoice Date
              </label>
              <input
                type="text"
                id="invoiceDate"
                name="invoiceDate"
                disabled
                value={formatDate(selectedInvoice?.invoiceDate as any)}
                className="mt-1 p-2 border border-gray-300 rounded-md"
              />
            </div>
            <div className="flex flex-col">
              <label htmlFor="total" className="text-sm font-medium">
                Total
              </label>
              <input
                disabled
                type="text"
                id="total"
                name="total"
                value={selectedInvoice?.total}
                className="mt-1 p-2 border border-gray-300 rounded-md"
              />
            </div>
            <div className="flex flex-col">
              <label htmlFor="invoiceDate" className="text-sm font-medium">
                Payment Date
              </label>
              <input
                type={selectedInvoice?.status === "paid" ? "text" : "date"}
                value={formatDate(selectedInvoice?.paymentDate as any)}
                id="paymentDate"
                name="paymentDate"
                className="mt-1 p-2 border border-gray-300 rounded-md"
              />
            </div>

            <div className="flex flex-col justify-end h-full">
              <button
                type="submit"
                className="bg-blue-600 text-white py-3 rounded-md"
              >
                Update
              </button>
            </div>
          </form>
        </div>
      </Modal>
      <div className="relative overflow-x-auto shadow-md sm:rounded-lg">
        <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
            <tr className="">
              <th scope="col" className="p-4">
                <div className="flex items-center">
                  <input
                    id="checkbox-all-search"
                    type="checkbox"
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 dark:focus:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                  />
                  <label htmlFor="checkbox-all-search" className="sr-only">
                    checkbox
                  </label>
                </div>
              </th>
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
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {invoices &&
              invoices.map((invoice: Invoice) => {
                return (
                  <tr
                    key={invoice.invoiceID}
                    className="bg-white  border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                  >
                    <td className="w-4 p-4">
                      <div className="flex items-center">
                        <input
                          id="checkbox-table-search-1"
                          type="checkbox"
                          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 dark:focus:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                        />
                        <label
                          htmlFor="checkbox-table-search-1"
                          className="sr-only"
                        >
                          checkbox
                        </label>
                      </div>
                    </td>
                    <th
                      scope="row"
                      className="px-6 py-4 font-medium whitespace-nowrap dark:text-white"
                    >
                      {invoice.invoiceID}
                    </th>
                    <td className="px-6 py-4 text-gray-900">
                      {
                        customers?.find(
                          (customer) => customer._id === invoice.customerID
                        )?.name
                      }
                    </td>
                    <td className="px-6 py-4 text-gray-900">
                      {new Date(invoice.invoiceDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">{invoice.total}</td>
                    <td className="px-6 py-4">{invoice.status}</td>
                    <td className="px-6 py-4 text-md text-gray-900">
                      {invoice.due}
                    </td>
                    <td className="flex items-center px-6 py-4">
                      <button
                        onClick={() => {
                          openModal();
                          setSelectedInvoice(invoice);
                        }}
                        className="font-medium text-blue-600 dark:text-blue-500 hover:underline"
                      >
                        Edit
                      </button>
                      <a
                        href="#"
                        className="font-medium text-red-600 dark:text-red-500 hover:underline ms-3"
                      >
                        Remove
                      </a>
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

export default Invoices;
