import { Order } from "@/types/types";
import React, { FC, useState } from "react";
import OrderCard from "./Card";

const Orders: FC<{ orders: Order[] | null }> = ({ orders }) => {
  const [sort, setSort] = useState<"today" | "all" | "future">("today");

  function sortOrdersByDeliveryDateDescending(orders: Order[]): Order[] {
    return orders.sort((a, b) => {
      if (!a.deliveryDate && !b.deliveryDate) return 0; // Both are null
      if (!a.deliveryDate) return 1; // `a` comes after `b`
      if (!b.deliveryDate) return -1; // `a` comes before `b`
      return (
        new Date(b.deliveryDate).getTime() - new Date(a.deliveryDate).getTime()
      );
    });
  }

  return (
    <div className="flex flex-col p-4 bg-white border shadow-md rounded-3xl w-full">
      <span className="text-2xl font-medium">Orders</span>
      <span className="text-sm text-gray-400 mt-2">
        Showing orders by priority of the delivery
      </span>

      {/* Sort Buttons */}
      <div
        className="grid max-w-xs grid-cols-3 gap-1 p-1 mx-auto my-2 mt-8 bg-gray-100 rounded-lg"
        role="group"
      >
        <button
          onClick={() => setSort("today")}
          type="button"
          className="px-5 py-1.5 text-xs font-medium text-gray-900 hover:bg-gray-200 rounded-lg"
        >
          Today
        </button>
        <button
          onClick={() => setSort("all")}
          type="button"
          className="px-5 py-1.5 text-xs font-medium text-white bg-gray-900 rounded-lg"
        >
          All
        </button>
        <button
          onClick={() => setSort("future")}
          type="button"
          className="px-5 py-1.5 text-xs font-medium text-gray-900 hover:bg-gray-200 rounded-lg"
        >
          Future
        </button>
      </div>
      {/* Body */}
      <div className="flex justify-center w-full h-full border border-gray-200 mt-5 rounded-lg bg-gray-50">
        {orders ? (
          <div className="flex flex-col space-y-2.5 p-2.5 w-full overflow-y-scroll">
            {sortOrdersByDeliveryDateDescending(orders).map((order) => (
              <OrderCard order={order} key={order._id} />
            ))}
          </div>
        ) : (
          <span className="mt-20 text-lg">No Orders</span>
        )}
      </div>
    </div>
  );
};

export default Orders;
