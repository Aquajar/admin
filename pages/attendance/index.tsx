import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import { RefreshCw, Loader2 } from "lucide-react";
import Wrapper from "@/components/Wrapper";
import useAxiosInstance from "@/lib/hooks/useAxiosInstance";
import { Button } from "@/components/ui/button";
import {
  AttendanceResponse,
  AttendanceRow,
  AttendanceStatus,
} from "@/types/types";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// Status meta — colours mirror the source attendance sheet.
const STATUS_META: Record<
  AttendanceStatus,
  { label: string; bg: string; text: string; name: string }
> = {
  P: { label: "P", bg: "#D9EAD3", text: "#274E13", name: "Present" },
  A: { label: "A", bg: "#EA9999", text: "#5B0000", name: "Absent" },
  HD: { label: "HD", bg: "#C9DAF8", text: "#1C4587", name: "Half day" },
  H: { label: "H", bg: "#CFE2F3", text: "#1C4587", name: "Holiday" },
};

const countOf = (days: Record<string, AttendanceStatus>) => {
  let present = 0;
  let absent = 0;
  Object.values(days || {}).forEach((v) => {
    if (v === "P") present += 1;
    else if (v === "A") absent += 1;
    else if (v === "HD") {
      present += 0.5;
      absent += 0.5;
    }
  });
  return { present, absent };
};

const fmtCount = (n: number) => (Number.isInteger(n) ? n : n.toFixed(1));

