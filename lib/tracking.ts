// Shared helpers for the staff trip logging pages (/trips, /tracking/*).
import axios from "axios";
import { useSession } from "next-auth/react";
import { useMemo } from "react";

export function useTrackingApi() {
  const { data: session } = useSession();
  const token = session?.user.accessToken;
  const api = useMemo(
    () => axios.create({ baseURL: process.env.NEXT_PUBLIC_API_URL, headers: { Authorization: `Bearer ${token}` } }),
    [token]
  );
  return { api, ready: !!token };
}

export const errMsg = (e: unknown) =>
  (e as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || "Something went wrong";

export const esc = (v: unknown) =>
  String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const IST = { timeZone: "Asia/Kolkata" } as const;
export const fmtTime = (v?: string | number | null) =>
  v ? new Date(v).toLocaleTimeString("en-IN", { ...IST, hour: "numeric", minute: "2-digit" }) : "—";
export const fmtDate = (v?: string | number | null) =>
  v ? new Date(v).toLocaleDateString("en-IN", { ...IST, day: "numeric", month: "short" }) : "—";
export const minutesBetween = (a?: string | null, b?: string | null) =>
  a && b ? Math.round((+new Date(b) - +new Date(a)) / 60000) : null;
export const todayIST = () => new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10);
export const ago = (v?: string | null) => {
  if (!v) return "never";
  const m = Math.round((Date.now() - +new Date(v)) / 60000);
  return m < 1 ? "just now" : m < 60 ? `${m} min ago` : `${Math.round(m / 60)} h ago`;
};

export const STATUS: Record<string, { label: string; cls: string }> = {
  auto_detected: { label: "Not logged", cls: "bg-amber-100 text-amber-800" },
  created: { label: "Logged", cls: "bg-blue-100 text-blue-800" },
  needs_info: { label: "Needs info", cls: "bg-orange-100 text-orange-800" },
  approved: { label: "Approved", cls: "bg-green-100 text-green-800" },
  rejected: { label: "Rejected", cls: "bg-red-100 text-red-800" },
  missed: { label: "Missed", cls: "bg-red-100 text-red-800" },
  locked: { label: "Locked", cls: "bg-gray-200 text-gray-800" },
};

export const SEVERITY_CLS: Record<string, string> = {
  high: "bg-red-600",
  medium: "bg-amber-500",
  low: "bg-sky-500",
  none: "bg-gray-300",
};

export const REASONS: Record<string, string> = {
  MOCK_LOCATION: "Fake GPS",
  CLUSTER_CONFLICT: "QR vs GPS conflict",
  UNKNOWN_STOP: "Unknown stop",
  LONG_TRIP: "Long trip",
  JAR_MISMATCH: "Jar mismatch",
  GPS_GAP: "GPS gap",
  NO_QR: "No vehicle QR",
  LATE_LOG: "Late log",
  OPEN_AT_SHIFT_END: "Open at shift end",
  NEW_ROUTE: "New route",
  SPOT_CHECK: "Spot check",
};

export const HEALTH_DOT: Record<string, string> = {
  green: "#16a34a",
  amber: "#f59e0b",
  red: "#dc2626",
  grey: "#9ca3af",
};

export const ROUTE_COLORS = ["#2563eb", "#7c3aed", "#db2777", "#0891b2", "#ea580c", "#65a30d", "#4f46e5", "#b91c1c"];

export type Stop = {
  siteId: string | null;
  name: string;
  known: boolean;
  delivery: boolean;
  lat: number;
  lng: number;
  arriveAt: string;
  leaveAt: string;
  minutes: number;
};
export type Member = {
  staffId: string;
  name: string;
  source: string;
  inferredShare: number;
  confirmedAt?: string | null;
  events?: { type: string; at: number; lat: number; lng: number }[];
};
export type Trip = {
  _id: string;
  day: string;
  vehicleId: string | null;
  vehicleName: string;
  vehicleSource: string;
  members: Member[];
  departAt: string;
  departSource: string;
  returnAt: string | null;
  closedAtShiftEnd: boolean;
  route: [number, number, number][];
  stops: Stop[];
  distanceKm: number;
  confidence: string;
  purpose: string;
  jarsLoaded: number | null;
  jarsDelivered: number | null;
  emptiesReturned: number | null;
  challan: string;
  notes: string;
  hasVoice: boolean;
  submittedAt?: string;
  status: string;
  checks: { name: string; pass: boolean; detail: string }[];
  reasonCodes: string[];
  severity: string;
  approval?: { by: string; auto: boolean; ruleVersion: number; at: string };
  rejectReason: string;
  infoRequest: string;
  nonWork: boolean;
  manual: boolean;
  mockReasons: string[];
  history: { at: string; by: string; action: string; note?: string }[];
};
export type Site = {
  _id: string;
  id: string;
  name: string;
  type: string;
  lat: number;
  lng: number;
  radius: number;
  countsAsDelivery: boolean;
  active: boolean;
  expectedDwell?: { min: number; max: number };
  qrUrl?: string;
  qrVersion?: number;
};
export type HealthRow = {
  staffId: string;
  name: string;
  employeeID: number;
  consentAt: string | null;
  checkinAt: string | null;
  status: "green" | "amber" | "red" | "grey";
  reasons: string[];
  device: null | {
    deviceId: string;
    model: string;
    boundAt: string;
    lastSeenAt: string | null;
    lastPing?: { lat: number; lng: number; acc: number; ts: string; mode: string };
    health?: Record<string, any>;
  };
};

// Route points are stored [lng, lat, epochSec]; Leaflet wants [lat, lng].
export const routeLatLng = (t: Pick<Trip, "route">) => (t.route || []).map((p) => [p[1], p[0]] as [number, number]);

const STOP_COLOR = (s: Stop) => (!s.known ? "#f59e0b" : s.delivery ? "#16a34a" : "#64748b");

// Map layers for one trip: the route plus numbered stops (green delivery, grey other, amber unknown).
export const tripLayers = (t: Trip) => ({
  lines: [{ points: routeLatLng(t), color: "#2563eb" }],
  markers: (t.stops || []).map((s, i) => ({
    lat: s.lat,
    lng: s.lng,
    color: STOP_COLOR(s),
    label: `${i + 1}. ${s.name} · ${s.minutes} min`,
    popup: `<b>${esc(s.name)}</b><br/>${fmtTime(s.arriveAt)}–${fmtTime(s.leaveAt)} · ${s.minutes} min`,
  })),
});
