import { Customer, Invoice } from "@/types/types";
import React, { FC, useEffect, useState } from "react";
import CurrencyFormat from "react-currency-format";

interface IProps {
  total: number | undefined;
  regular: number | undefined;
  newCustomers: number | undefined;
  top:
    | Array<{
        name: string;
        phone: string;
        totalSales: number;
      }>
    | undefined;
}

const CustomerInsight: FC<IProps> = ({ top, total, regular, newCustomers }) => {
  return (
    <div className="bg-black rounded-2xl p-5 my-6">
      <span className="text-white text-lg">Customer Insight</span>
      {/* Stats */}
      <div className="grid mt-4 grid-cols-1 w-full md:grid-cols-3 md:grid-rows-1 gap-8">
        {/* Total customers */}
        <div className="bg-[#FE7B50] rounded-2xl p-5 flex flex-col items-center justify-center">
          <span className="text-white text-3xl font-semibold">{total}</span>
          <span className="text-white text-sm">Total</span>
        </div>
        {/* Regular Customer this month */}
        <div className="bg-[#FE9D50] rounded-2xl p-5 flex flex-col items-center justify-center">
          <span className="text-white text-3xl font-semibold">{regular}</span>
          <span className="text-white text-sm">Regular</span>
        </div>
        {/* New Regular Customer added this month */}
        <div className="bg-[#ACA081] rounded-2xl p-5 flex flex-col items-center justify-center">
          <span className="text-white text-3xl font-semibold">
            +{newCustomers}
          </span>
          <span className="text-white text-sm">New added </span>
        </div>
      </div>
      {/* Leaderboard */}
      <div className="relative overflow-x-auto mt-6">
        <table className="w-full text-sm text-left rtl:text-right text-gray-300">
          <thead className="text-xs  uppercase  border-b border-gray-500">
            <tr>
              <th scope="col" className="px-6 py-3">
                Rank
              </th>
              <th scope="col" className="px-6 py-3">
                Name
              </th>
              <th scope="col" className="px-6 py-3">
                Phone
              </th>
              <th scope="col" className="px-6 py-3">
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {top?.map((customer, index) => {
              return (
                <tr key={customer.name}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-300">{index + 1}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-300">
                      {customer.name}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-300">
                      {customer.phone}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-300">
                      <CurrencyFormat
                        value={customer.totalSales}
                        displayType={"text"}
                        thousandSeparator={true}
                        prefix={"₹"}
                      />
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CustomerInsight;
