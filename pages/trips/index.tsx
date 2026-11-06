import Wrapper from "@/components/Wrapper";
import { MapLoading, PageTitle, ReasonChips, SeverityDot, StatusBadge, Tabs } from "@/components/Tracking/Bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { REASONS, Trip, errMsg, fmtDate, fmtTime, minutesBetween, todayIST, tripLayers, useTrackingApi } from "@/lib/tracking";
import dynamic from "next/dynamic";
import Link from "next/link";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

const TrackMap = dynamic(() => import("@/components/Tracking/TrackMap"), { ssr: false, loading: MapLoading });

const STATUS_FILTERS: [string, string][] = [
  ["", "All"],
  ["auto_detected,missed", "Not logged"],
  ["created", "Logged"],
  ["needs_info", "Needs info"],
  ["approved,locked", "Approved"],
  ["rejected", "Rejected"],
];

// Exception queue (design 12.5): trips that failed an auto-approval check, by
// severity then age. Low-severity items can be approved in bulk.
const TripsPage = () => {
  const { api, ready } = useTrackingApi();
  const [tab, setTab] = useState<"queue" | "all">("queue");
  const [day, setDay] = useState(todayIST());
  const [status, setStatus] = useState("");
  const [trips, setTrips] = useState<Trip[]>([]);
  const [selId, setSelId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Trip | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!ready) return;
    setLoading(true);
    try {
      const { data } =
        tab === "queue" ? await api.get("/admin/queue") : await api.get("/admin/trips", { params: { day, status: status || undefined } });
      setTrips(data.trips);
      setSelId((id) => (data.trips.some((t: Trip) => t._id === id) ? id : data.trips[0]?._id || null));
      setChecked(new Set());
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, [api, ready, tab, day, status]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!ready || !selId) return setDetail(null);
    api
      .get(`/admin/trips/${selId}`)
      .then(({ data }) => setDetail(data.trip))
      .catch((e) => toast.error(errMsg(e)));
  }, [api, ready, selId]);

  const act = async (action: string, extra: Record<string, unknown> = {}) => {
    if (!detail) return;
    setBusy(true);
    try {
      await api.patch(`/admin/trips/${detail._id}`, { action, ...extra });
      toast.success(action === "approve" ? "Approved" : action === "reject" ? "Rejected" : "Sent to staff");
      await load();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  };
  const reject = () => {
    const reason = window.prompt("Why is this not a valid work trip?");
    if (reason?.trim()) act("reject", { reason });
  };
  const askInfo = () => {
    const comment = window.prompt("What should the staff answer?");
    if (comment?.trim()) act("needs_info", { comment });
  };
  const bulkApprove = async () => {
    setBusy(true);
    try {
      const { data } = await api.post("/admin/trips/bulk-approve", { ids: Array.from(checked) });
      toast.success(`Approved ${data.approved} trip(s)`);
      await load();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const layers = useMemo(() => (detail ? tripLayers(detail) : { lines: [], markers: [] }), [detail]);
  const lowIds = trips.filter((t) => tab === "queue" && ["low", "none"].includes(t.severity)).map((t) => t._id);

  return (
    <Wrapper>
      <PageTitle
        title="Trip review"
        sub={tab === "queue" ? "Trips that need a decision, most serious first." : "Every detected trip for a day."}
        right={
          <Tabs
            value={tab}
            onChange={setTab}
            tabs={[
              ["queue", "Exception queue"],
              ["all", "All trips"],
            ]}
          />
        }
      />

      {tab === "all" && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Input type="date" value={day} onChange={(e) => setDay(e.target.value)} className="w-44" />
          {STATUS_FILTERS.map(([k, label]) => (
            <button
              key={k}
              onClick={() => setStatus(k)}
              className={`rounded-full border px-3 py-1 text-sm ${status === k ? "border-blue-600 bg-blue-600 text-white" : "border-gray-200 text-gray-700"}`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {tab === "queue" && lowIds.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-3 text-sm">
          <button className="text-blue-600" onClick={() => setChecked(new Set(checked.size === lowIds.length ? [] : lowIds))}>
            {checked.size === lowIds.length ? "Clear selection" : `Select all ${lowIds.length} low-severity`}
          </button>
          {checked.size > 0 && (
            <Button size="sm" disabled={busy} onClick={bulkApprove}>
              Approve {checked.size} selected
            </Button>
          )}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(280px,380px)_1fr]">
        <div className="flex max-h-[75vh] flex-col gap-2 overflow-y-auto pr-1">
          {loading ? (
            <p className="p-4 text-gray-400">Loading…</p>
          ) : trips.length === 0 ? (
            <p className="rounded-lg border border-dashed p-6 text-center text-gray-500">
              {tab === "queue" ? "Nothing to review. All logged trips passed the checks." : "No trips on this day."}
            </p>
          ) : (
            trips.map((t) => (
              <div
                key={t._id}
                onClick={() => setSelId(t._id)}
                className={`cursor-pointer rounded-lg border p-3 ${selId === t._id ? "border-blue-500 bg-blue-50/40" : "border-gray-200 hover:bg-gray-50"}`}
              >
                <div className="flex items-center gap-2">
                  {tab === "queue" && ["low", "none"].includes(t.severity) && (
                    <input
                      type="checkbox"
                      aria-label="Select for bulk approve"
                      checked={checked.has(t._id)}
                      onClick={(e) => e.stopPropagation()}
                      onChange={() => {
                        const n = new Set(checked);
                        n.has(t._id) ? n.delete(t._id) : n.add(t._id);
                        setChecked(n);
                      }}
                    />
                  )}
                  <SeverityDot severity={t.severity} />
                  <span className="min-w-0 flex-1 truncate font-medium capitalize">{t.members.map((m) => m.name).join(", ")}</span>
                  <StatusBadge status={t.status} />
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  {fmtDate(t.departAt)} · {fmtTime(t.departAt)}–{t.returnAt ? fmtTime(t.returnAt) : "open"} · {t.vehicleName || "No vehicle"}
                </p>
                {t.reasonCodes?.length > 0 && (
                  <div className="mt-1.5">
                    <ReasonChips codes={t.reasonCodes} />
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <div className="min-w-0">
          {detail ? (
            <div className="flex flex-col gap-3">
              <TrackMap {...layers} height="45vh" fitKey={detail._id} />
              <div className="rounded-lg border border-gray-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-lg font-semibold capitalize">{detail.members.map((m) => m.name).join(", ")}</p>
                    <p className="text-sm text-gray-500">
                      {fmtDate(detail.departAt)} · {fmtTime(detail.departAt)}–{detail.returnAt ? fmtTime(detail.returnAt) : "open"} (
                      {minutesBetween(detail.departAt, detail.returnAt) ?? "—"} min) · {detail.distanceKm} km · {detail.vehicleName || "No vehicle"}
                    </p>
                  </div>
                  <Link href={`/trips/${detail._id}`} className="text-sm font-medium text-blue-600">
                    Full details →
                  </Link>
                </div>
                <div className="mt-3 grid gap-1 text-sm sm:grid-cols-2">
                  <p>
                    <span className="text-gray-500">Purpose:</span> <span className="capitalize">{detail.purpose || "—"}</span>
                  </p>
                  <p>
                    <span className="text-gray-500">Jars:</span> {detail.jarsLoaded ?? "—"} loaded · {detail.jarsDelivered ?? "—"} delivered ·{" "}
                    {detail.emptiesReturned ?? "—"} empties
                  </p>
                  <p>
                    <span className="text-gray-500">Stops:</span> {detail.stops.map((s) => `${s.name} (${s.minutes}m)`).join(", ") || "none"}
                  </p>
                  <p>
                    <span className="text-gray-500">Challan:</span> {detail.challan || "—"}
                  </p>
                </div>
                {detail.checks?.some((c) => !c.pass) && (
                  <ul className="mt-3 space-y-0.5 text-sm">
                    {detail.checks
                      .filter((c) => !c.pass)
                      .map((c) => (
                        <li key={c.name} className="text-red-700">
                          ✗ {c.detail}
                        </li>
                      ))}
                  </ul>
                )}
                {detail.reasonCodes.includes("SPOT_CHECK") && (
                  <p className="mt-2 text-sm text-gray-500">{REASONS.SPOT_CHECK}: picked at random to keep the rules honest.</p>
                )}
                {!["approved", "locked", "rejected"].includes(detail.status) && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button disabled={busy} onClick={() => act("approve")} className="bg-green-600 hover:bg-green-700">
                      Approve
                    </Button>
                    <Button disabled={busy} variant="outline" onClick={askInfo}>
                      Needs info
                    </Button>
                    <Button disabled={busy} variant="outline" onClick={reject} className="text-red-600">
                      Reject
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            !loading && trips.length > 0 && <p className="text-gray-400">Pick a trip.</p>
          )}
        </div>
      </div>
    </Wrapper>
  );
};

export default TripsPage;
