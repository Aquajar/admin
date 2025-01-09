import Wrapper from "@/components/Wrapper";
import useAxiosInstance from "@/lib/hooks/useAxiosInstance";
import useRefreshTokenRotation from "@/lib/hooks/useRefreshToken";
import { useSession } from "next-auth/react";
import CurrencyFormat from "react-currency-format";
import { useEffect } from "react";
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
import { IoIosTrendingUp } from "react-icons/io";

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
  const { setInvoices } = useInvoicesStore();

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
        <div className="inline-flex rounded-md shadow-sm" role="group">
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
            <div className="grid grid-cols-1 w-full md:grid-cols-3 md:grid-rows-31 gap-3 mt-6 md:mt-0">
              {/* Total Sales */}
              <Card title="Total Sales">
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
                {/* <span className="bg-green-100 text-green-800 text-xs font-medium inline-flex items-center px-2.5 py-1 rounded-md dark:bg-green-900 dark:text-green-300">
                  <svg
                    className="w-2.5 h-2.5 me-1.5"
                    aria-hidden="true"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 10 14"
                  >
                    <path
                      stroke="currentColor"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M5 13V1m0 0L1 5m4-4 4 4"
                    />
                  </svg>
                  Profit rate 23.5%
                </span> */}
              </Card>
              {/* Total Dues */}
              <Card title="Total Dues">
                <div className="flex justify-between items-start">
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
              {/* Total Collected */}
              <Card title="Total Collected">
                <CurrencyFormat
                  value={currMonthlyData?.collected}
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
            </div>
          )}
          {/*
           * DAY SUMMARY SECTION
           */}
          <div className="w-full grid md:grid-cols-3 gap-5 rounded-3xl">
            {/*
             * JARS
             */}
            <div className="flex flex-col space-y-5 p-4 bg-white  border  shadow-sm rounded-3xl">
              <span className="text-sm text-gray-600">Jars Processed</span>
              <span className="text-4xl font-bold">
                {
                  data?.summary?.last7Days?.refilling?.filter(
                    (data) => data?.date === currDay
                  )[0]?.jars
                }
              </span>
              <div className="flex space-x-2">
                <IoIosTrendingUp className="text-green-500" size={25} />
                <span className="text-green-500 text-sm">+21%</span>
                <span className="text-sm">from yesterday</span>
              </div>
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
            <div className="flex flex-col space-y-5 p-4 bg-white  border  shadow-sm rounded-3xl">
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
              <div className="flex space-x-2">
                <IoIosTrendingUp className="text-green-500" size={25} />
                <span className="text-green-500 text-sm">+21%</span>
                <span className="text-sm">from yesterday</span>
              </div>
            </div>
            {/*
             * TOTAL COLLECTION
             */}
            <div className="flex flex-col space-y-5 p-4 bg-white border  shadow-sm rounded-3xl">
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
              {/*
               * SUGGESTION
               */}
              <div className="h-full border rounded-3xl flex flex-col shadow-sm bg-white p-4">
                <span className="text-2xl font-medium">Suggestion</span>
                <span className="text-gray-400 text-sm mt-2">
                  Showing the suggestion of customers that require the delivery
                </span>

                <div className="flex items-center justify-center h-full mt-5">
                  <div className="flex items-center justify-center w-full h-full border border-gray-200 rounded-lg bg-gray-50">
                    {/* <div role="status">
                      <svg
                        aria-hidden="true"
                        className="w-8 h-8 text-gray-200 animate-spin dark:text-gray-600 fill-blue-600"
                        viewBox="0 0 100 101"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                          fill="currentColor"
                        />
                        <path
                          d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                          fill="currentFill"
                        />
                      </svg>
                      <span className="sr-only">Loading...</span>
                    </div> */}
                    <span className="" >
                      Coming Soon
                    </span>
                  </div>
                </div>
              </div>
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
               * DRIVER SALES COLLECTION
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

              {/*
               * SALES SUMMARY
               */}
              {user?.role === "super_admin" && (
                <div className="w-full">
                  <SalesSummary
                    totalSales={data?.summary.total.sales || 0}
                    totalDue={data?.summary.total.due || 0}
                    totalCollected={data?.summary.total.collected || 0}
                  />
                </div>
              )}
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
          <div className="flex flex-col p-4 bg-white border shadow-sm rounded-3xl w-full">
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
