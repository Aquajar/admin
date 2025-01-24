import Wrapper from "@/components/Wrapper";
import { SidebarItems } from "@/lib/constants";
import useAxiosInstance from "@/lib/hooks/useAxiosInstance";
import { Order, SideBarItem } from "@/types/types";
import { useSession } from "next-auth/react";
import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { GoKebabHorizontal } from "react-icons/go";

const breadCrumbData: SideBarItem[] = [
  {
    name: "Orders",
    href: "/orders",
    icon: SidebarItems.filter((item) => item.name === "Orders")[0].icon,
  },
];

const Orders = () => {
  const [sort, setSort] = useState<"today" | "all" | "future">("today");
  const [orders, setOrders] = useState<Order[] | null | undefined>(null);
  const [sortedOrders, setSortedOrders] = useState<Order[]>([]);

  const { data: session } = useSession();

  const axiosInstance = useAxiosInstance(session);

  const fetchOrders = async () => {
    const URL = process.env.NEXT_PUBLIC_API_URL;
    const { data } = await axiosInstance.get(`${URL}/order/all`);
    setOrders(data.orders);
  };

  const handleOnClickDelivered = async (orderID: string) => {
    const orderStatus: "delivered" | "pending" = "delivered";

    const URL = process.env.NEXT_PUBLIC_API_URL;
    const { data } = await axiosInstance.put(`${URL}/order/delivered`, {
      id: orderID,
    });

    if (data.status === "success") {
      toast.success("Order updated successfully!");
      // Update State of Order
      const updatedOrders = orders?.map((order) =>
        order._id === orderID ? { ...order, status: orderStatus } : order
      );
      setOrders(updatedOrders);
    } else {
      toast.error("Failed to update order!");
    }
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

  return (
    <Wrapper breadcrumb={breadCrumbData}>
      <div className="flex w-full">
        <div></div>
        <div className="flex flex-col w-full">
          {/*
           * Tabs
           */}
          <div
            className="grid grid-cols-3 gap-1 p-1 my-2 mt-5 w-full md:w-fit bg-gray-200 rounded-lg"
            role="group"
          >
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
          {/*
           * Table
           */}
          <div className="relative overflow-x-auto sm:rounded-lg mt-6 w-full">
            <table className="w-full text-sm text-left  text-gray-900">
              <thead className="text-xs text-gray-500 uppercase bg-gray-100">
                <tr>
                  <th scope="col" className="px-6 py-3">
                    Order ID
                  </th>
                  <th scope="col" className="px-6 py-3">
                    <div className="flex items-center">Customer</div>
                  </th>
                  <th scope="col" className="px-6 py-3">
                    <div className="flex items-center">Products</div>
                  </th>
                  <th scope="col" className="px-6 py-3">
                    <div className="flex items-center">
                      Order Date
                      <a href="#">
                        <svg
                          className="w-3 h-3 ms-1.5"
                          aria-hidden="true"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M8.574 11.024h6.852a2.075 2.075 0 0 0 1.847-1.086 1.9 1.9 0 0 0-.11-1.986L13.736 2.9a2.122 2.122 0 0 0-3.472 0L6.837 7.952a1.9 1.9 0 0 0-.11 1.986 2.074 2.074 0 0 0 1.847 1.086Zm6.852 1.952H8.574a2.072 2.072 0 0 0-1.847 1.087 1.9 1.9 0 0 0 .11 1.985l3.426 5.05a2.123 2.123 0 0 0 3.472 0l3.427-5.05a1.9 1.9 0 0 0 .11-1.985 2.074 2.074 0 0 0-1.846-1.087Z" />
                        </svg>
                      </a>
                    </div>
                  </th>
                  <th scope="col" className="px-6 py-3">
                    <div className="flex items-center">
                      Delivery Date
                      <a href="#">
                        <svg
                          className="w-3 h-3 ms-1.5"
                          aria-hidden="true"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M8.574 11.024h6.852a2.075 2.075 0 0 0 1.847-1.086 1.9 1.9 0 0 0-.11-1.986L13.736 2.9a2.122 2.122 0 0 0-3.472 0L6.837 7.952a1.9 1.9 0 0 0-.11 1.986 2.074 2.074 0 0 0 1.847 1.086Zm6.852 1.952H8.574a2.072 2.072 0 0 0-1.847 1.087 1.9 1.9 0 0 0 .11 1.985l3.426 5.05a2.123 2.123 0 0 0 3.472 0l3.427-5.05a1.9 1.9 0 0 0 .11-1.985 2.074 2.074 0 0 0-1.846-1.087Z" />
                        </svg>
                      </a>
                    </div>
                  </th>
                  <th scope="col" className="px-6 py-3">
                    <div className="flex items-center">Status</div>
                  </th>
                  <th scope="col" className="px-6 py-3">
                    <div className="flex items-center">Action</div>
                  </th>
                </tr>
              </thead>
              <tbody className="">
                {sortedOrders &&
                  sortedOrders?.map((order) => {
                    return (
                      <tr
                        key={order._id}
                        className="bg-white border-b border-gray-200"
                      >
                        <th scope="row" className="px-6 py-6 font-normal">
                          #{order._id}
                        </th>
                        <td className="px-6 py-6 font-medium">
                          {order.customer.name || order.customer.phone}
                        </td>
                        <td className="px-6 py-6 font-medium">{order.note}</td>
                        <td className="px-6 py-6">
                          {new Date(order.orderDate).toDateString()}
                        </td>
                        <td className="px-6 py-6">
                          {order.deliveryDate &&
                            new Date(order.deliveryDate).toDateString()}
                        </td>
                        <td className="px-6 py-6 text-right">
                          <div className="flex items-center capitalize">
                            {" "}
                            <div
                              className={`h-2.5 w-2.5 mr-2 rounded-full ${
                                order.status === "delivered"
                                  ? "bg-green-500"
                                  : "bg-yellow-500"
                              }`}
                            />
                            {order.status}
                          </div>
                        </td>
                        <td className="px-4 py-6 text-right flex items-center">
                          <button
                            onClick={() =>
                              order.status === "delivered"
                                ? null
                                : handleOnClickDelivered(order._id)
                            }
                            disabled={order.status === "delivered"}
                            className={`border ${
                              order.status === "delivered"
                                ? "bg-gray-300 text-white"
                                : "hover:bg-green-400 text-blue-600 hover:text-black"
                            } border-gray-200 px-3 py-1.5 rounded-md font-normal`}
                          >
                            Delivered
                          </button>
                          <button className="ml-2">
                            <GoKebabHorizontal
                              className="rotate-90"
                              size={18}
                            />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
            {sortedOrders.length === 0 && (
              <div className="mt-10 text-gray-400 text-center">
                <span className="">
                  No orders found. Please check your filters and try again.
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Wrapper>
  );
};

export default Orders;
