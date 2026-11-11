import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import {
  Plus,
  Download,
  BarChart3,
  RefreshCw,
  Pencil,
  Trash2,
  Loader2,
  Car,
  Truck,
  Check,
  X,
  MapPin,
  ClipboardCheck,
} from "lucide-react";
import Link from "next/link";
import useRefreshTokenRotation from "@/lib/hooks/useRefreshToken";
import { REASONS } from "@/lib/tracking";
import Wrapper from "@/components/Wrapper";
import useAxiosInstance from "@/lib/hooks/useAxiosInstance";
import useVehicleLogOptions from "@/lib/hooks/useVehicleLogOptions";
import { VehicleLog } from "@/types/types";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import AddLogDialog from "@/components/VehicleLog/AddLogDialog";
import ExportDialog from "@/components/VehicleLog/ExportDialog";
import MonthSelect, { currentMonthKey, monthLabel } from "@/components/VehicleLog/MonthSelect";

const inr = (n: number) => "₹" + Math.round(n || 0).toLocaleString("en-IN");

// How an entry got here when it was not a vehicle QR scan or a GPS trip.
const KIND: Record<string, string> = { admin: "Admin entry", sheet: "Sheet entry", app: "App entry" };
// GPS-only trips, and QR / admin entries the phones' GPS does not back up.
const needsAttention = (l: VehicleLog) =>
  !!l.virtual || (l.source === "gps" && l.status === "pending") || l.gpsCheck?.state === "mismatch";

// The "how was it recorded" filter: GPS found the trip, the crew scanned the QR, or both agree.
const SOURCES = [
  { value: "gps", label: "GPS only" },
  { value: "matched", label: "GPS + QR matched" },
  { value: "qr", label: "QR scan only" },
];
const sourceOf = (l: VehicleLog) =>
  l.virtual || l.source === "gps" ? "gps" : l.source === "qr" ? (l.gpsCheck?.state === "match" ? "matched" : "qr") : "";

