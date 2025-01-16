import Wrapper from "@/components/Wrapper";
import useAxiosInstance from "@/lib/hooks/useAxiosInstance";
import useRefreshTokenRotation from "@/lib/hooks/useRefreshToken";
import { useSession } from "next-auth/react";
import CurrencyFormat from "react-currency-format";
import { useEffect, useState } from "react";
import Card from "@/components/dashboard/Card";
import { SlCalender } from "react-icons/sl";
import {
  FaCaretLeft,
  FaCaretRight,
  FaChevronLeft,
  FaChevronRight,
  FaCircle,
} from "react-icons/fa";
import useAuthUser from "@/lib/hooks/useAuthUser";
import CustomerInsight from "@/components/dashboard/CustomerInsight";
import SalesSummary from "@/components/dashboard/SalesSummary";
import { useDashboardStore } from "@/store/dashboardData.store";
import Greetings from "@/components/dashboard/Greetings";
import SalesAreaChart from "@/components/dashboard/SalesAreaChart";
import { useCustomersStore } from "@/store/customers.store";
import { useInvoicesStore } from "@/store/invoices.store";
import DriverSalesBarGraph from "@/components/dashboard/Driver/BarGraph";
import { monthAbbr, monthsInAnYear } from "@/lib/constants";
import DriverSalesCollection from "@/components/dashboard/Driver/Collection";
import { IoIosTrendingUp, IoIosTrendingDown } from "react-icons/io";
import Suggestions from "@/components/dashboard/Suggestions";
import MonthlySummary from "@/components/dashboard/MonthlySummary";

const BreadCrumb = [
  {
    href: "/",
    name: "Home",
  },
];

