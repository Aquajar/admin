import Wrapper from "@/components/Wrapper";
import { PageTitle } from "@/components/Tracking/Bits";
import { Input } from "@/components/ui/input";
import { errMsg, todayIST, useTrackingApi } from "@/lib/tracking";
import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";

type Report = {
  from: string;
  to: string;
  trips: number;
  byStaff: { name: string; trips: number; minutes: number; days: number }[];
  byVehicle: { name: string; trips: number; km: number; minutes: number; idleMinutes: number }[];
  byRoute: { route: string; trips: number; medianMin: number; maxMin: number }[];
};

const hours = (m: number) => `${Math.floor(m / 60)}h ${m % 60}m`;

function Table({ title, head, rows }: { title: string; head: string[]; rows: (string | number)[][] }) {
  return (
    <div className="rounded-lg border border-gray-200">
      <h2 className="border-b px-4 py-2 font-semibold">{title}</h2>
      <table className="w-full text-sm">
        <thead className="text-left text-gray-500">
          <tr>
            {head.map((h, i) => (
              <th key={h} className={`px-4 py-2 font-normal ${i ? "text-right" : ""}`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td className="px-4 py-3 text-gray-400" colSpan={head.length}>
                No approved trips in this range.
              </td>
            </tr>
          )}
          {rows.map((r, i) => (
            <tr key={i} className="border-t">
              {r.map((c, j) => (
                <td key={j} className={`px-4 py-2 ${j ? "text-right" : "capitalize"}`}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Approved trips only: per staff, per vehicle (km, idle time at non-delivery stops), per route.
const TripReports = () => {
  const { api, ready } = useTrackingApi();
  const [from, setFrom] = useState(`${todayIST().slice(0, 7)}-01`);
  const [to, setTo] = useState(todayIST());
  const [r, setR] = useState<Report | null>(null);

  useEffect(() => {
    if (!ready) return;
    api
      .get("/admin/reports", { params: { from, to } })
      .then(({ data }) => setR(data))
      .catch((e) => toast.error(errMsg(e)));
  }, [api, ready, from, to]);

  return (
    <Wrapper>
      <PageTitle
        title="Trip reports"
        sub={r ? `${r.trips} approved trips` : "Loading…"}
        right={
          <div className="flex items-center gap-2">
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
            <span className="text-gray-400">to</span>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
          </div>
        }
      />
      {r && (
        <div className="grid gap-4 xl:grid-cols-2">
          <Table title="Trips per staff" head={["Staff", "Trips", "Days", "Time out"]} rows={r.byStaff.map((s) => [s.name, s.trips, s.days, hours(s.minutes)])} />
          <Table
            title="Vehicles"
            head={["Vehicle", "Trips", "Km", "Time out", "Idle (non-delivery stops)"]}
            rows={r.byVehicle.map((v) => [v.name, v.trips, v.km, hours(v.minutes), hours(v.idleMinutes)])}
          />
          <div className="xl:col-span-2">
            <Table
              title="Duration per route"
              head={["Route (sites visited)", "Trips", "Median", "Longest"]}
              rows={r.byRoute.map((x) => [x.route, x.trips, `${x.medianMin} min`, `${x.maxMin} min`])}
            />
          </div>
        </div>
      )}
    </Wrapper>
  );
};

export default TripReports;
