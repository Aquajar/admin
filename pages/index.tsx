import Wrapper from "@/components/Wrapper";
import useAxiosInstance from "@/lib/hooks/useAxiosInstance";
import useRefreshTokenRotation from "@/lib/hooks/useRefreshToken";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { Accordion, AccordionItem } from "@szhsin/react-accordion";
import { ChevronDown, Droplets, IndianRupee, Landmark, Receipt, Wallet } from "lucide-react";
import useAuthUser from "@/lib/hooks/useAuthUser";
import SalesSummary from "@/components/dashboard/SalesSummary";
import { useDashboardStore } from "@/store/dashboardData.store";
import Greetings from "@/components/dashboard/Greetings";
import SalesAreaChart from "@/components/dashboard/SalesAreaChart";
import { useCustomersStore } from "@/store/customers.store";
import { monthsInAnYear } from "@/lib/constants";
import DateSelector from "@/components/dashboard/DateSelector";
import RefillBarChart from "@/components/dashboard/RefillChart";
import DashboardSkeleton from "@/components/dashboard/DashboardSkeleton";
import QuickStats from "@/components/dashboard/QuickStats";
import StatCard, { Em, Trend, inr, num } from "@/components/dashboard/StatCard";

// Section heading: title plus a quiet note; `live` adds a pulsing dot (static when reduced motion is on).
const SectionTitle = ({ title, sub, live }: { title: string; sub?: string; live?: boolean }) => (
  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
    {live && (
      <span className="relative flex size-2" aria-hidden>
        <span className="absolute inline-flex size-full rounded-full bg-emerald-400 opacity-75 motion-safe:animate-ping" />
        <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
      </span>
    )}
    <h2 className="whitespace-nowrap text-sm font-semibold text-gray-900">{title}</h2>
    {sub && <span className="text-sm text-gray-500">{sub}</span>}
  </div>
);

// % change from a to b; null when there is nothing to compare against.
const pctChange = (a?: number, b?: number) => (a && b != null ? ((b - a) / a) * 100 : null);

