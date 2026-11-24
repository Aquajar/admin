import { fmtTime, todayIST } from "@/lib/tracking";
import { AxiosInstance } from "axios";
import { CalendarCheck, Route, ShieldAlert, Truck } from "lucide-react";
import React, { FC, useEffect, useState } from "react";
import StatCard, { Em, plural } from "./StatCard";

type Live = {
  shiftEnd: number;
  rows: { checkinAt: string | null; shiftEndedAt: string | null }[];
  trips: { returnAt?: string | null; closedAtShiftEnd?: boolean; distanceKm?: number; vehicleName?: string; nonWork?: boolean; status?: string }[];
  alerts: unknown[];
};
type HrRow = { days: Record<string, string> };

const km = (n: number) => (n < 100 ? n.toFixed(1) : Math.round(n).toLocaleString("en-IN"));

// "Live Updates" figures from the Live Tracking, HR Attendance and Vehicle Log pages' APIs.
// Each request fails on its own: a missing value shows "—" and never blocks the dashboard.
const QuickStats: FC<{ axiosInstance: AxiosInstance }> = ({ axiosInstance }) => {
  const [live, setLive] = useState<Live | null>(null);
  const [hr, setHr] = useState<HrRow[] | null>(null);
  const [pendingLogs, setPendingLogs] = useState<number | null>(null);

  const [y, m, d] = todayIST().split("-").map(Number);

  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_API_URL;
    // Each card fills in as its own request returns; a slow or failed one never holds up the others.
    const skip = () => {};
    axiosInstance.get(`${base}/admin/live`).then((r) => setLive(r.data), skip);
    axiosInstance.get(`${base}/attendance?year=${y}&month=${m}`).then((r) => setHr(r.data.rows || []), skip);
    axiosInstance
      .get(`${base}/vehicle-log?from=2000-01-01&status=pending`)
      .then((r) => setPendingLogs((r.data.logs || []).filter((x: { status: string }) => x.status === "pending").length), skip);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Trips marked non-work or rejected aren't real work, same as the vehicle log.
  const trips = live?.trips.filter((t) => !t.nonWork && t.status !== "rejected");
  // After the shift window closes nobody counts as on shift, even before the engine closes their trips.
  const shiftOver = !!live && Date.now() > live.shiftEnd;
  const distance = trips?.reduce((s, t) => s + (t.distanceKm || 0), 0);
  const vehicles = trips && new Set(trips.map((t) => t.vehicleName).filter(Boolean)).size;

  // Today's HR sheet marks: P present, A absent, HD half day, H holiday, nothing = not marked yet.
  const marks = hr?.map((r) => r.days?.[String(d)]);
  const count = (s?: string) => marks?.filter((x) => x === s).length;
  const unmarked = marks?.filter((x) => !x).length;

  const checkedIn = live?.rows.filter((r) => r.checkinAt).length ?? 0;
  const onShift = live && !shiftOver ? live.rows.filter((r) => r.checkinAt && !r.shiftEndedAt).length : 0;
  const openTrips = trips && !shiftOver ? trips.filter((t) => !t.returnAt && !t.closedAtShiftEnd).length : 0;
  const present = count("P") ?? 0;
  const alerts = live?.alerts.length ?? 0;
  const toReview = (pendingLogs || 0) + alerts;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        href="/tracking/live"
        tone="blue"
        title="On Shift"
        icon={Truck}
        value={live ? onShift : "—"}
        unit={live ? (onShift === 1 ? "person" : "people") : undefined}
      >
        {live &&
          (shiftOver ? (
            <>
              Shift ended at {fmtTime(live.shiftEnd)}. <Em>{plural(checkedIn, "person", "people")}</Em> checked in today.
            </>
          ) : (
            <>
              <Em>{checkedIn}</Em> checked in today, <Em>{plural(openTrips, "trip")}</Em> on the road.
            </>
          ))}
      </StatCard>
      <StatCard
        href="/vehicle-log"
        tone="violet"
        title="Distance Today"
        icon={Route}
        value={distance == null ? "—" : km(distance)}
        unit={distance == null ? undefined : "km"}
      >
        {trips &&
          (trips.length ? (
            <>
              Across <Em>{plural(trips.length, "trip")}</Em>
              {vehicles ? (
                <>
                  {" "}
                  on <Em>{plural(vehicles, "vehicle")}</Em>
                </>
              ) : null}
              .
            </>
          ) : (
            <>No trips yet today.</>
          ))}
      </StatCard>
      <StatCard
        href="/attendance"
        tone="emerald"
        title="HR Attendance"
        icon={CalendarCheck}
        value={marks ? present : "—"}
        unit={marks ? `of ${marks.length} present` : undefined}
      >
        {marks && (
          <Sentence
            parts={[
              count("A") ? <><Em>{count("A")}</Em> absent</> : null,
              count("HD") ? <><Em>{count("HD")}</Em> on half day</> : null,
              count("H") ? <><Em>{count("H")}</Em> on holiday</> : null,
              unmarked ? <><Em>{unmarked}</Em> not marked yet</> : null,
            ]}
            empty="Everyone is marked present."
          />
        )}
      </StatCard>
      <StatCard
        href="/vehicle-log"
        tone="amber"
        title="Needs Review"
        icon={ShieldAlert}
        value={pendingLogs == null && !live ? "—" : toReview}
        unit={pendingLogs == null && !live ? undefined : toReview === 1 ? "item" : "items"}
      >
        {(pendingLogs != null || live) && (
          <Sentence
            parts={[
              pendingLogs ? <><Em>{plural(pendingLogs, "vehicle log")}</Em> to approve</> : null,
              alerts ? <><Em>{plural(alerts, "open alert")}</Em></> : null,
            ]}
            empty="All caught up."
          />
        )}
      </StatCard>
    </div>
  );
};

// Joins phrases as "a, b and c." Empty phrases are skipped; with none left, `empty` is shown.
const Sentence: FC<{ parts: React.ReactNode[]; empty: string }> = ({ parts, empty }) => {
  const p = parts.filter(Boolean);
  if (!p.length) return <>{empty}</>;
  return (
    <>
      {p.map((x, i) => (
        <React.Fragment key={i}>
          {i > 0 && (i === p.length - 1 ? " and " : ", ")}
          {x}
        </React.Fragment>
      ))}
      .
    </>
  );
};

export default QuickStats;