const AttendancePage = () => {
  const { data: session } = useSession();
  const axiosInstance = useAxiosInstance(session);
  const base = process.env.NEXT_PUBLIC_API_URL;

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [daysInMonth, setDaysInMonth] = useState(31);
  const [loading, setLoading] = useState(false);
  const [menu, setMenu] = useState<{
    employeeID: number;
    day: number;
    x: number;
    y: number;
  } | null>(null);

  const fetchData = useCallback(
    async (y: number, m: number) => {
      if (!session) return;
      setLoading(true);
      try {
        const { data } = await axiosInstance.get<AttendanceResponse>(
          `${base}/attendance?year=${y}&month=${m}`
        );
        setRows(data.rows || []);
        setDaysInMonth(data.daysInMonth || 31);
      } catch (error) {
        console.error(error);
        toast.error("Failed to load attendance");
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [session]
  );

  useEffect(() => {
    if (session) fetchData(year, month);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, year, month]);

  const dayList = useMemo(
    () => Array.from({ length: daysInMonth }, (_, i) => i + 1),
    [daysInMonth]
  );

  // Weekend flags for the day headers.
  const isWeekend = (d: number) => {
    const wd = new Date(year, month - 1, d).getDay();
    return wd === 0 || wd === 6;
  };

  const applyStatus = async (
    row: AttendanceRow,
    day: number,
    next: AttendanceStatus | null
  ) => {
    // Optimistic update.
    const prevDays = { ...(row.days || {}) };
    const newDays = { ...prevDays };
    if (next) newDays[String(day)] = next;
    else delete newDays[String(day)];
    const { present, absent } = countOf(newDays);

    setRows((rs) =>
      rs.map((r) =>
        r.employeeID === row.employeeID
          ? { ...r, days: newDays, present, absent }
          : r
      )
    );

    try {
      await axiosInstance.put(`${base}/attendance/mark`, {
        employeeID: row.employeeID,
        name: row.name,
        year,
        month,
        day,
        status: next,
      });
    } catch (error) {
      console.error(error);
      toast.error("Failed to save");
      // Revert.
      const reverted = countOf(prevDays);
      setRows((rs) =>
        rs.map((r) =>
          r.employeeID === row.employeeID
            ? { ...r, days: prevDays, present: reverted.present, absent: reverted.absent }
            : r
        )
      );
    }
  };

  // Open the status picker anchored to the clicked cell.
  const openMenu = (
    e: React.MouseEvent<HTMLButtonElement>,
    row: AttendanceRow,
    day: number
  ) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMenu({ employeeID: row.employeeID, day, x: rect.left, y: rect.bottom + 4 });
  };

  const pick = (status: AttendanceStatus | null) => {
    if (!menu) return;
    const row = rows.find((r) => r.employeeID === menu.employeeID);
    if (row) applyStatus(row, menu.day, status);
    setMenu(null);
  };

  const totalPresent = rows.reduce((s, r) => s + r.present, 0);
  const totalAbsent = rows.reduce((s, r) => s + r.absent, 0);

  return (
    <Wrapper>
      <div className="flex w-full flex-col gap-4">
        {/* Header */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[#0A0A0A]">
              Attendance
            </h1>
            <p className="text-[15px] text-[#6B7280]">
              {MONTHS[month - 1]} {year} · click a cell to mark
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="h-11 rounded-xl border border-[#EAEAEA] bg-white px-3 text-[15px] font-medium text-[#0A0A0A] hover:border-[#D4D4D4] focus:border-[#2563EB] focus:outline-none focus:ring-[3px] focus:ring-[#2563EB]/15"
            >
              {MONTHS.map((mn, i) => (
                <option key={mn} value={i + 1}>
                  {mn}
                </option>
              ))}
            </select>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="h-11 rounded-xl border border-[#EAEAEA] bg-white px-3 text-[15px] font-medium text-[#0A0A0A] hover:border-[#D4D4D4] focus:border-[#2563EB] focus:outline-none focus:ring-[3px] focus:ring-[#2563EB]/15"
            >
              {[now.getFullYear() + 1, now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2].map(
                (y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                )
              )}
            </select>
            <Button
              variant="outline"
              onClick={() => fetchData(year, month)}
              title="Refresh"
              className="h-11 w-11 rounded-xl border-[#EAEAEA] p-0 text-[#6B7280] shadow-none hover:bg-[#FAFAFA]"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 text-[13px] text-[#6B7280]">
          <span className="font-medium text-[#0A0A0A]">Legend:</span>
          {(Object.keys(STATUS_META) as AttendanceStatus[]).map((k) => (
            <span key={k} className="inline-flex items-center gap-1.5">
              <span
                className="inline-flex h-5 w-6 items-center justify-center rounded text-[11px] font-semibold"
                style={{
                  background: STATUS_META[k].bg,
                  color: STATUS_META[k].text,
                }}
              >
                {STATUS_META[k].label}
              </span>
              {STATUS_META[k].name}
            </span>
          ))}
          <span className="ml-auto text-[13px] text-[#6B7280]">
            Total present{" "}
            <span className="font-semibold text-[#274E13]">
              {fmtCount(totalPresent)}
            </span>{" "}
            · absent{" "}
            <span className="font-semibold text-[#990000]">
              {fmtCount(totalAbsent)}
            </span>
          </span>
        </div>

        {/* Grid */}
        <div className="relative w-full overflow-auto rounded-2xl border border-[#EAEAEA] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <table className="border-separate border-spacing-0 text-[13px]">
            <thead>
              <tr>
                <th className="sticky left-0 top-0 z-30 w-52 min-w-52 border-b border-r border-[#EAEAEA] bg-[#FAFAFA] px-4 py-3 text-left text-[13px] font-medium text-[#0A0A0A]">
                  Employee
                </th>
                <th className="sticky top-0 z-20 w-16 border-b border-r border-[#EAEAEA] bg-[#FAFAFA] px-2 py-3 text-center text-[13px] font-medium text-[#0A0A0A]">
                  Present
                </th>
                <th className="sticky top-0 z-20 w-16 border-b border-r border-[#EAEAEA] bg-[#FAFAFA] px-2 py-3 text-center text-[13px] font-medium text-[#0A0A0A]">
                  Absent
                </th>
                {dayList.map((d) => (
                  <th
                    key={d}
                    className={`sticky top-0 z-20 w-10 min-w-10 border-b border-r border-[#EAEAEA] px-0 py-3 text-center text-[13px] font-medium ${
                      isWeekend(d)
                        ? "bg-[#F1F5F9] text-[#6B7280]"
                        : "bg-[#FAFAFA] text-[#0A0A0A]"
                    }`}
                  >
                    {d}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.employeeID} className="group">
                  <td className="sticky left-0 z-10 w-52 min-w-52 border-b border-r border-[#EAEAEA] bg-white px-4 py-2 group-hover:bg-[#FAFAFA]">
                    <div className="font-medium text-[#0A0A0A]">{row.name}</div>
                    <div className="text-[12px] text-[#9CA3AF]">
                      #{row.employeeID}
                    </div>
                  </td>
                  <td className="border-b border-r border-[#EAEAEA] bg-[#EDF6EA] px-2 py-2 text-center font-semibold text-[#274E13]">
                    {fmtCount(row.present)}
                  </td>
                  <td className="border-b border-r border-[#EAEAEA] bg-[#FBECEC] px-2 py-2 text-center font-semibold text-[#990000]">
                    {fmtCount(row.absent)}
                  </td>
                  {dayList.map((d) => {
                    const st = row.days?.[String(d)];
                    const meta = st ? STATUS_META[st] : null;
                    return (
                      <td
                        key={d}
                        className="border-b border-r border-[#EAEAEA] p-0"
                      >
                        <button
                          type="button"
                          onClick={(e) => openMenu(e, row, d)}
                          title={meta ? meta.name : "Click to mark"}
                          className={`flex h-9 w-10 items-center justify-center text-[12px] font-semibold transition hover:brightness-95 ${
                            !meta ? "hover:bg-[#F5F5F5]" : ""
                          } ${
                            menu?.employeeID === row.employeeID && menu?.day === d
                              ? "ring-2 ring-inset ring-[#2563EB]"
                              : ""
                          }`}
                          style={
                            meta
                              ? { background: meta.bg, color: meta.text }
                              : undefined
                          }
                        >
                          {meta ? meta.label : ""}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>

          {loading && (
            <div className="flex items-center justify-center gap-2 py-10 text-[#6B7280]">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading…
            </div>
          )}
          {!loading && rows.length === 0 && (
            <div className="py-10 text-center text-[#6B7280]">
              No staff found.
            </div>
          )}
        </div>

        <p className="text-[13px] text-[#9CA3AF]">
          Tip: click a day to pick Present / Absent / Half day / Holiday.
          Changes save automatically.
        </p>
      </div>

      {/* Status picker */}
      {menu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setMenu(null)}
          />
          <div
            className="fixed z-50 w-44 rounded-xl border border-[#EAEAEA] bg-white p-1 shadow-[0_8px_24px_rgba(0,0,0,0.10)]"
            style={{
              left: Math.min(
                menu.x,
                (typeof window !== "undefined" ? window.innerWidth : 1000) - 188
              ),
              top: menu.y,
            }}
          >
            {(Object.keys(STATUS_META) as AttendanceStatus[]).map((s) => (
              <button
                key={s}
                onClick={() => pick(s)}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[14px] text-[#0A0A0A] hover:bg-[#FAFAFA]"
              >
                <span
                  className="inline-flex h-5 w-6 items-center justify-center rounded text-[11px] font-semibold"
                  style={{
                    background: STATUS_META[s].bg,
                    color: STATUS_META[s].text,
                  }}
                >
                  {STATUS_META[s].label}
                </span>
                {STATUS_META[s].name}
              </button>
            ))}
            <button
              onClick={() => pick(null)}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[14px] text-[#6B7280] hover:bg-[#FAFAFA]"
            >
              <span className="inline-flex h-5 w-6 items-center justify-center rounded border border-[#EAEAEA] text-[11px] text-[#9CA3AF]">
                —
              </span>
              Clear
            </button>
          </div>
        </>
      )}
    </Wrapper>
  );
};

export default AttendancePage;
