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
  AlertTriangle,
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

// The three kinds of trip entry (plus old sheet / app rows).
const KIND: Record<string, string> = { gps: "GPS only", qr: "QR scanned", admin: "Admin", sheet: "Sheet", app: "App" };
// GPS-only trips, and QR / admin entries the phones' GPS does not back up.
const needsAttention = (l: VehicleLog) =>
  !!l.virtual || (l.source === "gps" && l.status === "pending") || l.gpsCheck?.state === "mismatch";

type Tab = "all" | "pending" | "attention" | "approved" | "rejected";
const TABS: { key: Tab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "To review" },
  { key: "attention", label: "Needs attention" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
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

const VehicleLogPage = () => {
  const { data: session } = useSession();
  const axiosInstance = useAxiosInstance(session);
  useRefreshTokenRotation(axiosInstance);
  const { areaNames, staffNames, refresh: refreshOptions } =
    useVehicleLogOptions(session);

  const [month, setMonth] = useState(currentMonthKey());
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  const [logs, setLogs] = useState<VehicleLog[]>([]);
  // Every trip still waiting for approval, whatever its month.
  const [pendingAll, setPendingAll] = useState<VehicleLog[]>([]);
  const [loading, setLoading] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [editing, setEditing] = useState<VehicleLog | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<VehicleLog | null>(null);
  const [rejectTarget, setRejectTarget] = useState<VehicleLog | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [tab, setTab] = useState<Tab>("all");
  const [staffFilter, setStaffFilter] = useState("");
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

  // A month lists oldest→newest, so jump to the bottom where today's trips are.
  // The review queue starts at the top: the oldest waiting trip comes first.
  useEffect(() => {
    const el = tableScrollRef.current;
    if (el && !loading) el.scrollTop = tab === "pending" ? 0 : el.scrollHeight;
  }, [logs, loading, tab]);

  // Staff filter applies to the table and its totals.
  const loggedStaff = useMemo(
    () =>
      Array.from(
        new Set([...logs, ...pendingAll].flatMap((l) => l.staff || []).concat(staffFilter || []))
      ).sort(),
    [logs, pendingAll, staffFilter]
  );
  const byStaff = (rows: VehicleLog[]) =>
    staffFilter ? rows.filter((l) => (l.staff || []).includes(staffFilter)) : rows;

  const monthRows = byStaff(logs);
  const pendingRows = byStaff(pendingAll);
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
  const totals = useMemo(() => {
    const rows = shown.filter((l) => !l.virtual && (tab === "rejected" || l.status !== "rejected"));
    const sum = (k: keyof VehicleLog) => rows.reduce((a, l) => a + (Number(l[k]) || 0), 0);
    return { trips: rows.length, cash: sum("cash"), cols: SUM_KEYS.map(sum) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logs, pendingAll, tab, staffFilter]);

  // Approve or reject an entry sent from the staff app (only approved trips are paid).
  const review = async (log: VehicleLog, action: "approve" | "reject", reason = "") => {
    setReviewing(log._id || null);
    try {
      await axiosInstance.patch(`${base}/vehicle-log/${log._id}/review`, { action, reason });
      toast.success(action === "approve" ? "Trip approved" : "Trip rejected");
      setRejectTarget(null);
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
            <MonthSelect value={month} onChange={setMonth} months={availableMonths} />

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

        {/* Review queue call-out: shown from any month, until the queue is empty */}
        {pendingAll.length > 0 && tab !== "pending" && (
          <div className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                <ClipboardCheck className="h-5 w-5" />
              </div>
              <div>
                <div className="font-semibold text-amber-900">
                  {pendingAll.length} {pendingAll.length === 1 ? "trip is" : "trips are"} waiting for approval
                </div>
                <div className="text-sm text-amber-800">
                  Only approved trips are paid. Oldest from {fmtDate(pendingAll[0].date)}.
                </div>
              </div>
            </div>
            <Button
              onClick={() => {
                setStaffFilter("");
                setTab("pending");
              }}
              className="h-10 rounded-xl bg-amber-600 px-5 font-medium text-white shadow-none hover:bg-amber-700"
            >
              Review now
            </Button>
          </div>
        )}

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
            <div className="flex items-center gap-3">
              <span className="whitespace-nowrap text-sm text-[#6B7280]">
                {shown.length} {shown.length === 1 ? "trip" : "trips"}
                {tab === "pending" ? " · all months" : ""}
              </span>
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
            </div>
          </div>

          <div
            ref={tableScrollRef}
            className="w-full max-h-[calc(100dvh-15rem)] min-h-[20rem] overflow-auto rounded-2xl border border-[#EAEAEA] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
          >
            <table className="w-full min-w-[1100px] caption-bottom text-[15px] tabular-nums">
              <TableHeader className="sticky top-0 z-20">
                <TableRow className="hover:bg-transparent">
                  {[
                    "#", "Status", "Date", "Dep.", "Arr.", "Out", "Return",
                    "Engaged", "Filled", "Empty", "Recorded", "Cash",
                    "Staff", "Location", "Actions",
                  ].map((h) => (
                    <TableHead
                      key={h}
                      className={`whitespace-nowrap border-b border-[#EAEAEA] bg-[#FAFAFA] px-4 py-3 text-[13px] font-medium uppercase tracking-wide text-[#6B7280] ${
                        NUMERIC.includes(h) ? "text-right" : "text-left"
                      } ${h === "Staff" ? "min-w-[200px]" : ""} ${h === "Actions" ? "sticky right-0" : ""}`}
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
                      <TableCell className="px-4 py-3 text-[#9CA3AF]">{idx + 1}</TableCell>
                      <TableCell className="min-w-[210px] px-4 py-3">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                            pending || log.status === "unlogged"
                              ? "bg-amber-100 text-amber-800"
                              : log.status === "rejected"
                                ? "bg-red-100 text-red-800"
                                : "bg-green-100 text-green-800"
                          }`}
                        >
                          {log.status === "unlogged" ? "Not logged" : log.status || "approved"}
                        </span>
                        <span className="ml-1.5 text-xs text-[#6B7280]">{KIND[log.source || "sheet"]}</span>
                        {log.status === "rejected" && log.rejectReason && (
                          <div className="mt-1 text-xs text-red-700">Reason: {log.rejectReason}</div>
                        )}
                        {needsAttention(log) && (
                          <div className="mt-1 flex items-start gap-1 text-xs font-medium text-orange-700">
                            <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" />
                            <span>
                              Needs attention
                              {log.gpsCheck?.state === "mismatch" ? `: ${log.gpsCheck.reason}` : log.virtual ? ": not scanned or filled in" : ""}
                            </span>
                          </div>
                        )}
                        {log.gpsCheck?.state === "match" && (
                          <div className="mt-1 flex items-center gap-1 text-xs text-green-700">
                            <Check className="h-3.5 w-3.5" />
                            GPS matches
                          </div>
                        )}
                        {log.gpsCheck?.state === "waiting" && <div className="mt-1 text-xs text-[#9CA3AF]">Waiting for GPS</div>}
                        {log.vehicle && <div className="mt-1 text-xs text-[#6B7280]">{log.vehicle}</div>}
                        {log.gps?.reasonCodes?.length ? (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {log.gps.reasonCodes.map((c) => (
                              <span key={c} className="rounded bg-gray-100 px-1 text-[11px] text-gray-700">
                                {REASONS[c] || c}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell className="whitespace-nowrap px-4 py-3 font-medium text-[#0A0A0A]">
                        {fmtDate(log.date)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap px-4 py-3 text-[#6B7280]">
                        {log.departureTime || "—"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap px-4 py-3 text-[#6B7280]">
                        {log.arrivalTime || "—"}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-right text-[#0A0A0A]">{log.out ?? "—"}</TableCell>
                      <TableCell className="px-4 py-3 text-right text-[#0A0A0A]">{log.returned}</TableCell>
                      <TableCell
                        className={`px-4 py-3 text-right ${
                          log.engaged < 0 ? "text-[#DC2626]" : "text-[#0A0A0A]"
                        }`}
                      >
                        {log.engaged}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-right text-[#0A0A0A]">{log.filled}</TableCell>
                      <TableCell className="px-4 py-3 text-right text-[#0A0A0A]">{log.empty}</TableCell>
                      <TableCell className="px-4 py-3 text-right text-[#0A0A0A]">{log.recorded}</TableCell>
                      <TableCell className="px-4 py-3 text-right font-medium text-[#0A0A0A]">
                        {log.cash ? inr(log.cash) : <span className="text-[#9CA3AF]">—</span>}
                      </TableCell>
                      <TableCell className="min-w-[200px] px-4 py-3">
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
                      <TableCell className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {(log.location || []).map((l) => (
                            <Badge
                              key={l}
                              variant="secondary"
                              className="border-transparent bg-slate-100 text-[13px] text-slate-600 hover:bg-slate-100"
                            >
                              {l}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      {/* Pinned so approve / reject never needs a sideways scroll */}
                      <TableCell
                        className={`sticky right-0 z-10 whitespace-nowrap border-l border-[#EAEAEA] px-3 py-3 ${rowBg} group-hover:bg-[#FAFAFA]`}
                      >
                        <div className="flex items-center justify-end gap-1">
                          {pending && (
                            <>
                              <Button
                                disabled={reviewing === log._id}
                                onClick={() => review(log, "approve")}
                                className="h-9 rounded-lg bg-green-600 px-3 text-sm font-medium text-white shadow-none hover:bg-green-700"
                              >
                                {reviewing === log._id ? (
                                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                                ) : (
                                  <Check className="mr-1 h-4 w-4" />
                                )}
                                Approve
                              </Button>
                              <Button
                                variant="outline"
                                disabled={reviewing === log._id}
                                onClick={() => {
                                  setRejectReason("");
                                  setRejectTarget(log);
                                }}
                                className="h-9 rounded-lg border-red-200 px-3 text-sm font-medium text-red-700 shadow-none hover:bg-red-50 hover:text-red-800"
                              >
                                <X className="mr-1 h-4 w-4" />
                                Reject
                              </Button>
                            </>
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
                    <TableCell className="px-4 py-3" colSpan={5}>
                      Total
                      <span className="ml-2 font-normal text-[#6B7280]">
                        {totals.trips} {totals.trips === 1 ? "trip" : "trips"}
                        {tab === "all" || tab === "attention" ? ", rejected not counted" : ""}
                      </span>
                    </TableCell>
                    {totals.cols.map((v, i) => (
                      <TableCell key={SUM_KEYS[i]} className="px-4 py-3 text-right">
                        {v}
                      </TableCell>
                    ))}
                    <TableCell className="px-4 py-3 text-right">{inr(totals.cash)}</TableCell>
                    <TableCell colSpan={3} />
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
                  {tab === "all" && !staffFilter ? (
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
                        setStaffFilter("");
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
        defaultDate={isCurrentMonth ? undefined : `${month}-01`}
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

      {/* Reject: the reason is shown to the crew, so it is required */}
      <Dialog open={!!rejectTarget} onOpenChange={(o) => !o && setRejectTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject this trip?</DialogTitle>
            <DialogDescription>
              {rejectTarget
                ? `${fmtDate(rejectTarget.date)} · ${(rejectTarget.staff || []).join(", ") || "no staff"}. A rejected trip is not paid.`
                : ""}
            </DialogDescription>
          </DialogHeader>
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
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRejectTarget(null)}>
              Cancel
            </Button>
            <Button
              disabled={!rejectReason.trim() || !!reviewing}
              onClick={() => rejectTarget && review(rejectTarget, "reject", rejectReason.trim())}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {reviewing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Reject trip
            </Button>
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
