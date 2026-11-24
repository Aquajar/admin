import { cn } from "@/lib/utils";
import { ChevronRight, LucideIcon, Minus, TrendingDown, TrendingUp } from "lucide-react";
import Link from "next/link";
import React, { FC } from "react";

export const inr = (n?: number | null) =>
  n == null || Number.isNaN(n) ? "—" : "₹" + Math.round(n).toLocaleString("en-IN");

export const num = (n?: number | null) => (n == null ? "—" : n.toLocaleString("en-IN"));

// "1 trip" / "3 trips"; "no trips" reads better than "0 trips" in a sentence.
export const plural = (n: number, one: string, many = one + "s") =>
  n === 0 ? `no ${many}` : `${n.toLocaleString("en-IN")} ${n === 1 ? one : many}`;

// A figure inside a sentence: a touch darker than the prose so the eye finds it, never bold.
export const Em: FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="font-medium text-gray-900 tabular-nums">{children}</span>
);

// Change vs the previous value as a phrase; the icon and the words carry the direction, not colour alone.
export const Trend: FC<{ pct: number | null; vs: string }> = ({ pct, vs }) => {
  if (pct == null || !Number.isFinite(pct)) return <>Nothing to compare with {vs}.</>;
  const r = Math.round(pct);
  const [Icon, cls, word] =
    r > 0 ? [TrendingUp, "text-emerald-600", "Up"] : r < 0 ? [TrendingDown, "text-red-600", "Down"] : [Minus, "text-gray-500", ""];
  return (
    <span className="inline-flex items-center gap-1.5">
      <Icon size={14} className={cn("shrink-0", cls)} aria-hidden />
      {r === 0 ? (
        <>Same as {vs}.</>
      ) : (
        <span>
          {word} <Em>{Math.abs(r)}%</Em> from {vs}.
        </span>
      )}
    </span>
  );
};

// Tinted surfaces for the live cards; text stays gray-900/600 so contrast holds on every tint.
const TONES = {
  plain: { card: "bg-white", icon: "bg-blue-50 text-blue-600", hover: "hover:bg-gray-50" },
  blue: { card: "bg-blue-50 border-blue-100", icon: "bg-blue-100 text-blue-700", hover: "hover:bg-blue-100/60" },
  violet: { card: "bg-violet-50 border-violet-100", icon: "bg-violet-100 text-violet-700", hover: "hover:bg-violet-100/60" },
  emerald: { card: "bg-emerald-50 border-emerald-100", icon: "bg-emerald-100 text-emerald-700", hover: "hover:bg-emerald-100/60" },
  amber: { card: "bg-amber-50 border-amber-100", icon: "bg-amber-100 text-amber-700", hover: "hover:bg-amber-100/60" },
};

interface IProps {
  title: string;
  icon: LucideIcon;
  value: React.ReactNode;
  // Word after the headline figure ("present", "km"), set smaller so the number stays the anchor.
  unit?: string;
  href?: string;
  tone?: keyof typeof TONES;
  // One or two short sentences explaining the figure.
  children?: React.ReactNode;
}

// One card = title, one headline figure, a sentence. Every card on the dashboard uses the same three type styles.
const StatCard: FC<IProps> = ({ title, icon: Icon, value, unit, href, tone = "plain", children }) => {
  const t = TONES[tone];
  const body = (
    <>
      <div className="flex items-center gap-2">
        <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-md", t.icon)} aria-hidden>
          <Icon size={15} />
        </span>
        <span className="min-w-0 truncate text-sm font-medium text-gray-700" title={title}>
          {title}
        </span>
        {href && <ChevronRight size={14} className="ml-auto shrink-0 text-gray-400 transition-colors group-hover:text-gray-700" aria-hidden />}
      </div>
      <p className="text-2xl font-semibold tracking-tight text-gray-900 tabular-nums">
        {value}
        {unit && <span className="ml-1.5 text-sm font-normal tracking-normal text-gray-600">{unit}</span>}
      </p>
      {children && <div className="text-sm leading-relaxed text-gray-600">{children}</div>}
    </>
  );
  const cls = cn("group flex flex-col gap-1.5 rounded-xl border p-3.5 shadow-sm", t.card);
  return href ? (
    <Link
      href={href}
      className={cn(
        cls,
        t.hover,
        "transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
      )}
    >
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
};

export default StatCard;
