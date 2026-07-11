import React, { FC, useEffect, useRef } from "react";
import { MapCustomer, MapMode, MapStatus } from "@/types/types";

// Default first-load center — Siliguri, as requested.
export const DEFAULT_CENTER: [number, number] = [26.708294, 88.338026];
export const DEFAULT_ZOOM = 13;

// Bucket colours shared with the legend.
export const STATUS_COLORS: Record<MapStatus, string> = {
  green: "#16a34a",
  yellow: "#eab308",
  red: "#dc2626",
  none: "#9ca3af",
};

interface IProps {
  customers: MapCustomer[];
  mode: MapMode;
}

// Loads Leaflet (CSS + JS) from the public CDN exactly once and resolves with
// the global `L`. Kept out of npm so the map works without adding a dependency.
let leafletPromise: Promise<any> | null = null;
function loadLeaflet(): Promise<any> {
  if (typeof window === "undefined") return Promise.reject("no window");
  if ((window as any).L) return Promise.resolve((window as any).L);
  if (leafletPromise) return leafletPromise;

  leafletPromise = new Promise((resolve, reject) => {
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    const script = document.createElement("script");
    script.id = "leaflet-js";
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.async = true;
    script.onload = () => resolve((window as any).L);
    script.onerror = () => reject(new Error("Failed to load Leaflet"));
    document.body.appendChild(script);
  });

  return leafletPromise;
}

const escapeHtml = (value: unknown) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

function popupHtml(customer: MapCustomer, mode: MapMode): string {
  const name = escapeHtml(customer.name || "Unnamed customer");
  const rows: string[] = [
    `<div><span style="color:#6b7280">ID:</span> #${escapeHtml(customer.userID)}</div>`,
  ];

  if (customer.phone)
    rows.push(`<div><span style="color:#6b7280">Phone:</span> ${escapeHtml(customer.phone)}</div>`);
  if (customer.area)
    rows.push(`<div><span style="color:#6b7280">Area:</span> ${escapeHtml(customer.area)}</div>`);
  if (customer.landmark)
    rows.push(`<div><span style="color:#6b7280">Landmark:</span> ${escapeHtml(customer.landmark)}</div>`);

  if (mode === "sales") {
    const days = customer.sales.daysSinceLastDelivery;
    rows.push(
      `<div style="margin-top:4px"><span style="color:#6b7280">Last delivery:</span> ${
        days === null || days === undefined ? "No deliveries yet" : `${days} day(s) ago`
      }</div>`
    );
  } else {
    const due = customer.finance.totalDue || 0;
    const days = customer.finance.daysSinceOldestDue;
    rows.push(
      `<div style="margin-top:4px"><span style="color:#6b7280">Total due:</span> ₹${Number(
        due
      ).toLocaleString("en-IN")}</div>`
    );
    rows.push(
      `<div><span style="color:#6b7280">Oldest due:</span> ${
        days === null || days === undefined ? "—" : `${days} day(s)`
      }</div>`
    );
  }

  const { lat, lng } = customer.coordinates || {};
  const gmapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

  return `
    <div style="min-width:180px;font-size:13px;line-height:1.5">
      <div style="font-weight:600;font-size:14px;margin-bottom:4px">${name}</div>
      ${rows.join("")}
      <div style="display:flex;flex-direction:column;gap:4px;margin-top:8px">
        <a href="${gmapsUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;gap:4px;color:#059669;font-weight:600">➤ Follow on Google Maps</a>
        <a href="/customers/${escapeHtml(
          customer.userID
        )}?tab=invoices" style="color:#2563eb;font-weight:500">View profile →</a>
      </div>
    </div>`;
}

