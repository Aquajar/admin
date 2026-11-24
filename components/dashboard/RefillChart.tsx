"use client";

import { TrendingUp } from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Invoice } from "@/types/types";
import { Em } from "./StatCard";

// Chart Config
const chartConfig = {
  jars: {
    label: "Jars",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

// 👉 Helper to add st, nd, rd, th
function formatOrdinal(num: number): string {
  const suffix =
    num % 10 === 1 && num % 100 !== 11
      ? "st"
      : num % 10 === 2 && num % 100 !== 12
        ? "nd"
        : num % 10 === 3 && num % 100 !== 13
          ? "rd"
          : "th";
  return `${num}${suffix}`;
}

// 👉 Helper to abbreviate month
function abbreviateMonth(month: string): string {
  return new Date(`${month} 1, 2025`).toLocaleString("en-US", {
    month: "short",
  }); // "Sep", "Jan"
}

export default function RefillBarChart({
  chartData,
}: {
  chartData:
  | {
    date: string; // e.g. "26 September"
    sales: number;
    jars: number;
    due: number;
    collected: number;
    driverSummary: {
      name: string;
      invoices: Invoice[];
    }[];
  }[]
  | undefined;
}) {
  if (!chartData) {
    return null;
  }

  // Sort data by date (assuming format like "26 September")
  const sortedData = [...chartData].sort((a, b) => {
    const [dayA, monthA] = a.date.split(" ");
    const [dayB, monthB] = b.date.split(" ");
    return (
      new Date(`${monthA} ${dayA}, 2025`).getTime() -
      new Date(`${monthB} ${dayB}, 2025`).getTime()
    );
  });

  // Format dates with ordinal suffix + abbreviated month (e.g., "26th Sep")
  const formattedData = sortedData.map((item) => {
    const [day, month] = item.date.split(" ");
    return {
      ...item,
      dateFormatted: `${formatOrdinal(Number(day))}`,
    };
  });

  const total = chartData.reduce((a, b) => a + b.jars, 0);

  return (
    <Card className="rounded-xl shadow-sm">
      <CardHeader className="space-y-1 p-4 pb-2">
        <CardTitle className="text-sm">Jars Delivered</CardTitle>
        <CardDescription className="text-xs">Per day, last 7 days</CardDescription>
      </CardHeader>
      <CardContent className="px-4 pb-3">
        <ChartContainer config={chartConfig} className="aspect-auto h-[170px] w-full">
          <BarChart accessibilityLayer data={formattedData} margin={{ top: 8 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="dateFormatted"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent />}
            />
            <Bar dataKey="jars" fill="var(--chart-1)" radius={6} />
          </BarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <p className="text-sm leading-relaxed text-gray-600">
          Averaging <Em>{Math.round(total / chartData.length).toLocaleString("en-IN")}</Em> jars a day, <Em>{total.toLocaleString("en-IN")}</Em> in
          the last 7 days.
        </p>
      </CardFooter>
    </Card>
  );
}