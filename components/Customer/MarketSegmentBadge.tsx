import { FC } from "react";
import { MARKET_SEGMENTS, MarketSegment } from "@/lib/constants";

// Tailwind colour per segment. Keyed by the segment id so the tag reads at a
// glance in tables and on the billing screen.
const SEGMENT_STYLES: Record<MarketSegment, string> = {
  b2c: "bg-blue-50 text-blue-700 border-blue-200",
  b2b: "bg-purple-50 text-purple-700 border-purple-200",
  b2g: "bg-amber-50 text-amber-700 border-amber-200",
  b2b2c: "bg-teal-50 text-teal-700 border-teal-200",
  inst: "bg-rose-50 text-rose-700 border-rose-200",
  ngo: "bg-green-50 text-green-700 border-green-200",
};

interface IProps {
  segment?: MarketSegment | string | null;
  className?: string;
}

const MarketSegmentBadge: FC<IProps> = ({ segment, className = "" }) => {
  // Fall back to Individual (B2C) — matches the backend default — so customers
  // created before this field existed still render a sensible tag.
  const id = (segment || "b2c") as MarketSegment;
  const meta = MARKET_SEGMENTS.find((s) => s.id === id);

  if (!meta) {
    return <span className="text-xs text-gray-400">—</span>;
  }

  return (
    <span
      title={meta.description}
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${SEGMENT_STYLES[id]} ${className}`}
    >
      {meta.label}
    </span>
  );
};

export default MarketSegmentBadge;
