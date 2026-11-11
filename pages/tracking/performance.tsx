import Wrapper from "@/components/Wrapper";
import { PageTitle } from "@/components/Tracking/Bits";
import { Input } from "@/components/ui/input";
import { errMsg, fmtTime, todayIST, useTrackingApi } from "@/lib/tracking";
import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

type Row = {
  staffId: string;
  name: string;
  type: string;
  day: string;
  checkInAt: number | null;
  checkOutAt: number | null;
  shiftMin: number | null;
  lateMin: number | null;
  trips: number;
  approved: number;
  pending: number;
  rejected: number;
  qrTrips: number;
  unloggedTrips: number;
  jarsDelivered: number;
  roadMin: number;
  idleMin: number;
  km: number;
  pings: number;
  mockedPings: number;
  firstPingAt: number | null;
  lastPingAt: number | null;
  gpsCoverage: number | null;
  utilisation: number | null;
  scanRate: number | null;
  approvalRate: number | null;
  jarsPerTrip: number | null;
  jarsPerRoadHour: number | null;
  score: number | null;
  grade: string | null;
};
type Data = {
  from: string;
  to: string;
  shift: { start: string; end: string; fullDayTrips: number };
  weights: Record<string, number>;
  staff: { id: string; name: string }[];
  rows: Row[];
};

const hours = (m: number | null) => (m == null ? "—" : `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}m`);
const pct = (v: number | null) => (v == null ? "—" : `${v}%`);
const num = (v: number | null) => (v == null ? "—" : v);
const dayLabel = (d: string) =>
  new Date(`${d}T00:00:00+05:30`).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", weekday: "short", day: "numeric", month: "short" });
const shiftDay = (d: string, n: number) => new Date(Date.parse(`${d}T12:00:00+05:30`) + n * 86400000 + 330 * 60000).toISOString().slice(0, 10);
const avg = (a: (number | null)[]) => {
  const v = a.filter((x): x is number => x != null);
  return v.length ? Math.round(v.reduce((s, x) => s + x, 0) / v.length) : null;
};

