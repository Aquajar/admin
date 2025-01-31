import { Accordion, AccordionItem } from "@/components/Accordion";
import Activities from "@/components/Customer/Activities";
import Profile from "@/components/Customer/Profile";
import Statistics from "@/components/Customer/Statistics";
import Wrapper from "@/components/Wrapper";
import useAxiosInstance from "@/lib/hooks/useAxiosInstance";
import { copyTextToKeyboard } from "@/lib/utils";
import { Activity, Customer, Invoice, Product } from "@/types/types";
import { table } from "console";
import { getCookie, setCookie } from "cookies-next";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/router";
import React, { FC, useEffect, useState } from "react";
import CurrencyFormat from "react-currency-format";
import toast from "react-hot-toast";
import { AiOutlineLoading } from "react-icons/ai";

interface MonthlyData {
  totalAmount: number;
  dueAmount: number;
}

interface YearlyData {
  [month: string]: MonthlyData;
}

interface MonthwiseSummaries {
  [year: string]: YearlyData;
}
const BreadCrumb = [
  {
    name: "Customers",
    href: "/customers",
  },
  {
    name: "Profile",
    href: "/customers",
  },
];

const monthsInAnYear = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const tabs: { label: string; tabID: string }[] = [
  {
    label: "Profile",
    tabID: "profile",
  },
  {
    label: "Invoices",
    tabID: "invoices",
  },
  {
    label: "Monthwise Summary",
    tabID: "monthwise_summary",
  },
  {
    label: "Activities",
    tabID: "activities",
  },
  {
    label: "Statistics",
    tabID: "statistics",
  },
];

