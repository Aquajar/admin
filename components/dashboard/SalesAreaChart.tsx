"use client"
const formatToINR = (amount: number): string => {
  const formatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    // minimumFractionDigits: 2,
    // maximumFractionDigits: 2,
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
  console.log("chartData : ", chartData)
  return (
    <Card>
      <CardHeader>
        <div className="absolute right-14">
          <Select
            // Set the default value on the root component
            defaultValue="weekly"
            onValueChange={(value: "weekly" | "monthly" | "yearly") => setSalesStatsType(value)}
          >
            <SelectTrigger className="w-[150px]">
              {/* This placeholder will be shown if no default value was set */}
              <SelectValue
                style={{
                  outline: "none",
                  boxShadow: "none",
                  border: "none",
                }}
                placeholder="Select a period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">Last 7 Days</SelectItem>
              <SelectItem value="monthly">Last 6 Months</SelectItem>
              <SelectItem value="yearly">This Year</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <CardTitle>Sales</CardTitle>
        <CardDescription>Daily sales performance</CardDescription>
      </CardHeader>
      <CardContent>
        {chartData && <ChartContainer config={chartConfig}>
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
      <CardFooter className="flex-col items-start gap-2 text-sm">
        <div className="flex flex-col space-y-3 w-full">
          <span className="text-sm font-medium mb-2">
            {salesStatsType === "weekly" ? "Last 7 days" : salesStatsType === "monthly" ? "Last 6 months" : "This year"} Summary
          </span>
          <div className="flex justify-between">
            <span className="leading-none text-sm text-gray-500">
              {salesStatsType === "weekly" ? "Average Daily Sales" : salesStatsType === "monthly" ? "Average Monthly Sales" : "Average Yearly Sales"}
            </span>
            <span className="leading-none font-semibold text-gray-800">{formatToINR((chartData?.map((item) => item.sales).reduce((a, b) => a + b, 0) / chartData.length))}</span>
          </div>
          <div className="flex justify-between">
            <span className="leading-none text-sm text-gray-500">
              Total Sales
            </span>
            <span className="leading-none font-semibold text-gray-800">{formatToINR(chartData?.map((item) => item.sales).reduce((a, b) => a + b, 0))}</span>
          </div>
        </div>
      </CardFooter>
    </Card>
  )
}
