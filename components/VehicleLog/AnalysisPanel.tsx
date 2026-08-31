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
}> = ({ label, value, icon, accent = "text-[#0A0A0A]" }) => (
  <div className="flex items-center gap-3 rounded-2xl border border-[#EAEAEA] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F5F5F5] text-[#6B7280]">
      {icon}
    </div>
    <div className="min-w-0">
      <div className="truncate text-[13px] text-[#6B7280]">{label}</div>
      <div className={`text-lg font-semibold leading-tight ${accent}`}>
        {value}
      </div>
    </div>
  </div>
);

const inr = (n: number) => "₹" + Math.round(n || 0).toLocaleString("en-IN");

const AnalysisPanel: FC<Props> = ({ analytics, loading }) => {
  const t = analytics?.totals;
  const maxDayOut = Math.max(1, ...(analytics?.byDay || []).map((d) => d.out));

  return (
    <div className="space-y-4">
      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard
          label="Trips"
          value={loading ? "…" : t?.trips ?? 0}
          icon={<Truck className="h-5 w-5" />}
        />
        <StatCard
          label="Jars Out"
          value={loading ? "…" : t?.out ?? 0}
          icon={<PackageOpen className="h-5 w-5" />}
        />
        <StatCard
          label="Filled"
          value={loading ? "…" : t?.filled ?? 0}
          icon={<Droplets className="h-5 w-5" />}
        />
        <StatCard
          label="Empty"
          value={loading ? "…" : t?.empty ?? 0}
          icon={<RotateCcw className="h-5 w-5" />}
        />
        <StatCard
          label="Engaged"
          value={loading ? "…" : t?.engaged ?? 0}
          icon={<Link2 className="h-5 w-5" />}
          accent={(t?.engaged ?? 0) < 0 ? "text-[#DC2626]" : "text-[#0A0A0A]"}
        />
        <StatCard
          label="Cash"
          value={loading ? "…" : inr(t?.cash ?? 0)}
          icon={<IndianRupee className="h-5 w-5" />}
        />
      </div>

      {/* Detail row: daily bar + top lists */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Daily jars-out */}
        <div className="rounded-2xl border border-[#EAEAEA] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] lg:col-span-1">
          <div className="mb-3 text-[13px] font-medium text-[#6B7280]">
            Jars out · by day
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
                    className="w-full rounded-t bg-[#93C5FD] transition-colors group-hover:bg-[#60A5FA]"
                    style={{
                      height: `${Math.max(3, (d.out / maxDayOut) * 96)}px`,
                    }}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-24 items-center justify-center text-[13px] text-[#9CA3AF]">
              No data
            </div>
          )}
        </div>

        {/* Top locations */}
        <MiniList title="Top locations" items={analytics?.topLocations || []} />
        {/* Top staff */}
        <MiniList title="Top staff" items={analytics?.topStaff || []} />
      </div>
    </div>
  );
};

const MiniList: FC<{
  title: string;
  items: { name: string; trips: number }[];
}> = ({ title, items }) => (
  <div className="rounded-2xl border border-[#EAEAEA] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
    <div className="mb-3 text-[13px] font-medium text-[#6B7280]">{title}</div>
    {items.length === 0 ? (
      <div className="flex h-24 items-center justify-center text-[13px] text-[#9CA3AF]">
        No data
      </div>
    ) : (
      <div className="space-y-1.5">
        {items.slice(0, 5).map((it) => (
          <div
            key={it.name}
            className="flex items-center justify-between text-[15px]"
          >
            <span className="truncate text-[#0A0A0A]">{it.name}</span>
            <span className="ml-2 shrink-0 rounded-full bg-[#F1F5F9] px-2 py-0.5 text-[12px] font-semibold text-[#475569]">
              {it.trips}
            </span>
          </div>
        ))}
      </div>
    )}
  </div>
);

export default AnalysisPanel;