const CustomerInvoicesData = () => {
  const [amount, setAmount] = useState<string>("");
  const [invoices, setInvoices] = useState<Invoice[] | null | undefined>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [monthwiseSummaries, setMonthwiseSummaries] = useState<
    MonthwiseSummaries[]
  >([]);
  const [stats, setStats] = useState<{
    assets: {
      jars: string;
      dispenser: string;
      stand: string;
    };
  } | null>(null);
  const [activities, setActivities] = useState<Activity[] | null>(null);
  const [products, setProducts] = useState<Product[] | undefined>(undefined);
  const router = useRouter();

  const [selectedCustomerID, setSelectedCustomerID] = useState<
    string | undefined | string[]
  >(undefined);

  // Fetch products
  useEffect(() => {
    if (!products) {
      // Fetch products from cookies
      const cookieProducts = getCookie("products");
      if (cookieProducts) {
        setProducts(JSON.parse(cookieProducts));
      } else {
        // Fetch products
        const URL = process.env.NEXT_PUBLIC_API_URL + "/product/all";

        axiosInstance.get(URL).then((res) => {
          const products = res.data.products;
          setProducts(products);
          setCookie("products", JSON.stringify(products), {
            maxAge: 60 * 60 * 24 * 7,
          });
        });
      }
    }
  }, [products]);

  // Set Customer ID
  useEffect(() => {
    if (selectedCustomerID === undefined) {
      setSelectedCustomerID(router.query.id);
    }
  }, [router, selectedCustomerID]);

  const { data: session } = useSession();
  const axiosInstance = useAxiosInstance(session);

  // Get the invoice for the user
  const handleFetchInvoice = async () => {
    const url =
      process.env.NEXT_PUBLIC_API_URL +
      "/user/invoices?id=" +
      selectedCustomerID;
    const { data } = await axiosInstance.get(url);
    console.log(data);
    setInvoices(data.invoices);
    setCustomer(data.customer);
    setActivities(data.activities);
    setMonthwiseSummaries(data.monthwiseSummary);
    setStats(data.statistics);
  };

  useEffect(() => {
    if (session && selectedCustomerID) {
      handleFetchInvoice();
    }
  }, [selectedCustomerID, session]);

  // Handle the payment to due invoices
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

        setAmount("0");
      });

      // Create new activity
      const URL = process.env.NEXT_PUBLIC_API_URL + `/activity`;

      const payload = {
        message: `Payment of ₹${amount} added to ${
          selectedCustomerID || dueInvoices[0].customerID
        }`,
        tag: "payment",
      };
      await axiosInstance.post(URL, payload, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      toast.success("Invoice updated successfully!");
    }
  };

  return (
    <Wrapper breadcrumb={BreadCrumb}>
      <div className="flex flex-col w-full">
        {/*
         * Tabs
         */}
        <div className="border-b border-gray-200 mb-9 flex items-center justify-between">
          <ul className="flex flex-wrap -mb-px font-medium text-center text-gray-500">
            {tabs.map((tab) => (
              <li key={tab.tabID} className="me-2">
                <Link
                  href={
                    "/customers/" + selectedCustomerID + "?tab=" + tab.tabID
                  }
                  className={`inline-flex cursor-pointer items-center justify-center p-4 ${
                    tab.tabID === router.query.tab
                      ? "text-blue-600  border-blue-600 active"
                      : " border-transparent hover:text-gray-600 hover:border-gray-300"
                  } border-b-2 rounded-t-lg group`}
                >
                  {tab.label}
                </Link>
              </li>
            ))}
          </ul>
          <span className="mr-5 font-medium text-gray-500">
            Customer ID :{" "}
            <span className="font-bold text-black">{selectedCustomerID}</span>
          </span>
        </div>

        {!invoices || !products ? (
          <div className="w-full flex items-center">
            <AiOutlineLoading className="text-4xl animate-spin" />
          </div>
        ) : (
          <>
            {router.query.tab === "invoices" && (
              <>
                <div
                  className={`flex items-center flex-col  w-full h-[32rem] ${
                    invoices.length > 3 ? "md:h-[22rem]" : "md:h-[15rem]"
                  }  overflow-y-auto`}
                >
                  <div className="relative bg-white border border-gray-400 overflow-y-auto justify-end w-full">
                    <table className="w-full text-sm text-center">
                      <thead className="text-sm uppercase border-b border-gray-400 bg-gray-100 sticky top-0">
                        <tr className="">
                          <th
                            scope="col"
                            className="px-2 md:px-4 py-3 border-r border-gray-400"
                          >
                            Invoice ID
                          </th>
                          <th
                            scope="col"
                            className="px-10 md:px-4 py-3 border-x border-gray-400"
                          >
                            Date
                          </th>
                          <th
                            scope="col"
                            className="px-2 md:px-4 py-3 border-x border-gray-400"
                          >
                            Products
                          </th>
                          <th
                            scope="col"
                            className="px-2 md:px-4 py-3 border-x border-gray-400"
                          >
                            Total
                          </th>
                          <th
                            scope="col"
                            className="px-2 md:px-4 py-3 border-x border-gray-400"
                          >
                            Due
                          </th>
                          <th
                            scope="col"
                            className="px-2 md:px-4 py-3 border-l border-gray-400"
                          >
                            Payment Date
                          </th>
                        </tr>
                      </thead>
                      <tbody className="">
                        {invoices.length > 0 &&
                          invoices.map((invoice) => {
                            return (
                              <tr
                                key={invoice._id}
                                className={`${
                                  invoice.status === "paid"
                                    ? "bg-green-50"
                                    : "odd:bg-white even:bg-gray-50"
                                }`}
                              >
                                <td
                                  className="px-2 md:px-4 py-4 border-r border-gray-400"
                                  onClick={(e) =>
                                    copyTextToKeyboard(invoice.invoiceID)
                                  }
                                >
                                  {invoice.invoiceID}
                                </td>
                                <td className="px-2 md:px-4 py-4 text-md border-x border-gray-400">
                                  {new Date(
                                    invoice.invoiceDate!
                                  ).toLocaleDateString("en-US", {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                  })}
                                </td>
                                <td className="px-2 md:px-4 py-4 border-x border-gray-400">
                                  {products &&
                                    invoice.products.map((product) => {
                                      let item = products.find(
                                        // @ts-ignore
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
                                <td className="px-2 md:px-4 py-4 border-x border-gray-400">
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
                                <td className="px-2 md:px-4 py-4 border-x border-gray-400">
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
                                <td className="px-2 md:px-4 py-4 border-l border-gray-400">
                                  {invoice?.paymentDate ? (
                                    new Date(
                                      invoice.paymentDate as string | number
                                    )
                                      .toLocaleString()
                                      .split(",")[0]
                                  ) : (
                                    <span className="text-red-500">
                                      Not Paid
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="flex flex-col justify-end w-full my-12">
                  {/* Figure Summary */}
                  <div className="relative overflow-x-auto">
                    <table className="w-full text-left border border-gray-400">
                      <thead className="text-black uppercase bg-gray-100 border-b border-gray-400">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-sm">
                            Customer Lifetime Revenue (CLR)
                          </th>
                          <th scope="col" className="px-6 py-3 text-sm">
                            Total Due
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="bg-white">
                          <td className="px-6 py-4">
                            <CurrencyFormat
                              value={invoices.reduce(
                                (acc, cur) => acc + cur.total,
                                0
                              )}
                              displayType={"text"}
                              thousandSeparator={true}
                              prefix={"₹"}
                              renderText={(value) => (
                                <div className="text-xl font-medium">
                                  {value}
                                </div>
                              )}
                            />
                          </td>
                          <td className="px-6 py-4">
                            <CurrencyFormat
                              value={invoices?.reduce(
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
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/*
                   * Pay Now
                   */}
                  {invoices.reduce(
                    (acc, cur) => (cur.status === "paid" ? acc : acc + cur.due),
                    0
                  ) !== 0 && (
                    <div className="flex justify-between md:justify-end items-end w-full mt-5">
                      <div className="flex flex-col">
                        <label className="font-bold underline">
                          Enter the amount to pay :
                        </label>
                        <input
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          type="number"
                          className="w-full py-2 px-3 mt-2 rounded-md border-2 font-medium text-lg"
                        />
                      </div>
                      <button
                        onClick={handlePayNow}
                        className="bg-green-500 text-white px-6 py-3 rounded-lg ml-2"
                      >
                        Pay Now
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}

            {router.query.tab === "monthwise_summary" && (
              <>
                {/*
                 * Monthwise Summary
                 */}
                <div className="">
                  {monthwiseSummaries && (
                    <Accordion>
                      {Object.entries(monthwiseSummaries).map(
                        ([year, months], yearIndex) => (
                          <AccordionItem key={year} header={`Year: ${year}`}>
                            <div className="relative overflow-x-auto">
                              <table className="w-full text-sm text-left text-gray-900">
                                <thead className=" text-gray-700 uppercase bg-gray-100">
                                  <tr>
                                    <th
                                      scope="col"
                                      className="px-6 py-3 rounded-s-lg"
                                    >
                                      Month
                                    </th>
                                    <th scope="col" className="px-6 py-3">
                                      Total
                                    </th>
                                    <th
                                      scope="col"
                                      className="px-6 py-3 rounded-e-lg"
                                    >
                                      Due
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {Object.entries(months).map(
                                    ([month, monthData], monthIndex) => (
                                      <tr
                                        key={monthIndex}
                                        className="border-t border-gray-300"
                                      >
                                        <th
                                          scope="row"
                                          className="px-6 py-4 font-semibold text-gray-900 whitespace-nowrap"
                                        >
                                          {monthsInAnYear[parseInt(month) - 1]}
                                        </th>
                                        {Object.keys(monthData).map((key) => (
                                          <td
                                            className="px-6 py-4  border-x border-gray-300"
                                            key={key}
                                          >
                                            <CurrencyFormat
                                              // @ts-ignore
                                              value={monthData[key] || "0"}
                                              displayType={"text"}
                                              thousandSeparator={true}
                                              prefix={"₹"}
                                              renderText={(value) => (
                                                <div className="text-sm">
                                                  {value}
                                                </div>
                                              )}
                                            />
                                          </td>
                                        ))}
                                      </tr>
                                    )
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </AccordionItem>
                        )
                      )}
                    </Accordion>
                  )}
                </div>
              </>
            )}

            {router.query.tab === "profile" ? (
              <Profile
                setCustomer={setCustomer}
                customer={customer}
                axiosInstance={axiosInstance}
              />
            ) : (
              ""
            )}

            {router.query.tab === "activities" ? (
              <Activities activities={activities} />
            ) : (
              " "
            )}

            {router.query.tab === "statistics" ? (
              <Statistics assets={stats?.assets} />
            ) : (
              " "
            )}
          </>
        )}
      </div>
    </Wrapper>
  );
};

export default CustomerInvoicesData;