export default function Home() {
  const { data: session } = useSession();
  const axiosInstance = useAxiosInstance(session);
  useRefreshTokenRotation(axiosInstance);
  const { setCustomers } = useCustomersStore();
  const { setInvoices, invoices } = useInvoicesStore();

  const [jarPercertageChange, setJarPercertageChange] = useState(0);
  const [salePercertageChange, setSalePercertageChange] = useState(0);

  const {
    data,
    setData,
    currDay,
    setCurrDay,
    currMonth,
    currYear,
    setCurrYear,
    setCurrMonth,
    currMonthIndex,
    currDayIndex,
    currMonthlyData,
    setCurrDayIndex,
    setCurrMonthIndex,
    setCurrMonthlyData,
  } = useDashboardStore();

  const { user } = useAuthUser();

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      let URL = process.env.NEXT_PUBLIC_API_URL + "/user/dashboard";
      const response = await axiosInstance.get(URL);
      console.log(response.data);
      setCustomers(response.data.data.users);
      setInvoices(response.data.data.invoices);
      setData(response.data);
      setCurrDay(response.data?.summary.last7Days.refilling[currDayIndex].date);
      let month = monthsInAnYear[new Date().getMonth()];
      let year = new Date().getFullYear();

      // sort current month
      const yearlyData = response.data?.summary.monthly.find(
        (yearData: { year: string; data: any }) =>
          parseInt(yearData.year) === year
      );

      const currMonth = yearlyData?.data.find(
        (d: {
          month: string;
          sales: number;
          due: number;
          collected: number;
          jars: number;
        }) => d.month === month
      );

      setCurrMonth(currMonth.month);
      setCurrYear(currYear);
      setCurrMonthlyData(currMonth);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (session && user && data?.customers.total === 0) fetchDashboardData();
  }, [session, user, data]);

  // Set summary date to one day before
  const handlePrevDay = () => {
    let prevDay = data?.summary.last7Days.refilling[currDayIndex + 1].date;
    setCurrDay(prevDay);
    setCurrDayIndex(currDayIndex + 1);
  };

  // Set summary date to one day after
  const handleNextDay = () => {
    let nextDay = data?.summary.last7Days.refilling[currDayIndex - 1].date;
    setCurrDay(nextDay);
    setCurrDayIndex(currDayIndex - 1);
  };

  // set summary month to previous month and update the summary month
  const handlePrevMonth = () => {
    let year = currYear;

    if (currMonth === "January") {
      year = currYear - 1;
      setCurrYear(year);
    }

    // update current month data
    const yearlyData = data?.summary.monthly.find((data) => {
      return parseInt(data.year) === year;
    });

    function getPreviousItem(
      list: string[],
      currentItem: string
    ): string | null {
      const index = list.indexOf(currentItem);
      if (index > 0) {
        return list[index - 1]; // Return the previous item if it exists
      }
      if (index === 0) {
        return list[list.length - 1]; // Return the last element if currentItem is the first element
      }
      return null; // Return null if currentItem is not found in the list
    }

    const prevMonth = getPreviousItem(monthsInAnYear, currMonth);
    const prevMonthyData = yearlyData?.data.find(
      (item) => item.month === prevMonth
    );
    setCurrMonthlyData(prevMonthyData);
    setCurrMonth(prevMonthyData?.month || currMonth);
  };

  // set summary month to next month
  const handleNextMonth = () => {
    let year = currYear;
    if (currMonth === "December") {
      year = currYear + 1;
      setCurrYear(year);
    }

    // update current month data
    const yearlyData = data?.summary.monthly.find((data) => {
      return parseInt(data.year) === year;
    });

    function getNextItem(list: string[], currentItem: string): string | null {
      const index = list.indexOf(currentItem);
      if (index < list.length - 1) {
        return list[index + 1]; // Return the next item if it exists
      }
      if (index === list.length - 1) {
        return list[0]; // Return the first element if currentItem is the last element
      }
      return null; // Return null if currentItem is not found in the list
    }

    const nextMonth = getNextItem(monthsInAnYear, currMonth);

    const nextMonthyData = yearlyData?.data.find(
      (item) => item.month === nextMonth
    );

    setCurrMonthlyData(nextMonthyData);
    setCurrMonth(nextMonthyData?.month || currMonth);
  };

  function calculatePercentageDifference(
    a: number | undefined,
    b: number | undefined
  ): number {
    if (a === undefined || b === undefined) return 0;
    let result = ((b - a) / a) * 100;
    return result;
  }

  useEffect(() => {
    let jarsToday = data?.summary?.last7Days?.refilling?.find(
      (data) => data?.date === currDay
    )?.jars;

    let salesToday = data?.summary?.last7Days?.refilling?.find(
      (data) => data?.date === currDay
    )?.sales;

    let jarsYesterday =
      data?.summary?.last7Days?.refilling[
        data?.summary?.last7Days?.refilling.indexOf(
          data?.summary?.last7Days?.refilling?.filter(
            (data) => data?.date === currDay
          )[0]
        ) + 1
      ]?.jars;

    let salesYesterday =
      data?.summary?.last7Days?.refilling[
        data?.summary?.last7Days?.refilling.indexOf(
          data?.summary?.last7Days?.refilling?.filter(
            (data) => data?.date === currDay
          )[0]
        ) + 1
      ]?.sales;

    let jarPercentageChange = calculatePercentageDifference(
      jarsYesterday,
      jarsToday
    );

    let salePercentageChange = calculatePercentageDifference(
      salesYesterday,
      salesToday
    );

    setJarPercertageChange(jarPercentageChange);
    setSalePercertageChange(salePercentageChange);
  }, [currDay]);

  return (
    <Wrapper breadcrumb={BreadCrumb}>
      {/* <Loader visible /> */}
      <Greetings name={user?.name} />
      {/*
       * DATE SELECTOR
       */}
      <div className="flex justify-between my-3">
        <div className="flex justify-between space-x-2 items-center">
          <button
            onClick={handlePrevDay}
            disabled={
              currDayIndex + 1 === data?.summary.last7Days.refilling.length
            }
            className="disabled:opacity-50"
          >
            <FaChevronLeft className="text-lg" />
          </button>
          <span className={`text-lg font-semibold`}>{currDay}</span>
          <button
            onClick={handleNextDay}
            disabled={currDayIndex === 0}
            className="disabled:opacity-50"
          >
            <FaChevronRight className="text-lg" />
          </button>
        </div>
        <div className="inline-flex rounded-md shadow-md" role="group">
          <button
            type="button"
            className="px-4 py-2 flex justify-center text-sm font-medium text-gray-900 bg-white border border-gray-200 rounded-s-lg hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:ring-2 focus:ring-blue-700 focus:text-blue-700"
          >
            <SlCalender size={16} className="mr-3" />
            {currMonth}
          </button>

          <button
            type="button"
            className="px-4 py-2 text-sm font-medium text-gray-900 bg-white border border-gray-200 rounded-e-lg hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:ring-2 focus:ring-blue-700 focus:text-blue-700
            "
          >
            {currYear}
          </button>
        </div>
      </div>
      {/*
       * CARDS
       */}
      <div className="flex w-full md:flex-row flex-col">
        <div className="md:w-[70%] flex flex-col space-y-5 md:pr-5">
          {/*
           * MONTHLY INSIGHT
           */}
          {user?.role === "super_admin" && (
            <div className="flex flex-col border-b pb-5">
              <span className="font-medium text-gray-400 md:mb-3">
                Super Admin Tools
              </span>
              <div className="grid grid-cols-1 w-full md:grid-cols-2 md:grid-rows-31 gap-4 md:gap-3 mt-6 md:mt-0">
                {/*
                 * MONTHLY SALES SUMMARY
                 */}
                <div className="flex flex-col space-y-4 h-full">
                  {/* Total Sales */}
                  <Card title="Total Sales">
                    <div className="flex flex-col">
                      <span className="text-md text-gray-600 font-light mb-4">
                        Total Sales
                      </span>

                      <CurrencyFormat
                        value={currMonthlyData?.sales}
                        displayType={"text"}
                        thousandSeparator={true}
                        prefix={"₹"}
                        decimalScale={0}
                        fixedDecimalScale={true}
                        renderText={(value) => (
                          <p className="text-3xl font-semibold">{value}</p>
                        )}
                      />
                    </div>

                    <div className="rounded-2xl bg-gray-100 p-3 flex flex-col items-center">
                      <span className="text-sm text-gray-600">Average/day</span>
                      <CurrencyFormat
                        value={
                          currMonthlyData?.sales &&
                          currMonthlyData?.sales / new Date().getDate()
                        }
                        displayType={"text"}
                        thousandSeparator={true}
                        prefix={"₹"}
                        decimalScale={0}
                        fixedDecimalScale={true}
                        renderText={(value) => (
                          <p className="text-lg text-gray-600 font-semibold">
                            {value}
                          </p>
                        )}
                      />
                    </div>
                  </Card>
                  {/* Total Receivables */}
                  <Card title="Receivables">
                    <div className="flex flex-col">
                      <span className="text-md text-gray-600 font-light mb-4">
                        Receivables
                      </span>
                      <CurrencyFormat
                        value={currMonthlyData?.due}
                        displayType={"text"}
                        thousandSeparator={true}
                        prefix={"₹"}
                        decimalScale={0}
                        fixedDecimalScale={true}
                        renderText={(value) => (
                          <p className="text-3xl font-semibold">{value}</p>
                        )}
                      />
                    </div>
                  </Card>
                </div>

                {/*
                 * SALES SUMMARY
                 */}
                <div className="w-full">
                  <SalesSummary
                    totalSales={data?.summary.total.sales || 0}
                    totalDue={data?.summary.total.due || 0}
                    totalCollected={data?.summary.total.collected || 0}
                  />
                </div>
              </div>
            </div>
          )}
          {/*
           * DAY SUMMARY SECTION
           */}
          <div className="w-full grid md:grid-cols-3 gap-5 rounded-3xl">
            {/*
             * JARS
             */}
            <div className="flex flex-col space-y-5 p-4 bg-white  border  shadow-md rounded-3xl">
              <span className="text-sm text-gray-600">Jars Processed</span>
              <span className="text-4xl font-bold">
                {
                  data?.summary?.last7Days?.refilling?.find(
                    (data) => data?.date === currDay
                  )?.jars
                }
              </span>
              {/* Performance Stats */}
              {jarPercertageChange === -100 ? (
                <div>
                  <div className="w-[70%] h-3.5 bg-gray-200 rounded-full dark:bg-gray-700"></div>
                </div>
              ) : (
                <div className="flex space-x-2">
                  {jarPercertageChange > 0 ? (
                    <IoIosTrendingUp className="text-green-500" size={22} />
                  ) : (
                    <IoIosTrendingDown className="text-red-500" size={22} />
                  )}
                  <span
                    className={`${
                      jarPercertageChange > 0
                        ? "text-green-500"
                        : "text-red-500"
                    } text-sm font-semibold`}
                  >
                    {jarPercertageChange.toFixed(0)}%
                  </span>
                  <span className="text-sm">from yesterday</span>
                </div>
              )}
              {/* <span className="text-xl mt-2 text-white">
                      {(data?.summary.last7Days.refilling.filter(
                        (data) => data?.date === currDay
                      )[0]?.jars || 0) * 20}{" "}
                      L
                      <span className="text-sm text-gray-300 px-2">
                        water displaced
                      </span>
                    </span> */}
            </div>
            {/*
             * TOTAL SALES
             */}
            <div className="flex flex-col space-y-5 p-4 bg-white  border  shadow-md rounded-3xl">
              <span className="text-sm text-gray-600">Total Sales</span>
              <CurrencyFormat
                value={
                  data?.summary.last7Days.refilling.filter(
                    (data) => data?.date === currDay
                  )[0]?.sales
                }
                displayType={"text"}
                thousandSeparator={true}
                prefix={"₹"}
                renderText={(value) => (
                  <span className="text-4xl font-bold">{value}</span>
                )}
                decimalScale={0}
                fixedDecimalScale={true}
              />
              {/* Performance Stats */}
              {salePercertageChange === -100 ? (
                <div>
                  <div className="w-[70%] h-3.5 bg-gray-200 rounded-full dark:bg-gray-700"></div>
                </div>
              ) : (
                <div className="flex space-x-2">
                  {salePercertageChange > 0 ? (
                    <IoIosTrendingUp className="text-green-500" size={22} />
                  ) : (
                    <IoIosTrendingDown className="text-red-500" size={22} />
                  )}
                  <span
                    className={`${
                      salePercertageChange > 0
                        ? "text-green-500"
                        : "text-red-500"
                    } text-sm font-semibold`}
                  >
                    {salePercertageChange.toFixed(0)}%
                  </span>
                  <span className="text-sm">from yesterday</span>
                </div>
              )}
            </div>
            {/*
             * TOTAL COLLECTION
             */}
            <div className="flex flex-col space-y-5 p-4 bg-white border  shadow-md rounded-3xl">
              <span className="text-sm text-gray-600">Collection</span>
              <CurrencyFormat
                value={
                  data?.summary.last7Days.refilling.filter(
                    (data) => data?.date === currDay
                  )[0]?.collected
                }
                displayType={"text"}
                thousandSeparator={true}
                prefix={"₹"}
                renderText={(value) => (
                  <span className="text-4xl font-bold">{value}</span>
                )}
                decimalScale={0}
                fixedDecimalScale={true}
              />
              <div className="flex space-x-1 items-center">
                <span className="text-sm">See Statictics</span>
                <FaChevronRight size={12} />
              </div>
            </div>
          </div>

          {/*
           * LEVEL 2
           */}
          <div className="grid md:grid-cols-2 gap-5">
            <div className="flex flex-col gap-5">
              {/* {currMonthlyData && <MonthlySummary />} */}

              {/*
               * SUGGESTION
               */}
              <Suggestions data={data?.suggestion} />

              <div className="w-full">
                <CustomerInsight
                  // top={data?.customers.top}
                  total={data?.customers.total}
                  regular={data?.customers.regular}
                  newCustomers={data?.customers?.new}
                />
              </div>
            </div>

            {/*
             * LEVEL 3
             */}
            <div className="flex flex-col gap-5">
              {/*
               * DRIVER SALES STATS
               */}
              <DriverSalesCollection
                data={
                  data?.summary?.last7Days?.refilling?.filter(
                    (data) => data?.date === currDay
                  )[0]?.driverSummary
                }
              />

              {/*
               * DRIVER SALES BAR GRAPH
               */}
              <DriverSalesBarGraph
                data={
                  data?.summary?.last7Days?.refilling?.filter(
                    (data) => data?.date === currDay
                  )[0]?.driverSummary
                }
              />
            </div>
          </div>
          {/*
           * SALES AREA CHART
           */}
          {/* <div className="rounded-2xl h-96 p-5 shadow-md bg-white relative">
            {data?.summary.last7Days.refilling && (
              <SalesAreaChart data={data?.summary.last7Days.refilling} />
            )}
          </div> */}
        </div>
        <div className="flex md:w-[30%]">
          {/*
           * ORDERS
           */}
          <div className="flex flex-col p-4 bg-white border shadow-md rounded-3xl w-full">
            <span className="text-2xl font-medium">Orders</span>
            <span className="text-sm text-gray-400 mt-2">
              Showing orders by priority of the delivery
            </span>
            {/* Sort Buttons */}
            <div
              className="grid max-w-xs grid-cols-3 gap-1 p-1 mx-auto my-2 mt-8 bg-gray-100 rounded-lg"
              role="group"
            >
              <button
                type="button"
                className="px-5 py-1.5 text-xs font-medium text-gray-900 hover:bg-gray-200 rounded-lg"
              >
                Old
              </button>
              <button
                type="button"
                className="px-5 py-1.5 text-xs font-medium text-white bg-gray-900 rounded-lg"
              >
                Today
              </button>
              <button
                type="button"
                className="px-5 py-1.5 text-xs font-medium text-gray-900 hover:bg-gray-200 rounded-lg"
              >
                Future
              </button>
            </div>
            {/* Body */}
            <div className="flex justify-center w-full h-full border border-gray-200 mt-5 rounded-lg bg-gray-50">
              <span className="mt-20 text-lg">No Orders</span>
            </div>
          </div>
        </div>
      </div>
    </Wrapper>
  );
}
