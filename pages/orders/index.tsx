import Wrapper from "@/components/Wrapper";
import { customModalStyles, SidebarItems } from "@/lib/constants";
import useAxiosInstance from "@/lib/hooks/useAxiosInstance";
import { Customer, Item, Order, Product, SideBarItem } from "@/types/types";
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

  const closeModal = () => {
    setIsOpen(false);
    setCustomer(undefined);
    setCustomerID("");
    setPhoneNumber("");
    setItems([]);
  };

  // Create a new order
  const handleCreateOrder = async () => {
    setIsloading(true);

    let URL = process.env.NEXT_PUBLIC_API_URL! + "/order/create";
    let note = "";

    items.map((item) => {
      let n = item.name + " : " + item.quantity;
      note += n + "\n";
    });

    const asiaKolkataTimezone = "Asia/Kolkata";

    // Convert the date to the Asia/Kolkata timezone
    const kolkataDate = toZonedTime(deliveryDate, asiaKolkataTimezone);

    // Format the date to ISO string with the Asia/Kolkata timezone
    const formatedDeliveryDate = format(
      kolkataDate,
      "yyyy-MM-dd'T'HH:mm:ssXXX",
      {
        timeZone: asiaKolkataTimezone,
      }
    );

    const payload = {
      customer: {
        name: customer?.name,
        phone: customer?.phone,
        address: `${customer?.address?.landmark}, ${customer?.address?.text}`,
      },
      status: "pending",
      note: note,
      deliveryDate: formatedDeliveryDate,
      orderDate: new Date().toUTCString(),
    };

    try {
      const { data } = await axiosInstance.post(URL, payload);

      if (data.status === "success") {
        toast.success("Order created successfully!");
        setOrders((prev) => {
          if (!prev) return;
          return [...prev, data.order];
        });
        setIsloading(false);
        closeModal();
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to create order!");
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
    <Wrapper breadcrumb={breadCrumbData}>
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
              <div className="mb-8">
                <label
                  htmlFor="email"
                  className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
                >
                  Customer ID
                </label>
                <input
                  value={customerID}
                  onChange={(e) => {
                    setCustomerID(e.target.value);
                    setCustomer(undefined);
                    setPhoneNumber("");
                  }}
                  type="text"
                  id="customerID"
                  className="font-medium bg-gray-50 border border-gray-300 text-gray-900 rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                  placeholder=""
                />
                {customer && (
                  <span className="text-sm text-green-600 font-medium mt-1 float-right">
                    {customer.name}
                  </span>
                )}
              </div>
              <div className="mb-8">
                <label
                  htmlFor="phoneNumber"
                  className="block mb-2 text-sm font-medium text-gray-900"
                >
                  Phone Number
                </label>
                <input
                  value={phoneNumber}
                  onChange={(e) => {
                    setPhoneNumber(e.target.value);
                    setCustomer(undefined);
                    setCustomerID("");
                  }}
                  type="text"
                  id="phoneNumber"
                  className="bg-gray-50 font-medium border border-gray-300 text-gray-900 rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                />
              </div>
              <div className="flex items-start flex-col mb-8">
                {/* Items */}
                <div className="relative overflow-x-auto shadow-sm rounded-lg w-full">
                  <table className="w-full text-justify">
                    <thead className="bg-slate-200">
                      <tr className="">
                        {/* Sl no. */}
                        <th className="text-md font-medium py-1.5 px-4 text-gray-700">
                          Sl No.
                        </th>
                        <th className="text-md font-medium py-1.5 px-4 text-gray-700">
                          Item Name
                        </th>
                        <th className="text-md font-medium py-1.5 px-4 text-gray-700">
                          Qty
                        </th>
                        <th className="text-md font-medium py-1.5 px-2 text-gray-700">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-slate-100">
                      {items.map((item, index) => {
                        return (
                          <tr key={index}>
                            {/* Sl no. */}
                            <td className="text-md font-medium text-gray-700 px-4 py-2">
                              {index + 1}.
                            </td>
                            {/* Item Name */}
                            <td className="text-md font-medium text-gray-700 px-2 py-2">
                              <select
                                onChange={(e) => {
                                  const newItems = [...items];
                                  newItems[index].name = e.target.value;

                                  const product = products?.find(
                                    (product: Product) =>
                                      product.name === e.target.value
                                  );

                                  if (product === undefined) return;

                                  newItems[index].price =
                                    parseInt(
                                      product?.price.delivery as string
                                    ) || 0;
                                  newItems[index].total =
                                    newItems[index].quantity *
                                    newItems[index].price;
                                  setItems(newItems);
                                }}
                                className="border text-md rounded-md capitalize px-2 w-36 md:pr-14 md:pl-4 py-2 mt-1 bg-white"
                              >
                                {products &&
                                  products?.map((product: Product) => {
                                    return (
                                      <option
                                        key={product._id}
                                        value={product.name}
                                      >
                                        {product.name}
                                      </option>
                                    );
                                  })}
                              </select>
                            </td>
                            {/* Quantity */}
                            <td className="text-md font-medium text-gray-700 px-4 py-2">
                              <input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => {
                                  const newItems = [...items];
                                  newItems[index].quantity = parseInt(
                                    e.target.value
                                  );
                                  newItems[index].total =
                                    parseInt(e.target.value) *
                                    (customer?.profileRate
                                      ? customer?.profileRate
                                      : newItems[index].price);
                                  setItems(newItems);
                                }}
                                className="border w-14 text-center text-md rounded-md px-1 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-gray-500 bg-white"
                              />
                            </td>
                            {/* Delete Button */}
                            <td className="text-md font-medium text-gray-700 px-4 py-2">
                              <button
                                onClick={() => {
                                  const newItems = [...items];
                                  newItems.splice(index, 1);
                                  setItems(newItems);
                                }}
                                className="text-[#ED5E68]"
                              >
                                <MdOutlineDeleteForever className="w-6 h-6" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Add Item */}
                <div className="flex justify-end mt-4">
                  <button
                    onClick={() => {
                      setItems([
                        ...items,
                        {
                          name: products ? products[0].name : "jar",
                          quantity: 0,
                          price: products
                            ? parseInt(products[0].price.delivery || "0")
                            : 0,
                          total: 0,
                        },
                      ]);
                    }}
                    className="py-2 flex items-center justify-start"
                  >
                    <RiAddCircleLine className="w-6 h-6 mx-2" />
                    Add Item
                  </button>
                </div>
              </div>
              <div className="mb-8 flex flex-col">
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
                          {order.note?.split("/n").map((item, i) => (
                            <span
                              key={i}
                              className="bg-gray-200 text-gray-800 text-sm font-medium inline-flex items-center px-2.5 py-0.5 rounded-md me-2"
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
