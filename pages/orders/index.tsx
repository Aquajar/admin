import Wrapper from "@/components/Wrapper";
import { customModalStyles } from "@/lib/constants";
import useAxiosInstance from "@/lib/hooks/useAxiosInstance";
import { Customer, Item, Order, Product } from "@/types/types";
import axios from "axios";
import { getCookie } from "cookies-next";
import { toZonedTime, format } from "date-fns-tz";
import { useSession } from "next-auth/react";
import React, { useEffect, useState } from "react";
import ReactDatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import toast from "react-hot-toast";
import { GoKebabHorizontal, GoPlus } from "react-icons/go";
import { MdOutlineDeleteForever } from "react-icons/md";
import { RiAddCircleLine } from "react-icons/ri";
import Modal from "react-modal";
import { Menu, MenuItem, MenuButton } from "@szhsin/react-menu";
import "@szhsin/react-menu/dist/index.css";
import "@szhsin/react-menu/dist/transitions/slide.css";
import { useRouter } from "next/router";

Modal.setAppElement("#__next");

const Orders = () => {
  const [sort, setSort] = useState<"today" | "all" | "future">("today");
  const [orders, setOrders] = useState<Order[] | null | undefined>(null);
  const [sortedOrders, setSortedOrders] = useState<Order[]>([]);
  const [modalIsOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [products, setProducts] = useState<Product[] | undefined>(undefined);
  const [customer, setCustomer] = useState<undefined | null | Customer>(
    undefined
  );
  const [customerID, setCustomerID] = useState<string>("");
  const [isLoading, setIsloading] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [deliveryDate, setDeliveryDate] = useState(new Date());
  // Fast entry: a name or 4-digit ID, plus a jar count.
  const [orderInput, setOrderInput] = useState("");
  const [jarQty, setJarQty] = useState(1);

  const closeModal = () => {
    setIsOpen(false);
    setCustomer(undefined);
    setCustomerID("");
    setPhoneNumber("");
    setItems([]);
    setOrderInput("");
    setJarQty(1);
  };

  // Create a new order — quick: type a name OR a 4-digit ID (resolved to a
  // customer) and a jar count.
  const handleCreateOrder = async () => {
    const input = orderInput.trim();
    if (!input) {
      toast.error("Type a customer name or 4-digit ID");
      return;
    }
    setIsloading(true);

    try {
      let cust: { name?: string; phone?: string; address?: string } = { name: input };
      if (/^\d{4}$/.test(input)) {
        try {
          const { data } = await axiosInstance.get(
            `${process.env.NEXT_PUBLIC_API_URL}/user/find-by-userid/${input}`
          );
          const c = data?.user;
          if (c) {
            cust = {
              name: c.name,
              phone: c.phone,
              address: [c.address?.landmark, c.address?.text].filter(Boolean).join(", "),
            };
          }
        } catch {
          /* not found — use the input as a free-text name */
        }
      }

      const kolkataDate = toZonedTime(deliveryDate, "Asia/Kolkata");
      const formatedDeliveryDate = format(kolkataDate, "yyyy-MM-dd'T'HH:mm:ssXXX", {
        timeZone: "Asia/Kolkata",
      });

      const { data } = await axiosInstance.post(
        process.env.NEXT_PUBLIC_API_URL! + "/order/create",
        {
          customer: cust,
          status: "pending",
          note: `Jar : ${jarQty}`,
          deliveryDate: formatedDeliveryDate,
          orderDate: new Date().toUTCString(),
        }
      );

      if (data.status === "success") {
        toast.success("Order created!");
        setOrders((prev) => (prev ? [...prev, data.order] : prev));
        closeModal();
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to create order!");
    } finally {
      setIsloading(false);
    }
  };

  // Change the order status as delivered
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

  const handleOnClickDeleteOrder = async (orderID: string) => {
    const URL = process.env.NEXT_PUBLIC_API_URL;

    try {
      const { data } = await axiosInstance.delete(
        `${URL}/order/delete/${orderID}`
      );

      if (data.status === "success") {
        toast.success("Order deleted successfully!");
        // Update State of Orders
        const updatedOrders = orders?.filter((order) => order._id !== orderID);
        setOrders(updatedOrders);
      } else {
        toast.error("Failed to delete order!");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete order!");
    }
  };

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

  // Auto Fetch customer details by phone number/customer ID
  useEffect(() => {
    if (customer === undefined && phoneNumber.length === 10) {
      setIsloading(true);
      const URL =
        process.env.NEXT_PUBLIC_API_URL + "/user/find-by-phone/" + phoneNumber;
      axios
        .get(URL)
        .then((res) => {
          const customer: Customer = res.data.user;
          setCustomer(customer);
          customer?.userID && setCustomerID(customer?.userID?.toString() || "");
          setIsloading(false);
        })
        .catch((err) => {
          console.log(err);
          setCustomer(null);
          setIsloading(false);
        });
    } else if (customer === undefined && customerID.length === 4) {
      setIsloading(true);
      const URL =
        process.env.NEXT_PUBLIC_API_URL + "/user/find-by-userid/" + customerID;
      axiosInstance
        .get(URL)
        .then((res) => {
          const customer: Customer = res.data.user;
          setCustomer(customer);
          customer.phone && setPhoneNumber(customer.phone);
          setIsloading(false);
        })
        .catch((err) => {
          console.log(err);
          setCustomer(null);
          setIsloading(false);
        });
    }
  }, [phoneNumber, customer, customerID]);

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
    <Wrapper>
      {/*
       * Create order model
       */}
      <Modal
        style={customModalStyles}
        isOpen={modalIsOpen}
        onRequestClose={closeModal}
        contentLabel="Delete Invoice Modal"
      >
        <div className="flex flex-col relative md:w-[50vh]">
          <div className="flex justify-between items-center py-2 w-full">
            <button
              onClick={closeModal}
              className="text-gray-700 hover:text-gray-900 absolute text-sm -top-4 -right-2"
            >
              Close
            </button>

            <form className="w-full" onSubmit={(e) => e.preventDefault()}>
              <div className="mb-6">
                <label className="block mb-2 text-sm font-medium text-gray-900">
                  Customer (name or 4-digit ID)
                </label>
                <input
                  value={orderInput}
                  onChange={(e) => setOrderInput(e.target.value)}
                  autoFocus
                  type="text"
                  placeholder="e.g. Ramesh   or   1024"
                  className="font-medium bg-gray-50 border border-gray-300 text-gray-900 rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                />
              </div>
              <div className="mb-6">
                <label className="block mb-2 text-sm font-medium text-gray-900">
                  Jars (refill)
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setJarQty((q) => Math.max(1, q - 1))}
                    className="h-9 w-9 rounded-full bg-gray-100 text-lg font-bold text-gray-700 hover:bg-gray-200"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min={1}
                    value={jarQty}
                    onChange={(e) => setJarQty(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-20 text-center font-medium bg-gray-50 border border-gray-300 text-gray-900 rounded-lg p-2.5"
                  />
                  <button
                    type="button"
                    onClick={() => setJarQty((q) => q + 1)}
                    className="h-9 w-9 rounded-full bg-blue-600 text-lg font-bold text-white hover:bg-blue-700"
                  >
                    +
                  </button>
                </div>
              </div>
              <div className="mb-6 flex flex-col">
                <label className="text-md font-medium text-gray-700">
                  Delivery Date
                </label>
                <ReactDatePicker
                  showTimeSelect
                  dateFormat={"dd/MM/yyyy"}
                  className="border rounded-md cursor-pointer px-3 py-2 mt-1.5 bg-gray-50 w-full"
                  selected={deliveryDate}
                  onChange={(date) => {
                    if (!date) return;
                    setDeliveryDate(date);
                  }}
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                onClick={handleCreateOrder}
                className="text-white disabled:bg-gray-300 disabled:opacity-70 bg-blue-700 hover:bg-blue-800 font-medium rounded-lg text-sm w-full sm:w-auto px-5 py-2.5 text-center float-right"
              >
                Create
              </button>
            </form>
          </div>
        </div>
      </Modal>
      <div className="flex w-full">
        <div></div>
        <div className="flex flex-col w-full">
          {/*
           * Navigation
           */}
          <div className="flex justify-between flex-col-reverse md:flex-row">
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
            <div className="flex items-center justify-end mt-2">
              <button
                onClick={() => setIsOpen(true)}
                className="flex px-3 py-1.5 rounded-lg bg-blue-600 text-white items-center"
              >
                <GoPlus className="" size={22} />
                Create Order
              </button>
            </div>
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
                    <div className="flex items-center">Delivery Time</div>
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
                          #{order._id.slice(0, 8)}
                        </th>
                        <td className="px-6 py-6 font-medium">
                          {order.customer.name || order.customer.phone}
                        </td>
                        <td className="px-6 w-40 py-6 font-medium">
                          {order.note
                            ?.split("\n")
                            .map((s) => s.trim())
                            .filter(Boolean)
                            .map((item, i) => (
                              <span
                                key={i}
                                className="bg-gray-200 text-gray-800 text-sm font-medium inline-flex items-center px-2.5 py-0.5 rounded-md me-2 mb-1"
                              >
                                {item}
                              </span>
                            ))}
                        </td>
                        <td className="px-6 py-6">
                          {new Date(order.orderDate).toDateString()}
                        </td>
                        <td className="px-6 py-6">
                          {order.deliveryDate &&
                            new Date(order.deliveryDate).toDateString()}
                        </td>
                        <td className="px-6 py-6 font-medium">
                          {order.deliveryDate &&
                            new Date(order.deliveryDate).toLocaleTimeString()}
                        </td>
                        <td className="px-6 py-6 text-right">
                          <div className="flex items-center capitalize">
                            <div
                              className={`h-2.5 w-2.5 mr-2 rounded-full ${
                                order.status === "delivered"
                                  ? "bg-green-500"
                                  : "bg-yellow-500"
                              }`}
                            />
                            {order.status}
                          </div>
                          {order.status === "delivered" && order.deliveredBy && (
                            <div className="mt-1 text-xs text-gray-400">
                              by {order.deliveredBy}
                            </div>
                          )}
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
                                ? "bg-gray-300"
                                : "bg-white hover:bg-gray-100 hover:text-blue-700"
                            } py-1.5 px-5 me-2 text-sm font-medium text-gray-900 rounded-lg border border-gray-200 `}
                          >
                            Delivered
                          </button>

                          <Menu
                            align="start"
                            position="anchor"
                            direction="bottom"
                            menuButton={
                              <MenuButton className="flex items-center">
                                <GoKebabHorizontal
                                  className="rotate-90"
                                  size={18}
                                />
                              </MenuButton>
                            }
                            transition
                          >
                            <MenuItem
                              onClick={() =>
                                handleOnClickDeleteOrder(order._id)
                              }
                              className="text-sm"
                            >
                              Delete
                            </MenuItem>
                            <MenuItem
                              onClick={() =>
                                router.push(
                                  `/customers/${order.customer.userID}?tab=invoices`
                                )
                              }
                              className="text-sm"
                            >
                              View Customer Profile
                            </MenuItem>
                          </Menu>
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
