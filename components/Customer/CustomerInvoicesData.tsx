import useAxiosInstance from "@/lib/hooks/useAxiosInstance";
import { Invoice } from "@/types/types";
import { useSession } from "next-auth/react";
import React, { FC } from "react";
import CurrencyFormat from "react-currency-format";
import toast from "react-hot-toast";
import { AiOutlineLoading } from "react-icons/ai";

interface IProps {
  selectedCustomerID: number | undefined;
  invoices: Invoice[] | null | undefined;
  setInvoices: React.Dispatch<
    React.SetStateAction<Invoice[] | null | undefined>
  >;
  setModalIsOpen: React.Dispatch<boolean>;
  products: any[] | null | undefined;
  resetCustomerState: () => void;
}

const CustomerInvoicesData: FC<IProps> = ({
  invoices,
  products,
  setInvoices,
  setModalIsOpen,
}) => {
  const [amount, setAmount] = React.useState<string>("");

  const { data: session } = useSession();
  const axiosInstance = useAxiosInstance(session);

  const handlePayNow = async () => {
    if (!invoices || !products) return;
    const totalDue = invoices.reduce(
      (acc, cur) => (cur.status === "due" ? acc : acc + cur.due),
      0
    );

    if (amount === "" || parseInt(amount) === 0) {
      toast.error("Amount has to be greater than 0");
      return;
    } else if (parseInt(amount) > totalDue) {
      toast.error("Amount cannot be greater than total due amount");
      return;
    } else {
      let dueInvoices = invoices.filter((invoice) => invoice.status !== "paid");
      // sort invoices by newest at the end
      dueInvoices.sort((a, b) => {
        return (
          new Date(b.paymentDate as string | number).getTime() -
          new Date(a.paymentDate as string | number).getTime()
        );
      });

      dueInvoices.reverse();

      let parsedAmount = parseInt(amount);

      let dueAmount = parsedAmount;
      let changedInvoices: (string | undefined)[] = [];

      // Adjusting the due amount for each invoice
      for (let i = 0; i < dueInvoices.length; i++) {
        if (dueAmount === 0) break;
        if (dueInvoices[i].due > dueAmount) {
          dueInvoices[i].due -= dueAmount;
          dueAmount = 0;
          changedInvoices.push(dueInvoices[i]._id);
        } else {
          dueInvoices[i].status = "paid";
          dueAmount -= dueInvoices[i].due;
          dueInvoices[i].paymentDate = +new Date();
          dueInvoices[i].due = 0;
          changedInvoices.push(dueInvoices[i]._id);
        }
      }

      let updatedInvoices: Invoice[] = [];

      // Sort invoices which are changed
      dueInvoices.forEach(async (invoice) => {
        if (changedInvoices.includes(invoice._id)) {
          updatedInvoices.push(invoice);
        }
      });

      // Request to update the invoices
      updatedInvoices.forEach(async (invoice) => {
        const URL =
          process.env.NEXT_PUBLIC_API_URL + `/invoice/update/${invoice._id}`;

        const { data } = await axiosInstance.put(URL, {
          paymentDate: invoice.paymentDate,
          status: invoice.status,
          due: invoice.due,
        });

        // set the updated invoices to the state
        setInvoices((prev) => {
          if (!prev) return;
          return prev.map((inv) => {
            if (inv._id === invoice._id) {
              return invoice;
            } else {
              return inv;
            }
          });
        });
      });

      toast.success("Invoice updated successfully!");
      setModalIsOpen(false);
      // resetCustomerState();
    }
  };

  const createActivity = async ({}) => {
    // Create new activity
    const URL = process.env.NEXT_PUBLIC_API_URL + `/activity`;

    const { data } = await axiosInstance.post(URL, {
      message: `Payment of to user`,
      tag: "payment",
    });
  };

  return (
    <div className="flex items-center flex-col h-[50rem] md:h-[40rem] w-full p-2 py-14 overflow-y-auto bg-gray-100">
      {!invoices || !products ? (
        <div>
          <AiOutlineLoading className="text-4xl animate-spin" />
        </div>
      ) : (
        <>
          <div className="relative bg-white p-2 rounded-xl overflow-y-auto justify-end w-full">
            <table className="w-full text-sm text-left">
              <thead className="text-sm uppercase bg-gray-100">
                <tr>
                  <th scope="col" className="px-2 md:px-4 py-3">
                    Invoice ID
                  </th>
                  <th scope="col" className="px-2 md:px-4 py-3">
                    Date
                  </th>
                  <th scope="col" className="px-2 md:px-4 py-3">
                    Products
                  </th>
                  <th scope="col" className="px-2 md:px-4 py-3 ">
                    Total
                  </th>
                  <th scope="col" className="px-2 md:px-4 py-3 ">
                    Due
                  </th>
                  <th scope="col" className="px-2 md:px-4 py-3">
                    Payment Date
                  </th>
                </tr>
              </thead>
              <tbody className="">
                {invoices.length > 0 &&
                  invoices.map((invoice) => {
                    return (
                      <tr key={invoice._id} className="bg-white">
                        <td className="px-2 md:px-4 py-4">
                          {invoice.invoiceID}
                        </td>
                        <td className="px-2 md:px-4 py-4 text-md">
                          {new Date(invoice.invoiceDate).toLocaleDateString(
                            "en-US",
                            {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            }
                          )}
                        </td>
                        <td className="px-2 md:px-4 py-4">
                          {products &&
                            invoice.products.map((product) => {
                              let item = products.find(
                                (p: {
                                  _id: string;
                                  quantity: number;
                                  id: string;
                                }) => p?._id === product?.id
                              );

                              if (product.quantity === 0) return null;

                              return (
                                <span key={product._id}>
                                  {/* @ts-ignore */}
                                  {item.name} x {product.quantity}
                                  <br />
                                </span>
                              );
                            })}
                        </td>
                        <td className="px-2 md:px-4 py-4">
                          {
                            <CurrencyFormat
                              value={invoice.total}
                              displayType={"text"}
                              thousandSeparator={true}
                              prefix={"₹"}
                              renderText={(value) => <div>{value}</div>}
                            />
                          }
                        </td>
                        <td className="px-2 md:px-4 py-4">
                          {invoice.status === "paid" ? (
                            <span className="text-green-600">Paid</span>
                          ) : (
                            <CurrencyFormat
                              value={invoice.due}
                              displayType={"text"}
                              thousandSeparator={true}
                              prefix={"₹"}
                              renderText={(value) => <div>{value}</div>}
                            />
                          )}
                        </td>
                        <td className="px-2 md:px-4 py-4">
                          {invoice?.paymentDate ? (
                            new Date(invoice.paymentDate as string | number)
                              .toLocaleString()
                              .split(",")[0]
                          ) : (
                            <span className="text-red-500">Not Paid</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col justify-end w-full px-7 my-10">
            {/* Info */}
            <div className="flex w-full border-2 border-dashed rounded-lg border-gray-300">
              <tr className="font-normal w-1/2  text-gray-900">
                <th
                  scope="row"
                  className="px-2 md:px-4 py-2 text-xl font-semibold"
                >
                  Total :
                </th>
                <td className="px-2 md:px-4 py-2"></td>
                <td className="px-2 md:px-4 py-2">
                  <CurrencyFormat
                    value={invoices.reduce((acc, cur) => acc + cur.total, 0)}
                    displayType={"text"}
                    thousandSeparator={true}
                    prefix={"₹"}
                    renderText={(value) => (
                      <div className="text-lg">{value}</div>
                    )}
                  />
                </td>
              </tr>
              <tr className="font-semibold w-1/2 border-l-2 border-dashed border-gray-300 text-gray-900">
                <th
                  scope="row"
                  className="px-2 md:px-4 py-2 text-xl font-semibold"
                >
                  Due :
                </th>
                <td className="px-2 md:px-4 py-1"></td>
                <td className="px-2 md:px-4 py-1 ">
                  {
                    <CurrencyFormat
                      value={invoices.reduce(
                        (acc, cur) =>
                          cur.status === "paid" ? acc : acc + cur.due,
                        0
                      )}
                      displayType={"text"}
                      thousandSeparator={true}
                      prefix={"₹"}
                      renderText={(value) => (
                        <div className="font-bold text-red-500 text-xl">
                          {value}
                        </div>
                      )}
                    />
                  }
                </td>
              </tr>
            </div>

            {/*
             * Pay Now
             */}
            {invoices.reduce(
              (acc, cur) => (cur.status === "paid" ? acc : acc + cur.due),
              0
            ) !== 0 ? (
              <div className="flex justify-between items-end w-full mt-5">
                <div className="flex flex-col">
                  <label className="font-normal">
                    Enter the amount to pay:
                  </label>
                  <input
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    type="number"
                    className="w-full py-2 px-3 mt-2 rounded-md border-2 font-medium text-lg"
                  />
                </div>
                <button
                  onClick={createActivity}
                  // onClick={handlePayNow}
                  className="bg-green-500 text-white px-6 py-3 rounded-lg ml-2"
                >
                  Pay Now
                </button>
              </div>
            ) : (
              <div className="bg-green-200 p-4 w-full rounded-lg">
                <p className="text-green-800 font-semibold">
                  No pending payments!
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default CustomerInvoicesData;
