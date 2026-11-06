import Wrapper from "@/components/Wrapper";
import { MapLoading, PageTitle, Tabs } from "@/components/Tracking/Bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HealthRow, Site, ago, errMsg, esc, fmtDate, useTrackingApi } from "@/lib/tracking";
import dynamic from "next/dynamic";
import QRCode from "qrcode";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

const TrackMap = dynamic(() => import("@/components/Tracking/TrackMap"), { ssr: false, loading: MapLoading });

type Vehicle = { _id: string; name: string; regNo: string; active: boolean; qrUrl: string; qrVersion: number };
type Suggested = { lat: number; lng: number; count: number; minutes: number; lastAt: string };
const SITE_TYPES: [string, string][] = [
  ["factory", "Factory"],
  ["blinkit", "Blinkit store"],
  ["b2b", "B2B site"],
  ["d2c", "D2C customer"],
  ["fuel", "Fuel pump"],
  ["other", "Other"],
];
const EMPTY_SITE = { _id: "", name: "", type: "blinkit", lat: "", lng: "", radius: "", countsAsDelivery: true, active: true, dwellMin: "", dwellMax: "" };

const QrImage = ({ url, size = 88 }: { url: string; size?: number }) => {
  const [src, setSrc] = useState("");
  useEffect(() => {
    QRCode.toDataURL(url, { width: 512, margin: 1 }).then(setSrc).catch(() => setSrc(""));
  }, [url]);
  // eslint-disable-next-line @next/next/no-img-element
  return src ? <img src={src} width={size} height={size} alt="QR code" /> : <div style={{ width: size, height: size }} />;
};

async function printQr(title: string, sub: string, url: string) {
  const src = await QRCode.toDataURL(url, { width: 900, margin: 2 });
  const w = window.open("", "_blank");
  if (!w) return toast.error("Allow pop-ups to print the sticker");
  w.document.write(
    `<html><head><title>${esc(title)}</title></head><body style="font-family:sans-serif;text-align:center;padding:32px">` +
      `<h1 style="margin:0">${esc(title)}</h1><p style="font-size:20px;color:#444">${esc(sub)}</p>` +
      `<img src="${src}" style="width:75%;max-width:520px"/><p style="color:#666">Scan with the Aquajar Staff app</p>` +
      `<script>onload=()=>print()</script></body></html>`
  );
  w.document.close();
}

