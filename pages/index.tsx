import Wrapper from "@/components/Wrapper";
import useAxiosInstance from "@/lib/hooks/useAxiosInstance";
import useRefreshTokenRotation from "@/lib/hooks/useRefreshToken";
import { useSession } from "next-auth/react";
import CurrencyFormat from "react-currency-format";
import { useEffect, useState } from "react";
import Card from "@/components/dashboard/Card";
import { Accordion, AccordionItem } from "@szhsin/react-accordion";
import { SlCalender } from "react-icons/sl";
import { TbLayoutNavbarExpand } from "react-icons/tb";
import {
  FaCaretLeft,
  FaCaretRight,
  FaChevronLeft,
  FaChevronRight,
  FaCircle,
} from "react-icons/fa";
import { FaAngleUp, FaAngleRight } from "react-icons/fa6";
import useAuthUser from "@/lib/hooks/useAuthUser";
import CustomerInsight from "@/components/dashboard/CustomerInsight";
import SalesSummary from "@/components/dashboard/SalesSummary";
import { useDashboardStore } from "@/store/dashboardData.store";
import Greetings from "@/components/dashboard/Greetings";
import SalesAreaChart from "@/components/dashboard/SalesAreaChart";
import { useCustomersStore } from "@/store/customers.store";
import { useInvoicesStore } from "@/store/invoices.store";
import DriverSalesBarGraph from "@/components/Driver/Charts/BarGraph";
import { monthAbbr, monthsInAnYear } from "@/lib/constants";
import DriverSalesCollection from "@/components/Driver/Collection";
import { IoIosTrendingUp, IoIosTrendingDown } from "react-icons/io";
import Suggestions from "@/components/dashboard/Suggestions";
import MonthlySummary from "@/components/dashboard/MonthlySummary";
import DateSelector from "@/components/dashboard/DateSelector";
import RefillBarChart from "@/components/dashboard/RefillChart";


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

  const [salesStatsType, setSalesStatsType] = useState<"weekly" | "monthly" | "yearly">("weekly");

  const [jarPercertageChange, setJarPercertageChange] = useState(0);
  const [salePercertageChange, setSalePercertageChange] = useState(0);

  const [showMonthOptions, setShowMonthOptions] = useState(false);
  const [showYearOptions, setShowYearOptions] = useState(false);

  const [superAdminToolsIsexpanded, setSuperAdminToolsIsexpanded] =
    useState(false);

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

  // Change the current month
  const handleChangeMonth = (month: string) => {
    setCurrMonth(month);

    const yearlyData = data?.summary.monthly.find((data) => {
      return data.year === currYear;
    });

    const newMonthlyData = yearlyData?.data.find(
      (item) => item.month === month
    );

    setCurrMonthlyData(newMonthlyData);
    setShowMonthOptions(false);
  };

  // Change the current year
  const handleChangeYear = (year: number) => {
    setCurrYear(year);
    setShowMonthOptions(false);

    const yearlyData = data?.summary.monthly.find((data) => {
      return data.year === year;
    });

    const newMonthlyData = yearlyData?.data.find(
      (item) => item.month === currMonth
    );

    setCurrMonthlyData(newMonthlyData);

    setShowYearOptions(false);
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


  console.log(data)

  return (
    <Wrapper breadcrumb={BreadCrumb}>
      {/* <Loader visible /> */}
      <Greetings name={user?.name} />
      {/*
       * DATE SELECTOR
       */}
      <DateSelector
        showYearOptions={showYearOptions}
        setShowYearOptions={setShowYearOptions}
        totalDataLength={data?.summary.last7Days.refilling.length}
        currDay={currDay}
        handlePrevDay={handlePrevDay}
        handleNextDay={handleNextDay}
        handleChangeMonth={handleChangeMonth}
        handleChangeYear={handleChangeYear}
        setShowMonthOptions={setShowMonthOptions}
        showMonthOptions={showMonthOptions}
        currMonth={currMonth}
        currDayIndex={currDayIndex}
        currYear={currYear}
      />
      {/*
       * CARDS
       */}
      <div className="flex w-full md:flex-row flex-col">
        <div className="flex flex-col space-y-5 w-full">
          {/*
           * MONTHLY INSIGHT
           */}
          {user?.role === "super_admin" && <Accordion
            onStateChange={({ key, current }) => {
              if (current.isResolved) {
                console.log(`${key as string} is expanded: ${current.isEnter}`);
                setSuperAdminToolsIsexpanded(current.isEnter);
              }
            }}
          // transition
          // transitionTimeout={250}
          >
            <AccordionItem
              header={() => (
                <span className="font-medium flex items-center justify-center text-gray-400">
                  Super Admin Tools
                  {!superAdminToolsIsexpanded ? (
                    <TbLayoutNavbarExpand
                      className="ml-2 text-gray-700"
                      size={19}
                    />
                  ) : (
                    <FaAngleUp className="ml-2 text-gray-700" size={18} />
                  )}
                </span>
              )}
            >
              {user?.role === "super_admin" && (
                <div className="flex flex-col mt-2 border-b pb-5">
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
                          <span className="text-sm text-gray-600">
                            Average/day
                          </span>
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
            </AccordionItem>
          </Accordion>}
          <div className="grid md:grid-cols-12 gap-3">
            <div className="md:col-span-3">
              {/*
           * DAY SUMMARY SECTION
           */}
              <div className="w-full grid md:grid-cols-1 gap-5 rounded-3xl">
                {/*
             * JARS
             */}
                <div className="flex flex-col space-y-3 p-4 bg-white  border  shadow-sm rounded-2xl">
                  <span style={{
                    fontSize: '15px',
                  }} className="text-gray-700 font-medium">Jars Processed</span>
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
                        className={`${jarPercertageChange > 0
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
                <div className="flex flex-col space-y-3 p-4 bg-white  border  shadow-sm rounded-2xl">
                  <span style={{
                    fontSize: '15px',
                  }} className="text-gray-700 font-medium">Total Sales</span>
                  <CurrencyFormat
                    value={
                      data?.summary?.last7Days?.refilling?.find(
                        (data) => data?.date === currDay
                      )?.sales
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
                        className={`${salePercertageChange > 0
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
                <div className="flex flex-col space-y-3 p-4 bg-white  border  shadow-sm rounded-2xl">
                  <span style={{
                    fontSize: '15px',
                  }} className="text-gray-700 font-medium">Total Collection</span>
                  <CurrencyFormat
                    value={
                      data?.summary?.last7Days?.refilling?.find(
                        (data) => data?.date === currDay
                      )?.collected
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
            </div>
            <div className="md:col-span-9 grid md:grid-cols-2 gap-3">
              <RefillBarChart chartData={data?.summary?.last7Days?.refilling} />
              {/* @ts-ignore */}
              {data?.summary?.last7Days?.refilling && data?.summary?.monthly.find((i) => i.year === new Date().getFullYear())?.data && <SalesAreaChart setSalesStatsType={setSalesStatsType} salesStatsType={salesStatsType} chartData={salesStatsType === "weekly" ? data?.summary?.last7Days?.refilling : data?.summary?.monthly.find((i) => i.year === new Date().getFullYear())?.data.slice(-6).reverse()} />}
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
              {/* <Suggestions data={data?.suggestion} />

              <div className="w-full">
                <CustomerInsight
                  // top={data?.customers.top}
                  total={data?.customers.total}
                  regular={data?.customers.regular}
                  newCustomers={data?.customers?.new}
                />
              </div> */}
            </div>

            {/*
             * LEVEL 3
             */}
            <div className="flex flex-col gap-5">
              {/*
               * DRIVER SALES STATS
               */}
              {/* <DriverSalesCollection
                data={
                  data?.summary?.last7Days?.refilling?.filter(
                    (data) => data?.date === currDay
                  )[0]?.driverSummary
                }
              /> */}

              {/*
               * DRIVER SALES BAR GRAPH
               */}
              {/* <DriverSalesBarGraph
                data={
                  data?.summary?.last7Days?.refilling?.filter(
                    (data) => data?.date === currDay
                  )[0]?.driverSummary
                }
              /> */}
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
      </div>
    </Wrapper>
  );
}
