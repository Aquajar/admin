import Wrapper from "@/components/Wrapper";
import axios from "axios";
import React, { useEffect, useRef, useState } from "react";
import { Accordion, AccordionItem } from "@/components/Accordion";
import CurrencyFormat from "react-currency-format";

const BreadCrumb = [
  {
    href: "/fueling",
    name: "Fueling",
  },
];

interface FuelingEntry {
  Date: string;
  WB73E3666: string;
  WB73H1716: string;
}

interface MonthlyData {
  entries: FuelingEntry[];
  totals: {
    WB73E3666: number;
    WB73H1716: number;
  };
}

interface YearlyData {
  [year: string]: Record<string, MonthlyData>;
}

const Fueling = () => {
  const fetchCalled = useRef(false); // Use ref to track fetch calls

  const [groupedData, setGroupedData] = useState<YearlyData | null>(null);

  // Helper function to parse and format dates
  const parseDate = (dateString: string): Date => {
    const [day, month, year] = dateString.split("/").map(Number);
    return new Date(year, month - 1, day); // Month is 0-based in JS Date
  };

  // Helper function to parse currency values
  const parseCurrency = (value: string): number => {
    const num = value.replace(/[^0-9]/g, ""); // Remove non-numeric characters
    return num ? parseInt(num, 10) : 0; // Return 0 if empty or invalid
  };

  // Function to group data by year and month, and calculate totals
  const groupDataByYearAndMonth = (data: FuelingEntry[]): YearlyData => {
    // Sort data by date
    const sortedData = [...data].sort(
      (a, b) => parseDate(a.Date).getTime() - parseDate(b.Date).getTime()
    );

    // Group data by year and month, and calculate totals
    return sortedData.reduce((acc: YearlyData, item: FuelingEntry) => {
      const date = parseDate(item.Date);
      const year = date.getFullYear().toString();
      const month = date.toLocaleString("default", { month: "long" });

      if (!acc[year]) {
        acc[year] = {};
      }

      if (!acc[year][month]) {
        acc[year][month] = {
          entries: [],
          totals: { WB73E3666: 0, WB73H1716: 0 },
        };
      }

      acc[year][month].entries.push(item);

      // Accumulate totals
      acc[year][month].totals["WB73E3666"] += parseCurrency(
        item["WB73E3666"] || ""
      );
      acc[year][month].totals["WB73H1716"] += parseCurrency(
        item["WB73H1716"] || ""
      );

      return acc;
    }, {});
  };

  // Function to fetch the data from Sheet DB api
  const fetchFuelingData = async () => {
    try {
      const URL = `https://sheetdb.io/api/v1/${process.env.NEXT_PUBLIC_SHEETDB_KEY}?sheet=Fueling`;

      if (!fetchCalled.current) {
        // Prevent multiple fetch calls
        fetchCalled.current = true;
        const { data } = await axios.get<FuelingEntry[]>(URL);
        const grouped = groupDataByYearAndMonth(data);
        setGroupedData(grouped);
      }
    } catch (error) {
      console.error("Error fetching fueling data:", error);
    }
  };

  useEffect(() => {
    if (!fetchCalled.current) {
      // Fetch data only if it hasn't been called yet
      fetchFuelingData();
    }
  }, []); // Empty dependency array ensures the effect runs only once

  return (
    <Wrapper breadcrumb={BreadCrumb}>
      <div className="relative overflow-x-auto pb-52">
        {groupedData && (
          <Accordion>
            {Object.entries(groupedData).map(([year, months], yearIndex) => (
              <AccordionItem key={year} header={`Year: ${year}`}>
                <Accordion>
                  {Object.entries(months).map(
                    ([month, monthData], monthIndex) => (
                      <AccordionItem
                        key={month}
                        header={
                          <>
                            <div className="space-x-3">
                              <span className="text-lg font-semibold mr-3">
                                {month}
                              </span>
                              |
                              <span className="text-md">
                                <CurrencyFormat
                                  value={
                                    monthData.totals["WB73E3666"] +
                                    monthData.totals["WB73H1716"]
                                  }
                                  displayType={"text"}
                                  thousandSeparator={","}
                                  prefix={"₹"}
                                />
                              </span>
                            </div>
                          </>
                        }
                      >
                        <div className="overflow-x-auto">
                          <table className="table-auto w-full text-left border-collapse border border-gray-300">
                            <thead className="bg-gray-200">
                              <tr>
                                <th className="px-4 py-2 border border-gray-300">
                                  Date
                                </th>
                                {Object.keys(monthData.entries[0])
                                  .filter((key) => key !== "Date")
                                  .map((column) => (
                                    <th
                                      key={column}
                                      className="px-4 py-2 border border-gray-300"
                                    >
                                      {column}
                                    </th>
                                  ))}
                              </tr>
                            </thead>
                            <tbody>
                              {monthData.entries.map((entry, rowIndex) => (
                                <tr
                                  key={rowIndex}
                                  className="odd:bg-white even:bg-gray-50"
                                >
                                  <td className="px-4 py-2 border border-gray-300">
                                    {entry.Date}
                                  </td>
                                  {Object.keys(entry)
                                    .filter((key) => key !== "Date")
                                    .map((column) => (
                                      <td
                                        key={column}
                                        className="px-4 py-2 border border-gray-300"
                                      >
                                        {/* @ts-ignore */}
                                        {entry[column]}
                                      </td>
                                    ))}
                                </tr>
                              ))}
                              <tr className="font-semibold bg-gray-100">
                                <td className="px-4 py-2 border border-gray-300">
                                  Monthly Totals
                                </td>
                                {Object.keys(monthData.totals).map(
                                  (totalKey) => (
                                    <td
                                      key={totalKey}
                                      className="px-4 py-2 border border-gray-300"
                                    >
                                      <CurrencyFormat
                                        // @ts-ignore
                                        value={monthData.totals[totalKey]}
                                        displayType={"text"}
                                        thousandSeparator={","}
                                        prefix={"₹"}
                                      />
                                    </td>
                                  )
                                )}
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </AccordionItem>
                    )
                  )}
                </Accordion>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </div>
    </Wrapper>
  );
};

export default Fueling;
