import React, { FC } from "react";
import {
  Truck,
  PackageOpen,
  Droplets,
  RotateCcw,
  Link2,
  IndianRupee,
} from "lucide-react";
import { VehicleLogAnalytics } from "@/types/types";

interface Props {
  analytics: VehicleLogAnalytics | null;
  loading: boolean;
}

const StatCard: FC<{
  label: string;
  value: string | number;
  icon: React.ReactNode;
  accent?: string;
}> = ({ label, value, icon, accent = "text-blue-700" }) => (
  <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2.5">
    <div className="flex h-9 w-9 items-center justify-center rounded-md bg-blue-50 text-blue-600">
      {icon}
    </div>
    <div className="min-w-0">
      <div className="truncate text-xs text-gray-500">{label}</div>
      <div className={`text-lg font-bold leading-tight ${accent}`}>{value}</div>
    </div>
  </div>
);

const inr = (n: number) => "₹" + Math.round(n || 0).toLocaleString("en-IN");

const AnalysisPanel: FC<Props> = ({ analytics, loading }) => {
  const t = analytics?.totals;
  const maxDayOut = Math.max(
    1,
    ...(analytics?.byDay || []).map((d) => d.out)
  );

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard
          label="Trips"
          value={loading ? "…" : t?.trips ?? 0}
          icon={<Truck className="h-4 w-4" />}
        />
        <StatCard
          label="Jars Out"
          value={loading ? "…" : t?.out ?? 0}
          icon={<PackageOpen className="h-4 w-4" />}
        />
        <StatCard
          label="Filled"
          value={loading ? "…" : t?.filled ?? 0}
          icon={<Droplets className="h-4 w-4" />}
          accent="text-green-600"
        />
        <StatCard
          label="Empty"
          value={loading ? "…" : t?.empty ?? 0}
          icon={<RotateCcw className="h-4 w-4" />}
        />
        <StatCard
          label="Engaged"
          value={loading ? "…" : t?.engaged ?? 0}
          icon={<Link2 className="h-4 w-4" />}
          accent={(t?.engaged ?? 0) < 0 ? "text-red-600" : "text-blue-700"}
        />
        <StatCard
          label="Cash"
          value={loading ? "…" : inr(t?.cash ?? 0)}
          icon={<IndianRupee className="h-4 w-4" />}
          accent="text-green-700"
        />
      </div>

      {/* Detail row: daily bar + top lists */}
      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-3">
        {/* Daily jars-out */}
        <div className="rounded-lg border border-gray-200 bg-white p-3 lg:col-span-1">
          <div className="mb-2 text-xs font-semibold text-gray-600">
            Jars Out · by day
          </div>
          {analytics && analytics.byDay.length > 0 ? (
            <div className="flex h-24 items-end gap-0.5">
              {analytics.byDay.map((d) => (
                <div
                  key={d.date}
                  className="group relative flex-1"
                  title={`${d.date}: ${d.out} out`}
                >
                  <div
                    className="w-full rounded-t bg-blue-400 transition-colors group-hover:bg-blue-600"
                    style={{
                      height: `${Math.max(3, (d.out / maxDayOut) * 96)}px`,
                    }}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-24 items-center justify-center text-xs text-gray-400">
              No data
            </div>
          )}
        </div>

        {/* Top locations */}
        <MiniList
          title="Top Locations"
          items={analytics?.topLocations || []}
        />
        {/* Top staff */}
        <MiniList title="Top Staff" items={analytics?.topStaff || []} />
      </div>
    </div>
  );
};

const MiniList: FC<{
  title: string;
  items: { name: string; trips: number }[];
}> = ({ title, items }) => (
  <div className="rounded-lg border border-gray-200 bg-white p-3">
    <div className="mb-2 text-xs font-semibold text-gray-600">{title}</div>
    {items.length === 0 ? (
      <div className="flex h-24 items-center justify-center text-xs text-gray-400">
        No data
      </div>
    ) : (
      <div className="space-y-1">
        {items.slice(0, 5).map((it) => (
          <div
            key={it.name}
            className="flex items-center justify-between text-sm"
          >
            <span className="truncate text-gray-700">{it.name}</span>
            <span className="ml-2 shrink-0 rounded bg-gray-100 px-1.5 text-xs font-medium text-gray-600">
              {it.trips}
            </span>
          </div>
        ))}
      </div>
    )}
  </div>
);

export default AnalysisPanel;
