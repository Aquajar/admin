import { Order } from "@/types/types";
import React, { FC } from "react";
import { FiFlag } from "react-icons/fi";

const OrderCard: FC<{ order: Order }> = ({ order }) => {
  return (
    <div className="shadow relative rounded-xl border p-2.5 flex flex-col w-full bg-white">
      <div className="space-x-2">
        {order.note?.split("/n").map((item, index) => (
          <span
            key={index}
            className="px-2 py-0.5 rounded-lg bg-blue-100 font-medium"
          >
            {item}
          </span>
        ))}
      </div>

      <span className="text-sm mt-2 text-gray-500">
        <span className="font-medium">
          {order.customer.name !== "null"
            ? order.customer.name
            : order.customer.phone}
          , {order.customer.address}
        </span>
      </span>

      <span className="text-sm text-gray-900 flex items-center mt-4 border-t pt-2">
        <FiFlag className="mr-2" />
        {new Date(order.deliveryDate!).toLocaleString()}
      </span>
      <div className="absolute right-2.5 bottom-2.5">
        <div
          className={`rounded-full w-2.5 h-2.5 ${
            order.status === "pending"
              ? new Date() < new Date(order.deliveryDate!)
                ? "bg-yellow-400"
                : "bg-red-500"
              : "bg-green-500"
          }`}
        />
      </div>
    </div>
  );
};

export default OrderCard;
