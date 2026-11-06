import React, { useEffect, useRef, useState } from "react";
import { DEFAULT_CENTER, DEFAULT_ZOOM, loadLeaflet } from "@/components/Map/CustomerMap";

export type MapMarker = { lat: number; lng: number; color: string; label?: string; popup?: string; size?: number };
export type MapLine = { points: [number, number][]; color: string; weight?: number; dashed?: boolean };
export type MapCircle = { lat: number; lng: number; radius: number; color: string; popup?: string };

interface Props {
  markers?: MapMarker[];
  lines?: MapLine[];
  circles?: MapCircle[];
  height?: string;
  // The view re-fits only when this changes, so polling refreshes don't move the map.
  fitKey?: string;
  onClick?: (lat: number, lng: number) => void;
}

// Leaflet map for the trip pages: markers, routes and geofence circles.
// Load with next/dynamic and ssr:false (Leaflet needs the DOM).
const TrackMap = ({ markers = [], lines = [], circles = [], height = "60vh", fitKey, onClick }: Props) => {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const layer = useRef<any>(null);
  const fitted = useRef<string | undefined>(undefined);
  const clickRef = useRef(onClick);
  clickRef.current = onClick;
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    loadLeaflet().then((L) => {
      if (!alive || !el.current || map.current) return;
      map.current = L.map(el.current).setView(DEFAULT_CENTER, DEFAULT_ZOOM);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(map.current);
      layer.current = L.layerGroup().addTo(map.current);
      map.current.on("click", (e: any) => clickRef.current?.(e.latlng.lat, e.latlng.lng));
      setReady(true);
    });
    return () => {
      alive = false;
      map.current?.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    const L = (window as any).L;
    if (!ready || !L) return;
    layer.current.clearLayers();
    const bounds: [number, number][] = [];
    circles.forEach((c) => {
      const circle = L.circle([c.lat, c.lng], { radius: c.radius, color: c.color, weight: 1.5, fillOpacity: 0.08 }).addTo(layer.current);
      if (c.popup) circle.bindPopup(c.popup);
      bounds.push([c.lat, c.lng]);
    });
    lines.forEach((l) => {
      if (l.points.length < 2) return;
      L.polyline(l.points, { color: l.color, weight: l.weight || 4, opacity: 0.85, dashArray: l.dashed ? "6 6" : undefined }).addTo(layer.current);
      bounds.push(...l.points);
    });
    markers.forEach((m) => {
      const mk = L.circleMarker([m.lat, m.lng], { radius: m.size || 8, color: "#fff", weight: 2, fillColor: m.color, fillOpacity: 1 }).addTo(layer.current);
      if (m.popup) mk.bindPopup(m.popup);
      if (m.label) mk.bindTooltip(m.label);
      bounds.push([m.lat, m.lng]);
    });
    if (fitted.current !== fitKey && bounds.length) {
      fitted.current = fitKey;
      map.current.fitBounds(bounds, { padding: [30, 30], maxZoom: 16 });
    }
  }, [ready, markers, lines, circles, fitKey]);

  return <div ref={el} style={{ height }} className="w-full rounded-lg border border-gray-200 z-0" />;
};

export default TrackMap;
