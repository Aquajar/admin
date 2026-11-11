import React, { FC } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export const currentMonthKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

export const monthLabel = (key: string) => {
  const [y, m] = key.split("-").map(Number);
  if (!y || !m) return key;
  return `${MONTH_NAMES[m - 1]} ${y}`;
};

// The months that have logs, plus always the current and the picked month; newest first.
export const monthOptions = (months: string[], selected: string) =>
  Array.from(new Set([...months, currentMonthKey(), selected])).sort((a, b) => (a < b ? 1 : -1));

const MonthSelect: FC<{
  value: string;
  onChange: (month: string) => void;
  months: string[];
}> = ({ value, onChange, months }) => (
  <Select value={value} onValueChange={onChange}>
    <SelectTrigger
      aria-label="Month"
      className="h-11 w-44 shrink-0 rounded-xl border-[#EAEAEA] bg-white text-[15px] font-medium text-[#0A0A0A] shadow-none hover:border-[#D4D4D4] focus:ring-[3px] focus:ring-[#2563EB]/15"
    >
      {/* Render the label from state — Radix's SelectValue leaves the
          trigger blank on first paint until the list mounts. */}
      <span>{monthLabel(value)}</span>
    </SelectTrigger>
    <SelectContent>
      {monthOptions(months, value).map((m) => (
        <SelectItem key={m} value={m}>
          {monthLabel(m)}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
);

export default MonthSelect;
