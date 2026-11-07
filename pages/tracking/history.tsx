import Wrapper from "@/components/Wrapper";
import { MapLoading, PageTitle } from "@/components/Tracking/Bits";
import { Input } from "@/components/ui/input";
import { errMsg, fmtTime, todayIST, useTrackingApi } from "@/lib/tracking";
import dynamic from "next/dynamic";
import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

const TrackMap = dynamic(() => import("@/components/Tracking/TrackMap"), { ssr: false, loading: MapLoading });

type Ping = { ts: number; lat: number; lng: number; acc?: number; spd?: number; mode?: string; mocked?: boolean; ev?: string };
type History = {
  staff: { id: string; name: string; employeeID: number; active: boolean }[];
  pings: Ping[];
  trips: { _id: string; departAt: string; returnAt: string | null; vehicleName: string; distanceKm: number; status: string }[];
  distanceKm: number;
};

const KEEP_DAYS = 60;
const PAGE = 100;
const minDay = () => new Date(Date.now() + 330 * 60000 - (KEEP_DAYS - 1) * 86400000).toISOString().slice(0, 10);

// Raw phone locations for one staff member, one day, optionally a time window. Kept 60 days.
const GpsHistory = () => {
  const { api, ready } = useTrackingApi();
  const [staffId, setStaffId] = useState("");
  const [day, setDay] = useState(todayIST());
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [data, setData] = useState<History | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);

  useEffect(() => {
    if (!ready) return;
    setLoading(true);
    api
      .get("/admin/gps-history", { params: { staffId: staffId || undefined, day, from: from || undefined, to: to || undefined } })
      .then(({ data }) => {
        setData(data);
        setPage(0);
      })
      .catch((e) => toast.error(errMsg(e)))
      .finally(() => setLoading(false));
  }, [ready, api, staffId, day, from, to]);

  const pings = useMemo(() => data?.pings || [], [data]);
  const layers = useMemo(() => {
    if (!pings.length) return { lines: [], markers: [] };
    const first = pings[0];
    const last = pings[pings.length - 1];
    return {
      lines: [{ points: pings.map((p) => [p.lat, p.lng] as [number, number]), color: "#2563eb" }],
      markers: [
        { lat: first.lat, lng: first.lng, color: "#16a34a", label: `Start ${fmtTime(first.ts)}` },
        { lat: last.lat, lng: last.lng, color: "#dc2626", label: `Last ${fmtTime(last.ts)}` },
        ...pings.filter((p) => p.ev || p.mocked).map((p) => ({
          lat: p.lat,
          lng: p.lng,
          color: p.mocked ? "#9333ea" : "#f59e0b",
          size: 8,
          label: `${fmtTime(p.ts)} · ${p.mocked ? "mock location" : p.ev === "geofence_exit" ? "left factory" : "back at factory"}`,
        })),
      ],
    };
  }, [pings]);
  const rows = pings.slice(page * PAGE, (page + 1) * PAGE);
  const pages = Math.ceil(pings.length / PAGE);
  const selectCls = "h-10 rounded-md border border-gray-300 bg-white px-3 text-sm";

  return (
    <Wrapper>
      <PageTitle
        title="GPS History"
        sub={`Phone locations of each staff member, kept for ${KEEP_DAYS} days.`}
        right={
          <div className="flex flex-wrap items-center gap-2">
            <select value={staffId} onChange={(e) => setStaffId(e.target.value)} className={`${selectCls} min-w-[180px]`}>
              <option value="">Pick staff…</option>
              {(data?.staff || []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                  {s.active ? "" : " (inactive)"}
                </option>
              ))}
            </select>
            <Input type="date" value={day} min={minDay()} max={todayIST()} onChange={(e) => e.target.value && setDay(e.target.value)} className="w-40" />
            <Input type="time" value={from} onChange={(e) => setFrom(e.target.value)} className="w-32" title="From" />
            <span className="text-gray-400">–</span>
            <Input type="time" value={to} onChange={(e) => setTo(e.target.value)} className="w-32" title="To" />
            {(from || to) && (
              <button onClick={() => (setFrom(""), setTo(""))} className="text-sm text-blue-600">
                Whole day
              </button>
            )}
          </div>
        }
      />

      {!staffId ? (
        <p className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-gray-500">Pick a staff member to see where their phone was.</p>
      ) : (
        <>
          <div className="mb-3 flex flex-wrap gap-6 text-sm text-gray-700">
            <span>
              <b>{pings.length}</b> locations
            </span>
            <span>
              <b>{data?.distanceKm ?? 0}</b> km
            </span>
            {pings.length > 0 && (
              <span>
                {fmtTime(pings[0].ts)} – {fmtTime(pings[pings.length - 1].ts)}
              </span>
            )}
            {loading && <span className="text-gray-400">Loading…</span>}
          </div>
          {(data?.trips || []).length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2 text-sm">
              {data!.trips.map((t) => (
                <Link key={t._id} href={`/trips/${t._id}`} className="rounded-full border border-gray-200 px-3 py-1 hover:border-blue-400">
                  {fmtTime(t.departAt)}–{t.returnAt ? fmtTime(t.returnAt) : "…"} · {t.vehicleName || "trip"} · {t.distanceKm} km
                </Link>
              ))}
            </div>
          )}
          {pings.length === 0 && !loading ? (
            <p className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-gray-500">No locations from this phone in that time.</p>
          ) : (
            <TrackMap {...layers} height="55vh" fitKey={`${staffId}|${day}|${from}|${to}|${pings.length > 0}`} />
          )}

          {pings.length > 0 && (
            <div className="mt-4 overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-gray-500">
                  <tr>
                    {["Time", "Latitude, longitude", "Accuracy", "Speed", "Mode", ""].map((h) => (
                      <th key={h} className="px-4 py-2 font-normal">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((p) => (
                    <tr key={p.ts} className="border-t">
                      <td className="px-4 py-2">{new Date(p.ts).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata" })}</td>
                      <td className="px-4 py-2">
                        <a href={`https://maps.google.com/?q=${p.lat},${p.lng}`} target="_blank" rel="noreferrer" className="text-blue-600">
                          {p.lat.toFixed(5)}, {p.lng.toFixed(5)}
                        </a>
                      </td>
                      <td className="px-4 py-2">{p.acc != null ? `${Math.round(p.acc)} m` : "—"}</td>
                      <td className="px-4 py-2">{p.spd != null ? `${Math.round(p.spd * 3.6)} km/h` : "—"}</td>
                      <td className="px-4 py-2 capitalize">{p.mode === "road" ? "road" : p.mode || "—"}</td>
                      <td className="px-4 py-2 text-xs text-orange-700">
                        {p.mocked ? "mock location" : p.ev === "geofence_exit" ? "left factory" : p.ev === "geofence_enter" ? "back at factory" : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {pages > 1 && (
                <div className="flex items-center justify-between border-t px-4 py-2 text-sm">
                  <button disabled={page === 0} onClick={() => setPage(page - 1)} className="text-blue-600 disabled:text-gray-300">
                    ← Earlier
                  </button>
                  <span className="text-gray-500">
                    Page {page + 1} of {pages}
                  </span>
                  <button disabled={page >= pages - 1} onClick={() => setPage(page + 1)} className="text-blue-600 disabled:text-gray-300">
                    Later →
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </Wrapper>
  );
};

export default GpsHistory;
