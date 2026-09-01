import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import {
  Plus,
  FileSpreadsheet,
  FileText,
  RefreshCw,
  Pencil,
  Trash2,
  Loader2,
  Car,
} from "lucide-react";
import Wrapper from "@/components/Wrapper";
import useAxiosInstance from "@/lib/hooks/useAxiosInstance";
import useVehicleLogOptions from "@/lib/hooks/useVehicleLogOptions";
import { VehicleLog, VehicleLogAnalytics } from "@/types/types";
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
import AnalysisPanel from "@/components/VehicleLog/AnalysisPanel";
import AddLogDialog from "@/components/VehicleLog/AddLogDialog";
import {
  exportVehicleLogXLSX,
  exportVehicleLogPDF,
} from "@/components/VehicleLog/vehicleLogExport";

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
  if (!y || !m) return key;
  return `${MONTH_NAMES[m - 1]} ${y}`;
};

const inr = (n: number) => "₹" + Math.round(n || 0).toLocaleString("en-IN");

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
  const { areaNames, staffNames, refresh: refreshOptions } =
    useVehicleLogOptions(session);

  const [month, setMonth] = useState(currentMonthKey());
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  const [logs, setLogs] = useState<VehicleLog[]>([]);
  const [analytics, setAnalytics] = useState<VehicleLogAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState<"pdf" | "xlsx" | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<VehicleLog | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<VehicleLog | null>(null);

  const tableScrollRef = useRef<HTMLDivElement>(null);

  const base = process.env.NEXT_PUBLIC_API_URL;

  const fetchMonths = useCallback(async () => {
    if (!session) return;
    try {
      const { data } = await axiosInstance.get(`${base}/vehicle-log/months`);
      setAvailableMonths(
        (data.months || []).map((m: { month: string }) => m.month)
      );
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
        const [logsRes, analyticsRes] = await Promise.all([
          axiosInstance.get(`${base}/vehicle-log?month=${key}`),
          axiosInstance.get(`${base}/vehicle-log/analytics?month=${key}`),
        ]);
        setLogs(logsRes.data.logs || []);
        setAnalytics(analyticsRes.data || null);
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

  useEffect(() => {
    if (session) {
      fetchData(month);
      fetchMonths();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, month]);

  // After logs load (page open, month switch, add/edit/delete), jump the table
  // box to the bottom — logs are oldest→newest, so today's & yesterday's trips
  // land in view without scrolling. The user can scroll up for earlier days.
  useEffect(() => {
    const el = tableScrollRef.current;
    if (el && !loading && logs.length > 0) {
      el.scrollTop = el.scrollHeight;
    }
  }, [logs, loading]);

  const refreshAll = () => {
    fetchData(month);
    fetchMonths();
  };

  // Month options = the months that have logs, plus always the current month.
  const monthOptions = useMemo(() => {
    const set = new Set<string>(availableMonths);
    set.add(currentMonthKey());
    set.add(month);
    return Array.from(set).sort((a, b) => (a < b ? 1 : -1));
  }, [availableMonths, month]);

  const totals = analytics?.totals;

  const handleExport = async (kind: "xlsx" | "pdf") => {
    if (logs.length === 0) {
      toast.error("Nothing to export for this month");
      return;
    }
    setExporting(kind);
    try {
      const fileBase = `Vehicle-Log-${month}`;
      if (kind === "xlsx") {
        await exportVehicleLogXLSX(logs, monthLabel(month), fileBase);
      } else {
        await exportVehicleLogPDF(logs, monthLabel(month), fileBase);
      }
    } catch (error) {
      console.error(error);
      toast.error(`Failed to export ${kind.toUpperCase()}`);
    } finally {
      setExporting(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget?._id) return;
    try {
      await axiosInstance.delete(`${base}/vehicle-log/${deleteTarget._id}`);
      toast.success("Log deleted");
      setDeleteTarget(null);
      refreshAll();
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete log");
    }
  };

  const isCurrentMonth = month === currentMonthKey();

  return (
    <Wrapper>
      <div className="flex w-full flex-col gap-3">
        {/* Header */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[#0A0A0A]">
              Vehicle Log
            </h1>
            <p className="text-[15px] text-[#6B7280]">
              {monthLabel(month)}
              {isCurrentMonth && (
                <span className="ml-2 rounded-full bg-green-100 px-2.5 py-0.5 text-[13px] font-medium text-green-800">
                  Current month
                </span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Month browse */}
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

            <Button
              variant="outline"
              onClick={refreshAll}
              title="Refresh"
              className="h-11 w-11 rounded-xl border-[#EAEAEA] p-0 text-[#6B7280] shadow-none hover:bg-[#FAFAFA]"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>

            <Button
              variant="outline"
              onClick={() => handleExport("xlsx")}
              disabled={exporting !== null}
              className="h-11 rounded-xl border-[#EAEAEA] px-5 text-[15px] font-medium text-[#0A0A0A] shadow-none hover:bg-[#FAFAFA]"
            >
              {exporting === "xlsx" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FileSpreadsheet className="mr-2 h-4 w-4" />
              )}
              XLSX
            </Button>
            <Button
              variant="outline"
              onClick={() => handleExport("pdf")}
              disabled={exporting !== null}
              className="h-11 rounded-xl border-[#EAEAEA] px-5 text-[15px] font-medium text-[#0A0A0A] shadow-none hover:bg-[#FAFAFA]"
            >
              {exporting === "pdf" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FileText className="mr-2 h-4 w-4" />
              )}
              PDF
            </Button>

            <Button
              onClick={() => {
                setEditing(null);
                setDialogOpen(true);
              }}
              className="h-11 rounded-xl bg-[#2563EB] px-5 text-[15px] font-medium text-white shadow-none hover:bg-[#1D4ED8]"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Log
            </Button>
          </div>
        </div>

        {/* Analysis */}
        <div>
          <h2 className="mb-3 text-base font-semibold text-[#0A0A0A]">
            Analysis
          </h2>
          <AnalysisPanel analytics={analytics} loading={loading} />
        </div>

        {/* Logs table */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#0A0A0A]">
              Trips <span className="font-normal text-[#9CA3AF]">({logs.length})</span>
            </h2>
          </div>

          <div
            ref={tableScrollRef}
            className="w-full max-h-[32rem] overflow-auto rounded-2xl border border-[#EAEAEA] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
          >
            <table className="w-full min-w-[1050px] text-[15px]">
              <thead className="sticky top-0 z-10 text-[15px] font-medium text-[#0A0A0A]">
                <tr>
                  {[
                    "#", "Date", "Dep.", "Arr.", "Out", "Return",
                    "Engaged", "Filled", "Empty", "Recorded", "Cash",
                    "Staff", "Location", "",
                  ].map((h, i) => (
                    <th
                      key={i}
                      className={`whitespace-nowrap border-b border-[#EAEAEA] bg-[#FAFAFA] px-4 py-4 font-medium ${
                        ["Out", "Return", "Engaged", "Filled", "Empty", "Recorded", "Cash"].includes(h)
                          ? "text-right"
                          : "text-left"
                      }`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map((log, idx) => {
                  return (
                    <tr
                      key={log._id}
                      className="border-b border-[#EAEAEA] transition-colors hover:bg-[#FAFAFA]"
                    >
                      <td className="px-4 py-3 text-[#9CA3AF]">{idx + 1}</td>
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-[#0A0A0A]">
                        {fmtDate(log.date)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-[#6B7280]">
                        {log.departureTime || "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-[#6B7280]">
                        {log.arrivalTime || "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-[#0A0A0A]">{log.out}</td>
                      <td className="px-4 py-3 text-right text-[#0A0A0A]">
                        {log.returned}
                      </td>
                      <td
                        className={`px-4 py-3 text-right ${
                          log.engaged < 0 ? "text-[#DC2626]" : "text-[#0A0A0A]"
                        }`}
                      >
                        {log.engaged}
                      </td>
                      <td className="px-4 py-3 text-right text-[#0A0A0A]">{log.filled}</td>
                      <td className="px-4 py-3 text-right text-[#0A0A0A]">{log.empty}</td>
                      <td className="px-4 py-3 text-right text-[#0A0A0A]">
                        {log.recorded}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-[#0A0A0A]">
                        {log.cash ? inr(log.cash) : <span className="text-[#9CA3AF]">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {(log.staff || []).map((s) => {
                            const isDriver = log.driver === s;
                            return (
                              <span
                                key={s}
                                title={isDriver ? "Driver" : undefined}
                                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[13px] ${
                                  isDriver
                                    ? "bg-blue-100 font-medium text-blue-800"
                                    : "bg-slate-100 text-slate-600"
                                }`}
                              >
                                {isDriver && <Car className="h-3 w-3" />}
                                {s}
                              </span>
                            );
                          })}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {(log.location || []).map((l) => (
                            <span
                              key={l}
                              className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[13px] text-slate-600"
                            >
                              {l}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <div className="flex gap-1">
                          <button
                            onClick={() => {
                              setEditing(log);
                              setDialogOpen(true);
                            }}
                            className="rounded-lg p-1.5 text-[#9CA3AF] hover:bg-[#FAFAFA] hover:text-[#2563EB]"
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(log)}
                            className="rounded-lg p-1.5 text-[#9CA3AF] hover:bg-red-50 hover:text-[#DC2626]"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {logs.length > 0 && totals && (
                <tfoot className="sticky bottom-0 z-10">
                  <tr className="border-t border-[#EAEAEA] font-semibold text-[#0A0A0A] [&>td]:bg-[#FAFAFA]">
                    <td className="px-4 py-3" colSpan={4}>
                      Total
                    </td>
                    <td className="px-4 py-3 text-right">{totals.out}</td>
                    <td className="px-4 py-3 text-right">{totals.returned}</td>
                    <td className="px-4 py-3 text-right">{totals.engaged}</td>
                    <td className="px-4 py-3 text-right">{totals.filled}</td>
                    <td className="px-4 py-3 text-right">{totals.empty}</td>
                    <td className="px-4 py-3 text-right">{totals.recorded}</td>
                    <td className="px-4 py-3 text-right">{inr(totals.cash)}</td>
                    <td colSpan={3} />
                  </tr>
                </tfoot>
              )}
            </table>

            {loading && (
              <div className="flex items-center justify-center gap-2 py-8 text-gray-500">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading…
              </div>
            )}

            {!loading && logs.length === 0 && (
              <div className="flex flex-col items-center justify-center gap-3 py-12 text-gray-500">
                <p>No logs for {monthLabel(month)}.</p>
                <Button
                  onClick={() => {
                    setEditing(null);
                    setDialogOpen(true);
                  }}
                  className="h-11 rounded-xl bg-[#2563EB] px-5 text-[15px] font-medium text-white shadow-none hover:bg-[#1D4ED8]"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add the first log
                </Button>
              </div>
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

      {/* Delete confirm */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this log?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the trip
              {deleteTarget ? ` on ${fmtDate(deleteTarget.date)}` : ""}. This
              cannot be undone.
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
