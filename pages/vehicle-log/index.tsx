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

// No breadcrumb — the page has its own "Vehicle Log" heading.
const BreadCrumb: { name: string; href: string }[] = [];

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

// Column-group header colours, matching the source spreadsheet.
const HEAD_BG: Record<string, string> = {
  "#": "bg-[#ffff00]",
  Date: "bg-[#ffff00]",
  "Dep.": "bg-[#ffff00]",
  "Arr.": "bg-[#ffff00]",
  Out: "bg-[#f6b26b]",
  Return: "bg-[#f6b26b]",
  Engaged: "bg-[#f6b26b]",
  Filled: "bg-[#93c47d]",
  Empty: "bg-[#93c47d]",
  Recorded: "bg-[#93c47d]",
  Cash: "bg-[#fff2cc]",
  Staff: "bg-[#f3f3f3]",
  Location: "bg-[#f3f3f3]",
  "": "bg-[#f3f3f3]",
};

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
    <Wrapper breadcrumb={BreadCrumb}>
      <div className="flex w-full flex-col gap-3">
        {/* Header */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Vehicle Log</h1>
            <p className="text-sm text-gray-500">
              {monthLabel(month)}
              {isCurrentMonth && (
                <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
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
              className="w-44 shrink-0 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700"
            >
              {monthOptions.map((m) => (
                <option key={m} value={m}>
                  {monthLabel(m)}
                </option>
              ))}
            </select>

            <Button
              variant="outline"
              size="icon"
              onClick={refreshAll}
              title="Refresh"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>

            <Button
              variant="outline"
              onClick={() => handleExport("xlsx")}
              disabled={exporting !== null}
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
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Log
            </Button>
          </div>
        </div>

        {/* Analysis */}
        <div>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
            Analysis
          </h2>
          <AnalysisPanel analytics={analytics} loading={loading} />
        </div>

        {/* Logs table */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
              Trips ({logs.length})
            </h2>
          </div>

          <div
            ref={tableScrollRef}
            className="w-full max-h-[32rem] overflow-auto rounded-lg border border-slate-300 shadow-sm"
          >
            <table className="w-full min-w-[1050px] border-collapse text-[15px] [&_td]:border [&_td]:border-slate-200 [&_th]:border [&_th]:border-slate-300">
              <thead className="sticky top-0 z-10 text-xs font-bold uppercase tracking-wide text-slate-800">
                <tr>
                  {[
                    "#", "Date", "Dep.", "Arr.", "Out", "Return",
                    "Engaged", "Filled", "Empty", "Recorded", "Cash",
                    "Staff", "Location", "",
                  ].map((h, i) => (
                    <th
                      key={i}
                      className={`whitespace-nowrap px-4 py-3 ${
                        HEAD_BG[h] ?? "bg-[#f3f3f3]"
                      } ${
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
                    <tr key={log._id} className="transition hover:brightness-95">
                      <td className="bg-white px-4 py-3 text-slate-400">
                        {idx + 1}
                      </td>
                      <td className="whitespace-nowrap bg-white px-4 py-3 font-semibold text-slate-800">
                        {fmtDate(log.date)}
                      </td>
                      <td className="whitespace-nowrap bg-white px-4 py-3 text-slate-700">
                        {log.departureTime || "—"}
                      </td>
                      <td className="whitespace-nowrap bg-white px-4 py-3 text-slate-700">
                        {log.arrivalTime || "—"}
                      </td>
                      <td className="bg-[#fce5cd] px-4 py-3 text-right font-medium text-slate-800">
                        {log.out}
                      </td>
                      <td className="bg-[#fce5cd] px-4 py-3 text-right text-slate-800">
                        {log.returned}
                      </td>
                      <td
                        className={`bg-[#fce5cd] px-4 py-3 text-right font-medium ${
                          log.engaged < 0 ? "text-red-700" : "text-slate-700"
                        }`}
                      >
                        {log.engaged}
                      </td>
                      <td className="bg-[#d9ead3] px-4 py-3 text-right font-medium text-slate-800">
                        {log.filled}
                      </td>
                      <td className="bg-[#d9ead3] px-4 py-3 text-right text-slate-800">
                        {log.empty}
                      </td>
                      <td className="bg-[#d9ead3] px-4 py-3 text-right text-slate-800">
                        {log.recorded}
                      </td>
                      <td className="bg-[#fff2cc] px-4 py-3 text-right font-semibold text-slate-800">
                        {log.cash ? inr(log.cash) : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="bg-white px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {(log.staff || []).map((s) => (
                            <span
                              key={s}
                              className="rounded bg-slate-100 px-2 py-0.5 text-[13px] text-slate-700"
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="bg-white px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {(log.location || []).map((l) => (
                            <span
                              key={l}
                              className="rounded bg-slate-100 px-2 py-0.5 text-[13px] text-slate-700"
                            >
                              {l}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="whitespace-nowrap bg-white px-4 py-3">
                        <div className="flex gap-1">
                          <button
                            onClick={() => {
                              setEditing(log);
                              setDialogOpen(true);
                            }}
                            className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-blue-600"
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(log)}
                            className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
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
                  <tr className="border-t-2 border-slate-400 font-bold text-slate-800 [&>td]:bg-[#c9daf8]">
                    <td className="px-4 py-3" colSpan={4}>
                      TOTAL
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
                  className="bg-blue-600 text-white hover:bg-blue-700"
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