export default function Home() {
  const { data: session } = useSession();
  const axiosInstance = useAxiosInstance(session);
  useRefreshTokenRotation(axiosInstance);
  const { setCustomers } = useCustomersStore();

  const [salesStatsType, setSalesStatsType] = useState<"weekly" | "monthly" | "yearly">("weekly");

  const [showMonthOptions, setShowMonthOptions] = useState(false);
  const [showYearOptions, setShowYearOptions] = useState(false);

  // Set if the dashboard request fails, so we stop showing the skeleton.
  const [loadFailed, setLoadFailed] = useState(false);

  const {
    data,
    setData,
    currDay,
    setCurrDay,
    currMonth,
    currYear,
    setCurrYear,
    setCurrMonth,
    currDayIndex,
    currMonthlyData,
    setCurrDayIndex,
    setCurrMonthlyData,
  } = useDashboardStore();

  const { user } = useAuthUser();
  const isSuperAdmin = user?.role === "super_admin";

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      let URL = process.env.NEXT_PUBLIC_API_URL + "/user/dashboard";
      const response = await axiosInstance.get(URL);
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
      setLoadFailed(true);
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

  // The store starts empty; the daily series is the first thing the page needs.
  const isLoading = !data?.summary?.last7Days?.refilling?.length && !loadFailed;

  if (isLoading) {
    return (
      <Wrapper>
        <Greetings name={user?.name} />
        <DashboardSkeleton showAdminTools={isSuperAdmin} />
      </Wrapper>
    );
  }

  // Selected day and the one before it (the series is newest first).
  const days = data?.summary?.last7Days?.refilling || [];
  const dayIdx = days.findIndex((d) => d?.date === currDay);
  const day = dayIdx >= 0 ? (days[dayIdx] as (typeof days)[number] & { d2cSales?: number; b2bSales?: number }) : undefined;
  const prev = dayIdx >= 0 ? days[dayIdx + 1] : undefined;
  const prevLabel = prev?.date || "previous day";
  const collectedPct = day?.sales ? Math.min(100, Math.round((day.collected / day.sales) * 100)) : null;

  // Average/day over the days elapsed in the chosen month (all of them for a past month).
  const monthIdx = monthsInAnYear.indexOf(currMonth);
  const now = new Date();
  const isThisMonth = currYear === now.getFullYear() && monthIdx === now.getMonth();
  const daysInPeriod = isThisMonth ? now.getDate() : new Date(currYear, monthIdx + 1, 0).getDate();

  const thisYear = data?.summary?.monthly.find((i) => i.year === now.getFullYear())?.data;
  const salesChartData =
    salesStatsType === "weekly"
      ? days
      : salesStatsType === "monthly"
        ? thisYear?.slice(-6).reverse()
        : thisYear?.slice().reverse();

  return (
    <Wrapper>
      <Greetings
        name={user?.name}
        right={
          <DateSelector
            showYearOptions={showYearOptions}
            setShowYearOptions={setShowYearOptions}
            totalDataLength={days.length}
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
            showPeriod={isSuperAdmin}
          />
        }
      />

      <div className="flex w-full flex-col gap-6">
        {/*
         * SUPER ADMIN: monthly + all-time money figures
         */}
        {isSuperAdmin && (
          <Accordion>
            <AccordionItem
              buttonProps={{
                className:
                  "w-full rounded-xl border bg-white px-3 py-2.5 shadow-sm transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
              }}
              header={({ state }) => (
                <span className="flex items-center gap-2 text-left">
                  <Landmark size={16} className="text-gray-500" aria-hidden />
                  <span className="text-sm font-semibold text-gray-900">Business Totals</span>
                  <span className="text-sm text-gray-500">
                    {currMonth} {currYear} · super admin only
                  </span>
                  <ChevronDown
                    size={16}
                    aria-hidden
                    className={`ml-auto text-gray-500 transition-transform duration-200 ${state.isEnter ? "rotate-180" : ""}`}
                  />
                </span>
              )}
            >
              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="contents">
                  <StatCard title={`Sales in ${currMonth}`} icon={Receipt} value={inr(currMonthlyData?.sales)}>
                    {currMonthlyData ? (
                      <>
                        About <Em>{inr(currMonthlyData.sales / daysInPeriod)}</Em> a day, with <Em>{num(currMonthlyData.jars)}</Em> jars.
                      </>
                    ) : (
                      <>No sales recorded for this month.</>
                    )}
                  </StatCard>
                  <StatCard title={`Receivables from ${currMonth}`} icon={Wallet} value={inr(currMonthlyData?.due)}>
                    Still to be collected from this month&apos;s sales.
                  </StatCard>
                </div>
                <SalesSummary
                  totalSales={data?.summary.total.sales || 0}
                  totalDue={data?.summary.total.due || 0}
                  totalCollected={data?.summary.total.collected || 0}
                />
              </div>
            </AccordionItem>
          </Accordion>
        )}

        {/*
         * SELECTED DAY
         */}
        <section className="flex flex-col gap-3" aria-label="Day summary">
          <SectionTitle title="Day Summary" sub={currDay} />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <StatCard title="Jars Processed" icon={Droplets} value={num(day?.jars)} unit="jars">
              <Trend pct={pctChange(prev?.jars, day?.jars)} vs={prevLabel} />
            </StatCard>
            <StatCard title="Total Sales" icon={IndianRupee} value={inr(day?.sales)}>
              <div className="flex flex-col gap-1">
                <span>
                  <Em>{inr(day?.d2cSales || 0)}</Em> from D2C and <Em>{inr(day?.b2bSales || 0)}</Em> from B2B.
                </span>
                <Trend pct={pctChange(prev?.sales, day?.sales)} vs={prevLabel} />
              </div>
            </StatCard>
            <StatCard title="Total Collection" icon={Wallet} value={inr(day?.collected)}>
              <div className="flex flex-col gap-2">
                <div
                  className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100"
                  role="progressbar"
                  aria-label="Share of sales collected"
                  aria-valuenow={collectedPct ?? 0}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div className="h-full rounded-full bg-emerald-500 transition-[width] duration-500" style={{ width: `${collectedPct ?? 0}%` }} />
                </div>
                <span>
                  {collectedPct == null ? (
                    <>No sales on this day.</>
                  ) : !day?.due ? (
                    <>Everything has been collected.</>
                  ) : collectedPct === 0 ? (
                    <>
                      Nothing collected yet, <Em>{inr(day.due)}</Em> still due.
                    </>
                  ) : (
                    <>
                      <Em>{collectedPct}%</Em> collected, <Em>{inr(day.due)}</Em> still due.
                    </>
                  )}
                </span>
              </div>
            </StatCard>
          </div>
        </section>

        {/*
         * LIVE UPDATES
         */}
        <section className="flex flex-col gap-3" aria-label="Live updates">
          <SectionTitle title="Live Updates" sub="Today, from tracking, HR and vehicle logs" live />
          <QuickStats axiosInstance={axiosInstance} />
        </section>

        {/*
         * TRENDS
         */}
        <section className="flex flex-col gap-3" aria-label="Trends">
          <SectionTitle title="Trends" />
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <RefillBarChart chartData={days} />
            {/* @ts-ignore month rows have no date/driverSummary; the chart switches its x-axis key */}
            {salesChartData && <SalesAreaChart setSalesStatsType={setSalesStatsType} salesStatsType={salesStatsType} chartData={salesChartData} />}
          </div>
        </section>

      </div>
    </Wrapper>
  );
}
