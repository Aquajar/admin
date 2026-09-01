import { Accordion, AccordionItem } from "@/components/Accordion";
import Activities from "@/components/Customer/Activities";
import Profile from "@/components/Customer/Profile";
import GenerateBillDialog from "@/components/Customer/GenerateBillDialog";
import WaterCardDialog from "@/components/Customer/WaterCardDialog";
import Statistics from "@/components/Customer/Statistics";
import { Button } from "@/components/ui/button";
import Wrapper from "@/components/Wrapper";
import useAxiosInstance from "@/lib/hooks/useAxiosInstance";
import { copyTextToKeyboard } from "@/lib/utils";
import { Activity, Customer, Invoice, Product } from "@/types/types";
import { getCookie, setCookie } from "cookies-next";
import { SquarePen, Trash2 } from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import CurrencyFormat from "react-currency-format";
import toast from "react-hot-toast";
import { AiOutlineLoading } from "react-icons/ai";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

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

interface CustomerSummary {
  clr: number;
  totalDue: number;
}

const INVOICE_PAGE_SIZE = 20;
const ACTIVITY_PAGE_SIZE = 20;

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
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [summary, setSummary] = useState<CustomerSummary | null>(null);
  const [monthwiseSummaries, setMonthwiseSummaries] = useState<MonthwiseSummaries>(
    {}
  );
  const [stats, setStats] = useState<{
    assets: {
      jars: string;
      dispensers: string;
      stands: string;
    };
  } | null>(null);
  const [products, setProducts] = useState<Product[] | undefined>(undefined);

  // Invoices (paginated / infinite scroll)
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoicePage, setInvoicePage] = useState(0);
  const [invoiceHasMore, setInvoiceHasMore] = useState(true);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [invoicesInitialized, setInvoicesInitialized] = useState(false);

  // Activities (separate api, lazy + paginated)
  const [activities, setActivities] = useState<Activity[] | null>(null);
  const [activityPage, setActivityPage] = useState(0);
  const [activityHasMore, setActivityHasMore] = useState(true);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activitiesInitialized, setActivitiesInitialized] = useState(false);

  const router = useRouter();

  const [selectedCustomerID, setSelectedCustomerID] = useState<
    string | undefined | string[]
  >(undefined);

  const { data: session } = useSession();
  const axiosInstance = useAxiosInstance(session);

  // First load (profile + summary + products) is ready
  const firstLoadReady = Boolean(customer && products && summary);

  // Set Customer ID from the route
  useEffect(() => {
    if (selectedCustomerID === undefined && router.query.id) {
      setSelectedCustomerID(router.query.id);
    }
  }, [router, selectedCustomerID]);

  // Fetch products (cached in cookies)
  useEffect(() => {
    if (!products) {
      const cookieProducts = getCookie("products");
      if (cookieProducts) {
        setProducts(JSON.parse(cookieProducts));
      } else {
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

  // ── First load: profile details + summary + monthwise + statistics ──────────
  const fetchProfileDetails = useCallback(async () => {
    if (!selectedCustomerID) return;
    const url =
      process.env.NEXT_PUBLIC_API_URL +
      "/user/profile-details?id=" +
      selectedCustomerID;
    const { data } = await axiosInstance.get(url);
    setCustomer(data.customer);
    setSummary(data.summary);
    setMonthwiseSummaries(data.monthwiseSummary || {});
    setStats(data.statistics);
  }, [axiosInstance, selectedCustomerID]);

  useEffect(() => {
    if (session && selectedCustomerID) {
      fetchProfileDetails();
    }
  }, [selectedCustomerID, session]);

  // ── Invoices: paginated fetch (append) ──────────────────────────────────────
  const fetchInvoicesPage = useCallback(
    async (page: number) => {
      if (!selectedCustomerID) return;
      setInvoiceLoading(true);
      try {
        const url =
          process.env.NEXT_PUBLIC_API_URL +
          `/user/invoices/list?id=${selectedCustomerID}&page=${page}&limit=${INVOICE_PAGE_SIZE}`;
        const { data } = await axiosInstance.get(url);
        setInvoices((prev) =>
          page === 1 ? data.invoices : [...prev, ...data.invoices]
        );
        setInvoicePage(page);
        setInvoiceHasMore(Boolean(data.hasMore));
        setInvoicesInitialized(true);
      } catch (error) {
        console.log(error);
        toast.error("Failed to load invoices");
      } finally {
        setInvoiceLoading(false);
      }
    },
    [axiosInstance, selectedCustomerID]
  );

  // Load the first invoices page when the invoices tab is opened
  useEffect(() => {
    if (
      session &&
      selectedCustomerID &&
      router.query.tab === "invoices" &&
      !invoicesInitialized &&
      !invoiceLoading
    ) {
      fetchInvoicesPage(1);
    }
  }, [
    session,
    selectedCustomerID,
    router.query.tab,
    invoicesInitialized,
    invoiceLoading,
    fetchInvoicesPage,
  ]);

  // Single scroll container + sentinel. We keep the "load more" logic in a ref
  // so the IntersectionObserver always reads the latest state without having to
  // be torn down and rebuilt on every render.
  const invoiceScrollRef = useRef<HTMLDivElement>(null);
  const invoiceSentinelRef = useRef<HTMLDivElement>(null);
  const loadMoreInvoicesRef = useRef<() => void>(() => {});

  loadMoreInvoicesRef.current = () => {
    if (invoicesInitialized && invoiceHasMore && !invoiceLoading) {
      fetchInvoicesPage(invoicePage + 1);
    }
  };

  // Observe a sentinel at the bottom of the invoice list; load the next page as
  // soon as it scrolls into view. Works regardless of scroll math / layout.
  useEffect(() => {
    if (router.query.tab !== "invoices") return;
    const root = invoiceScrollRef.current;
    const sentinel = invoiceSentinelRef.current;
    if (!root || !sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMoreInvoicesRef.current();
        }
      },
      { root, rootMargin: "150px", threshold: 0 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [router.query.tab, invoicesInitialized, firstLoadReady]);

  // Fallback for environments without IntersectionObserver behaviour we expect:
  // near-bottom scroll on the single scroll container also pulls the next page.
  const handleInvoiceScroll = (
    e: React.UIEvent<HTMLDivElement, UIEvent>
  ) => {
    const el = e.currentTarget;
    const nearBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight < 150;
    if (nearBottom) {
      loadMoreInvoicesRef.current();
    }
  };

  const reloadInvoices = useCallback(() => {
    setInvoices([]);
    setInvoicePage(0);
    setInvoiceHasMore(true);
    setInvoicesInitialized(false);
  }, []);

  // ── Activities: separate, lazy + paginated ──────────────────────────────────
  const fetchActivitiesPage = useCallback(
    async (page: number) => {
      if (!selectedCustomerID) return;
      setActivityLoading(true);
      try {
        const url =
          process.env.NEXT_PUBLIC_API_URL +
          `/user/activities?id=${selectedCustomerID}&page=${page}&limit=${ACTIVITY_PAGE_SIZE}`;
        const { data } = await axiosInstance.get(url);
        setActivities((prev) =>
          page === 1 || !prev
            ? data.activities
            : [...prev, ...data.activities]
        );
        setActivityPage(page);
        setActivityHasMore(Boolean(data.hasMore));
        setActivitiesInitialized(true);
      } catch (error) {
        console.log(error);
        toast.error("Failed to load activities");
      } finally {
        setActivityLoading(false);
      }
    },
    [axiosInstance, selectedCustomerID]
  );

  // Load activities when the activities tab is opened
  useEffect(() => {
    if (
      session &&
      selectedCustomerID &&
      router.query.tab === "activities" &&
      !activitiesInitialized &&
      !activityLoading
    ) {
      fetchActivitiesPage(1);
    }
  }, [
    session,
    selectedCustomerID,
    router.query.tab,
    activitiesInitialized,
    activityLoading,
    fetchActivitiesPage,
  ]);

  const handleActivityScroll = (
    e: React.UIEvent<HTMLDivElement, UIEvent>
  ) => {
    const el = e.currentTarget;
    const nearBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (nearBottom && activityHasMore && !activityLoading) {
      fetchActivitiesPage(activityPage + 1);
    }
  };

  // ── Pay Now: allocate payment across outstanding dues (FIFO) ─────────────────
  const handlePayNow = async () => {
    if (!summary) return;

    const totalDue = summary.totalDue;

    if (amount === "" || parseInt(amount) === 0) {
      toast.error("Amount has to be greater than 0");
      return;
    } else if (parseInt(amount) > totalDue) {
      toast.error("Amount cannot be greater than total due amount");
      return;
    }

    try {
      // Fetch only the unpaid invoices (oldest first) for allocation
      const dueURL =
        process.env.NEXT_PUBLIC_API_URL +
        "/user/invoices/due?id=" +
        selectedCustomerID;
      const { data: dueData } = await axiosInstance.get(dueURL);
      const dueInvoices: Invoice[] = dueData.invoices || [];

      let dueAmount = parseInt(amount);
      const updatedInvoices: Invoice[] = [];

      // Adjust the due amount for each invoice, oldest first
      for (let i = 0; i < dueInvoices.length; i++) {
        if (dueAmount === 0) break;
        if (dueInvoices[i].due > dueAmount) {
          dueInvoices[i].due -= dueAmount;
          dueAmount = 0;
          updatedInvoices.push(dueInvoices[i]);
        } else {
          dueInvoices[i].status = "paid";
          dueAmount -= dueInvoices[i].due;
          dueInvoices[i].paymentDate = +new Date();
          dueInvoices[i].due = 0;
          updatedInvoices.push(dueInvoices[i]);
        }
      }

      // Request to update the changed invoices
      await Promise.all(
        updatedInvoices.map((invoice) => {
          const URL =
            process.env.NEXT_PUBLIC_API_URL +
            `/invoice/update/${invoice._id}`;
          return axiosInstance.put(URL, {
            paymentDate: invoice.paymentDate,
            status: invoice.status,
            due: invoice.due,
          });
        })
      );

      // Create new activity
      const activityURL = process.env.NEXT_PUBLIC_API_URL + `/activity`;
      const payload = {
        message: `Payment of ₹${amount} added to ${selectedCustomerID || dueInvoices[0]?.customerID
          }`,
        tag: "payment",
      };
      await axiosInstance.post(activityURL, payload, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      setAmount("0");
      toast.success("Invoice updated successfully!");

      // Refresh summary (CLR / total due / monthwise) and invoice list
      await fetchProfileDetails();
      reloadInvoices();
      setActivitiesInitialized(false);
      setActivities(null);
    } catch (error) {
      console.log(error);
      toast.error("Failed to record payment");
    }
  };

  // Remove invoice
  const deleteInvoice = async (invoice: Invoice) => {
    try {
      let URL;
      URL = process.env.NEXT_PUBLIC_API_URL + `/invoice/delete/${invoice._id}`;
      await axiosInstance.delete(URL);
      setInvoices((invoices) =>
        invoices.filter((inv) => inv.invoiceID !== invoice.invoiceID)
      );

      // Create new activity
      URL = process.env.NEXT_PUBLIC_API_URL + `/activity`;

      const payload = {
        message: `Invoice ID ${invoice.invoiceID} deleted, customer ref no. ${invoice.customerID}`,
        tag: "entry",
      };
      await axiosInstance.post(URL, payload, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      // Keep CLR / total due / monthwise in sync after a deletion
      fetchProfileDetails();
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <Wrapper>
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
                  className={`inline-flex cursor-pointer items-center justify-center p-4 ${tab.tabID === router.query.tab
                    ? "text-blue-600  border-blue-600 active"
                    : " border-transparent hover:text-gray-600 hover:border-gray-300"
                    } border-b-2 rounded-t-lg group`}
                >
                  {tab.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mr-5 flex items-center gap-4">
            <WaterCardDialog
              customer={customer}
              customerID={selectedCustomerID}
              axiosInstance={axiosInstance}
            />
            <GenerateBillDialog
              customer={customer}
              monthwiseSummaries={monthwiseSummaries}
            />
            <span className="font-medium text-gray-500">
              Customer ID :{" "}
              <span className="font-bold text-black">{selectedCustomerID}</span>
            </span>
          </div>
        </div>

        {!firstLoadReady ? (
          <div className="w-full flex items-center">
            <AiOutlineLoading className="text-4xl animate-spin" />
          </div>
        ) : (
          <>
            {router.query.tab === "invoices" && (
              <>
                <div
                  ref={invoiceScrollRef}
                  onScroll={handleInvoiceScroll}
                  className="w-full h-[32rem] md:h-[26rem] overflow-y-auto"
                >
                  <div className="relative bg-white border border-gray-400 w-full">
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
                            className="px-2 md:px-4 py-3 border-x border-gray-400"
                          >
                            Payment Date
                          </th>
                          <th
                            scope="col"
                            className="px-2 md:px-4 py-3 border-l border-gray-400"
                          >
                            Action
                          </th>
                        </tr>
                      </thead>
                      <tbody className="">
                        {invoices.length > 0 &&
                          invoices.map((invoice) => {
                            return (
                              <tr
                                key={invoice._id}
                                className={`${invoice.status === "paid"
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
                                          {item?.name} x {product.quantity}
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
                                <td className="px-2 md:px-4 py-4 border-l border-gray-400">
                                  <div className="flex flex-row justify-around">
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button size="icon" variant="outline" >
                                          <Trash2 size={16} />
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            This action cannot be undone. This will permanently delete the invoice from the system.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                                          <AlertDialogAction onClick={() => deleteInvoice(invoice)}>Continue</AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>

                                    <Button size="icon" variant="outline" >
                                      <SquarePen size={16} />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>

                    {invoiceLoading && (
                      <div className="w-full flex items-center justify-center py-4">
                        <AiOutlineLoading className="text-2xl animate-spin" />
                      </div>
                    )}

                    {!invoiceLoading &&
                      invoicesInitialized &&
                      invoices.length === 0 && (
                        <div className="w-full text-center py-6 text-gray-500">
                          No invoices found.
                        </div>
                      )}

                    {!invoiceLoading &&
                      !invoiceHasMore &&
                      invoices.length > 0 && (
                        <div className="w-full text-center py-3 text-xs text-gray-400">
                          End of invoices
                        </div>
                      )}

                    {/* Infinite-scroll trigger */}
                    <div ref={invoiceSentinelRef} className="h-px w-full" />
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
                              value={summary?.clr ?? 0}
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
                              value={summary?.totalDue ?? 0}
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
                  {(summary?.totalDue ?? 0) !== 0 && (
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
              <div
                onScroll={handleActivityScroll}
                className="w-full max-h-[34rem] overflow-y-auto"
              >
                {!activitiesInitialized && activityLoading ? (
                  <div className="w-full flex items-center justify-center py-6">
                    <AiOutlineLoading className="text-2xl animate-spin" />
                  </div>
                ) : (
                  <>
                    <Activities activities={activities} />
                    {activityLoading && activitiesInitialized && (
                      <div className="w-full flex items-center justify-center py-4">
                        <AiOutlineLoading className="text-2xl animate-spin" />
                      </div>
                    )}
                  </>
                )}
              </div>
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
