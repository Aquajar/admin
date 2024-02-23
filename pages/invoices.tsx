import Wrapper from "@/components/Wrapper";
import useAxiosInstance from "@/lib/hooks/useAxiosInstance";
import useInvoice from "@/lib/hooks/useInvoice";
import useRefreshTokenRotation from "@/lib/hooks/useRefreshToken";
import { useCustomersStore } from "@/store/customers.store";
import { useInvoicesStore } from "@/store/invoices.store";
import { Invoice } from "@/types/types";
import axios from "axios";
import { useSession } from "next-auth/react";
import React, { useEffect } from "react";
import CurrencyFormat from "react-currency-format";
import toast from "react-hot-toast";
import Modal from "react-modal";

Modal.setAppElement("#__next");

const customModalStyles = {
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
};

const Invoices = () => {
  const { data: session } = useSession();
  const { invoices, setInvoices } = useInvoicesStore();
  const { customers } = useCustomersStore();
  const [selectedInvoice, setSelectedInvoice] = React.useState<Invoice | null>(
    null
  );
  const [modalIsOpen, setIsOpen] = React.useState(false);
  const [deleteModalIsOpen, setDeleteModalIsOpen] = React.useState(false);

  // Create axios instance
  const axiosInstance = useAxiosInstance(session);

  // Hooks
  useRefreshTokenRotation(axiosInstance);
  useInvoice(axiosInstance, session);

  // Fetch invoices
  const refreshInvoice = async () => {
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

      toast.dismiss();
      if (data.invoices) setInvoices(filteredInvoices);
    } catch (error) {
      console.log(error);
    }
  };

  // Mark invoice as paid
  const markAsPaid = async (invoice: Invoice) => {
    try {
      const URL =
        process.env.NEXT_PUBLIC_API_URL + `/invoice/update/${invoice._id}`;
      const { data } = await axiosInstance.put(URL, {
        paymentDate: new Date(),
        status: "paid",
        due: 0,
      });
      setInvoices((invoices) => {
        if (!invoices) return [];
        const index = invoices.findIndex(
          (inv) => inv.invoiceID === invoice.invoiceID
        );
        const updatedInvoices = [...invoices];
        updatedInvoices[index] = data.invoice;
        return updatedInvoices;
      });
      closeModal();
    } catch (error) {
      console.log(error);
    }
  };

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
      closeDeleteModal();
    } catch (error) {
      console.log(error);
    }
  };

  // Parse date string to "DD/MM/YYYY"
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

  function openModal() {
    setIsOpen(true);
  }

  function openDeleteModal() {
    setDeleteModalIsOpen(true);
  }

  function closeModal() {
    setIsOpen(false);
  }

  function closeDeleteModal() {
    setDeleteModalIsOpen(false);
  }

  return (
    <Wrapper name="Invoices">
      {/*
       * EDIT MODAL
       */}
      <Modal
        isOpen={modalIsOpen}
        onRequestClose={closeModal}
        contentLabel="Edit Invoice Modal"
        style={customModalStyles}
      >
        <div className="flex flex-col">
          <h1 className="text-2xl font-bold mb-4">Edit Invoice</h1>
          <div className="grid grid-cols-2 gap-5 items-center justify-center">
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
                Due
              </label>
              <CurrencyFormat
                value={selectedInvoice?.due}
                displayType={"input"}
                disabled
                thousandSeparator={true}
                prefix={"₹"}
                className="mt-1 p-2 border border-gray-300 rounded-md"
              />
            </div>
            <div className="flex flex-col">
              <label htmlFor="invoiceDate" className="text-sm font-medium">
                Payment Date
              </label>
              <input
                type={"text"}
                // @ts-ignore
                value={
                  selectedInvoice?.status === "paid"
                    ? formatDate(selectedInvoice?.paymentDate as any)
                    : "Unpaid"
                }
                disabled
                id="paymentDate"
                name="paymentDate"
                className="mt-1 p-2 border border-gray-300 rounded-md"
              />
            </div>

            <div className="flex flex-col justify-end h-full">
              <button
                disabled={selectedInvoice?.status === "paid"}
                onClick={() => markAsPaid(selectedInvoice as Invoice)}
                type="submit"
                className="bg-blue-600 text-white py-3 rounded-md disabled:bg-gray-300"
              >
                Mark as Paid
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/*
       * DELETE MODAL
       */}
      <Modal
        style={customModalStyles}
        isOpen={deleteModalIsOpen}
        onRequestClose={closeDeleteModal}
        contentLabel="Delete Invoice Modal"
      >
        <div className="flex flex-col">
          <h1 className="text-xl font-semibold mb-4">
            Do you want to delete this record?
          </h1>
          <div className="grid grid-cols-2 w-full justify-around mt-4">
            <button
              className="bg-red-600 text-white py-3 rounded-md"
              onClick={() => removeInvoice(selectedInvoice as Invoice)}
            >
              Delete
            </button>
            <button
              onClick={closeDeleteModal}
              className="bg-gray-300 text-gray-900 py-3 rounded-md ms-3"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>
      {/*
       * REFRESH BUTTON
       */}
      <button
        onClick={() => {
          toast.loading("Refreshing...");
          refreshInvoice();
        }}
        className="absolute right-10 bg-white px-3 shadow-sm py-1 rounded-md text-gray-900"
      >
        refresh
      </button>

      <div className="relative overflow-x-auto shadow-md sm:rounded-lg">
        <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
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
                      {new Date(invoice.invoiceDate).toLocaleDateString()}
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
                      <button
                        onClick={() => {
                          openDeleteModal();
                          setSelectedInvoice(invoice);
                        }}
                        className="font-medium text-red-600 dark:text-red-500 hover:underline ms-3"
                      >
                        Remove
                      </button>
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
