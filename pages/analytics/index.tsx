import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import { Loader2, TrendingDown, Ban, Users } from "lucide-react";
import Wrapper from "@/components/Wrapper";
import useAxiosInstance from "@/lib/hooks/useAxiosInstance";
import useRefreshTokenRotation from "@/lib/hooks/useRefreshToken";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import {
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type AtRisk = {
  name: string;
  status: "stopped" | "reduced";
  recent: number;
  prior: number;
  lastPurchase: string | null;
  daysSinceLast: number | null;
};

type AreaRow = {
  area: string;
  totalCustomers: number;
  activeCustomers: number;
  sales: number;
  collected: number;
  dues: number;
  atRiskCount: number;
  atRisk: AtRisk[];
};

type Analytics = {
  month: string;
  generatedAt: string;
  activeSince: string;
  areas: AreaRow[];
  totals: Omit<AreaRow, "area" | "atRisk">;
};

const inr = (n: number) => "₹" + Math.round(n || 0).toLocaleString("en-IN");

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const monthLabel = (key: string) => {
  const [y, m] = key.split("-").map(Number);
  if (!y || !m) return key;
  return `${MONTH_NAMES[m - 1]} ${y}`;
};

// Last 12 months as "YYYY-MM"
const monthOptions = () => {
  const out: string[] = [];
  const d = new Date();
  for (let i = 0; i < 12; i++) {
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    d.setMonth(d.getMonth() - 1);
  }
  return out;
};

const currentMonthKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

const AnalyticsPage = () => {
  const { data: session } = useSession();
  const axiosInstance = useAxiosInstance(session);
  useRefreshTokenRotation(axiosInstance);

  const [month, setMonth] = useState(currentMonthKey());
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [riskArea, setRiskArea] = useState<AreaRow | null>(null);

  const base = process.env.NEXT_PUBLIC_API_URL;
  const months = useMemo(monthOptions, []);

  const fetchData = useCallback(
    async (key: string) => {
      if (!session) return;
      setLoading(true);
      try {
        const { data } = await axiosInstance.get(
          `${base}/user/area-analytics?month=${key}`
        );
        setData(data);
      } catch (error) {
        console.error(error);
        toast.error("Failed to load area analytics");
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [session]
  );

  useEffect(() => {
    if (session) fetchData(month);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, month]);

  const t = data?.totals;

  const kpis = [
    { label: "Total sales", value: t ? inr(t.sales) : "—", sub: monthLabel(month) },
    { label: "Collected", value: t ? inr(t.collected) : "—", sub: "this month" },
    { label: "Dues", value: t ? inr(t.dues) : "—", sub: "outstanding this month" },
    { label: "Active customers", value: t ? String(t.activeCustomers) : "—", sub: "last 30 days" },
    { label: "Taking less / stopped", value: t ? String(t.atRiskCount) : "—", sub: "declining customers" },
  ];

  return (
    <Wrapper>
      <div className="flex w-full flex-col gap-4">
        {/* Header */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[#0A0A0A]">
              Area Analytics
            </h1>
            <p className="text-[15px] text-[#6B7280]">
              Sales, collection and customer activity by service area
            </p>
          </div>
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="h-11 w-48 shrink-0 rounded-xl border-[#EAEAEA] bg-white text-[15px] font-medium text-[#0A0A0A] shadow-none">
              <span>{monthLabel(month)}</span>
            </SelectTrigger>
            <SelectContent>
              {months.map((m) => (
                <SelectItem key={m} value={m}>
                  {monthLabel(m)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* KPI summary */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {kpis.map((k) => (
            <div
              key={k.label}
              className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm"
            >
              <p className="text-[12px] font-medium uppercase tracking-wide text-[#9CA3AF]">
                {k.label}
              </p>
              <p className="mt-1 text-2xl font-semibold text-[#0A0A0A]">{k.value}</p>
              <p className="text-[12px] text-[#9CA3AF]">{k.sub}</p>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="w-full overflow-auto rounded-2xl border border-[#EAEAEA] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <table className="w-full min-w-[900px] caption-bottom text-[15px]">
            <TableHeader className="sticky top-0 z-10">
              <TableRow className="hover:bg-transparent">
                {[
                  "Area", "Customers", "Active 30d", "Sales", "Collected", "Dues", "Taking less / stopped",
                ].map((h, i) => (
                  <TableHead
                    key={i}
                    className={`whitespace-nowrap border-b border-[#EAEAEA] bg-[#FAFAFA] px-4 py-4 font-medium text-[#0A0A0A] ${
                      i === 0 ? "text-left" : "text-right"
                    }`}
                  >
                    {h}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.areas.map((a) => (
                <TableRow
                  key={a.area}
                  className="border-b border-[#EAEAEA] hover:bg-[#FAFAFA]"
                >
                  <TableCell className="px-4 py-3 font-medium text-[#0A0A0A]">
                    {a.area}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-right text-[#6B7280]">
                    {a.totalCustomers}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-right font-medium text-[#0A0A0A]">
                    {a.activeCustomers}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-right font-medium text-[#0A0A0A]">
                    {inr(a.sales)}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-right text-green-700">
                    {inr(a.collected)}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-right text-[#DC2626]">
                    {inr(a.dues)}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-right">
                    {a.atRiskCount > 0 ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setRiskArea(a)}
                        className="h-8 gap-1.5 rounded-lg px-2.5 font-medium text-[#B45309] hover:bg-amber-50"
                      >
                        <TrendingDown className="h-4 w-4" />
                        {a.atRiskCount}
                      </Button>
                    ) : (
                      <span className="text-[#9CA3AF]">0</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            {data && data.areas.length > 0 && t && (
              <TableFooter className="sticky bottom-0 z-10 border-t border-[#EAEAEA] bg-transparent">
                <TableRow className="font-semibold text-[#0A0A0A] hover:bg-transparent [&>td]:bg-[#FAFAFA]">
                  <TableCell className="px-4 py-3">Total</TableCell>
                  <TableCell className="px-4 py-3 text-right">{t.totalCustomers}</TableCell>
                  <TableCell className="px-4 py-3 text-right">{t.activeCustomers}</TableCell>
                  <TableCell className="px-4 py-3 text-right">{inr(t.sales)}</TableCell>
                  <TableCell className="px-4 py-3 text-right">{inr(t.collected)}</TableCell>
                  <TableCell className="px-4 py-3 text-right">{inr(t.dues)}</TableCell>
                  <TableCell className="px-4 py-3 text-right">{t.atRiskCount}</TableCell>
                </TableRow>
              </TableFooter>
            )}
          </table>

          {loading && (
            <div className="flex items-center justify-center gap-2 py-10 text-gray-500">
              <Loader2 className="h-5 w-5 animate-spin" /> Loading…
            </div>
          )}
          {!loading && data && data.areas.length === 0 && (
            <div className="flex items-center justify-center py-10 text-gray-500">
              No data for {monthLabel(month)}.
            </div>
          )}
        </div>
      </div>

      {/* At-risk customers dialog */}
      <Dialog open={!!riskArea} onOpenChange={(o) => !o && setRiskArea(null)}>
        <DialogContent className="max-h-[80vh] overflow-hidden sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-[#B45309]" />
              {riskArea?.area} · taking less or stopped
            </DialogTitle>
            <DialogDescription>
              {riskArea?.atRiskCount} customers ordering below their prior 30-day
              rate. “Stopped” = no order in the last 30 days.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[52vh] space-y-2 overflow-auto pr-1">
            {riskArea?.atRisk.map((c, i) => (
              <div
                key={`${c.name}-${i}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-[#EAEAEA] px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-medium text-[#0A0A0A]">
                    {c.name}
                  </p>
                  <p className="text-[13px] text-[#6B7280]">
                    {c.recent} vs {c.prior} orders (last 30d vs prior 30d)
                    {c.daysSinceLast != null && ` · last ${c.daysSinceLast}d ago`}
                  </p>
                </div>
                {c.status === "stopped" ? (
                  <Badge
                    variant="secondary"
                    className="shrink-0 gap-1 border-transparent bg-red-100 text-red-700 hover:bg-red-100"
                  >
                    <Ban className="h-3 w-3" /> Stopped
                  </Badge>
                ) : (
                  <Badge
                    variant="secondary"
                    className="shrink-0 gap-1 border-transparent bg-amber-100 text-amber-800 hover:bg-amber-100"
                  >
                    <TrendingDown className="h-3 w-3" /> Reduced
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </Wrapper>
  );
};

export default AnalyticsPage;
