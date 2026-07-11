import Wrapper from "@/components/Wrapper";
import { STATUS_COLORS } from "@/components/Map/CustomerMap";
import useAxiosInstance from "@/lib/hooks/useAxiosInstance";
import { MapCustomer, MapMode, MapStatus, SideBarItem } from "@/types/types";
import { useSession } from "next-auth/react";
import dynamic from "next/dynamic";
import React, { useEffect, useMemo, useState } from "react";
import { FaMapMarkedAlt } from "react-icons/fa";
import { MdFullscreen, MdFullscreenExit } from "react-icons/md";

// Leaflet touches the DOM directly, so render the map on the client only.
const CustomerMap = dynamic(() => import("@/components/Map/CustomerMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[70vh] flex items-center justify-center text-gray-400 border border-gray-200 rounded-lg">
      Loading map…
    </div>
  ),
});

const breadCrumbData: SideBarItem[] = [
  {
    name: "Map",
    href: "/map",
    icon: FaMapMarkedAlt,
  },
];

// Legend copy per mode — mirrors the buckets computed on the backend.
const LEGENDS: Record<MapMode, { status: MapStatus; label: string }[]> = {
  sales: [
    { status: "green", label: "Delivered 1–2 days ago" },
    { status: "yellow", label: "Delivered 3–4 days ago" },
    { status: "red", label: "5+ days since delivery" },
    { status: "none", label: "No deliveries yet" },
  ],
  finance: [
    { status: "green", label: "Due up to 35 days" },
    { status: "yellow", label: "Due up to 45 days" },
    { status: "red", label: "Due over 45 days" },
    { status: "none", label: "No outstanding due" },
  ],
};

const MapPage = () => {
  const { data: session } = useSession();
  const axiosInstance = useAxiosInstance(session);

  const [mode, setMode] = useState<MapMode>("sales");
  const [customers, setCustomers] = useState<MapCustomer[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  // Allow Escape to leave full-screen.
  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFullscreen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fullscreen]);

  useEffect(() => {
    if (!session || customers) return;

    const fetchCustomers = async () => {
      setLoading(true);
      try {
        const { data } = await axiosInstance.get(
          process.env.NEXT_PUBLIC_API_URL + "/map/customers"
        );
        setCustomers(data?.customers || []);
      } catch (error) {
        console.log(error);
        setCustomers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCustomers();
  }, [session, customers, axiosInstance]);

  // Count markers per bucket for the active mode.
  const counts = useMemo(() => {
    const acc: Record<MapStatus, number> = { green: 0, yellow: 0, red: 0, none: 0 };
    (customers || []).forEach((c) => {
      const status = mode === "sales" ? c.sales.status : c.finance.status;
      acc[status] += 1;
    });
    return acc;
  }, [customers, mode]);

  const modeToggle = (
    <div
      className="grid grid-cols-2 gap-1 p-1 w-full md:w-fit bg-gray-200 rounded-lg"
      role="group"
    >
      <button
        onClick={() => setMode("sales")}
        className={`px-6 py-1.5 text-sm font-medium rounded-lg ${
          mode === "sales"
            ? "text-white bg-gray-900"
            : "text-gray-900 hover:bg-gray-100"
        }`}
      >
        Sales
      </button>
      <button
        onClick={() => setMode("finance")}
        className={`px-6 py-1.5 text-sm font-medium rounded-lg ${
          mode === "finance"
            ? "text-white bg-gray-900"
            : "text-gray-900 hover:bg-gray-100"
        }`}
      >
        Finance
      </button>
    </div>
  );

  const legend = (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
      {LEGENDS[mode].map(({ status, label }) => (
        <div key={status} className="flex items-center gap-2 text-sm text-gray-700">
          <span
            className="inline-block w-3.5 h-3.5 rounded-full border-2 border-white shadow"
            style={{ backgroundColor: STATUS_COLORS[status] }}
          />
          {label}
          <span className="text-gray-400">({counts[status]})</span>
        </div>
      ))}
    </div>
  );

  return (
    <Wrapper breadcrumb={breadCrumbData}>
      <div className="flex flex-col w-full">
        {/* Header + mode toggle */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mt-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Customer Map</h1>
            <p className="text-sm text-gray-500">
              {loading
                ? "Loading customers…"
                : `${customers?.length ?? 0} customers plotted`}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {modeToggle}
            <button
              onClick={() => setFullscreen(true)}
              className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-300 text-gray-900 hover:bg-gray-100 whitespace-nowrap"
              title="Full screen map"
            >
              <MdFullscreen className="w-5 h-5" />
              Fullscreen
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-4 mb-3">{legend}</div>

        {/* Map */}
        <div
          className={
            fullscreen
              ? "fixed inset-0 z-[9999] bg-white"
              : "w-full h-[70vh] relative"
          }
        >
          <CustomerMap customers={customers || []} mode={mode} />

          {fullscreen && (
            <div className="absolute top-4 right-4 z-[10000] flex flex-col gap-3 bg-white/95 backdrop-blur rounded-xl shadow-lg border border-gray-200 p-4 max-w-[16rem]">
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm font-semibold text-gray-900">
                  Customer Map
                </span>
                <button
                  onClick={() => setFullscreen(false)}
                  className="flex items-center gap-1 px-2 py-1 text-sm font-medium rounded-md border border-gray-300 text-gray-900 hover:bg-gray-100"
                  title="Exit full screen (Esc)"
                >
                  <MdFullscreenExit className="w-5 h-5" />
                  Exit
                </button>
              </div>
              {modeToggle}
              {legend}
            </div>
          )}
        </div>
      </div>
    </Wrapper>
  );
};

export default MapPage;
