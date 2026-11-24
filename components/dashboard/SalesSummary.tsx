import { BadgeIndianRupee } from "lucide-react";
import React, { FC } from "react";
import StatCard, { Em, inr } from "./StatCard";

interface IProps {
  totalSales: number;
  totalDue: number;
  totalCollected: number;
}

// All-time sales split into collected and still due.
const SalesSummary: FC<IProps> = ({ totalSales, totalDue, totalCollected }) => {
  const collectedPct = totalSales ? Math.min(100, Math.round((totalCollected / totalSales) * 100)) : 0;
  return (
    <StatCard title="All-time sales" icon={BadgeIndianRupee} value={inr(totalSales)}>
      <div className="flex flex-col gap-2">
        <div
          className="flex h-1.5 w-full overflow-hidden rounded-full bg-amber-200"
          role="progressbar"
          aria-label="Share of all-time sales collected"
          aria-valuenow={collectedPct}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className="h-full bg-emerald-500 transition-[width] duration-500" style={{ width: `${collectedPct}%` }} />
        </div>
        <span>
          <Em>{collectedPct}%</Em> collected, <Em>{inr(totalDue)}</Em> still due.
        </span>
      </div>
    </StatCard>
  );
};

export default SalesSummary;
