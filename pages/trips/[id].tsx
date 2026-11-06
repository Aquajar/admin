import Wrapper from "@/components/Wrapper";
import { MapLoading, ReasonChips, SeverityDot, StatusBadge } from "@/components/Tracking/Bits";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trip, errMsg, fmtDate, fmtTime, minutesBetween, tripLayers, useTrackingApi } from "@/lib/tracking";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

const TrackMap = dynamic(() => import("@/components/Tracking/TrackMap"), { ssr: false, loading: MapLoading });

type Audit = { _id: string; actor: string; action: string; at: string };
type Other = { _id: string; departAt: string; returnAt: string | null; vehicleName: string; status: string; members: { name: string }[] };
type Mode = null | "edit" | "reassign" | "merge" | "split";

// <input type="datetime-local"> works in local time; the admin is in IST.
const toLocal = (v?: string | null) => {
  if (!v) return "";
  const d = new Date(v);
  return new Date(+d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
const fromLocal = (v: string) => (v ? new Date(v).toISOString() : null);

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="rounded-lg border border-gray-200 p-4">
    <h2 className="mb-2 font-semibold text-gray-900">{title}</h2>
    {children}
  </div>
);

const TripDetail = () => {
  const router = useRouter();
  const id = router.query.id as string | undefined;
  const { api, ready } = useTrackingApi();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [audit, setAudit] = useState<Audit[]>([]);
  const [sameDay, setSameDay] = useState<Other[]>([]);
  const [voice, setVoice] = useState<string | null>(null);
  const [replay, setReplay] = useState(0);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<Mode>(null);
  const [dialogOpen, setDialogOpen] = useState(false); // separate from mode so content stays during the close animation
  const [form, setForm] = useState<Record<string, any>>({});
  const [staff, setStaff] = useState<{ _id: string; name: string; status: string }[]>([]);
  const [vehicles, setVehicles] = useState<{ _id: string; name: string; regNo: string }[]>([]);

  const load = useCallback(async () => {
    if (!ready || !id) return;
    try {
      const { data } = await api.get(`/admin/trips/${id}`);
      setTrip(data.trip);
      setAudit(data.audit);
      setSameDay(data.sameDay);
      setReplay(0);
    } catch (e) {
      toast.error(errMsg(e));
    }
  }, [api, ready, id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!ready || !trip?.hasVoice) return;
    let url = "";
    api
      .get(`/admin/trips/${trip._id}/voice`, { responseType: "blob" })
      .then(({ data }) => setVoice((url = URL.createObjectURL(data))))
      .catch(() => {});
    return () => URL.revokeObjectURL(url);
  }, [api, ready, trip?._id, trip?.hasVoice]);

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    try {
      await fn();
      toast.success(ok);
      setDialogOpen(false);
      await load();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  };
  const act = (action: string, extra: Record<string, unknown> = {}, ok = "Saved") =>
    run(() => api.patch(`/admin/trips/${id}`, { action, ...extra }), ok);
  const ask = (q: string, action: string, key: string, ok: string) => {
    const v = window.prompt(q);
    if (v?.trim()) act(action, { [key]: v }, ok);
  };

  const open = async (m: Mode) => {
    if (!trip) return;
    if (m === "reassign" && (!staff.length || !vehicles.length)) {
      const [s, v] = await Promise.all([api.get("/staff"), api.get("/admin/vehicles")]);
      setStaff((s.data || []).filter((x: any) => x.status === "active"));
      setVehicles(v.data.vehicles);
    }
    setForm(
      m === "edit"
        ? {
            departAt: toLocal(trip.departAt),
            returnAt: toLocal(trip.returnAt),
            purpose: trip.purpose,
            jarsLoaded: trip.jarsLoaded ?? "",
            jarsDelivered: trip.jarsDelivered ?? "",
            emptiesReturned: trip.emptiesReturned ?? "",
            challan: trip.challan,
          }
        : m === "reassign"
          ? { vehicleId: trip.vehicleId || "", memberIds: trip.members.map((x) => String(x.staffId)) }
          : m === "split"
            ? { at: toLocal(new Date((+new Date(trip.departAt) + +new Date(trip.returnAt || Date.now())) / 2).toISOString()) }
            : { otherId: sameDay[0]?._id || "" }
    );
    setMode(m);
    setDialogOpen(true);
  };

  const save = () => {
    if (mode === "edit")
      return act("edit", { ...form, departAt: fromLocal(form.departAt), returnAt: fromLocal(form.returnAt) }, "Trip updated");
    if (mode === "reassign") return act("reassign", { vehicleId: form.vehicleId || null, memberIds: form.memberIds }, "Reassigned");
    if (mode === "split")
      return run(async () => {
        const { data } = await api.post(`/admin/trips/${id}/split`, { at: fromLocal(form.at) });
        toast(`Second part: ${fmtTime(data.trips[1].departAt)} onwards`);
      }, "Trip split");
    if (mode === "merge") return run(() => api.post(`/admin/trips/${id}/merge`, { otherId: form.otherId }), "Trips merged");
  };

  const saveStopAsSite = async (lat: number, lng: number) => {
    const name = window.prompt("Name this delivery point");
    if (!name?.trim() || !trip) return;
    await run(async () => {
      await api.post("/admin/sites", { name, type: "other", lat, lng });
      await api.post("/admin/engine/rerun", { day: trip.day });
    }, "Saved as delivery point");
  };

  const layers = useMemo(() => {
    if (!trip) return { lines: [], markers: [] };
    const l = tripLayers(trip);
    const p = trip.route[replay];
    return p ? { ...l, markers: [...l.markers, { lat: p[1], lng: p[0], color: "#111827", size: 9, label: fmtTime(p[2] * 1000) }] } : l;
  }, [trip, replay]);

  if (!trip)
    return (
      <Wrapper>
        <p className="text-gray-400">Loading…</p>
      </Wrapper>
    );

  const locked = trip.status === "locked";
  const decided = ["approved", "locked", "rejected"].includes(trip.status);
  const field = (k: string, label: string, type = "text") => (
    <div>
      <Label>{label}</Label>
      <Input type={type} value={form[k] ?? ""} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
    </div>
  );

  return (
    <Wrapper>
      <Link href="/trips" className="text-sm text-blue-600">
        ← Trip review
      </Link>
      <div className="mb-4 mt-2 flex flex-wrap items-center gap-3">
        <SeverityDot severity={trip.severity} />
        <h1 className="text-2xl font-bold capitalize text-gray-900">{trip.members.map((m) => m.name).join(", ")}</h1>
        <StatusBadge status={trip.status} />
        {trip.nonWork && <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs">Non-work</span>}
        {trip.manual && <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs text-purple-800">Edited by admin</span>}
      </div>
      <p className="-mt-3 mb-4 text-sm text-gray-500">
        {fmtDate(trip.departAt)} · left {fmtTime(trip.departAt)} ({trip.departSource.replace("_", " ")}) · back{" "}
        {trip.returnAt ? fmtTime(trip.returnAt) : trip.closedAtShiftEnd ? "unknown (open at shift end)" : "— on the road"} ·{" "}
        {minutesBetween(trip.departAt, trip.returnAt) ?? "—"} min · {trip.distanceKm} km · {trip.vehicleName || "No vehicle"} · confidence{" "}
        {trip.confidence}
      </p>

      <div className="mb-4 flex flex-wrap gap-2">
        {locked ? (
          <Button variant="outline" disabled={busy} onClick={() => ask("Why unlock this trip after the month was closed?", "unlock", "reason", "Unlocked")}>
            Unlock
          </Button>
        ) : (
          <>
            {trip.status !== "approved" && (
              <Button className="bg-green-600 hover:bg-green-700" disabled={busy} onClick={() => act("approve", {}, "Approved")}>
                Approve
              </Button>
            )}
            {!decided && (
              <Button variant="outline" disabled={busy} onClick={() => ask("What should the staff answer?", "needs_info", "comment", "Sent to staff")}>
                Needs info
              </Button>
            )}
            {trip.status !== "rejected" && (
              <Button variant="outline" className="text-red-600" disabled={busy} onClick={() => ask("Why is this not a valid work trip?", "reject", "reason", "Rejected")}>
                Reject
              </Button>
            )}
            <Button variant="outline" disabled={busy} onClick={() => open("edit")}>
              Edit
            </Button>
            <Button variant="outline" disabled={busy} onClick={() => open("reassign")}>
              Reassign
            </Button>
            <Button variant="outline" disabled={busy || !sameDay.length} onClick={() => open("merge")}>
              Merge
            </Button>
            <Button variant="outline" disabled={busy} onClick={() => open("split")}>
              Split
            </Button>
            <Button variant="ghost" disabled={busy} onClick={() => act("nonwork", { value: !trip.nonWork })}>
              {trip.nonWork ? "Mark as work" : "Mark non-work"}
            </Button>
          </>
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <div className="flex min-w-0 flex-col gap-3">
          <TrackMap {...layers} height="55vh" fitKey={trip._id} />
          {trip.route.length > 1 && (
            <div className="flex items-center gap-3">
              <span className="w-20 text-sm text-gray-500">Replay</span>
              <input
                type="range"
                min={0}
                max={trip.route.length - 1}
                value={replay}
                onChange={(e) => setReplay(Number(e.target.value))}
                className="flex-1"
                aria-label="Route replay"
              />
              <span className="w-20 text-right text-sm font-medium">{fmtTime(trip.route[replay][2] * 1000)}</span>
            </div>
          )}
          <Section title="Stops">
            {trip.stops.length === 0 ? (
              <p className="text-sm text-gray-500">No stops detected.</p>
            ) : (
              <table className="w-full text-sm">
                <tbody>
                  {trip.stops.map((s, i) => (
                    <tr key={i} className="border-t first:border-0">
                      <td className="py-1.5 pr-2">{i + 1}.</td>
                      <td className="py-1.5">
                        {s.name} {!s.known && <span className="text-amber-600">(unknown)</span>}
                        {s.known && !s.delivery && <span className="text-gray-400"> (not a delivery)</span>}
                      </td>
                      <td className="py-1.5 text-gray-500">
                        {fmtTime(s.arriveAt)}–{fmtTime(s.leaveAt)}
                      </td>
                      <td className="py-1.5 text-right">{s.minutes} min</td>
                      <td className="py-1.5 pl-2 text-right">
                        {!s.known && !locked && (
                          <button className="text-blue-600" onClick={() => saveStopAsSite(s.lat, s.lng)}>
                            Save as delivery point
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Section>
        </div>

        <div className="flex flex-col gap-3">
          <Section title="Checks">
            <ReasonChips codes={trip.reasonCodes} />
            <ul className="mt-2 space-y-1 text-sm">
              {(trip.checks || []).map((c) => (
                <li key={c.name} className={c.pass ? "text-gray-600" : "text-red-700"}>
                  {c.pass ? "✓" : "✗"} {c.detail}
                </li>
              ))}
              {!trip.checks?.length && <li className="text-gray-400">Checks run once the trip is logged and back.</li>}
            </ul>
            {trip.approval?.at && (
              <p className="mt-2 text-xs text-gray-500">
                Approved by {trip.approval.auto ? `rules v${trip.approval.ruleVersion}` : trip.approval.by} on {fmtDate(trip.approval.at)}
              </p>
            )}
          </Section>
          <Section title="Team">
            <ul className="space-y-1.5 text-sm">
              {trip.members.map((m) => (
                <li key={m.staffId}>
                  <span className="font-medium capitalize">{m.name}</span>{" "}
                  <span className="text-gray-500">
                    · {m.source.toUpperCase()} · {m.confirmedAt ? "confirmed" : "not confirmed"}
                    {m.inferredShare > 0 && ` · ${Math.round(m.inferredShare * 100)}% inferred`}
                  </span>
                  {(m.events || []).map((e, i) => (
                    <div key={i} className="ml-3 text-xs text-gray-500">
                      {e.type === "leave" ? "Dropped off" : "Picked up"} at {fmtTime(e.at)}
                    </div>
                  ))}
                </li>
              ))}
            </ul>
          </Section>
          <Section title="Staff log">
            <dl className="grid grid-cols-[120px_1fr] gap-y-1 text-sm">
              <dt className="text-gray-500">Purpose</dt>
              <dd className="capitalize">{trip.purpose || "—"}</dd>
              <dt className="text-gray-500">Jars loaded</dt>
              <dd>{trip.jarsLoaded ?? "—"}</dd>
              <dt className="text-gray-500">Delivered</dt>
              <dd>{trip.jarsDelivered ?? "—"}</dd>
              <dt className="text-gray-500">Empties back</dt>
              <dd>{trip.emptiesReturned ?? "—"}</dd>
              <dt className="text-gray-500">Challan</dt>
              <dd>{trip.challan || "—"}</dd>
              <dt className="text-gray-500">Logged</dt>
              <dd>{trip.submittedAt ? `${fmtDate(trip.submittedAt)} ${fmtTime(trip.submittedAt)}` : "Not yet"}</dd>
            </dl>
            {trip.notes && <p className="mt-2 whitespace-pre-wrap text-sm">{trip.notes}</p>}
            {voice && <audio controls src={voice} className="mt-2 w-full" />}
            {trip.infoRequest && <p className="mt-2 text-sm text-orange-700">Asked: {trip.infoRequest}</p>}
            {trip.rejectReason && <p className="mt-2 text-sm text-red-700">Rejected: {trip.rejectReason}</p>}
          </Section>
          <Section title="History">
            <ul className="space-y-1 text-xs text-gray-600">
              {[...trip.history].reverse().map((h, i) => (
                <li key={i}>
                  {fmtDate(h.at)} {fmtTime(h.at)} · <b>{h.by}</b> · {h.action.replace(/_/g, " ")}
                  {h.note ? ` — ${h.note}` : ""}
                </li>
              ))}
              {audit.length > 0 && <li className="pt-1 text-gray-400">{audit.length} audited admin change(s) with before/after values.</li>}
            </ul>
          </Section>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="capitalize">{mode} trip</DialogTitle>
          </DialogHeader>
          {mode === "edit" && (
            <div className="grid grid-cols-2 gap-3">
              {field("departAt", "Departure", "datetime-local")}
              {field("returnAt", "Return", "datetime-local")}
              <div>
                <Label>Purpose</Label>
                <select className="h-9 w-full rounded-md border px-2 text-sm" value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })}>
                  {["", "delivery", "pickup", "purchase", "service", "other"].map((p) => (
                    <option key={p} value={p}>
                      {p || "—"}
                    </option>
                  ))}
                </select>
              </div>
              {field("challan", "Challan")}
              {field("jarsLoaded", "Jars loaded", "number")}
              {field("jarsDelivered", "Delivered", "number")}
              {field("emptiesReturned", "Empties back", "number")}
            </div>
          )}
          {mode === "reassign" && (
            <div className="space-y-3">
              <div>
                <Label>Vehicle</Label>
                <select className="h-9 w-full rounded-md border px-2 text-sm" value={form.vehicleId} onChange={(e) => setForm({ ...form, vehicleId: e.target.value })}>
                  <option value="">No vehicle</option>
                  {vehicles.map((v) => (
                    <option key={v._id} value={v._id}>
                      {v.name} {v.regNo}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Members</Label>
                <div className="mt-1 grid max-h-60 grid-cols-2 gap-1 overflow-y-auto text-sm">
                  {staff.map((s) => (
                    <label key={s._id} className="flex items-center gap-2 capitalize">
                      <input
                        type="checkbox"
                        checked={form.memberIds?.includes(s._id)}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            memberIds: e.target.checked ? [...form.memberIds, s._id] : form.memberIds.filter((x: string) => x !== s._id),
                          })
                        }
                      />
                      {s.name}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
          {mode === "merge" && (
            <div>
              <Label>Merge with</Label>
              <select className="h-9 w-full rounded-md border px-2 text-sm" value={form.otherId} onChange={(e) => setForm({ ...form, otherId: e.target.value })}>
                {sameDay.map((o) => (
                  <option key={o._id} value={o._id}>
                    {fmtTime(o.departAt)}–{fmtTime(o.returnAt)} · {o.members.map((m) => m.name).join(", ")} · {o.vehicleName || "no vehicle"}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-xs text-gray-500">The other trip is folded into this one and removed.</p>
            </div>
          )}
          {mode === "split" && (
            <div>
              {field("at", "Split at", "datetime-local")}
              <p className="mt-2 text-xs text-gray-500">Everything after this time becomes a separate trip.</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button disabled={busy} onClick={save}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Wrapper>
  );
};

export default TripDetail;
