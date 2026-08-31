import React, { FC, useCallback, useEffect, useMemo, useState } from "react";
import type { AxiosInstance } from "axios";
import { Session } from "next-auth";
import toast from "react-hot-toast";
import {
  IndianRupee,
  Truck,
  Droplets,
  Gauge,
  SlidersHorizontal,
  FileSpreadsheet,
  Loader2,
  AlertCircle,
  ArrowUp,
  ArrowDown,
  ChevronsUpDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { EarningsResponse, StaffEarning, TripRateConfig } from "@/types/types";
import RatesDialog from "@/components/HR/RatesDialog";

type SortKey =
  | "name"
  | "role"
  | "daysWorked"
  | "trips"
  | "jars"
  | "earned"
  | "perDay";

interface Props {
  session: Session | null;
  axiosInstance: AxiosInstance;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const currentMonthKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

const monthLabel = (key: string) => {
  const [y, m] = key.split("-").map(Number);
  return y && m ? `${MONTH_NAMES[m - 1]} ${y}` : key;
};

const inr = (n: number) =>
  "₹" + (Math.round((n || 0) * 100) / 100).toLocaleString("en-IN");

const EarningsTab: FC<Props> = ({ session, axiosInstance }) => {
  const base = process.env.NEXT_PUBLIC_API_URL;
  const [month, setMonth] = useState(currentMonthKey());
  const [months, setMonths] = useState<string[]>([]);
  const [data, setData] = useState<EarningsResponse | null>(null);
  const [config, setConfig] = useState<TripRateConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [ratesOpen, setRatesOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("earned");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const fetchMonths = useCallback(async () => {
    try {
      const { data } = await axiosInstance.get(`${base}/vehicle-log/months`);
      setMonths((data.months || []).map((m: { month: string }) => m.month));
    } catch {
      /* non-fatal */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchEarnings = useCallback(
    async (key: string) => {
      setLoading(true);
      try {
        const [earn, cfg] = await Promise.all([
          axiosInstance.get(`${base}/vehicle-log/earnings?month=${key}`),
          axiosInstance.get(`${base}/trip-rate`),
        ]);
        setData(earn.data);
        setConfig(cfg.data.config);
      } catch (error) {
        console.error(error);
        toast.error("Failed to load earnings");
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  useEffect(() => {
    if (session) {
      fetchEarnings(month);
      fetchMonths();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, month]);

  const monthOptions = useMemo(() => {
    const set = new Set<string>(months);
    set.add(currentMonthKey());
    set.add(month);
    return Array.from(set).sort((a, b) => (a < b ? 1 : -1));
  }, [months, month]);

  const rows = data?.rows || [];
  const totals = data?.totals;

  const sortedRows = useMemo(() => {
    const copy = [...(data?.rows || [])];
    copy.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      const cmp =
        typeof av === "string"
          ? String(av).localeCompare(String(bv))
          : (Number(av) || 0) - (Number(bv) || 0);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [data, sortKey, sortDir]);

  const toggleSort = (key: SortKey, isText = false) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(isText ? "asc" : "desc");
    }
  };

  // A sortable header cell with a direction indicator.
  const sortHead = (
    label: string,
    key: SortKey,
    align: "left" | "right" = "right",
    isText = false
  ) => (
    <th
      className={`whitespace-nowrap px-6 py-4 font-medium text-[#0A0A0A] ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      <button
        type="button"
        onClick={() => toggleSort(key, isText)}
        className={`inline-flex w-full items-center gap-1.5 transition hover:opacity-70 ${
          align === "right" ? "justify-end" : "justify-start"
        }`}
      >
        <span>{label}</span>
        {sortKey === key ? (
          sortDir === "asc" ? (
            <ArrowUp className="h-3.5 w-3.5 text-[#0A0A0A]" />
          ) : (
            <ArrowDown className="h-3.5 w-3.5 text-[#0A0A0A]" />
          )
        ) : (
          <ChevronsUpDown className="h-3.5 w-3.5 text-[#9CA3AF]" />
        )}
      </button>
    </th>
  );

  const handleExport = async () => {
    if (!data || rows.length === 0) {
      toast.error("Nothing to export");
      return;
    }
    setExporting(true);
    try {
      const XLSX = await import("xlsx");
      const header = ["Person", "Role", "Days Worked", "Trips", "Jars", "Total Earned", "Per Day"];
      const body = sortedRows.map((r) => [
        r.name,
        r.role === "driver" ? "Driver" : "Labour",
        r.daysWorked,
        r.trips,
        r.jars,
        r.earned,
        r.perDay,
      ]);
      const totalRow = ["TOTAL", "", "", totals?.trips ?? "", totals?.jarsDelivered ?? "", totals?.totalEarned ?? "", ""];
      const aoa = [
        [`AQUAJAR EARNINGS — ${monthLabel(month).toUpperCase()}`],
        [],
        header,
        ...body,
        [],
        totalRow,
        [],
        ["Trips", totals?.trips ?? ""],
        ["Jars delivered (trip level)", totals?.jarsDelivered ?? ""],
        ["Wage cost per jar", totals?.wageCostPerJar ?? ""],
      ];
      const ws = XLSX.utils.aoa_to_sheet(aoa);
      ws["!cols"] = [{ wch: 20 }, { wch: 10 }, { wch: 12 }, { wch: 8 }, { wch: 8 }, { wch: 14 }, { wch: 10 }];
      ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 6 } }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Earnings");
      XLSX.writeFile(wb, `Aquajar-Earnings-${month}.xlsx`);
    } catch (error) {
      console.error(error);
      toast.error("Export failed");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="h-11 w-44 shrink-0 rounded-xl border border-[#EAEAEA] bg-white px-3 text-[15px] font-medium text-[#0A0A0A] hover:border-[#D4D4D4] focus:border-[#2563EB] focus:outline-none focus:ring-[3px] focus:ring-[#2563EB]/15"
          >
            {monthOptions.map((m) => (
              <option key={m} value={m}>
                {monthLabel(m)}
              </option>
            ))}
          </select>
          {config && (
            <span className="hidden text-[13px] text-[#6B7280] md:inline">
              D&nbsp;{inr(config.rates.driver.airport)}/{inr(config.rates.driver.local)}
              &nbsp;·&nbsp;L&nbsp;{inr(config.rates.labour.airport)}/{inr(config.rates.labour.local)}
              &nbsp;(air/local per jar)
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setRatesOpen(true)}
            className="h-11 rounded-xl border-[#EAEAEA] px-5 text-[15px] font-medium text-[#0A0A0A] shadow-none hover:bg-[#FAFAFA]"
          >
            <SlidersHorizontal className="mr-2 h-4 w-4" />
            Edit Rates
          </Button>
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={exporting}
            className="h-11 rounded-xl border-[#EAEAEA] px-5 text-[15px] font-medium text-[#0A0A0A] shadow-none hover:bg-[#FAFAFA]"
          >
            {exporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="mr-2 h-4 w-4" />
            )}
            Export
          </Button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Total Wage"
          value={loading ? "…" : inr(totals?.totalEarned ?? 0)}
          icon={<IndianRupee className="h-5 w-5" />}
        />
        <StatCard
          label="Trips"
          value={loading ? "…" : totals?.trips ?? 0}
          icon={<Truck className="h-5 w-5" />}
        />
        <StatCard
          label="Jars Delivered"
          value={loading ? "…" : totals?.jarsDelivered ?? 0}
          icon={<Droplets className="h-5 w-5" />}
        />
        <StatCard
          label="Wage / Jar"
          value={loading ? "…" : inr(totals?.wageCostPerJar ?? 0)}
          icon={<Gauge className="h-5 w-5" />}
        />
      </div>

      {/* Earnings table */}
      <div className="w-full overflow-x-auto rounded-2xl border border-[#EAEAEA] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <table className="w-full min-w-[720px] text-[15px]">
          <thead className="border-b border-[#EAEAEA] bg-[#FAFAFA] text-[#0A0A0A]">
            <tr>
              {sortHead("Person", "name", "left", true)}
              {sortHead("Role", "role", "left", true)}
              {sortHead("Days", "daysWorked")}
              {sortHead("Trips", "trips")}
              {sortHead("Jars", "jars")}
              {sortHead("Total Earned", "earned")}
              {sortHead("Per Day", "perDay")}
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((r: StaffEarning) => (
              <tr
                key={r.name}
                className="border-b border-[#EAEAEA] transition-colors hover:bg-[#FAFAFA]"
              >
                <td className="px-6 py-4 font-medium text-[#0A0A0A]">
                  <span className="flex items-center gap-2">
                    {r.name}
                    {!r.matched && (
                      <span
                        title="Not linked to a staff record"
                        className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-2 py-0.5 text-[12px] font-semibold text-amber-800"
                      >
                        <AlertCircle className="h-3 w-3" />
                        unlinked
                      </span>
                    )}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`rounded-full px-3 py-1 text-[13px] font-medium capitalize ${
                      r.role === "driver"
                        ? "bg-blue-100 text-blue-900"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {r.role}
                  </span>
                </td>
                <td className="px-6 py-4 text-right text-[#0A0A0A]">{r.daysWorked}</td>
                <td className="px-6 py-4 text-right text-[#0A0A0A]">{r.trips}</td>
                <td className="px-6 py-4 text-right text-[#0A0A0A]">{r.jars}</td>
                <td className="px-6 py-4 text-right font-semibold text-[#0A0A0A]">
                  {inr(r.earned)}
                </td>
                <td className="px-6 py-4 text-right text-[#6B7280]">{inr(r.perDay)}</td>
              </tr>
            ))}
          </tbody>
          {rows.length > 0 && totals && (
            <tfoot>
              <tr className="border-t border-[#EAEAEA] bg-[#FAFAFA] font-semibold text-[#0A0A0A]">
                <td className="px-6 py-4" colSpan={3}>
                  Total
                </td>
                <td className="px-6 py-4 text-right">{totals.trips}</td>
                <td className="px-6 py-4 text-right">{totals.jarsDelivered}</td>
                <td className="px-6 py-4 text-right">{inr(totals.totalEarned)}</td>
                <td className="px-6 py-4" />
              </tr>
            </tfoot>
          )}
        </table>

        {loading && (
          <div className="flex items-center justify-center gap-2 py-10 text-gray-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            Calculating earnings…
          </div>
        )}
        {!loading && rows.length === 0 && (
          <div className="py-10 text-center text-gray-500">
            No trips logged for {monthLabel(month)}.
          </div>
        )}
      </div>

      <RatesDialog
        open={ratesOpen}
        onOpenChange={setRatesOpen}
        axiosInstance={axiosInstance}
        config={config}
        onSaved={() => fetchEarnings(month)}
      />
    </div>
  );
};

const StatCard: FC<{
  label: string;
  value: string | number;
  icon: React.ReactNode;
}> = ({ label, value, icon }) => (
  <div className="flex items-center gap-3 rounded-2xl border border-[#EAEAEA] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F5F5F5] text-[#6B7280]">
      {icon}
    </div>
    <div className="min-w-0">
      <div className="truncate text-[13px] text-[#6B7280]">{label}</div>
      <div className="text-lg font-semibold leading-tight text-[#0A0A0A]">
        {value}
      </div>
    </div>
  </div>
);

export default EarningsTab;