const CustomerMap: FC<IProps> = ({ customers, mode }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const layerRef = useRef<any>(null);
  const LRef = useRef<any>(null);
  const markersRef = useRef<{ marker: any; status: MapStatus }[]>([]);
  const resizeObsRef = useRef<ResizeObserver | null>(null);

  // Initialise the map once.
  useEffect(() => {
    let cancelled = false;

    loadLeaflet()
      .then((L) => {
        if (cancelled || !containerRef.current || mapRef.current) return;
        LRef.current = L;

        const map = L.map(containerRef.current).setView(DEFAULT_CENTER, DEFAULT_ZOOM);

        // Free satellite imagery (Esri World Imagery — no API key required).
        L.tileLayer(
          "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
          {
            maxZoom: 19,
            attribution: "Imagery &copy; Esri, Maxar, Earthstar Geographics",
          }
        ).addTo(map);

        // Transparent labels overlay so roads / place names stay readable.
        L.tileLayer(
          "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
          { maxZoom: 19, pane: "overlayPane" }
        ).addTo(map);

        layerRef.current = L.layerGroup().addTo(map);
        mapRef.current = map;

        // Rescale marker sizes whenever the zoom level changes.
        map.on("zoomend", updateRadii);

        // Keep Leaflet in sync whenever the container is resized — e.g. when the
        // map is toggled in/out of the full-screen overlay.
        if (typeof ResizeObserver !== "undefined" && containerRef.current) {
          resizeObsRef.current = new ResizeObserver(() => map.invalidateSize());
          resizeObsRef.current.observe(containerRef.current);
        }

        // Trigger the marker draw after the container has real dimensions.
        setTimeout(() => map.invalidateSize(), 100);
        drawMarkers();
      })
      .catch((err) => console.error(err));

    return () => {
      cancelled = true;
      if (resizeObsRef.current) {
        resizeObsRef.current.disconnect();
        resizeObsRef.current = null;
      }
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Redraw whenever the data or the active mode changes.
  useEffect(() => {
    drawMarkers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customers, mode]);

  // Uniform marker pixel radius as a function of zoom, so dots stay small (and
  // stop overlapping) when zoomed out and grow as you zoom in. All statuses use
  // the same size.
  function radiusForZoom(zoom: number) {
    return Math.max(1.5, Math.min(8, (zoom - 5) * 0.7));
  }

  function updateRadii() {
    const map = mapRef.current;
    if (!map) return;
    const zoom = map.getZoom();
    markersRef.current.forEach(({ marker }) => {
      marker.setRadius(radiusForZoom(zoom));
    });
  }

  function drawMarkers() {
    const L = LRef.current;
    if (!L || !mapRef.current || !layerRef.current) return;

    layerRef.current.clearLayers();
    markersRef.current = [];

    const zoom = mapRef.current.getZoom();

    // Draw order = stacking order. Render lower priority first so red (highest)
    // ends up on top and is never hidden behind other dots.
    const priority: Record<MapStatus, number> = { none: 0, green: 1, yellow: 2, red: 3 };
    const ordered = [...customers].sort((a, b) => {
      const sa = mode === "sales" ? a.sales.status : a.finance.status;
      const sb = mode === "sales" ? b.sales.status : b.finance.status;
      return priority[sa] - priority[sb];
    });

    ordered.forEach((customer) => {
      const { lat, lng } = customer.coordinates || {};
      if (lat == null || lng == null) return;

      const status = mode === "sales" ? customer.sales.status : customer.finance.status;
      const color = STATUS_COLORS[status] || STATUS_COLORS.none;
      const isRed = status === "red";

      const marker = L.circleMarker([lat, lng], {
        radius: radiusForZoom(zoom),
        color: "#ffffff",
        weight: 1,
        fillColor: color,
        fillOpacity: isRed ? 1 : 0.85,
      });

      marker.bindPopup(popupHtml(customer, mode));
      marker.bindTooltip(customer.name || `#${customer.userID}`, { direction: "top" });
      marker.addTo(layerRef.current);
      if (isRed) marker.bringToFront();

      markersRef.current.push({ marker, status });
    });
  }

  return (
    <div
      ref={containerRef}
      className="w-full h-full rounded-lg border border-gray-200 z-0"
      style={{ minHeight: "70vh" }}
    />
  );
};

export default CustomerMap;