const SetupPage = () => {
  const { api, ready } = useTrackingApi();
  const [tab, setTab] = useState<"sites" | "vehicles" | "devices">("sites");
  const [sites, setSites] = useState<Site[]>([]);
  const [suggested, setSuggested] = useState<Suggested[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [devices, setDevices] = useState<HealthRow[]>([]);
  const [draft, setDraft] = useState<typeof EMPTY_SITE>(EMPTY_SITE);
  const [newVehicle, setNewVehicle] = useState({ name: "", regNo: "" });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!ready) return;
    try {
      const [s, sg, v, d] = await Promise.all([
        api.get("/admin/sites"),
        api.get("/admin/sites/suggested"),
        api.get("/admin/vehicles"),
        api.get("/admin/devices"),
      ]);
      setSites(s.data.sites);
      setSuggested(sg.data.suggested);
      setVehicles(v.data.vehicles);
      setDevices(d.data.rows);
    } catch (e) {
      toast.error(errMsg(e));
    }
  }, [api, ready]);

  useEffect(() => {
    load();
  }, [load]);

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    try {
      await fn();
      toast.success(ok);
      await load();
      return true;
    } catch (e) {
      toast.error(errMsg(e));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const factory = sites.find((s) => s.type === "factory" && s.active);
  const saveSite = async () => {
    const body = {
      ...draft,
      lat: Number(draft.lat),
      lng: Number(draft.lng),
      radius: draft.radius ? Number(draft.radius) : undefined,
      dwellMin: Number(draft.dwellMin) || 0,
      dwellMax: Number(draft.dwellMax) || 0,
    };
    const ok = await run(() => (draft._id ? api.put(`/admin/sites/${draft._id}`, body) : api.post("/admin/sites", body)), "Site saved");
    if (ok) setDraft(EMPTY_SITE);
  };
  const editSite = (s: Site) =>
    setDraft({
      _id: s._id,
      name: s.name,
      type: s.type,
      lat: String(s.lat),
      lng: String(s.lng),
      radius: String(s.radius),
      countsAsDelivery: s.countsAsDelivery,
      active: s.active,
      dwellMin: String(s.expectedDwell?.min || ""),
      dwellMax: String(s.expectedDwell?.max || ""),
    });

  const layers = useMemo(() => {
    const color = (s: Site) => (!s.active ? "#d1d5db" : s.type === "factory" ? "#2563eb" : s.countsAsDelivery ? "#16a34a" : "#64748b");
    const lat = Number(draft.lat);
    const lng = Number(draft.lng);
    return {
      circles: sites.map((s) => ({ lat: s.lat, lng: s.lng, radius: s.radius, color: color(s), popup: `<b>${esc(s.name)}</b><br/>${esc(s.type)} · ${s.radius} m` })),
      markers: [
        ...suggested.map((g) => ({ lat: g.lat, lng: g.lng, color: "#f59e0b", label: `Suggested: ${g.count} visits` })),
        ...(Number.isFinite(lat) && draft.lat !== "" ? [{ lat, lng, color: "#111827", size: 9, label: "New location" }] : []),
      ],
    };
  }, [sites, suggested, draft.lat, draft.lng]);

  return (
    <Wrapper>
      <PageTitle
        title="Sites, vehicles and phones"
        sub="Delivery points the engine matches stops against, QR stickers, and each staff member's bound phone."
        right={
          <Tabs
            value={tab}
            onChange={setTab}
            tabs={[
              ["sites", "Sites"],
              ["vehicles", "Vehicles & QR"],
              ["devices", "Staff & phones"],
            ]}
          />
        }
      />

      {tab === "sites" && (
        <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
          <div className="min-w-0">
            <TrackMap
              {...layers}
              height="60vh"
              fitKey={sites.length ? "sites" : undefined}
              onClick={(lat, lng) => setDraft((d) => ({ ...d, lat: lat.toFixed(6), lng: lng.toFixed(6) }))}
            />
            <p className="mt-1 text-xs text-gray-500">Click the map to place a site. Orange dots are unknown stops visited 3+ times.</p>
            <div className="mt-4 overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-gray-500">
                  <tr>
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2">Type</th>
                    <th className="px-3 py-2">Radius</th>
                    <th className="px-3 py-2">Delivery</th>
                    <th className="px-3 py-2">Active</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {sites.map((s) => (
                    <tr key={s._id} className="border-t">
                      <td className="px-3 py-2 font-medium">{s.name}</td>
                      <td className="px-3 py-2">{SITE_TYPES.find(([k]) => k === s.type)?.[1]}</td>
                      <td className="px-3 py-2">{s.radius} m</td>
                      <td className="px-3 py-2">{s.countsAsDelivery ? "Yes" : "No"}</td>
                      <td className="px-3 py-2">{s.active ? "Yes" : "Retired"}</td>
                      <td className="px-3 py-2 text-right">
                        <button className="text-blue-600" onClick={() => editSite(s)}>
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="rounded-lg border border-gray-200 p-4">
              <h2 className="mb-3 font-semibold">{draft._id ? "Edit site" : "Add site"}</h2>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label>Name</Label>
                  <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
                </div>
                <div>
                  <Label>Type</Label>
                  <select className="h-9 w-full rounded-md border px-2 text-sm" value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })}>
                    {SITE_TYPES.map(([k, l]) => (
                      <option key={k} value={k}>
                        {l}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Radius (m)</Label>
                  <Input type="number" placeholder={draft.type === "factory" ? "150" : "75"} value={draft.radius} onChange={(e) => setDraft({ ...draft, radius: e.target.value })} />
                </div>
                <div>
                  <Label>Latitude</Label>
                  <Input value={draft.lat} onChange={(e) => setDraft({ ...draft, lat: e.target.value })} />
                </div>
                <div>
                  <Label>Longitude</Label>
                  <Input value={draft.lng} onChange={(e) => setDraft({ ...draft, lng: e.target.value })} />
                </div>
                <div>
                  <Label>Usual stay min</Label>
                  <Input type="number" value={draft.dwellMin} onChange={(e) => setDraft({ ...draft, dwellMin: e.target.value })} />
                </div>
                <div>
                  <Label>Usual stay max</Label>
                  <Input type="number" value={draft.dwellMax} onChange={(e) => setDraft({ ...draft, dwellMax: e.target.value })} />
                </div>
                <label className="col-span-2 flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={draft.countsAsDelivery} onChange={(e) => setDraft({ ...draft, countsAsDelivery: e.target.checked })} />
                  Counts as a delivery (a fuel pump does not)
                </label>
                <label className="col-span-2 flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} />
                  Active (retired sites stay for history)
                </label>
              </div>
              <div className="mt-3 flex gap-2">
                <Button disabled={busy || !draft.name || !draft.lat} onClick={saveSite}>
                  Save site
                </Button>
                {(draft._id || draft.name) && (
                  <Button variant="outline" onClick={() => setDraft(EMPTY_SITE)}>
                    Cancel
                  </Button>
                )}
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 p-4">
              <h2 className="mb-2 font-semibold">Gate check-in QR</h2>
              {factory?.qrUrl ? (
                <div className="flex items-center gap-4">
                  <QrImage url={factory.qrUrl} size={110} />
                  <div className="flex flex-col gap-2">
                    <Button size="sm" variant="outline" onClick={() => printQr("Factory gate check-in", factory.name, factory.qrUrl!)}>
                      Print
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-600"
                      disabled={busy}
                      onClick={() =>
                        window.confirm("Make a new gate QR? The printed one stops working.") &&
                        run(() => api.post(`/admin/sites/${factory._id}/regenerate-qr`), "New gate QR ready. Print and replace it.")
                      }
                    >
                      Regenerate
                    </Button>
                    <span className="text-xs text-gray-500">Version {factory.qrVersion}</span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500">Add the factory first: click its gate on the map, choose type Factory, radius about 150 m.</p>
              )}
            </div>

            {suggested.length > 0 && (
              <div className="rounded-lg border border-gray-200 p-4">
                <h2 className="mb-2 font-semibold">Suggested delivery points</h2>
                <ul className="space-y-2 text-sm">
                  {suggested.map((g, i) => (
                    <li key={i} className="flex items-center justify-between gap-2">
                      <span>
                        {g.count} visits · {g.minutes} min total · last {fmtDate(g.lastAt)}
                      </span>
                      <button className="text-blue-600" onClick={() => setDraft({ ...EMPTY_SITE, lat: g.lat.toFixed(6), lng: g.lng.toFixed(6) })}>
                        Name it
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "vehicles" && (
        <div>
          <div className="mb-4 flex flex-wrap items-end gap-2">
            <div>
              <Label>Vehicle name</Label>
              <Input value={newVehicle.name} placeholder="Tata Ace 1" onChange={(e) => setNewVehicle({ ...newVehicle, name: e.target.value })} />
            </div>
            <div>
              <Label>Registration no.</Label>
              <Input value={newVehicle.regNo} placeholder="WB 74 A 1234" onChange={(e) => setNewVehicle({ ...newVehicle, regNo: e.target.value })} />
            </div>
            <Button
              disabled={busy || !newVehicle.name.trim()}
              onClick={async () => (await run(() => api.post("/admin/vehicles", newVehicle), "Vehicle added")) && setNewVehicle({ name: "", regNo: "" })}
            >
              Add vehicle
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {vehicles.map((v) => (
              <div key={v._id} className={`flex gap-4 rounded-lg border p-4 ${v.active ? "border-gray-200" : "border-dashed opacity-60"}`}>
                <QrImage url={v.qrUrl} />
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <p className="font-semibold">{v.name}</p>
                  <p className="text-sm text-gray-500">
                    {v.regNo || "No reg. no."} · QR v{v.qrVersion}
                  </p>
                  <div className="mt-auto flex flex-wrap gap-2 text-sm">
                    <button className="text-blue-600" onClick={() => printQr(v.name, v.regNo, v.qrUrl)}>
                      Print sticker
                    </button>
                    <button
                      className="text-red-600"
                      onClick={() =>
                        window.confirm(`New QR for ${v.name}? The old sticker stops working.`) &&
                        run(() => api.post(`/admin/vehicles/${v._id}/regenerate-qr`), "New sticker ready")
                      }
                    >
                      Regenerate
                    </button>
                    <button className="text-gray-600" onClick={() => run(() => api.put(`/admin/vehicles/${v._id}`, { active: !v.active }), v.active ? "Retired" : "Reactivated")}>
                      {v.active ? "Retire" : "Reactivate"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "devices" && (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-500">
              <tr>
                <th className="px-3 py-2">Staff</th>
                <th className="px-3 py-2">Phone</th>
                <th className="px-3 py-2">Bound</th>
                <th className="px-3 py-2">Consent</th>
                <th className="px-3 py-2">Last upload</th>
                <th className="px-3 py-2">App</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {devices.map((r) => (
                <tr key={r.staffId} className="border-t">
                  <td className="px-3 py-2 font-medium capitalize">
                    {r.name} <span className="text-gray-400">#{r.employeeID}</span>
                  </td>
                  <td className="px-3 py-2">{r.device ? r.device.model || r.device.deviceId : <span className="text-gray-400">Not signed in yet</span>}</td>
                  <td className="px-3 py-2">{r.device ? fmtDate(r.device.boundAt) : "—"}</td>
                  <td className="px-3 py-2">{r.consentAt ? fmtDate(r.consentAt) : <span className="text-red-600">Not given</span>}</td>
                  <td className="px-3 py-2">{r.device ? ago(r.device.lastSeenAt) : "—"}</td>
                  <td className="px-3 py-2 text-gray-500">{r.device?.health?.appVersion || "—"}</td>
                  <td className="px-3 py-2 text-right">
                    {r.device && (
                      <button
                        className="text-red-600"
                        onClick={() =>
                          window.confirm(`Reset ${r.name}'s phone? They will be signed out and can sign in on a new phone.`) &&
                          run(() => api.delete(`/admin/devices/${r.staffId}`), "Phone reset")
                        }
                      >
                        Reset phone
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Wrapper>
  );
};

export default SetupPage;
