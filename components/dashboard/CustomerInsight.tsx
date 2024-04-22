import { Customer, Invoice } from "@/types/types";
import React, { FC, useEffect, useState } from "react";

interface IProps {
  customers: Customer[] | null | undefined;
  currentMonth: number;
  invoices: Invoice[] | null | undefined;
}

const CustomerInsight: FC<IProps> = ({ customers, currentMonth, invoices }) => {
  const [topCustomers, setTopCustomers] = useState<
    { customerId: string; total: number }[]
  >([]);

  const findTopCustomers = () => {
    const customerInvoices = invoices?.reduce((acc, invoice) => {
      if (!invoice.customerID) return acc;
      if (acc[invoice?.customerID]) {
        acc[invoice.customerID] += invoice.total;
      } else {
        acc[invoice.customerID] = invoice.total;
      }
      return acc;
    }, {} as { [key: string]: number });

    let customerIds;
    let topCustomers;

    customerIds = Object.keys(customerInvoices || {});

    if (!customerInvoices) return [];

    // Filter only regular customers
    customerIds = customerIds.filter(
      (customerId) =>
        customers?.find((customer) => customer._id === customerId)?.isRegular
    );

    topCustomers = customerIds
      .map((customerId) => ({
        customerId,
        total: customerInvoices[customerId],
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    return topCustomers;
  };

  useEffect(() => {
    if (!invoices || !customers) return;
    setTopCustomers(findTopCustomers());
  }, [invoices, customers]);

  return (
    <div className="bg-black rounded-2xl p-5 my-6">
      <span className="text-white text-lg">Customer Insight</span>
      {/* Stats */}
      <div className="grid mt-4 grid-cols-1 w-full md:grid-cols-3 md:grid-rows-1 gap-8">
        {/* Total customers */}
        <div className="bg-[#FE7B50] rounded-2xl p-5 flex flex-col items-center justify-center">
          <span className="text-white text-3xl font-semibold">
            {customers?.length}
          </span>
          <span className="text-white text-sm">Total</span>
        </div>
        {/* Regular Customer this month */}
        <div className="bg-[#FE9D50] rounded-2xl p-5 flex flex-col items-center justify-center">
          <span className="text-white text-3xl font-semibold">
            {customers?.filter((customer) => customer.isRegular).length}
          </span>
          <span className="text-white text-sm">Regular</span>
        </div>
        {/* New Regular Customer added this month */}
        <div className="bg-[#ACA081] rounded-2xl p-5 flex flex-col items-center justify-center">
          <span className="text-white text-3xl font-semibold">
            +
            {
              customers?.filter(
                (customer) =>
                  customer.isRegular &&
                  new Date(customer.createdAt).getMonth() === currentMonth
              ).length
            }
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
                Area
              </th>
              <th scope="col" className="px-6 py-3">
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {topCustomers.map((customer, index) => {
              const customerData = customers?.find(
                (c) => c._id === customer.customerId
              );
              return (
                <tr key={customer.customerId}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-300">{index + 1}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-300">
                      {customerData?.name}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-300">
                      {customerData?.address?.text}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-300">
                      {customer.total}
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