const GRADE: Record<string, string> = {
  A: "bg-green-100 text-green-800",
  B: "bg-blue-100 text-blue-800",
  C: "bg-amber-100 text-amber-800",
  D: "bg-red-100 text-red-800",
};
const Score = ({ score, grade }: { score: number | null; grade: string | null }) =>
  score == null || !grade ? (
    <span className="text-gray-400">—</span>
  ) : (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${GRADE[grade]}`}>
      {grade} · {score}
    </span>
  );
// A percentage that turns amber / red when it is low (the number is always shown, colour is extra).
const Rate = ({ v, warn = 80, bad = 50 }: { v: number | null; warn?: number; bad?: number }) => (
  <span className={v == null ? "text-gray-400" : v < bad ? "font-semibold text-red-700" : v < warn ? "font-semibold text-amber-700" : ""}>{pct(v)}</span>
);

const th = "whitespace-nowrap px-3 py-2 text-xs font-medium uppercase tracking-wide text-gray-500";
const td = "whitespace-nowrap px-3 py-2";

// What each calculated term means; the weights come from the API so they cannot drift.
const TERMS = (d: Data): [string, string][] => [
  ["Shift time", "Check-in to check-out. An open shift ends now (today) or at the shift end time."],
  ["Late", `Minutes checked in after the shift start (${d.shift.start}).`],
  ["GPS coverage", "Share of the shift that has a phone GPS fix at least every 5 minutes. Low coverage means the phone was off, had no signal or tracking was stopped."],
  ["Scan rate", "Trips started with a vehicle QR scan ÷ all trips (logged trips plus trips only GPS saw)."],
  ["Unlogged", "GPS trips with no vehicle scan and no details filled in. They need attention and are not paid."],
  ["Approval rate", "Approved trips ÷ trips the admin has approved or rejected."],
  ["Road time", "Time between leaving and returning, added up over the day's GPS trips."],
  ["Utilisation", "Road time ÷ shift time."],
  ["Jars delivered", "Jars out minus full jars brought back, on trips that are not rejected."],
  ["Jars / trip, Jars / road hour", "Jars delivered ÷ trips, and ÷ hours on the road."],
  ["Output", `Approved trips ÷ the full-day target (${d.shift.fullDayTrips} trips), capped at 100%.`],
  ["Punctuality", "100 when on time, minus 1 point for every minute late."],
  [
    "Score",
    `Weighted average out of 100: output ${d.weights.output}, scan rate ${d.weights.scan}, GPS coverage ${d.weights.gps}, approval rate ${d.weights.approval}, punctuality ${d.weights.punctuality}. A measure that cannot be calculated that day is left out. Grade A is 85 or more, B 70, C 50, D below 50.`,
  ],
];

// Day-wise performance per staff: check-in, GPS and trips, plus calculated measures and a score.
const StaffPerformance = () => {
  const { api, ready } = useTrackingApi();
  const [to, setTo] = useState(todayIST());
  const [from, setFrom] = useState(shiftDay(todayIST(), -6));
  const [staffId, setStaffId] = useState("");
  const [d, setD] = useState<Data | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!ready || !from || !to) return;
    setLoading(true);
    api
      .get("/admin/performance", { params: { from, to } })
      .then(({ data }) => setD(data))
      .catch((e) => toast.error(errMsg(e)))
      .finally(() => setLoading(false));
  }, [api, ready, from, to]);

  const rows = useMemo(() => (d?.rows || []).filter((r) => !staffId || r.staffId === staffId), [d, staffId]);

  // One line per staff over the whole range.
  const summary = useMemo(() => {
    const by = new Map<string, Row[]>();
    for (const r of rows) by.set(r.staffId, [...(by.get(r.staffId) || []), r]);
    return Array.from(by.values())
      .map((rs) => {
        const sum = (k: "trips" | "approved" | "unloggedTrips" | "jarsDelivered" | "roadMin" | "km" | "qrTrips") => rs.reduce((a, r) => a + r[k], 0);
        const checked = rs.filter((r) => r.checkInAt);
        const all = sum("trips") + sum("unloggedTrips");
        const score = avg(rs.map((r) => r.score));
        return {
          id: rs[0].staffId,
          name: rs[0].name,
          type: rs[0].type,
          days: checked.length,
          onTime: checked.filter((r) => !r.lateMin).length,
          avgLate: avg(checked.map((r) => r.lateMin)),
          gps: avg(rs.map((r) => r.gpsCoverage)),
          scan: all ? Math.round((sum("qrTrips") / all) * 100) : null,
          trips: sum("trips"),
          approved: sum("approved"),
          unlogged: sum("unloggedTrips"),
          jars: sum("jarsDelivered"),
          roadMin: sum("roadMin"),
          km: Math.round(sum("km") * 10) / 10,
          score,
          grade: score == null ? null : score >= 85 ? "A" : score >= 70 ? "B" : score >= 50 ? "C" : "D",
        };
      })
      .sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
  }, [rows]);

  return (
    <Wrapper>
      <PageTitle
        title="Staff performance"
        sub={d ? `${dayLabel(d.from)} to ${dayLabel(d.to)} · shift ${d.shift.start}–${d.shift.end}${loading ? " · loading…" : ""}` : "Loading…"}
        right={
          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Staff"
              value={staffId}
              onChange={(e) => setStaffId(e.target.value)}
              className="h-9 !w-44 rounded-md border border-input bg-white px-2 text-sm capitalize"
            >
              <option value="">All staff</option>
              {(d?.staff || []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <Input aria-label="From" type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className="w-40" />
            <span className="text-gray-400">to</span>
            <Input aria-label="To" type="date" value={to} min={from} max={todayIST()} onChange={(e) => setTo(e.target.value)} className="w-40" />
          </div>
        }
      />

      {d && (
        <div className="flex flex-col gap-4">
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <h2 className="border-b px-4 py-2 font-semibold">Summary for the period</h2>
            <table className="w-full text-sm tabular-nums">
              <thead className="text-left">
                <tr>
                  {["Staff", "Score", "Days in", "On time", "Avg late", "GPS coverage", "Scan rate", "Trips (approved)", "Unlogged", "Jars delivered", "Road time", "Km"].map((h, i) => (
                    <th key={h} className={`${th} ${i > 1 ? "text-right" : ""}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {summary.length === 0 && (
                  <tr>
                    <td className="px-4 py-3 text-gray-400" colSpan={12}>
                      No check-ins, GPS or trips in this period.
                    </td>
                  </tr>
                )}
                {summary.map((s) => (
                  <tr key={s.id} className="border-t">
                    <td className={`${td} font-medium capitalize`}>
                      {s.name} <span className="text-xs font-normal text-gray-400">{s.type}</span>
                    </td>
                    <td className={td}>
                      <Score score={s.score} grade={s.grade} />
                    </td>
                    <td className={`${td} text-right`}>{s.days}</td>
                    <td className={`${td} text-right`}>{s.days ? `${s.onTime} of ${s.days}` : "—"}</td>
                    <td className={`${td} text-right`}>{s.avgLate == null ? "—" : `${s.avgLate} min`}</td>
                    <td className={`${td} text-right`}>
                      <Rate v={s.gps} />
                    </td>
                    <td className={`${td} text-right`}>
                      <Rate v={s.scan} />
                    </td>
                    <td className={`${td} text-right`}>
                      {s.trips} ({s.approved})
                    </td>
                    <td className={`${td} text-right ${s.unlogged ? "font-semibold text-amber-700" : ""}`}>{s.unlogged}</td>
                    <td className={`${td} text-right`}>{s.jars}</td>
                    <td className={`${td} text-right`}>{hours(s.roadMin)}</td>
                    <td className={`${td} text-right`}>{s.km}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <h2 className="border-b px-4 py-2 font-semibold">Day by day</h2>
            <table className="w-full text-sm tabular-nums">
              <thead className="text-left">
                <tr>
                  {["Day", "Staff", "Score", "Check-in", "Check-out", "Shift", "GPS coverage", "GPS seen", "Trips", "Scan rate", "Jars", "Jars / trip", "Road time", "Utilisation", "Km"].map((h, i) => (
                    <th key={h} className={`${th} ${i > 4 && i !== 7 ? "text-right" : ""}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr>
                    <td className="px-4 py-3 text-gray-400" colSpan={15}>
                      Nothing recorded for these days.
                    </td>
                  </tr>
                )}
                {rows.map((r, i) => (
                  <tr key={`${r.staffId}${r.day}`} className={`border-t ${i && rows[i - 1].day !== r.day ? "border-t-2 border-gray-300" : ""}`}>
                    <td className={`${td} text-gray-500`}>{dayLabel(r.day)}</td>
                    <td className={`${td} font-medium capitalize`}>{r.name}</td>
                    <td className={td}>
                      <Score score={r.score} grade={r.grade} />
                    </td>
                    <td className={td}>
                      {r.checkInAt ? fmtTime(r.checkInAt) : <span className="font-semibold text-red-700">No check-in</span>}
                      {!!r.lateMin && <span className="ml-1.5 text-xs font-semibold text-amber-700">{r.lateMin} min late</span>}
                    </td>
                    <td className={td}>{r.checkOutAt ? fmtTime(r.checkOutAt) : r.checkInAt ? <span className="text-gray-400">Not checked out</span> : "—"}</td>
                    <td className={`${td} text-right`}>{hours(r.shiftMin)}</td>
                    <td className={`${td} text-right`}>
                      <Rate v={r.gpsCoverage} />
                    </td>
                    <td className={td}>
                      {r.pings ? `${fmtTime(r.firstPingAt)} – ${fmtTime(r.lastPingAt)}` : <span className="text-gray-400">No GPS</span>}
                      {r.mockedPings > 0 && <span className="ml-1.5 rounded bg-red-100 px-1 text-xs font-semibold text-red-800">{r.mockedPings} fake</span>}
                    </td>
                    <td className={`${td} text-right`}>
                      {r.trips}
                      <span className="ml-1.5 text-xs text-gray-500">
                        {r.approved} ok{r.pending ? ` · ${r.pending} waiting` : ""}
                        {r.rejected ? ` · ${r.rejected} rejected` : ""}
                      </span>
                      {r.unloggedTrips > 0 && <span className="ml-1.5 text-xs font-semibold text-amber-700">+{r.unloggedTrips} unlogged</span>}
                    </td>
                    <td className={`${td} text-right`}>
                      <Rate v={r.scanRate} />
                    </td>
                    <td className={`${td} text-right`}>{r.jarsDelivered}</td>
                    <td className={`${td} text-right`}>{num(r.jarsPerTrip)}</td>
                    <td className={`${td} text-right`}>{r.roadMin ? hours(r.roadMin) : "—"}</td>
                    <td className={`${td} text-right`}>{pct(r.utilisation)}</td>
                    <td className={`${td} text-right`}>{r.km || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <details className="rounded-lg border border-gray-200 px-4 py-3 text-sm" open>
            <summary className="cursor-pointer font-semibold">How these are calculated</summary>
            <dl className="mt-3 grid gap-x-6 gap-y-2 md:grid-cols-[200px_1fr]">
              {TERMS(d).map(([term, meaning]) => (
                <React.Fragment key={term}>
                  <dt className="font-medium text-gray-900">{term}</dt>
                  <dd className="text-gray-600">{meaning}</dd>
                </React.Fragment>
              ))}
            </dl>
            <p className="mt-3 text-xs text-gray-500">GPS fixes are kept for 30 days, so the report covers at most the last 31 days.</p>
          </details>
        </div>
      )}
    </Wrapper>
  );
};

export default StaffPerformance;
