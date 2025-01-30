import { Order, Product } from "@/types/types";
import React, { FC, useEffect, useState } from "react";
import OrderCard from "./Card";
import { useSession } from "next-auth/react";
import useAxiosInstance from "@/lib/hooks/useAxiosInstance";
import { useRouter } from "next/router";
import { getCookie } from "cookies-next";

const Orders: FC = () => {
  const [sort, setSort] = useState<"today" | "all" | "future">("today");
  const [orders, setOrders] = useState<Order[] | null | undefined>(null);
  const [sortedOrders, setSortedOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[] | undefined>(undefined);

  const { data: session } = useSession();

  const axiosInstance = useAxiosInstance(session);

  const fetchOrders = async () => {
    const URL = process.env.NEXT_PUBLIC_API_URL;
    const { data } = await axiosInstance.get(`${URL}/order/all`);
    setOrders(data.orders);
  };

  function filterAndSortOrders(
    orders: Order[],
    filter: "today" | "all" | "future"
  ): Order[] {
    const today = new Date().setHours(0, 0, 0, 0); // Start of today's date

    return orders
      .filter((order) => {
        const deliveryDate =
          order.deliveryDate &&
          new Date(order.deliveryDate).setHours(0, 0, 0, 0);

        if (filter === "today") {
          return deliveryDate === today;
        }
        if (filter === "future") {
          return deliveryDate && deliveryDate > today;
        }
        return true; // For "all"
      })
      .sort(
        (a, b) =>
          new Date(a.deliveryDate!).getTime() -
          new Date(b.deliveryDate!).getTime()
      );
  }

  useEffect(() => {
    if (session && !orders) fetchOrders();
  }, [session, orders]);

  useEffect(() => {
    if (orders) {
      let n = filterAndSortOrders(orders, sort);
      setSortedOrders(n);
    }
  }, [sort, orders]);

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

  // Fetch products from cookies
  useEffect(() => {
    if (products === undefined) {
      let rawData = getCookie("products");

      let parsedData = rawData ? JSON.parse(rawData) : [];

      setProducts(parsedData);
    }
  }, [products]);

  const router = useRouter();

  return (
    <div className="flex flex-col p-4 bg-white border shadow-md rounded-3xl w-full">
      <span className="text-2xl font-medium">Orders</span>
      <span className="text-sm text-gray-400 mt-2">
        Showing orders by priority of the delivery
      </span>

      {/* Sort Buttons */}
      <div className="flex justify-center">
        <div
          className="grid grid-cols-3 gap-1 p-1 my-2 mt-5 w-full md:w-fit bg-gray-200 rounded-lg"
          role="group"
        >
          <button
            onClick={() => setSort("all")}
            type="button"
            className={`px-5 py-1.5 text-sm font-medium rounded-lg ${
              sort === "all"
                ? "text-white bg-gray-900"
                : "text-gray-900 hover:bg-gray-100"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setSort("today")}
            type="button"
            className={`px-5 py-1.5 text-sm font-medium rounded-lg ${
              sort === "today"
                ? "text-white bg-gray-900"
                : "text-gray-900 hover:bg-gray-100"
            }`}
          >
            Today
          </button>
          <button
            onClick={() => setSort("future")}
            type="button"
            className={`px-5 py-1.5 text-sm font-medium rounded-lg ${
              sort === "future"
                ? "text-white bg-gray-900"
                : "text-gray-900 hover:bg-gray-100"
            }`}
          >
            Future
          </button>
        </div>
      </div>
      {/* Body */}
      <div className="flex justify-center w-full h-full border border-gray-200 mt-5 rounded-lg bg-gray-50">
        {orders ? (
          <div className="flex flex-col space-y-2.5 p-2.5 w-full overflow-y-scroll">
            {sortedOrders.map((order) => (
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
