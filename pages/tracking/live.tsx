import Wrapper from "@/components/Wrapper";
import { MapLoading, PageTitle, StatusBadge } from "@/components/Tracking/Bits";
import { Button } from "@/components/ui/button";
import { HEALTH_DOT, HealthRow, ROUTE_COLORS, Site, Trip, ago, errMsg, esc, fmtTime, routeLatLng, useTrackingApi } from "@/lib/tracking";
import dynamic from "next/dynamic";
import Link from "next/link";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

const TrackMap = dynamic(() => import("@/components/Tracking/TrackMap"), { ssr: false, loading: MapLoading });

type Alert = { _id: string; type: string; severity: string; message: string; createdAt: string };
type Live = { day: string; rows: HealthRow[]; trips: Trip[]; sites: Site[]; alerts: Alert[] };

// Live positions, trip trails and phone health. Uploads are batched every 1–2 min,
// so polling every 20 s keeps the map well inside the 2-minute target.
const LivePage = () => {
  const { api, ready } = useTrackingApi();
  const [live, setLive] = useState<Live | null>(null);

  const load = useCallback(async () => {
    if (!ready) return;
    try {
      const { data } = await api.get("/admin/live");
      setLive(data);
    } catch (e) {
      toast.error(errMsg(e));
    }
  }, [api, ready]);

  useEffect(() => {
    load();
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, [load]);

  const resolve = async (id: string) => {
    try {
      await api.patch(`/admin/alerts/${id}`);
      load();
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  const layers = useMemo(() => {
    if (!live) return { circles: [], lines: [], markers: [] };
    const factory = live.sites.filter((s) => s.type === "factory");
    const open = live.trips.filter((t) => !t.returnAt && !t.closedAtShiftEnd);
    return {
      circles: factory.map((s) => ({ lat: s.lat, lng: s.lng, radius: s.radius, color: "#2563eb", popup: esc(s.name) })),
      lines: open.map((t, i) => ({ points: routeLatLng(t), color: ROUTE_COLORS[i % ROUTE_COLORS.length] })),
      markers: [
        ...live.sites
          .filter((s) => s.type !== "factory")
          .map((s) => ({ lat: s.lat, lng: s.lng, color: "#cbd5e1", size: 5, label: s.name })),
        ...live.rows
          .filter((r) => r.device?.lastPing?.lat != null && r.checkinAt)
          .map((r) => {
            const p = r.device!.lastPing!;
            const h = r.device!.health || {};
            return {
              lat: p.lat,
              lng: p.lng,
              color: HEALTH_DOT[r.status],
              label: r.name,
              popup: `<b>${esc(r.name)}</b><br/>${p.mode === "road" ? "On trip" : "At factory"} · ${esc(ago(p.ts))}<br/>Battery ${
                h.battery != null ? Math.round(h.battery * 100) + "%" : "—"
              }${h.charging ? " (charging)" : ""}<br/>${esc(r.reasons.join(", "))}`,
            };
          }),
      ],
    };
  }, [live]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    live?.trips.forEach((t) => (c[t.status] = (c[t.status] || 0) + 1));
    return c;
  }, [live]);

  return (
    <Wrapper>
      <PageTitle
        title="Live tracking"
        sub={live ? `${live.day} · refreshes every 20 s` : "Loading…"}
        right={
          <div className="flex flex-wrap gap-2 text-sm">
            {Object.entries(counts).map(([s, n]) => (
              <span key={s} className="flex items-center gap-1">
                <StatusBadge status={s} /> {n}
              </span>
            ))}
            <Link href="/trips" className="font-medium text-blue-600">
              Review queue →
            </Link>
          </div>
        }
      />

      {live && live.alerts.length > 0 && (
        <div className="mb-3 space-y-1.5">
          {live.alerts.map((a) => (
            <div key={a._id} className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${a.severity === "high" ? "bg-red-50 text-red-800" : "bg-amber-50 text-amber-800"}`}>
              <span className="flex-1">
                {a.message} · {ago(a.createdAt)}
              </span>
              <Button size="sm" variant="ghost" onClick={() => resolve(a._id)}>
                Resolve
              </Button>
            </div>
          ))}
        </div>
      )}

      <TrackMap {...layers} height="55vh" fitKey={live ? "live" : undefined} />

      <h2 className="mb-2 mt-6 text-lg font-semibold">Phone health</h2>
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-3 py-2">Staff</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Phone</th>
              <th className="px-3 py-2">Check-in</th>
              <th className="px-3 py-2">Mode</th>
              <th className="px-3 py-2">Last upload</th>
              <th className="px-3 py-2">Battery</th>
              <th className="px-3 py-2">GPS / permission</th>
              <th className="px-3 py-2">Unsynced</th>
              <th className="px-3 py-2">App</th>
            </tr>
          </thead>
          <tbody>
            {(live?.rows || []).map((r) => {
              const h = r.device?.health || {};
              return (
                <tr key={r.staffId} className="border-t">
                  <td className="px-3 py-2 font-medium capitalize">
                    {r.name} <span className="text-gray-400">#{r.employeeID}</span>
                  </td>
                  <td className="px-3 py-2">
                    <span className="flex items-center gap-2">
                      <span className="inline-block size-2.5 rounded-full" style={{ background: HEALTH_DOT[r.status] }} />
                      <span className="text-gray-600">{r.reasons.join(", ") || "OK"}</span>
                    </span>
                  </td>
                  <td className="px-3 py-2">{r.device ? r.device.model || "Linked" : <span className="text-gray-400">Not signed in</span>}</td>
                  <td className="px-3 py-2">{r.checkinAt ? fmtTime(r.checkinAt) : "—"}</td>
                  <td className="px-3 py-2">{r.device?.lastPing?.mode || "—"}</td>
                  <td className="px-3 py-2">{r.device?.lastSeenAt ? ago(r.device.lastSeenAt) : r.device ? "After check-in" : "—"}</td>
                  <td className="px-3 py-2">
                    {h.battery != null ? `${Math.round(h.battery * 100)}%` : "—"}
                    {h.charging ? " ⚡" : ""}
                  </td>
                  <td className="px-3 py-2">
                    {h.gpsOn === false ? "GPS off" : h.gpsOn ? "GPS on" : "—"} · {h.permBg || "—"}
                  </td>
                  <td className="px-3 py-2">{h.pending ?? "—"}</td>
                  <td className="px-3 py-2 text-gray-500">{h.appVersion || "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Wrapper>
  );
};

export default LivePage;
