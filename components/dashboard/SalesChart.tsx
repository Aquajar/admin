"use client";

import { TrendingUp } from "lucide-react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";

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

// Chart config for sales
const chartConfig = {
  sales: {
    label: "Sales",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

// Helper: Add st, nd, rd, th
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

// Helper: Abbreviate month
function abbreviateMonth(month: string): string {
  return new Date(`${month} 1, 2025`).toLocaleString("en-US", {
    month: "short",
  });
}

export default function SalesAreaChart({
  chartData = [],
}: {
  chartData?: {
    date: string; // e.g. "26 September"
    sales: number;
    jars: number;
    due: number;
    collected: number;
    driverSummary: {
      name: string;
      invoices: Invoice[];
    }[];
  }[];
}) {
  if (chartData.length === 0) return null;

  // Sort by date
  const sortedData = [...chartData].sort((a, b) => {
    const [dayA, monthA] = a.date.split(" ");
    const [dayB, monthB] = b.date.split(" ");
    return (
      new Date(`${monthA} ${dayA}, 2025`).getTime() -
      new Date(`${monthB} ${dayB}, 2025`).getTime()
    );
  });

  // Format dates: "26th Sep"
  const formattedData = sortedData.map((item) => {
    const [day, month] = item.date.split(" ");
    return {
      ...item,
      dateFormatted: `${formatOrdinal(Number(day))} ${abbreviateMonth(month)}`,
    };
  });

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>Daily Sales Summary</CardTitle>
        <CardDescription>Track sales per day</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <AreaChart
            data={formattedData}
            margin={{ top: 20, left: 12, right: 12 }}
          >
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
            <Area
              dataKey="sales"
              type="natural"
              stroke="var(--chart-1)"
              fill="var(--chart-1)"
              fillOpacity={0.2}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 text-sm">
        <div className="flex gap-2 leading-none font-medium">
          Trending up by 8% this week <TrendingUp className="h-4 w-4" />
        </div>
        <div className="text-muted-foreground leading-none">
          Showing sales over time
        </div>
      </CardFooter>
    </Card>
  );
}