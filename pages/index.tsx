import Wrapper from "@/components/Wrapper";
import useAxiosInstance from "@/lib/hooks/useAxiosInstance";
import useCustomers from "@/lib/hooks/useCustomers";
import useInvoice from "@/lib/hooks/useInvoice";
import useRefreshTokenRotation from "@/lib/hooks/useRefreshToken";
import { useSession } from "next-auth/react";
import CurrencyFormat from "react-currency-format";
import { useEffect, useState } from "react";
import Card from "@/components/dashboard/Card";
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
import Loader from "@/components/Loader";

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
    setCurrMonth,
    currMonthIndex,
    currDayIndex,
    setCurrDayIndex,
    setCurrMonthIndex,
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
      setCurrMonth(response.data?.summary.monthly[0].month);
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
    const prevMonth = data?.summary.monthly[currMonthIndex + 1].month;
    setCurrMonth(prevMonth || "");
    setCurrMonthIndex(currMonthIndex + 1);
  };

  // set summary month to next month
  const handleNextMonth = () => {
    const nextMonth = data?.summary.monthly[currMonthIndex - 1].month;
    setCurrMonth(nextMonth || "");
    setCurrMonthIndex(currMonthIndex - 1);
  };

  return (
    <Wrapper breadcrumb={BreadCrumb}>
      {/* <Loader visible /> */}
      <Greetings name={user?.name} />
      <div className="flex">
        <div className="flex mb-4 font-medium w-fit">
          <button
            onClick={handlePrevMonth}
            disabled={currMonthIndex + 1 === data?.summary.monthly.length}
            className="disabled:opacity-0"
          >
            <FaChevronLeft />
          </button>
          <span className={`font-medium w-14 mx-2 text-center`}>
            {currMonth}
          </span>
          <button
            onClick={handleNextMonth}
            disabled={currMonthIndex === 0}
            className="disabled:opacity-0 ml-5"
          >
            <FaChevronRight />
          </button>
        </div>
      </div>
      <div className="flex flex-col w-full mb-20 space-y-5">
        {/*
         * LEVEL 1
         */}
        <div className="grid grid-cols-1 w-full md:grid-cols-3 md:grid-rows-31 gap-3 mt-6 md:mt-0">
          {/* Total Sales */}
          <Card title="Total Sales">
            <CurrencyFormat
              value={
                data?.summary.monthly.filter(
                  (data) => data.month === currMonth
                )[0]?.sales
              }
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
                value={
                  data?.summary.monthly.filter(
                    (data) => data.month === currMonth
                  )[0]?.due
                }
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
              value={
                data?.summary.monthly.filter(
                  (data) => data.month === currMonth
                )[0]?.collected
              }
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

        {/*
         * LEVEL 2
         */}
        <div className="grid grid-cols-1 md:grid-cols-2 grid-rows-1 gap-5">
          {/*
           * DAY SUMMARY SECTION
           */}
          <div className="">
            <div className="w-full h-fit flex flex-col rounded-3xl shadow bg-black py-6">
              {/*
               * HEADER
               */}
              <div className="flex w-full justify-between px-3 items-center">
                <button
                  onClick={handlePrevDay}
                  disabled={
                    currDayIndex + 1 ===
                    data?.summary.last7Days.refilling.length
                  }
                  className="disabled:opacity-50"
                >
                  <FaCaretLeft className="text-gray-300 text-2xl" />
                </button>
                <span className={`text-2xl font-semibold text-white`}>
                  {currDay} Summary
                </span>
                <button
                  onClick={handleNextDay}
                  disabled={currDayIndex === 0}
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
                  {
                    data?.summary?.last7Days?.refilling?.filter(
                      (data) => data?.date === currDay
                    )[0]?.jars
                  }

                  <span className="text-sm text-gray-300 px-2">
                    refilling processed
                  </span>
                </span>
                <span className="text-xl mt-2 text-white">
                  {(data?.summary.last7Days.refilling.filter(
                    (data) => data?.date === currDay
                  )[0]?.jars || 0) * 20}{" "}
                  L
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
                <div className="w-full h-4 bg-gray-600 rounded-xl">
                  <div
                    className={`h-4 bg-gray-300 rounded-xl transition-all duration-500 ease-in-out`}
                    style={{
                      width: `${
                        ((data?.summary.last7Days.refilling.filter(
                          (data) => data?.date === currDay
                        )[0]?.collected || 0) /
                          (data?.summary.last7Days.refilling.filter(
                            (data) => data?.date === currDay
                          )[0]?.sales || 1)) *
                        100
                      }%`,
                    }}
                  >
                    {}
                  </div>
                </div>
                {/* Statements */}
                <div className="mt-5 w-full flex justify-between items-center">
                  {/* Due */}
                  <div className="flex flex-col justify-between items-center">
                    <div className="text-gray-300 text-sm w-full flex items-center">
                      <FaCircle />
                      <span className="text-white text-sm ml-2">Due</span>
                    </div>
                    <CurrencyFormat
                      value={
                        data?.summary.last7Days.refilling.filter(
                          (data) => data?.date === currDay
                        )[0]?.due
                      }
                      displayType={"text"}
                      thousandSeparator={true}
                      prefix={"₹"}
                      renderText={(value) => (
                        <span className="text-white text-lg mt-2 font-semibold">
                          {value}
                        </span>
                      )}
                      decimalScale={0}
                      fixedDecimalScale={true}
                    />
                  </div>

                  {/* Collected */}
                  <div className="flex flex-col justify-between items-center mt-2">
                    <div className="text-gray-300 text-sm w-full flex items-center">
                      <span className="text-white text-sm mr-2">Collected</span>
                      <FaCircle className="text-gray-600" />
                    </div>
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
                        <span className="text-white text-lg mr-2 font-semibold">
                          {value}
                        </span>
                      )}
                      decimalScale={0}
                      fixedDecimalScale={true}
                    />
                  </div>
                </div>
                <button className="text-gray-800 text-sm w-full mb-3 bg-gray-200 rounded-md py-2 mt-8 px-2 text-start">
                  <CurrencyFormat
                    value={
                      data?.summary.last7Days.refilling.filter(
                        (data) => data?.date === currDay
                      )[0]?.sales
                    }
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
                  {
                    data?.summary.last7Days.refilling.filter(
                      (data) => data?.date === currDay
                    )[0]?.jars
                  }{" "}
                  jars
                </button>
              </div>
            </div>
          </div>
          {/*
           * SALES AREA CHART
           */}
          <div className="rounded-2xl p-5 shadow-md bg-white relative">
            {data?.summary.last7Days.refilling && (
              <SalesAreaChart data={data?.summary.last7Days.refilling} />
            )}
          </div>
        </div>

        {/*
         * CUSTOMERS INSIGHT
         */}
        <CustomerInsight
          // top={data?.customers.top}
          total={data?.customers.total}
          regular={data?.customers.regular}
          newCustomers={data?.customers?.new}
        />
        {/*
         * LEVEL 2
         */}
        <div className="flex flex-col w-full">
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
    </Wrapper>
  );
}
