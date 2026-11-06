import React from "react";
import { REASONS, SEVERITY_CLS, STATUS } from "@/lib/tracking";

export const StatusBadge = ({ status }: { status: string }) => {
  const s = STATUS[status] || { label: status, cls: "bg-gray-100 text-gray-700" };
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${s.cls}`}>{s.label}</span>;
};

export const SeverityDot = ({ severity }: { severity: string }) => (
  <span title={`Severity: ${severity}`} className={`inline-block size-2.5 shrink-0 rounded-full ${SEVERITY_CLS[severity] || SEVERITY_CLS.none}`} />
);

export const ReasonChips = ({ codes }: { codes: string[] }) => (
  <div className="flex flex-wrap gap-1">
    {codes.map((c) => (
      <span key={c} className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-700">
        {REASONS[c] || c}
      </span>
    ))}
  </div>
);

export function Tabs<T extends string>({ value, onChange, tabs }: { value: T; onChange: (v: T) => void; tabs: [T, string][] }) {
  return (
    <div className="inline-flex rounded-lg bg-gray-100 p-1">
      {tabs.map(([k, label]) => (
        <button
          key={k}
          onClick={() => onChange(k)}
          className={`rounded-md px-3 py-1.5 text-sm font-medium ${value === k ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export const PageTitle = ({ title, sub, right }: { title: string; sub?: string; right?: React.ReactNode }) => (
  <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
    <div>
      <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
      {sub && <p className="text-sm text-gray-500">{sub}</p>}
    </div>
    {right}
  </div>
);

export const MapLoading = () => (
  <div className="flex h-[50vh] w-full items-center justify-center rounded-lg border border-gray-200 text-gray-400">Loading map…</div>
);
