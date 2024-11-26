import { monthAbbr } from "@/lib/constants";
import React, { FC, useEffect, useMemo } from "react";
import { Chart } from "react-google-charts";

type RefillingData = {
  date: string;
  sales: number;
  jars: number;
  due: number;
  collected: number;
};

interface IProps {
  data: Array<RefillingData>;
}

export const options = {
  title: "",
  hAxis: { title: "Date", titleTextStyle: { color: "#333" } },
  vAxis: { minValue: 0 },
  chartArea: { width: "80%", height: "50%" },
};

const SalesAreaChart: FC<IProps> = ({ data }) => {
  // Sort Data required by the Chart Component
  const transformedData = useMemo(
    () => [
      ["Date", "Sales"],
      ...data.map((entry) => [
        entry?.date?.replace(
          /\b(January|February|March|April|May|June|July|August|September|October|November|December)\b/,
          (match) => {
            return monthAbbr[match]; // Replace with the abbreviation
          }
        ),
        entry?.sales,
      ]),
    ],
    [data]
  );

  const averageSales = useMemo(
    () =>
      (
        data.reduce((sum, entry) => sum + entry?.sales, 0) / data?.length
      )?.toFixed(0),
    [data]
  );

  return (
    <div className="w-full h-full">
      <div className="absolute top-5 z-50 flex flex-col md:flex-row items-baseline w-full">
        <span className="text-2xl font-medium">Sales Performance</span>
        <span className="md:ml-20 text-sm">Daily Average : {averageSales}</span>
      </div>
      <Chart
        className=""
        chartType="AreaChart"
        width="100%"
        height="100%"
        data={transformedData}
        options={options}
      />
    </div>
  );
};

export default SalesAreaChart;
