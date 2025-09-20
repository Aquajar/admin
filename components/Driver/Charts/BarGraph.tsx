import { DriverSummary } from "@/types/types";
import React, { useEffect, useState } from "react";

const DriverSalesSummary = ({ data }: { data: DriverSummary[] }) => {
  const [itemsArray, setItemsArray] = useState<number[]>([50]);
  const maxSales = 200;
  const diviser = 40;

  useEffect(() => {
    const itemsArray = Array.from(
      {
        length: maxSales / diviser,
      },
      (_, index) => index + 1
    );

    setItemsArray(itemsArray);
  }, [data]);

  return (
    <div className="w-full bg-white rounded-3xl border shadow-md p-4 md:p-6">
      <div className="flex justify-between pb-1">
        <span className="text-2xl font-medium">Driver Insight</span>
      </div>

      {/* Graph */}
      <div className="p-5 h-60 mb-4">
        <div
          className={`relative border-gray-300 h-full w-full grid grid-cols-${5}`}
        >
          {data && (
            <>
              <div
                style={{
                  width: `${(data[0]?.jars / maxSales) * 100}%`,
                }}
                className={`bottom-12 absolute h-10 bg-blue-500 rounded-r-lg z-50`}
              >
                <span className="absolute w-40 -bottom-6 text-sm">
                  {data[0]?.name}{" "}
                  <span className="text-red-600">({data[0]?.jars})</span>
                </span>
              </div>
              <div
                style={{
                  width: `${(data[1]?.jars / maxSales) * 100}%`,
                }}
                className="bottom-32 absolute h-10 py-3 bg-blue-900 rounded-r-lg z-50"
              >
                <span className="absolute w-40 -bottom-6 text-sm">
                  {data[1]?.name}
                  <span className="text-red-600"> ({data[1]?.jars})</span>
                </span>
              </div>
            </>
          )}
          {itemsArray.map((item, i) => (
            <div key={item} className={`border-l border-gray-300 relative`}>
              <span className="absolute -bottom-8 text-sm -left-1">
                {i * diviser}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DriverSalesSummary;
