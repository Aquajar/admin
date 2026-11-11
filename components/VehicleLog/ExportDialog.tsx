import React, { FC, useEffect, useState } from "react";
import type { AxiosInstance } from "axios";
import toast from "react-hot-toast";
import { Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { VehicleLog } from "@/types/types";
import { monthLabel, monthOptions } from "@/components/VehicleLog/MonthSelect";
import { exportVehicleLogPDF, exportVehicleLogXLSX } from "@/components/VehicleLog/vehicleLogExport";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  axiosInstance: AxiosInstance;
  months: string[];
  month: string; // what the page is showing; the dialog starts from it
  staff: string;
  staffNames: string[];
}

const STATUSES = [
  { value: "approved", label: "Approved only" },
  { value: "pending", label: "Waiting for approval" },
  { value: "rejected", label: "Rejected" },
  { value: "all", label: "All trips" },
];

const fmtDay = (ymd: string) =>
  new Date(ymd).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

const selectCls = "h-10 w-full rounded-md border border-input bg-white px-3 text-sm";

// Two-option toggle (period, file type).
const Seg: FC<{
  value: string;
  onChange: (v: any) => void;
  options: { value: string; label: React.ReactNode }[];
}> = ({ value, onChange, options }) => (
  <div className="grid grid-cols-2 gap-1 rounded-lg bg-[#F5F5F5] p-1">
    {options.map((o) => (
      <button
        key={o.value}
        type="button"
        aria-pressed={value === o.value}
        onClick={() => onChange(o.value)}
        className={`flex h-9 items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors ${
          value === o.value ? "bg-white text-[#0A0A0A] shadow-sm" : "text-[#6B7280] hover:text-[#0A0A0A]"
        }`}
      >
        {o.label}
      </button>
    ))}
  </div>
);

const ExportDialog: FC<Props> = ({ open, onOpenChange, axiosInstance, months, month, staff, staffNames }) => {
  const [period, setPeriod] = useState<"month" | "range">("month");
  const [m, setM] = useState(month);
  const [from, setFrom] = useState(`${month}-01`);
  const [to, setTo] = useState(new Date().toLocaleDateString("en-CA")); // local YYYY-MM-DD
  const [status, setStatus] = useState("approved");
  const [who, setWho] = useState(staff);
  const [format, setFormat] = useState<"xlsx" | "pdf">("xlsx");
  const [busy, setBusy] = useState(false);

  // Each time it opens, start from what the page is showing.
  useEffect(() => {
    if (open) {
      setM(month);
      setWho(staff);
    }
  }, [open, month, staff]);

  const badRange = period === "range" && (!from || !to || from > to);

  const download = async () => {
    setBusy(true);
    try {
      const params = new URLSearchParams(period === "month" ? { month: m } : { from, to });
      if (status !== "all") params.set("status", status);
      const { data } = await axiosInstance.get(`${process.env.NEXT_PUBLIC_API_URL}/vehicle-log?${params}`);
      // GPS-only rows are not saved entries; the status is re-checked here in case the API ignores it.
      const rows = ((data.logs || []) as VehicleLog[]).filter(
        (l) =>
          !l.virtual &&
          (status === "all" || (l.status || "approved") === status) &&
          (!who || (l.staff || []).includes(who))
      );
      if (rows.length === 0) {
        toast.error("No trips match these filters");
        return;
      }
      const label = period === "month" ? monthLabel(m) : `${fmtDay(from)} to ${fmtDay(to)}`;
      const fileBase = [
        "Vehicle-Log",
        period === "month" ? m : `${from}_to_${to}`,
        who.replace(/\s+/g, "-"),
        status === "approved" ? "" : status,
      ]
        .filter(Boolean)
        .join("-");
      await (format === "xlsx" ? exportVehicleLogXLSX : exportVehicleLogPDF)(rows, label, fileBase, status !== "approved");
      toast.success(`Downloaded ${rows.length} trips`);
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error("Download failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Download vehicle log</DialogTitle>
          <DialogDescription>Choose which trips go into the file.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-gray-600">Period</Label>
            <Seg
              value={period}
              onChange={setPeriod}
              options={[
                { value: "month", label: "Whole month" },
                { value: "range", label: "Date range" },
              ]}
            />
            {period === "month" ? (
              <select aria-label="Month" value={m} onChange={(e) => setM(e.target.value)} className={selectCls}>
                {monthOptions(months, m).map((k) => (
                  <option key={k} value={k}>
                    {monthLabel(k)}
                  </option>
                ))}
              </select>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="vlog-export-from" className="text-xs text-gray-600">From</Label>
                    <Input id="vlog-export-from" type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="vlog-export-to" className="text-xs text-gray-600">To</Label>
                    <Input id="vlog-export-to" type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} />
                  </div>
                </div>
                {badRange && (
                  <p role="alert" className="text-xs text-red-600">
                    Pick both dates, with From on or before To.
                  </p>
                )}
              </>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="vlog-export-status" className="text-xs text-gray-600">Trips</Label>
              <select id="vlog-export-status" value={status} onChange={(e) => setStatus(e.target.value)} className={selectCls}>
                {STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="vlog-export-staff" className="text-xs text-gray-600">Staff</Label>
              <select id="vlog-export-staff" value={who} onChange={(e) => setWho(e.target.value)} className={selectCls}>
                <option value="">All staff</option>
                {staffNames.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-gray-600">File type</Label>
            <Seg
              value={format}
              onChange={setFormat}
              options={[
                { value: "xlsx", label: <><FileSpreadsheet className="h-4 w-4" /> Excel</> },
                { value: "pdf", label: <><FileText className="h-4 w-4" /> PDF</> },
              ]}
            />
          </div>
        </div>

        <DialogFooter>
          <Button onClick={download} disabled={busy || badRange} className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] sm:w-auto">
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            {busy ? "Preparing…" : "Download"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ExportDialog;
