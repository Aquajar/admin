import Wrapper from "@/components/Wrapper";
import { PageTitle } from "@/components/Tracking/Bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { errMsg, todayIST, useTrackingApi } from "@/lib/tracking";
import React, { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";

type Row = {
  staffId: string;
  employeeID: number;
  name: string;
  days: Record<number, { value: number; trips: number; holiday?: boolean }>;
  fullDays: number;
  halfDays: number;
  holidays: number;
  payableDays: number;
  salary: number;
  payout: number;
};
type Sheet = { month: string; daysInMonth: number; rows: Row[]; locked: boolean };

const inr = (n: number) => "₹" + Math.round(n || 0).toLocaleString("en-IN");
const CELL: Record<string, string> = { "1": "bg-green-100 text-green-800", "0.5": "bg-amber-100 text-amber-800", "0": "text-gray-300", H: "bg-sky-100 text-sky-800" };

// Trip-based attendance (design 14): approved trips per day → 0, ½ or 1 day;
// payout = salary ÷ 30 × payable days. Locking a finished month freezes trips and values.
const TripAttendance = () => {
  const { api, ready } = useTrackingApi();
  const [month, setMonth] = useState(todayIST().slice(0, 7));
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!ready) return;
    try {
      const { data } = await api.get("/admin/attendance", { params: { month } });
      setSheet(data);
    } catch (e) {
      toast.error(errMsg(e));
    }
  }, [api, ready, month]);

  useEffect(() => {
    load();
  }, [load]);

  const lock = async (unlock: boolean) => {
    let reason: string | null = "";
    if (unlock) {
      reason = window.prompt("Why reopen this month? (saved in the audit log)");
      if (!reason?.trim()) return;
    } else if (!window.confirm(`Lock ${month}? Approved trips become final for payout.`)) return;
    setBusy(true);
    try {
      await api.post(`/admin/attendance/${unlock ? "unlock" : "lock"}`, { month, reason });
      toast.success(unlock ? "Month reopened" : "Month locked");
      load();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const exportXlsx = async () => {
    if (!sheet) return;
    const mod: any = await import("sheetjs-style");
    const XLSX = mod.default || mod;
    const days = Array.from({ length: sheet.daysInMonth }, (_, i) => i + 1);
    const aoa = [
      ["ID", "Name", ...days.map(String), "Full days", "Half days", "Payable days", "Salary", "Payout"],
      ...sheet.rows.map((r) => [
        r.employeeID,
        r.name,
        ...days.map((d) => (r.days[d] ? (r.days[d].holiday ? "H" : r.days[d].value) : "")),
        r.fullDays,
        r.halfDays,
        r.payableDays,
        r.salary,
        r.payout,
      ]),
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), sheet.month);
    XLSX.writeFile(wb, `trip-attendance-${sheet.month}.xlsx`);
  };

  const days = sheet ? Array.from({ length: sheet.daysInMonth }, (_, i) => i + 1) : [];
  const total = sheet?.rows.reduce((a, r) => a + r.payout, 0) || 0;

  return (
    <Wrapper>
      <PageTitle
        title="Trip attendance and payout"
        sub="Approved vehicle-log trips: 1–2 = half day, 3+ = full day; holiday (H on the Attendance sheet) = full day. Pay per day = salary ÷ days in the month."
        right={
          <div className="flex flex-wrap items-center gap-2">
            <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-40" />
            <Button variant="outline" onClick={exportXlsx} disabled={!sheet}>
              Export
            </Button>
            {sheet?.locked ? (
              <Button variant="outline" disabled={busy} onClick={() => lock(true)}>
                Unlock month
              </Button>
            ) : (
              <Button disabled={busy || month >= todayIST().slice(0, 7)} onClick={() => lock(false)} title="Only finished months can be locked">
                Lock month
              </Button>
            )}
          </div>
        }
      />
      {sheet?.locked && <p className="mb-3 rounded-lg bg-gray-100 px-3 py-2 text-sm">This month is locked. Changes need an unlock, which is audited.</p>}
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="sticky left-0 bg-gray-50 px-3 py-2 text-left">Staff</th>
              {days.map((d) => (
                <th key={d} className="px-1 py-2 font-normal">
                  {d}
                </th>
              ))}
              <th className="px-2 py-2">Days</th>
              <th className="px-2 py-2 text-right">Salary</th>
              <th className="px-3 py-2 text-right">Payout</th>
            </tr>
          </thead>
          <tbody>
            {(sheet?.rows || []).map((r) => (
              <tr key={r.staffId} className="border-t">
                <td className="sticky left-0 whitespace-nowrap bg-white px-3 py-2 text-sm font-medium capitalize">
                  {r.name} <span className="text-gray-400">#{r.employeeID}</span>
                </td>
                {days.map((d) => {
                  const c = r.days[d];
                  return (
                    <td
                      key={d}
                      title={c ? (c.holiday ? "Holiday (paid)" : `${c.trips} approved trip(s)`) : ""}
                      className={`px-1 py-2 text-center ${c ? CELL[c.holiday ? "H" : String(c.value)] : ""}`}
                    >
                      {c ? (c.holiday ? "H" : c.value === 1 ? "P" : c.value === 0.5 ? "½" : "·") : ""}
                    </td>
                  );
                })}
                <td className="px-2 py-2 text-center text-sm">{r.payableDays}</td>
                <td className="px-2 py-2 text-right text-sm text-gray-500">{inr(r.salary)}</td>
                <td className="px-3 py-2 text-right text-sm font-semibold">{inr(r.payout)}</td>
              </tr>
            ))}
          </tbody>
          {sheet && (
            <tfoot>
              <tr className="border-t bg-gray-50">
                <td className="sticky left-0 bg-gray-50 px-3 py-2 text-sm font-semibold" colSpan={days.length + 3}>
                  Total payout
                </td>
                <td className="px-3 py-2 text-right text-sm font-bold">{inr(total)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </Wrapper>
  );
};

export default TripAttendance;
