import React, { FC } from "react";
import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";

ChartJS.register(ArcElement, Tooltip, Legend);

interface IProps {
  collection: number;
  payments: number;
}
const DashboardCard: FC<IProps> = ({ collection, payments }) => {
  const total = collection + payments;

  // Percentage Calculation
  const paymentsPercentage = Math.round((payments / total) * 100);
  const collectedPercentage = Math.round((collection / total) * 100);

  // Due Status Class
  const dueStatusClass =
    paymentsPercentage > 80 ? "text-green-500" : "text-red-500";

  // Collected Status Class
  const collectedStatusClass =
    collectedPercentage > 80 ? "text-green-500" : "text-red-500";

  // Chart Data
  const data = {
    labels: ["Due", "Collected"],
    datasets: [
      {
        data: [paymentsPercentage, collectedPercentage], // Data values
        backgroundColor: ["#FFA500", "#A3E635"], // Colors for sections
        borderWidth: 0,
      },
    ],
  };

  // Chart Options
  const options = {
    cutout: "70%", // Creates the donut effect
    plugins: {
      tooltip: {
        enabled: true,
      },
      legend: {
        display: false, // Hides the legend,
      },
    },
  };

  return (
    <div className="w-full bg-white rounded-3xl shadow border p-4">
      {/* Title */}
      <h2 className="text-center text-lg font-semibold">
        Total View Performance
      </h2>
      <hr className="my-2 border-gray-300" />

      {/* Chart */}
      <div className="relative w-64 h-64 mx-auto">
        <Doughnut data={data} options={options} />
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-gray-500 text-sm">Total Count</p>
          <p className="text-black text-2xl font-bold">565K</p>
        </div>
      </div>

      {/* Subtext */}
      <p className="text-center text-gray-500 mt-4">
        Here are some tips on how to improve your score.
      </p>

      {/* Legend */}
      <div className="mt-4 flex justify-around">
        <div className="flex items-center">
          <div className="w-4 h-4 bg-green-400 rounded-full mr-2"></div>
          <p className="text-sm text-gray-700">View Count</p>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 bg-teal-600 rounded-full mr-2"></div>
          <p className="text-sm text-gray-700">Percentage</p>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 bg-orange-400 rounded-full mr-2"></div>
          <p className="text-sm text-gray-700">Sales</p>
        </div>
      </div>
    </div>
  );
};

export default DashboardCard;