const TONE = {
  green: "bg-green-100 text-green-800",
  amber: "bg-amber-100 text-amber-800",
  red: "bg-red-100 text-red-800",
  orange: "bg-orange-100 text-orange-800",
  blue: "bg-blue-100 text-blue-800",
  gray: "bg-gray-100 text-gray-700",
};
const Pill = ({ tone, children }: { tone: keyof typeof TONE; children: React.ReactNode }) => (
  <span className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${TONE[tone]}`}>{children}</span>
);
const dash = <span className="text-[#9CA3AF]">—</span>;

const QrStatus = ({ log }: { log: VehicleLog }) =>
  log.source === "qr" ? (
    <>
      <Pill tone="green">Scanned</Pill>
      {log.scanAt && (
        <div className="mt-1 text-xs text-[#6B7280]">
          {new Date(log.scanAt).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}
        </div>
      )}
    </>
  ) : log.virtual || log.source === "gps" ? (
    <Pill tone="amber">Not scanned</Pill>
  ) : (
    <span className="whitespace-nowrap text-xs text-[#6B7280]">{KIND[log.source || "sheet"]}</span>
  );

const GpsStatus = ({ log }: { log: VehicleLog }) => {
  const check = log.gpsCheck?.state;
  return (
    <>
      {log.virtual || log.source === "gps" ? (
        <Pill tone="blue">GPS trip{log.gps?.distanceKm ? ` · ${log.gps.distanceKm} km` : ""}</Pill>
      ) : check === "match" ? (
        <Pill tone="green">Matched</Pill>
      ) : check === "waiting" ? (
        <Pill tone="gray">Waiting</Pill>
      ) : check === "mismatch" ? (
        <>
          <Pill tone="orange">No match</Pill>
          <div className="mt-1 max-w-[180px] text-xs text-orange-700">{log.gpsCheck?.reason}</div>
        </>
      ) : (
        dash
      )}
      {log.gps?.reasonCodes?.length ? (
        <div className="mt-1 flex max-w-[180px] flex-wrap gap-1">
          {log.gps.reasonCodes.map((c) => (
            <span key={c} className="rounded bg-gray-100 px-1 text-[11px] text-gray-700">
              {REASONS[c] || c}
            </span>
          ))}
        </div>
      ) : null}
    </>
  );
};

const LogStatus = ({ log }: { log: VehicleLog }) => (
  <Pill tone={log.status === "pending" || log.status === "unlogged" ? "amber" : log.status === "rejected" ? "red" : "green"}>
    {log.status === "unlogged" ? "Not logged" : log.status === "pending" ? "Pending" : log.status === "rejected" ? "Rejected" : "Approved"}
  </Pill>
);

type Tab = "all" | "pending" | "attention" | "approved" | "rejected";
const TABS: { key: Tab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "To review" },
  { key: "attention", label: "Needs attention" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
];

const COLUMNS = [
  "#", "Date", "Dep.", "Arr.", "Staff", "Location", "Vehicle", "QR", "GPS", "Status",
  "Out", "Return", "Engaged", "Filled", "Empty", "Recorded", "Cash", "Actions",
];
const NUMERIC = ["Out", "Return", "Engaged", "Filled", "Empty", "Recorded", "Cash"];
const SUM_KEYS = ["out", "returned", "engaged", "filled", "empty", "recorded"] as const;

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};
// Local YYYY-MM-DD, the same day fmtDate shows.
const dayKey = (iso: string) => new Date(iso).toLocaleDateString("en-CA");

// Kept while the admin is on another page (a trip's GPS route), so coming back shows
// the same list, filters and scroll position at once instead of loading from scratch.
const saved: {
  month?: string;
  tab?: Tab;
  staff?: string;
  kind?: string;
  day?: string;
  logs?: VehicleLog[];
  pendingAll?: VehicleLog[];
  months?: string[];
  scrollTop?: number;
} = {};

const VehicleLogPage = () => {
  const { data: session } = useSession();
  const axiosInstance = useAxiosInstance(session);
  useRefreshTokenRotation(axiosInstance);
  const { areaNames, staffNames, refresh: refreshOptions } =
    useVehicleLogOptions(session);

  const [month, setMonth] = useState(saved.month || currentMonthKey());
  const [availableMonths, setAvailableMonths] = useState<string[]>(saved.months || []);
  const [logs, setLogs] = useState<VehicleLog[]>(saved.logs || []);
  // The month `logs` belongs to (it lags `month` while a new month loads).
  const [loadedMonth, setLoadedMonth] = useState(saved.logs ? saved.month : "");
  // Every trip still waiting for approval, whatever its month.
  const [pendingAll, setPendingAll] = useState<VehicleLog[]>(saved.pendingAll || []);
  const [loading, setLoading] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [editing, setEditing] = useState<VehicleLog | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<VehicleLog | null>(null);
  const [reviewTarget, setReviewTarget] = useState<VehicleLog | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [tab, setTab] = useState<Tab>(saved.tab || "all");
  const [staffFilter, setStaffFilter] = useState(saved.staff || "");
  const [kind, setKind] = useState(saved.kind || "");
  const [day, setDay] = useState(saved.day || ""); // YYYY-MM-DD: only that day's trips
  const [reviewing, setReviewing] = useState<string | null>(null);

  const tableScrollRef = useRef<HTMLDivElement>(null);

  const base = process.env.NEXT_PUBLIC_API_URL;

  // Months with logs + the review queue: neither depends on the month being shown.
  const fetchSide = useCallback(async () => {
    if (!session) return;
    try {
      const [monthsRes, pendingRes] = await Promise.all([
        axiosInstance.get(`${base}/vehicle-log/months`),
        axiosInstance.get(`${base}/vehicle-log?from=2000-01-01&status=pending`),
      ]);
      setAvailableMonths((monthsRes.data.months || []).map((m: { month: string }) => m.month));
      setPendingAll((pendingRes.data.logs || []).filter((l: VehicleLog) => l.status === "pending"));
    } catch {
      /* non-fatal */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const fetchData = useCallback(
    async (key: string) => {
      if (!session) return;
      setLoading(true);
      try {
        const { data } = await axiosInstance.get(`${base}/vehicle-log?month=${key}`);
        setLogs(data.logs || []);
        setLoadedMonth(key);
      } catch (error) {
        console.error(error);
        toast.error("Failed to load vehicle logs");
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [session]
  );

  const refreshAll = () => {
    fetchData(month);
    fetchSide();
  };

  useEffect(() => {
    if (session) refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, month]);

  useEffect(() => {
    Object.assign(saved, { month, tab, staff: staffFilter, kind, day, logs, pendingAll, months: availableMonths });
  });

  // A month lists oldest→newest, so a newly opened month jumps to the bottom where today's
  // trips are; the review queue starts at the top (oldest waiting trip first). A refresh
  // (after approving, or coming back from a trip page) keeps the place.
  const view = `${month}|${tab}`;
  const scrolledFor = useRef<string | null>(null);
  useEffect(() => {
    const el = tableScrollRef.current;
    if (!el || loadedMonth !== month || scrolledFor.current === view) return;
    if (scrolledFor.current === null && saved.scrollTop != null) el.scrollTop = saved.scrollTop;
    else el.scrollTop = tab === "pending" ? 0 : el.scrollHeight;
    scrolledFor.current = view;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadedMonth, view]);

  const loggedStaff = useMemo(
    () =>
      Array.from(
        new Set([...logs, ...pendingAll].flatMap((l) => l.staff || []).concat(staffFilter || []))
      ).sort(),
    [logs, pendingAll, staffFilter]
  );
  // The staff, source and day filters apply to the table and its totals.
  const filtersOn = !!(staffFilter || kind || day);
  const filtered = (rows: VehicleLog[]) =>
    rows.filter(
      (l) =>
        (!staffFilter || (l.staff || []).includes(staffFilter)) &&
        (!kind || sourceOf(l) === kind) &&
        (!day || dayKey(l.date) === day)
    );
  const clearFilters = () => {
    setStaffFilter("");
    setKind("");
    setDay("");
  };
  // Picking a day in another month opens that month; picking another month drops the day.
  const pickDay = (v: string) => {
    setDay(v);
    if (v && v.slice(0, 7) !== month) setMonth(v.slice(0, 7));
  };
  const pickMonth = (m: string) => {
    setMonth(m);
    if (day.slice(0, 7) !== m) setDay("");
  };

  const monthRows = filtered(logs);
  const pendingRows = filtered(pendingAll);
  const shown =
    tab === "pending"
      ? pendingRows
      : tab === "all"
        ? monthRows
        : tab === "attention"
          ? monthRows.filter(needsAttention)
          : monthRows.filter((l) => (l.status || "approved") === tab);
  const counts: Partial<Record<Tab, number>> = {
    pending: pendingRows.length,
    attention: monthRows.filter(needsAttention).length,
  };

  // Totals follow the rows on screen; rejected trips only count on their own tab.
  const counted = shown.filter((l) => !l.virtual && (tab === "rejected" || l.status !== "rejected"));
  const sum = (k: keyof VehicleLog) => counted.reduce((a, l) => a + (Number(l[k]) || 0), 0);
  const totals = { trips: counted.length, cash: sum("cash"), cols: SUM_KEYS.map(sum) };

  // Approve or reject an entry sent from the staff app (only approved trips are paid).
  const review = async (log: VehicleLog, action: "approve" | "reject", reason = "") => {
    setReviewing(log._id || null);
    try {
      await axiosInstance.patch(`${base}/vehicle-log/${log._id}/review`, { action, reason });
      toast.success(action === "approve" ? "Trip approved" : "Trip rejected");
      setReviewTarget(null);
      refreshAll();
    } catch (e: any) {
      toast.error(e?.response?.data?.error?.message || "Failed to update");
    } finally {
      setReviewing(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget?._id) return;
    try {
      // A GPS-only row is a GPS trip with no entry: mark it not-a-work-trip so it stays gone.
      if (deleteTarget.virtual) await axiosInstance.patch(`${base}/admin/trips/${deleteTarget.tripId}`, { action: "nonwork", value: true });
      else await axiosInstance.delete(`${base}/vehicle-log/${deleteTarget._id}`);
      toast.success(deleteTarget.virtual ? "GPS trip removed" : "Log deleted");
      setDeleteTarget(null);
      refreshAll();
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete log");
    }
  };

  const openEditor = (log: VehicleLog | null) => {
    setEditing(log);
    setDialogOpen(true);
  };

  const isCurrentMonth = month === currentMonthKey();
  const outlineBtn =
    "h-11 rounded-xl border-[#EAEAEA] px-4 text-[15px] font-medium text-[#0A0A0A] shadow-none hover:bg-[#FAFAFA]";
  const iconBtn = "size-9 rounded-lg text-[#6B7280]";

  return (
    <Wrapper>
      <div className="flex w-full flex-col gap-4">
        {/* Header */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[#0A0A0A]">
              Vehicle Log
            </h1>
            <div className="flex items-center text-[15px] text-[#6B7280]">
              {monthLabel(month)}
              {isCurrentMonth && (
                <Badge
                  variant="secondary"
                  className="ml-2 border-transparent bg-green-100 text-[13px] text-green-800 hover:bg-green-100"
                >
                  Current month
                </Badge>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <MonthSelect value={month} onChange={pickMonth} months={availableMonths} />

            <Button
              variant="outline"
              onClick={refreshAll}
              aria-label="Refresh"
              title="Refresh"
              className="h-11 w-11 rounded-xl border-[#EAEAEA] p-0 text-[#6B7280] shadow-none hover:bg-[#FAFAFA]"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>

            <Button variant="outline" asChild className={outlineBtn}>
              <Link href={`/vehicle-log/analysis?month=${month}`}>
                <BarChart3 className="mr-2 h-4 w-4" />
                Analysis
              </Link>
            </Button>
            <Button variant="outline" onClick={() => setExportOpen(true)} className={outlineBtn}>
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>

            <Button
              onClick={() => openEditor(null)}
              className="h-11 rounded-xl bg-[#2563EB] px-5 text-[15px] font-medium text-white shadow-none hover:bg-[#1D4ED8]"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Log
            </Button>
          </div>
        </div>

        {/* Logs table */}
        <div>
          <div className="mb-3 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div role="tablist" aria-label="Filter trips" className="flex flex-wrap gap-1.5">
              {TABS.map(({ key, label }) => (
                <button
                  key={key}
                  role="tab"
                  aria-selected={tab === key}
                  onClick={() => setTab(key)}
                  className={`flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors ${
                    tab === key
                      ? "border-[#2563EB] bg-[#2563EB] text-white"
                      : "border-[#EAEAEA] bg-white text-[#374151] hover:bg-[#FAFAFA]"
                  }`}
                >
                  {label}
                  {counts[key] ? (
                    <span
                      className={`rounded-full px-1.5 text-xs font-semibold tabular-nums ${
                        tab === key ? "bg-white/20 text-white" : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {counts[key]}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-1 whitespace-nowrap text-sm text-[#6B7280]">
                {shown.length} {shown.length === 1 ? "trip" : "trips"}
                {tab === "pending" ? " · all months" : ""}
              </span>
              <Input
                type="date"
                value={day}
                onChange={(e) => pickDay(e.target.value)}
                aria-label="Show one day"
                title="Show one day"
                className={`h-9 w-40 rounded-full bg-white px-3 text-sm shadow-none ${day ? "border-[#2563EB] text-[#2563EB]" : "border-[#EAEAEA] text-[#0A0A0A]"}`}
              />
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value)}
                aria-label="Filter by GPS and QR scan"
                className={`h-9 !w-48 rounded-full border bg-white px-3 text-sm ${kind ? "border-[#2563EB] text-[#2563EB]" : "border-[#EAEAEA] text-[#0A0A0A]"}`}
              >
                <option value="">GPS and QR: all</option>
                {SOURCES.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <select
                value={staffFilter}
                onChange={(e) => setStaffFilter(e.target.value)}
                aria-label="Filter by staff"
                className={`h-9 !w-44 rounded-full border bg-white px-3 text-sm ${staffFilter ? "border-[#2563EB] text-[#2563EB]" : "border-[#EAEAEA] text-[#0A0A0A]"}`}
              >
                <option value="">All staff</option>
                {loggedStaff.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              {filtersOn && (
                <Button variant="ghost" onClick={clearFilters} className="h-9 rounded-full px-3 text-sm text-[#6B7280]">
                  <X className="mr-1 h-4 w-4" />
                  Clear
                </Button>
              )}
            </div>
          </div>

          <div
            ref={tableScrollRef}
            onScroll={(e) => (saved.scrollTop = e.currentTarget.scrollTop)}
            className="w-full max-h-[calc(100dvh-15rem)] min-h-[20rem] overflow-auto rounded-2xl border border-[#EAEAEA] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
          >
            <table className="w-full min-w-[1400px] caption-bottom text-[15px] tabular-nums">
              <TableHeader className="sticky top-0 z-20">
                <TableRow className="hover:bg-transparent">
                  {COLUMNS.map((h) => (
                    <TableHead
                      key={h}
                      className={`whitespace-nowrap border-b border-[#EAEAEA] bg-[#FAFAFA] px-3 py-3 text-[13px] font-medium uppercase tracking-wide text-[#6B7280] ${
                        NUMERIC.includes(h) ? "text-right" : "text-left"
                      } ${h === "Staff" ? "min-w-[170px]" : ""} ${h === "Actions" ? "sticky right-0" : ""}`}
                    >
                      {h}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {shown.map((log, idx) => {
                  const pending = log.status === "pending";
                  // Row tint doubles as the sticky actions cell's background.
                  const rowBg = pending ? "bg-amber-50" : "bg-white";
                  return (
                    <TableRow
                      key={log._id}
                      className={`group border-b border-[#EAEAEA] ${rowBg} hover:bg-[#FAFAFA]`}
                    >
                      <TableCell className="px-3 py-3 text-[#9CA3AF]">{idx + 1}</TableCell>
                      <TableCell className="whitespace-nowrap px-3 py-3 font-medium text-[#0A0A0A]">
                        {fmtDate(log.date)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap px-3 py-3 text-[#6B7280]">
                        {log.departureTime || "—"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap px-3 py-3 text-[#6B7280]">
                        {log.arrivalTime || "—"}
                      </TableCell>
                      <TableCell className="min-w-[170px] px-3 py-3">
                        <div className="flex flex-wrap gap-1">
                          {(log.staff || []).map((s) => {
                            const isDriver = log.driver === s;
                            const firstName = s.trim().split(/\s+/)[0] || s;
                            return (
                              <Badge
                                key={s}
                                variant="secondary"
                                title={isDriver ? `${s} (Driver)` : s}
                                className={`text-[13px] ${
                                  isDriver
                                    ? "border-transparent bg-blue-100 font-medium text-blue-800 hover:bg-blue-100"
                                    : "border-transparent bg-slate-100 text-slate-600 hover:bg-slate-100"
                                }`}
                              >
                                {isDriver && <Car className="h-3 w-3" />}
                                {firstName}
                              </Badge>
                            );
                          })}
                        </div>
                      </TableCell>
                      <TableCell className="min-w-[150px] px-3 py-3">
                        <div className="flex flex-wrap gap-1">
                          {(log.location || []).map((l) => (
                            <Badge
                              key={l}
                              variant="secondary"
                              className="border-transparent whitespace-nowrap bg-slate-100 text-[13px] text-slate-600 hover:bg-slate-100"
                            >
                              {l}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap px-3 py-3 text-[#0A0A0A]">
                        {/* QR entries store "name · reg no": two lines keep the column narrow */}
                        {log.vehicle
                          ? log.vehicle.split(" · ").map((part, i) => (
                              <div key={i} className={i ? "text-xs text-[#6B7280]" : ""}>
                                {part}
                              </div>
                            ))
                          : dash}
                      </TableCell>
                      <TableCell className="px-3 py-3">
                        <QrStatus log={log} />
                      </TableCell>
                      <TableCell className="px-3 py-3">
                        <GpsStatus log={log} />
                      </TableCell>
                      <TableCell className="px-3 py-3">
                        <LogStatus log={log} />
                        {log.status === "rejected" && log.rejectReason && (
                          <div className="mt-1 max-w-[180px] text-xs text-red-700">Reason: {log.rejectReason}</div>
                        )}
                      </TableCell>
                      <TableCell className="px-3 py-3 text-right text-[#0A0A0A]">{log.out ?? "—"}</TableCell>
                      <TableCell className="px-3 py-3 text-right text-[#0A0A0A]">{log.returned}</TableCell>
                      <TableCell
                        className={`px-3 py-3 text-right ${
                          log.engaged < 0 ? "text-[#DC2626]" : "text-[#0A0A0A]"
                        }`}
                      >
                        {log.engaged}
                      </TableCell>
                      <TableCell className="px-3 py-3 text-right text-[#0A0A0A]">{log.filled}</TableCell>
                      <TableCell className="px-3 py-3 text-right text-[#0A0A0A]">{log.empty}</TableCell>
                      <TableCell className="px-3 py-3 text-right text-[#0A0A0A]">{log.recorded}</TableCell>
                      <TableCell className="px-3 py-3 text-right font-medium text-[#0A0A0A]">
                        {log.cash ? inr(log.cash) : <span className="text-[#9CA3AF]">—</span>}
                      </TableCell>
                      {/* Pinned so the row actions never need a sideways scroll */}
                      <TableCell
                        className={`sticky right-0 z-10 whitespace-nowrap border-l border-[#EAEAEA] px-3 py-3 ${rowBg} group-hover:bg-[#FAFAFA]`}
                      >
                        <div className="flex items-center justify-end gap-1">
                          {pending && (
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={reviewing === log._id}
                              onClick={() => {
                                setRejecting(false);
                                setRejectReason("");
                                setReviewTarget(log);
                              }}
                              aria-label="Approve or reject"
                              title="Approve or reject"
                              className="size-9 rounded-lg bg-amber-100 text-amber-800 hover:bg-amber-200 hover:text-amber-900"
                            >
                              {reviewing === log._id ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardCheck className="h-4 w-4" />}
                            </Button>
                          )}
                          {log.virtual && (
                            <Button variant="outline" onClick={() => openEditor(log)} className="h-9 rounded-lg px-3 text-sm">
                              Fill in
                            </Button>
                          )}
                          {log.tripId && (
                            <Link
                              href={`/trips/${log.tripId}`}
                              aria-label="GPS route"
                              title="GPS route"
                              className="flex size-9 items-center justify-center rounded-lg text-[#6B7280] hover:bg-[#F1F5F9] hover:text-[#2563EB]"
                            >
                              <MapPin className="h-4 w-4" />
                            </Link>
                          )}
                          {!log.virtual && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditor(log)}
                              aria-label="Edit"
                              title="Edit"
                              className={`${iconBtn} hover:bg-[#F1F5F9] hover:text-[#2563EB]`}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteTarget(log)}
                            aria-label={log.virtual ? "Delete GPS trip" : "Delete"}
                            title={log.virtual ? "Delete GPS trip" : "Delete"}
                            className={`${iconBtn} hover:bg-red-50 hover:text-[#DC2626]`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
              {totals.trips > 0 && (
                <TableFooter className="sticky bottom-0 z-20 border-t border-[#EAEAEA] bg-transparent">
                  <TableRow className="font-semibold text-[#0A0A0A] hover:bg-transparent [&>td]:bg-[#FAFAFA]">
                    <TableCell className="px-3 py-3" colSpan={10}>
                      Total
                      <span className="ml-2 font-normal text-[#6B7280]">
                        {totals.trips} {totals.trips === 1 ? "trip" : "trips"}
                        {tab === "all" || tab === "attention" ? ", rejected not counted" : ""}
                      </span>
                    </TableCell>
                    {totals.cols.map((v, i) => (
                      <TableCell key={SUM_KEYS[i]} className="px-3 py-3 text-right">
                        {v}
                      </TableCell>
                    ))}
                    <TableCell className="px-3 py-3 text-right">{inr(totals.cash)}</TableCell>
                    <TableCell />
                  </TableRow>
                </TableFooter>
              )}
            </table>

            {loading && shown.length === 0 && (
              <div role="status" className="flex items-center justify-center gap-2 py-12 text-gray-500">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading…
              </div>
            )}

            {!loading && shown.length === 0 && (
              <Empty className="border-0 py-12">
                <EmptyHeader>
                  <EmptyMedia variant="icon">{tab === "pending" ? <ClipboardCheck /> : <Truck />}</EmptyMedia>
                  <EmptyTitle>
                    {tab === "pending" ? "All caught up" : logs.length === 0 ? "No trips logged" : "No trips match"}
                  </EmptyTitle>
                  <EmptyDescription>
                    {tab === "pending"
                      ? "No trips are waiting for approval."
                      : logs.length === 0
                        ? `No logs for ${monthLabel(month)}.`
                        : `Nothing in ${monthLabel(month)} matches these filters.`}
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  {tab === "all" && !filtersOn ? (
                    <Button
                      onClick={() => openEditor(null)}
                      className="h-11 rounded-xl bg-[#2563EB] px-5 text-[15px] font-medium text-white shadow-none hover:bg-[#1D4ED8]"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add the first log
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setTab("all");
                        clearFilters();
                      }}
                      className={outlineBtn}
                    >
                      Show all trips
                    </Button>
                  )}
                </EmptyContent>
              </Empty>
            )}
          </div>
        </div>
      </div>

      {/* Add / Edit dialog */}
      <AddLogDialog
        open={dialogOpen}
        onOpenChange={(o) => {
          setDialogOpen(o);
          if (!o) setEditing(null);
        }}
        axiosInstance={axiosInstance}
        areaNames={areaNames}
        staffNames={staffNames}
        onSaved={() => {
          refreshAll();
          refreshOptions();
        }}
        editing={editing}
        defaultDate={day || (isCurrentMonth ? undefined : `${month}-01`)}
      />

      <ExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        axiosInstance={axiosInstance}
        months={availableMonths}
        month={month}
        staff={staffFilter}
        staffNames={Array.from(new Set([...staffNames, ...loggedStaff])).sort()}
      />

      {/* Approve / reject: one dialog, so an approval is always confirmed against the trip's details */}
      <Dialog open={!!reviewTarget} onOpenChange={(o) => !o && setReviewTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{rejecting ? "Reject this trip?" : "Approve this trip?"}</DialogTitle>
            <DialogDescription>
              {rejecting ? "A rejected trip is not paid. The crew sees your reason." : "Check the details. Only approved trips are paid."}
            </DialogDescription>
          </DialogHeader>
          {reviewTarget && (
            <dl className="grid grid-cols-[90px_1fr] items-start gap-x-3 gap-y-2 rounded-xl bg-[#FAFAFA] p-3 text-sm">
              <dt className="text-[#6B7280]">Date</dt>
              <dd className="font-medium text-[#0A0A0A]">
                {fmtDate(reviewTarget.date)} · {reviewTarget.departureTime || "—"} to {reviewTarget.arrivalTime || "—"}
              </dd>
              <dt className="text-[#6B7280]">Staff</dt>
              <dd>
                {(reviewTarget.staff || []).map((n) => (n === reviewTarget.driver ? `${n} (driver)` : n)).join(", ") || "—"}
              </dd>
              <dt className="text-[#6B7280]">Location</dt>
              <dd>{(reviewTarget.location || []).join(", ") || "—"}</dd>
              <dt className="text-[#6B7280]">Vehicle</dt>
              <dd>{reviewTarget.vehicle || "—"}</dd>
              <dt className="text-[#6B7280]">Jars</dt>
              <dd className="tabular-nums">
                Out {reviewTarget.out ?? "—"} · Return {reviewTarget.returned} · Filled {reviewTarget.filled}
                {reviewTarget.cash ? ` · Cash ${inr(reviewTarget.cash)}` : ""}
              </dd>
              <dt className="text-[#6B7280]">QR</dt>
              <dd>
                <QrStatus log={reviewTarget} />
              </dd>
              <dt className="text-[#6B7280]">GPS</dt>
              <dd>
                <GpsStatus log={reviewTarget} />
              </dd>
            </dl>
          )}
          {rejecting && (
            <div className="space-y-1.5">
              <Label htmlFor="vlog-reject-reason" className="text-xs text-gray-600">
                Why is this not a valid trip? <span className="text-red-600">*</span>
              </Label>
              <Textarea
                id="vlog-reject-reason"
                autoFocus
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Duplicate of the 10:30 trip"
              />
            </div>
          )}
          <DialogFooter className="gap-2">
            {rejecting ? (
              <>
                <Button variant="outline" disabled={!!reviewing} onClick={() => setRejecting(false)}>
                  Back
                </Button>
                <Button
                  disabled={!rejectReason.trim() || !!reviewing}
                  onClick={() => reviewTarget && review(reviewTarget, "reject", rejectReason.trim())}
                  className="bg-red-600 text-white hover:bg-red-700"
                >
                  {reviewing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Reject trip
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  disabled={!!reviewing}
                  onClick={() => setRejecting(true)}
                  className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800 sm:mr-auto"
                >
                  <X className="mr-1 h-4 w-4" />
                  Reject
                </Button>
                <Button variant="outline" disabled={!!reviewing} onClick={() => setReviewTarget(null)}>
                  Cancel
                </Button>
                <Button
                  disabled={!!reviewing}
                  onClick={() => reviewTarget && review(reviewTarget, "approve")}
                  className="bg-green-600 text-white hover:bg-green-700"
                >
                  {reviewing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-1 h-4 w-4" />}
                  Approve
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{deleteTarget?.virtual ? "Delete this GPS trip?" : "Delete this log?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.virtual
                ? `GPS found this trip${deleteTarget ? ` on ${fmtDate(deleteTarget.date)}` : ""} but nobody logged it. Deleting marks it as not a work trip: it leaves the vehicle log and is not counted anywhere. The GPS route stays in GPS History.`
                : `This permanently removes the trip${deleteTarget ? ` on ${fmtDate(deleteTarget.date)}` : ""}. This cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Wrapper>
  );
};

export default VehicleLogPage;
