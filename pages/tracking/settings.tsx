import Wrapper from "@/components/Wrapper";
import { PageTitle } from "@/components/Tracking/Bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { errMsg, fmtDate, fmtTime, todayIST, useTrackingApi } from "@/lib/tracking";
import React, { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";

type Values = Record<string, number | string>;
type Version = { version: number; changedBy: string; changedAt: string; values: Values };

// Labels for every threshold in the design's configuration reference (section 25).
const GROUPS: [string, [string, string][]][] = [
  ["Shift", [["checkinOpens", "Check-in opens"], ["shiftStart", "Shift start (no check-in alert)"], ["shiftEnd", "Shift end"]]],
  [
    "Departure and return",
    [
      ["factoryRadiusM", "Factory radius (m)"],
      ["exitBufferM", "Exit buffer (m)"],
      ["exitPings", "Exit: consecutive pings"],
      ["exitFarM", "Exit: far distance (m)"],
      ["ignoreExitMin", "Ignore exits shorter than (min)"],
      ["returnPings", "Return: consecutive pings"],
      ["preciseAccuracyM", "Precise ping accuracy (m)"],
    ],
  ],
  [
    "Staff app",
    [
      ["factoryIntervalSec", "Factory mode interval (s)"],
      ["roadIntervalSec", "Road mode interval (s)"],
      ["roadDistanceM", "Road mode min distance (m)"],
      ["roadUploadSec", "Road upload interval (s)"],
      ["minAppVersion", "Minimum app version"],
    ],
  ],
  [
    "Vehicle clustering",
    [
      ["clusterWindowMin", "Candidate window (± min)"],
      ["clusterBucketSec", "Bucket (s)"],
      ["joinDistanceM", "Join distance (m)"],
      ["joinShare", "Join share (0–1)"],
      ["joinWindowMin", "Join window (min)"],
      ["splitDistanceM", "Split distance (m)"],
      ["splitMin", "Split duration (min)"],
      ["reclusterSec", "Re-cluster every (s)"],
      ["gapFillMin", "Gap fill after (min)"],
    ],
  ],
  [
    "Stops",
    [
      ["stopSpeedKmh", "Stop speed (km/h)"],
      ["stopRadiusM", "Stop radius (m)"],
      ["stopMinMin", "Stop minimum (min)"],
      ["stopEndM", "Stop end distance (m)"],
      ["stopMergeMin", "Merge gap (min)"],
      ["stopMergeM", "Merge distance (m)"],
      ["siteRadiusM", "Default site radius (m)"],
    ],
  ],
  [
    "Auto-approval",
    [
      ["unknownStopMin", "Unknown stop flag after (min)"],
      ["lateLogHours", "Late log after (h)"],
      ["maxGapMin", "Max GPS gap (min)"],
      ["maxInferredShare", "Max inferred share (0–1)"],
      ["minRouteHistory", "Minimum route history (trips)"],
      ["spotCheckShare", "Spot-check share (0–1)"],
      ["baselineDays", "Baseline window (days)"],
    ],
  ],
  [
    "Phone health and fake GPS",
    [
      ["silencePushMin", "Silence: push staff after (min)"],
      ["silenceAlertMin", "Silence: alert admin after (min)"],
      ["lowBatteryPct", "Low battery (%)"],
      ["poorAccuracyM", "Poor accuracy (m)"],
      ["poorAccuracyMin", "Poor accuracy for (min)"],
      ["pendingPingsAmber", "Unsynced pings warning"],
      ["mockMaxSpeedKmh", "Max speed (km/h)"],
      ["teleportM", "Teleport distance (m)"],
      ["teleportSec", "Teleport time (s)"],
      ["maxClockDriftMin", "Max clock drift (min)"],
    ],
  ],
  ["Attendance", [["halfDayTrips", "Trips for a half day"], ["fullDayTrips", "Trips for a full day"]]],
];

const TripSettings = () => {
  const { api, ready } = useTrackingApi();
  const [values, setValues] = useState<Values>({});
  const [defaults, setDefaults] = useState<Values>({});
  const [version, setVersion] = useState(0);
  const [history, setHistory] = useState<Version[]>([]);
  const [busy, setBusy] = useState(false);
  const [day, setDay] = useState(todayIST());

  const load = useCallback(async () => {
    if (!ready) return;
    try {
      const { data } = await api.get("/admin/settings");
      setValues(data.values);
      setDefaults(data.defaults);
      setVersion(data.version);
      setHistory(data.history);
    } catch (e) {
      toast.error(errMsg(e));
    }
  }, [api, ready]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    setBusy(true);
    try {
      const { data } = await api.put("/admin/settings", { values });
      toast.success(`Saved as version ${data.version}`);
      load();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const rerun = async () => {
    setBusy(true);
    try {
      const { data } = await api.post("/admin/engine/rerun", { day });
      toast.success(`Recomputed ${day}: ${data.trips} trip(s)`);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Wrapper>
      <PageTitle
        title="Trip settings"
        sub={`Version ${version}. Every save is a new version; trips record which version approved them.`}
        right={
          <Button disabled={busy} onClick={save}>
            Save changes
          </Button>
        }
      />
      <div className="grid gap-4 lg:grid-cols-2">
        {GROUPS.map(([group, keys]) => (
          <div key={group} className="rounded-lg border border-gray-200 p-4">
            <h2 className="mb-3 font-semibold">{group}</h2>
            <div className="grid gap-x-4 gap-y-2 sm:grid-cols-2">
              {keys.map(([k, label]) => (
                <label key={k} className="text-sm">
                  <span className="text-gray-600">{label}</span>
                  <Input
                    value={values[k] ?? ""}
                    onChange={(e) => setValues({ ...values, [k]: e.target.value })}
                    className={String(values[k]) !== String(defaults[k]) ? "border-blue-400" : ""}
                  />
                  {String(values[k]) !== String(defaults[k]) && <span className="text-xs text-gray-400">default {String(defaults[k])}</span>}
                </label>
              ))}
            </div>
          </div>
        ))}
        <div className="rounded-lg border border-gray-200 p-4">
          <h2 className="mb-1 font-semibold">Rerun the engine</h2>
          <p className="mb-3 text-sm text-gray-500">Rebuild a day from raw pings after a settings change. Approved, rejected and edited trips are left alone.</p>
          <div className="flex gap-2">
            <Input type="date" value={day} onChange={(e) => setDay(e.target.value)} className="w-44" />
            <Button variant="outline" disabled={busy} onClick={rerun}>
              Rerun
            </Button>
          </div>
        </div>
        <div className="rounded-lg border border-gray-200 p-4">
          <h2 className="mb-2 font-semibold">History</h2>
          <ul className="space-y-1 text-sm text-gray-600">
            {history.map((h) => (
              <li key={h.version}>
                v{h.version} · {h.changedBy} · {fmtDate(h.changedAt)} {fmtTime(h.changedAt)}
              </li>
            ))}
            {!history.length && <li className="text-gray-400">Using the design defaults.</li>}
          </ul>
        </div>
      </div>
    </Wrapper>
  );
};

export default TripSettings;
