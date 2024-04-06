import Wrapper from "@/components/Wrapper";
import useAxiosInstance from "@/lib/hooks/useAxiosInstance";
import useCustomers from "@/lib/hooks/useCustomers";
import useInvoice from "@/lib/hooks/useInvoice";
import useRefreshTokenRotation from "@/lib/hooks/useRefreshToken";
import { useCustomersStore } from "@/store/customers.store";
import { useInvoicesStore } from "@/store/invoices.store";
import { useSession } from "next-auth/react";
import CurrencyFormat from "react-currency-format";
import { getLastNDays } from "@/lib/helpers";
import { useEffect, useState } from "react";
import Card from "@/components/dashboard/Card";
import { Invoice } from "@/types/types";
import {
  FaCaretLeft,
  FaCaretRight,
  FaChevronLeft,
  FaChevronRight,
} from "react-icons/fa";
import useAuthUser from "@/lib/hooks/useAuthUser";
import CustomerInsight from "@/components/dashboard/CustomerInsight";

const month = [
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

export default function Home() {
  const { data: session } = useSession();
  const axiosInstance = useAxiosInstance(session);
  useInvoice(axiosInstance, session);
  useCustomers(axiosInstance, session);
  useRefreshTokenRotation(axiosInstance);

  const { invoices } = useInvoicesStore();
  const { customers } = useCustomersStore();
  const [Salesdata, setSalesData] = useState([0, 0, 0, 0, 0, 0, 0]);
  const [DueData, setDueData] = useState([0, 0, 0, 0, 0, 0, 0]);
  const [itemsQuantity, setItemsQuantity] = useState([0, 0, 0, 0, 0, 0, 0]);
  const [totalSales, setTotalSales] = useState(0);
  const [totalDues, setTotalDues] = useState(0);
  const [totalCollected, setTotalCollected] = useState(0);
  const [currentMonthSales, setCurrentMonthSales] = useState(0);
  const [currentMonthDues, setCurrentMonthDues] = useState(0);
  const [currentMonthCollected, setCurrentMonthCollected] = useState(0);
  const [totalJarSold, setTotalJarSold] = useState(0);
  const [totalJarSoldToday, setTotalJarSoldToday] = useState(0);
  const [todaysInvoice, setTodaysInvoice] = useState<Invoice[]>([]);
  const [summaryDate, setSummaryDate] = useState(new Date().toDateString());
  const [summaryMonth, setSummaryMonth] = useState(
    month[new Date().getMonth()] + " " + new Date().getFullYear()
  );

  const { user } = useAuthUser();

  const last7Days: string[] = getLastNDays(7);

  // Set summary date to one day before
  const handlePrevDay = () => {
    const date = new Date(summaryDate);
    date.setDate(date.getDate() - 1);
    setSummaryDate(date.toDateString());
  };

  // Set summary date to one day after
  const handleNextDay = () => {
    const date = new Date(summaryDate);
    date.setDate(date.getDate() + 1);
    setSummaryDate(date.toDateString());
  };

  // set summary month to previous month and update the summary month
  const handlePrevMonth = () => {
    setSummaryMonth(
      month[month.indexOf(summaryMonth.split(" ")[0]) - 1] +
        " " +
        new Date().getFullYear()
    );
  };

  // set summary month to next month
  const handleNextMonth = () => {
    setSummaryMonth(
      month[month.indexOf(summaryMonth.split(" ")[0]) + 1] +
        " " +
        new Date().getFullYear()
    );
  };

  useEffect(() => {
    if (invoices) {
      //  get total jars sold
      if (totalJarSold === 0) {
        let t = 0;
        invoices?.map((invoice) => {
          invoice.products.map((product) => {
            if (product.id === "65c1271bd78bb1922f9b1a63")
              t += product.quantity;
          });
        });
        setTotalJarSold(t);
      }
      //  get total sales
      setTotalSales(
        invoices?.reduce((acc, invoice) => {
          return acc + invoice.total;
        }, 0)
      );

      //  get total dues
      setTotalDues(
        invoices?.reduce((acc, invoice) => {
          if (invoice.status === "paid") return acc;
          return acc + invoice.total;
        }, 0)
      );

      // get total collected
      setTotalCollected(
        invoices?.reduce((acc, invoice) => {
          if (invoice.status === "pending") return acc;
          return acc + invoice.total;
        }, 0)
      );

      //  get paid sales for each day in the last 7 days
      const salesData = last7Days.map((date) => {
        const sales = invoices.reduce((acc, invoice) => {
          let invoiceDate = new Date(invoice.invoiceDate).toLocaleDateString();
          if (invoiceDate === date) {
            let t: number = 0;
            if (invoice.status === "pending") {
              t = invoice.total - invoice.due;
            } else if (invoice.status === "paid") {
              t = invoice.total;
            }
            return acc + t;
          }
          return acc;
        }, 0);

        return sales;
      });

      //  get due sales for each day in the last 7 days
      const dueData = last7Days.map((date) => {
        const sales = invoices.reduce((acc, invoice) => {
          let invoiceDate = new Date(invoice.invoiceDate).toLocaleDateString();
          if (invoiceDate === date && invoice.status === "pending") {
            return acc + invoice.due;
          }
          return acc;
        }, 0);

        return sales;
      });

      // get an array of number of invoices generated each day in last 7 days
      const itemsQuantity = last7Days.map((date) => {
        const items = invoices.reduce((acc, invoice) => {
          let invoiceDate = new Date(invoice.invoiceDate).toLocaleDateString();
          if (invoiceDate === date) {
            return acc + invoice.products.length;
          }
          return acc;
        }, 0);

        return items;
      });

      setItemsQuantity(itemsQuantity);
      setDueData(dueData);
      setSalesData(salesData);
    }
  }, [invoices]);

  // Get Day wise summary
  useEffect(() => {
    if (invoices) {
      // get all todays invoices
      const todaysInvoices = invoices.filter(
        (invoice) =>
          new Date(invoice.invoiceDate).toDateString() === summaryDate
      );
      setTodaysInvoice(todaysInvoices);

      // get total jars sold today
      let t = 0;
      invoices?.map((invoice) => {
        invoice.products.map((product) => {
          if (
            product.id === "65c1271bd78bb1922f9b1a63" &&
            new Date(invoice.invoiceDate).toDateString() === summaryDate
          )
            t += product.quantity;
        });
      });

      setTotalJarSoldToday(t);
    }
  }, [summaryDate, invoices]);

  // Get Month wise summary
  useEffect(() => {
    if (invoices) {
      // get total sales for the current month
      setCurrentMonthSales(
        invoices?.reduce((acc, invoice) => {
          if (
            month[new Date(invoice.invoiceDate).getMonth()] ===
            summaryMonth.split(" ")[0]
          ) {
            return acc + invoice.total;
          }
          return acc;
        }, 0)
      );

      // get total dues for the current month
      setCurrentMonthDues(
        invoices?.reduce((acc, invoice) => {
          if (
            month[new Date(invoice.invoiceDate).getMonth()] ===
              summaryMonth.split(" ")[0] &&
            invoice.status === "pending"
          ) {
            return acc + invoice.total;
          }
          return acc;
        }, 0)
      );

      // get total collected for the current month
      setCurrentMonthCollected(
        invoices?.reduce((acc, invoice) => {
          if (
            month[new Date(invoice.invoiceDate).getMonth()] ===
              summaryMonth.split(" ")[0] &&
            invoice.status === "paid"
          ) {
            return acc + invoice.total;
          }
          return acc;
        }, 0)
      );
    }
  }, [summaryMonth, invoices]);

  return (
    <Wrapper name="Dashboard">
      <div className="flex">
        <div className="flex mb-4 font-medium w-fit">
          <button onClick={handlePrevMonth}>
            <FaChevronLeft />
          </button>
          <span className={`font-medium mx-3`}>{summaryMonth}</span>
          <button
            onClick={handleNextMonth}
            disabled={
              summaryMonth ===
              month[new Date().getMonth()] + " " + new Date().getFullYear()
            }
            className="disabled:opacity-0"
          >
            <FaChevronRight />
          </button>
        </div>
      </div>
      <div className="flex flex-col md:flex-row w-full mb-20">
        {/*
         * LEFT
         */}
        <div className="flex flex-col w-full md:w-[70%]">
          {/*
           * CARDS SECTION
           */}
          <div className="grid grid-cols-1 w-full md:grid-cols-3 md:grid-rows-1 gap-3">
            {/* Total Sales */}
            <Card title="Total Sales">
              <CurrencyFormat
                value={currentMonthSales}
                displayType={"text"}
                thousandSeparator={true}
                prefix={"₹"}
                decimalScale={0}
                fixedDecimalScale={true}
                renderText={(value) => (
                  <p className="text-3xl font-semibold">{value}</p>
                )}
              />
            </Card>
            {/* Total Dues */}
            <Card title="Total Dues">
              <div className="flex justify-between items-start">
                <CurrencyFormat
                  value={currentMonthDues}
                  displayType={"text"}
                  thousandSeparator={true}
                  prefix={"₹"}
                  decimalScale={0}
                  fixedDecimalScale={true}
                  renderText={(value) => (
                    <p className="text-3xl font-semibold">{value}</p>
                  )}
                />
                <span className="mt-2.5 text-sm border border-red-500 bg-red-50 px-2 py-1 rounded-2xl inline-flex items-center text-red-500">
                  {((totalDues / totalSales) * 100).toFixed(1)}%
                </span>
              </div>
            </Card>
            {/* Total Collected */}
            <Card title="Total Collected">
              <CurrencyFormat
                value={currentMonthCollected}
                displayType={"text"}
                thousandSeparator={true}
                prefix={"₹"}
                decimalScale={0}
                fixedDecimalScale={true}
                renderText={(value) => (
                  <p className="text-3xl font-semibold">{value}</p>
                )}
              />
            </Card>
            {/* Total Customers */}
            {/* <Card title="Total Customers">
              <CurrencyFormat
                value={customers?.length}
                displayType={"text"}
                thousandSeparator={true}
                // prefix={"₹"}
                decimalScale={0}
                fixedDecimalScale={true}
                renderText={(value) => (
                  <p className="text-3xl font-semibold">{value}</p>
                )}
              />
            </Card> */}
          </div>
          <span className="text-lg mt-6 mb-2 text-gray-900 font-semibold">
            Universal Summary
          </span>
          <div className="grid grid-cols-1 w-full md:grid-cols-3 md:grid-rows-1 gap-3">
            {/* Total Sales */}
            <Card title="Total Sales">
              <CurrencyFormat
                value={totalSales}
                displayType={"text"}
                thousandSeparator={true}
                prefix={"₹"}
                decimalScale={0}
                fixedDecimalScale={true}
                renderText={(value) => (
                  <p className="text-3xl font-semibold">{value}</p>
                )}
              />
            </Card>
            {/* Total Dues */}
            <Card title="Total Dues">
              <div className="flex justify-between items-start">
                <CurrencyFormat
                  value={totalDues}
                  displayType={"text"}
                  thousandSeparator={true}
                  prefix={"₹"}
                  decimalScale={0}
                  fixedDecimalScale={true}
                  renderText={(value) => (
                    <p className="text-3xl font-semibold">{value}</p>
                  )}
                />
                <span className="mt-2.5 text-sm border border-red-500 bg-red-50 px-2 py-1 rounded-2xl inline-flex items-center text-red-500">
                  {((totalDues / totalSales) * 100).toFixed(1)}%
                </span>
              </div>
            </Card>
            {/* Total Collected */}
            <Card title="Total Collected">
              <CurrencyFormat
                value={totalCollected}
                displayType={"text"}
                thousandSeparator={true}
                prefix={"₹"}
                decimalScale={0}
                fixedDecimalScale={true}
                renderText={(value) => (
                  <p className="text-3xl font-semibold">{value}</p>
                )}
              />
            </Card>
            {/* Total Customers */}
            {/* <Card title="Total Customers">
              <CurrencyFormat
                value={customers?.length}
                displayType={"text"}
                thousandSeparator={true}
                // prefix={"₹"}
                decimalScale={0}
                fixedDecimalScale={true}
                renderText={(value) => (
                  <p className="text-3xl font-semibold">{value}</p>
                )}
              />
            </Card> */}
          </div>
          {/*
           * CUSTOMERS INSIGHT
           */}
          <CustomerInsight
          invoices={invoices}
            customers={customers}
            currentMonth={month.indexOf(summaryMonth.split(" ")[0])}
          />
          {/*
           * SALES CHART
           */}
          {/* <div className="w-full mt-6 rounded-2xl shadow p-5 bg-white">
            <span className="text-2xl font-semibold ">
              Sales in the last 7 days
            </span>
          </div> */}
        </div>
        {/*
         * RIGHT
         */}
        <div className="flex flex-col w-full md:w-[30%]">
          {/*
           * DAY SUMMARY SECTION
           */}
          <div className="w-full mt-5 md:ml-5 md:mt-0">
            <div className="w-full h-fit flex flex-col rounded-3xl shadow bg-black py-8">
              {/*
               * HEADER
               */}
              <div className="flex w-full justify-between px-3 items-center">
                <button onClick={handlePrevDay}>
                  <FaCaretLeft className="text-gray-300 text-2xl" />
                </button>
                <span className={`text-2xl font-semibold text-white`}>
                  {summaryDate === new Date().toDateString()
                    ? "Today's"
                    : summaryDate.split(" ")[1] +
                      " " +
                      summaryDate.split(" ")[2]}{" "}
                  Summary
                </span>
                <button
                  onClick={handleNextDay}
                  disabled={summaryDate === new Date().toDateString()}
                  className="disabled:opacity-50"
                >
                  <FaCaretRight className="text-gray-300 text-2xl" />
                </button>
              </div>
              {/*
               * JAR SUMMARY
               */}
              <div className="flex flex-col px-8 py-6 w-full">
                <span className="text-2xl text-white mt-2">
                  {totalJarSoldToday}
                  <span className="text-sm text-gray-300 px-2">
                    refilling processed
                  </span>
                </span>
                <span className="text-xl mt-2 text-white">
                  {totalJarSoldToday * 20}L
                  <span className="text-sm text-gray-300 px-2">
                    water displaced
                  </span>
                </span>
              </div>
              {/*
               * SALES DATA
               */}
              <div className="flex flex-col mt-4 w-full px-8">
                {/* Progress Bar */}
                <div className="w-full h-6 bg-gray-600 rounded-3xl">
                  <div
                    className={`h-6 bg-gray-300 rounded-3xl transition-all duration-500 ease-in-out`}
                    style={{
                      width: `${
                        (todaysInvoice
                          .filter((invoice) => invoice.status === "paid")
                          .map((invoice) =>
                            invoice.products
                              .map((product) => product.quantity)
                              .reduce((acc, val) => acc + val, 0)
                          )
                          .reduce((acc, val) => acc + val, 0) /
                          todaysInvoice
                            .map((invoice) =>
                              invoice.products
                                .map((product) => product.quantity)
                                .reduce((acc, val) => acc + val, 0)
                            )
                            .reduce((acc, val) => acc + val, 0)) *
                        100
                      }%`,
                    }}
                  >
                    {}
                  </div>
                </div>
                {/* Statements */}
                <div className="mt-5 w-full flex flex-col justify-start">
                  <div className="flex justify-between items-center">
                    {/* Collected */}
                    <span className="text-gray-300 text-sm w-full">
                      <CurrencyFormat
                        value={todaysInvoice
                          .filter((invoice) => invoice.status === "paid")
                          .map((invoice) => invoice.total)
                          .reduce((acc, val) => acc + val, 0)}
                        displayType={"text"}
                        thousandSeparator={true}
                        prefix={"₹"}
                        renderText={(value) => (
                          <span className="text-white text-lg mr-2 font-semibold">
                            {value}
                          </span>
                        )}
                        decimalScale={0}
                        fixedDecimalScale={true}
                      />
                      Collected
                    </span>
                    <span className="h-3 w-3 bg-gray-300 text-sm rounded-full" />
                  </div>
                  {/* Due */}
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-gray-300 text-sm w-full">
                      <CurrencyFormat
                        value={todaysInvoice
                          .filter((invoice) => invoice.status === "pending")
                          .map((invoice) => invoice.total)
                          .reduce((acc, val) => acc + val, 0)}
                        displayType={"text"}
                        thousandSeparator={true}
                        prefix={"₹"}
                        renderText={(value) => (
                          <span className="text-white text-lg mr-2 font-semibold">
                            {value}
                          </span>
                        )}
                        decimalScale={0}
                        fixedDecimalScale={true}
                      />
                      Due
                    </span>
                    <span className="h-3 w-3 bg-gray-600 text-sm rounded-full" />
                  </div>
                </div>
                <button className="text-gray-800 text-sm w-full mb-3 bg-gray-200 rounded-md py-2 mt-4 px-2 text-start">
                  <CurrencyFormat
                    value={todaysInvoice
                      .map((invoice) => invoice.total)
                      .reduce((acc, val) => acc + val, 0)}
                    displayType={"text"}
                    thousandSeparator={true}
                    prefix={"Rs. "}
                    renderText={(value) => (
                      <span className="text-black text-xl mr-2 font-semibold">
                        {value}
                      </span>
                    )}
                    decimalScale={0}
                    fixedDecimalScale={true}
                  />
                  in sales{" "}
                  {summaryDate === new Date().toDateString()
                    ? "today"
                    : "on " +
                      summaryDate.split(" ")[1] +
                      " " +
                      summaryDate.split(" ")[2]}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Wrapper>
  );
}
