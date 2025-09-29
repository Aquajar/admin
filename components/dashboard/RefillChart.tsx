"use client";

import { TrendingUp } from "lucide-react";
import { Bar, BarChart, CartesianGrid, LabelList, XAxis } from "recharts";

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

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>Daily Jars Summary</CardTitle>
        <CardDescription>Track delivered jars per day</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <BarChart accessibilityLayer data={formattedData} margin={{ top: 20 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="dateFormatted"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Bar dataKey="jars" fill="var(--chart-1)" radius={8}>
              <LabelList
                position="top"
                offset={12}
                className="fill-foreground"
                fontSize={12}
              />
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col">
        <div className="flex flex-col space-y-3 w-full">
          <span className="text-sm font-medium mb-2">
            Last 7 days summary
          </span>
          <div className="flex justify-between">
            <span className="leading-none text-sm text-gray-500">
              Average jars delivered per day
            </span>
            <span className="leading-none font-semibold text-gray-800">{(chartData.map((item) => item.jars).reduce((a, b) => a + b, 0) / chartData.length).toFixed(0)}</span>
          </div>
          <div className="flex justify-between">
            <span className="leading-none text-sm text-gray-500">
              Total jar delivered
            </span>
            <span className="leading-none font-semibold text-gray-800">{(chartData.map((item) => item.jars).reduce((a, b) => a + b, 0))}</span>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}