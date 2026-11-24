"use client"
const formatToINR = (amount: number): string => {
  const formatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  });

  // Use the format method to get the formatted string.
  return formatter.format(amount);
};
import { CartesianGrid, Line, LineChart, XAxis } from "recharts"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { Invoice } from "@/types/types"
import { Em } from "./StatCard"
import { set } from "date-fns";
import { Dispatch, SetStateAction } from "react";


const chartConfig = {
  sales: {
    label: "Sales",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig

export default function SalesLineChart({
  chartData,
  salesStatsType,
  setSalesStatsType
}: {
  chartData: {
    date: string;
    sales: number;
    d2cSales?: number;
    b2bSales?: number;
    jars: number;
    due: number;
    collected: number;
    driverSummary: {
      name: string;
      invoices: Invoice[];
    }[];
  }[],
  salesStatsType: "weekly" | "monthly" | "yearly"
  setSalesStatsType: Dispatch<SetStateAction<"weekly" | "monthly" | "yearly">>
}) {
  const total = chartData.reduce((a, b) => a + b.sales, 0);
  const d2c = chartData.reduce((a, b) => a + (b.d2cSales || 0), 0);
  const b2b = chartData.reduce((a, b) => a + (b.b2bSales || 0), 0);

  return (
    <Card className="rounded-xl shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 p-4 pb-2">
        <div className="flex flex-col gap-1">
          <CardTitle className="text-sm">Sales</CardTitle>
          <CardDescription className="text-xs">
            {salesStatsType === "weekly" ? "Daily sales, last 7 days" : salesStatsType === "monthly" ? "Monthly sales, last 6 months" : "Monthly sales this year"}
          </CardDescription>
        </div>
        <Select
          value={salesStatsType}
          onValueChange={(value: "weekly" | "monthly" | "yearly") => setSalesStatsType(value)}
        >
          <SelectTrigger className="h-8 w-[132px] shrink-0 text-xs" aria-label="Sales period">
            <SelectValue placeholder="Select a period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="weekly">Last 7 Days</SelectItem>
            <SelectItem value="monthly">Last 6 Months</SelectItem>
            <SelectItem value="yearly">This Year</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="px-4 pb-3">
        {chartData && <ChartContainer config={chartConfig} className="aspect-auto h-[170px] w-full">
          <LineChart
            accessibilityLayer
            data={[...chartData].reverse()}
            margin={{
              left: 12,
              right: 12,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey={salesStatsType === "weekly" ? "date" : "month"}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value: string) => {
                const monthFullNames: string[] = [
                  'January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November', 'December'
                ];
                const monthAbbreviations: string[] = [
                  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
                ];
                const day = value.split(" ")[0] // e.g. "26"
                const suffix =
                  day.endsWith("1") && day !== "11"
                    ? "st"
                    : day.endsWith("2") && day !== "12"
                      ? "nd"
                      : day.endsWith("3") && day !== "13"
                        ? "rd"
                        : "th"

                if (salesStatsType === "weekly") {
                  return `${day}${suffix}`
                }
                else return monthFullNames.findIndex((m) => m === value) !== -1 ? monthAbbreviations[monthFullNames.findIndex((m) => m === value)] : value
              }}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Line
              dataKey="sales"
              type="natural"
              stroke="var(--color-sales)"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ChartContainer>}
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <p className="text-sm leading-relaxed text-gray-600">
          {total ? (
            <>
              <Em>{formatToINR(total)}</Em> {salesStatsType === "weekly" ? "over the last 7 days" : salesStatsType === "monthly" ? "over the last 6 months" : "so far this year"}, about{" "}
              <Em>{formatToINR(total / (chartData.length || 1))}</Em> a {salesStatsType === "weekly" ? "day" : "month"}. <Em>{Math.round((Math.max(d2c, b2b) / total) * 100)}%</Em> came from{" "}
              {b2b >= d2c ? "B2B" : "D2C"}.
            </>
          ) : (
            <>No sales in this period.</>
          )}
        </p>
      </CardFooter>
    </Card>
  )
}
