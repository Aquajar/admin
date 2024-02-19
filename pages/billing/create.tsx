import Wrapper from "@/components/Wrapper";
import React, { useEffect, useState } from "react";
import { RiAddCircleLine, RiLoader5Line } from "react-icons/ri";
import CurrencyFormat from "react-currency-format";
import { MdOutlineDeleteForever } from "react-icons/md";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import Summary from "@/components/billing/Summary";
import DeliveryDetails from "@/components/billing/DeliveryDetails";
import axios from "axios";
import { randomString } from "@/lib/helpers";
import toast from "react-hot-toast";
import { Customer, Item, Product, RecentCard } from "@/types/types";
import { getCookie, setCookie } from "cookies-next";
import Card from "@/components/Recents/Card";
import { useSession } from "next-auth/react";
import useRefreshTokenRotation from "@/lib/hooks/useRefreshToken";

interface ItemProps {
  id: string;
  quantity: number;
}

const Invoice = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [orderType, setOrderType] = useState("retail");
  const [startDate, setStartDate] = useState(new Date());
  const [invoiceId, setInvoiceId] = useState<string | null>(null);
  const [subTotal, setSubTotal] = useState<number>(0);
  const [tax, setTax] = useState<number>(0);
  const [total, setTotal] = useState<number>(0);
  const [address, setAddress] = useState<string>("");
  const [landmark, setLandmark] = useState<string>("");
  const [vehicle, setVehicle] = useState<string>("WB73E3666");
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [phoneNumber, setPhoneNumber] = useState<string>("");
  const [billTo, setBillTo] = useState<string>("");
  const [customer, setCustomer] = useState<undefined | null | Customer>(
    undefined
  );
  const [isLoading, setIsloading] = useState(false);
  const [recentInvoices, setRecentInvoices] = useState<
    RecentCard[] | [] | null
  >(null);
  const [products, setProducts] = useState<Product[] | undefined>(undefined);

  const { data: session } = useSession();

  // Create an axios instance with the user's access token
  const axiosInstance = axios.create({
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session?.user.accessToken}`,
    },
  });

  useRefreshTokenRotation(axiosInstance);

  // Assign invoice Id
  useEffect(() => {
    if (!invoiceId) setInvoiceId(randomString(8).toUpperCase());
  }, [invoiceId]);

  // Calculate total, subtotal and tax
  useEffect(() => {
    let total = 0;
    let subTotal = 0;

    items.forEach((item) => {
      if (isNaN(item.total)) item.total = 0;
      total += item.total;
    });

    const tax = total - total * (100 / (100 + 12));
    subTotal = total - tax;

    setSubTotal(parseFloat(subTotal.toFixed(2)));
    setTax(parseFloat(tax.toFixed(2)));
    setTotal(parseFloat(total.toFixed(2)));
  }, [items]);

  // Fetch recent invoices from cookies
  useEffect(() => {
    if (recentInvoices === null) {
      let rawData = getCookie("recentInvoice");

      let parsedDate = rawData ? JSON.parse(rawData) : [];

      parsedDate = parsedDate.sort(
        (a: RecentCard, b: RecentCard) =>
          new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      setRecentInvoices(parsedDate);
    }
  }, [recentInvoices]);

  // Fetch customer details when phone number is entered
  useEffect(() => {
    if (customer === undefined && phoneNumber.length === 10) {
      console.log("Fetching user details");
      setIsloading(true);
      const URL =
        process.env.NEXT_PUBLIC_API_URL + "/user/find-by-phone/" + phoneNumber;
      axios
        .get(URL)
        .then((res) => {
          console.log(res.data);
          const customer: Customer = res.data.user;
          setCustomer(customer);
          customer?.name && setBillTo(customer.name);
          customer.address?.text && setAddress(customer.address.text);
          customer.address?.landmark && setLandmark(customer.address.landmark);
          setIsloading(false);
        })
        .catch((err) => {
          console.log(err);
          setCustomer(null);
          setIsloading(false);
        });
    }
  }, [phoneNumber, customer]);

  // Handle order type change
  const handleOrderType = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setOrderType(e.target.value);

    // reset jar price
    const newItems = [...items];
    newItems.forEach((item) => {
      const product = products?.find(
        (product: Product) => product.name === item.name
      );

      if (product === undefined) return;

      if (e.target.value === "retail") {
        item.price = parseInt(product?.price.retail) || 0;
      } else if (e.target.value === "delivery") {
        item.price = parseInt(product?.price.delivery) || 0;
      }
      item.total = item.quantity * item.price;
    });

    setItems(newItems);
  };

  // Generate Bill
  const handleGenerateBill = async () => {
    if (phoneNumber.length !== 10) {
      return toast.error("Please enter a valid phone number");
    } else if (billTo === "") {
      return toast.error("Please enter the name of the customer");
    } else if (total === 0) {
      return toast.error("Please add items to the invoice");
    } else if (orderType === "delivery" && address === "" && landmark === "") {
      return toast.error("Please enter the address");
    } else if (paymentMethod === "") {
      return toast.error("Please select a payment method");
    }

    let newProducts: ItemProps[] = [];
    let invoices: string[] = [];

    items.forEach((item) => {
      let product = products?.find(
        (product: Product) => product.name === item.name
      );

      const payload: ItemProps = {
        id: product?._id as string,
        quantity: item.quantity,
      };

      newProducts.push(payload);
    });

    customer?.invoices &&
      customer?.invoices.map((invoice) => invoices.push(invoice));
    invoices.push(invoiceId as string);

    // set due date to 28th day of the month
    const dueDate = new Date();
    dueDate.setDate(28);

    if (dueDate.getDate() < new Date().getDate()) {
      dueDate.setMonth(dueDate.getMonth() + 1);
    }

    if (paymentMethod !== "due") {
      dueDate.setDate(new Date().getDate());
    }

    // create user object
    let user = {
      name: billTo,
      phone: phoneNumber,
      address: {
        text: address ? address : null,
        landmark: landmark ? landmark : null,
      },
      invoices: invoices,
    };

    // create payload
    let payload = {
      user: user,
      invoiceID: invoiceId,
      invoiceDate: +startDate,
      customerID: customer?._id,
      vehicleID: orderType === "delivery" ? vehicle : null,
      total: total,
      products: newProducts,
      address: orderType === "delivery" ? address : null,
      landmark: orderType === "delivery" ? landmark : null,
      dueDate: +dueDate,
      status: paymentMethod === "due" ? "pending" : "paid",
      paymentMethod: paymentMethod,
    };

    const URL = process.env.NEXT_PUBLIC_API_URL + "/invoice/generate";

    try {
      setIsloading(true);
      const res = await axiosInstance.post(URL, payload);

      // Update recent invoices
      let _recentInvoices = recentInvoices ? recentInvoices : [];

      let resultInvoice = res.data.invoice;

      _recentInvoices.unshift(resultInvoice);
      _recentInvoices = _recentInvoices.slice(0, 4);

      setRecentInvoices(_recentInvoices);

      setCookie("recentInvoice", _recentInvoices, {
        maxAge: 60 * 60 * 24 * 7,
      });
      setIsloading(false);
      toast.success("Invoice generated successfully", {
        duration: 3000,
      });

      // reset form
      setPhoneNumber("");
      setBillTo("");
      setCustomer(undefined);
      setAddress("");
      setLandmark("");
      setItems([
        {
          name: products ? products[0].name : "jar",
          quantity: 0,
          price: products
            ? orderType === "retail"
              ? parseInt(products[0].price.retail)
              : parseInt(products[0].price.delivery)
            : 25,
          total: 0,
        },
      ]);
      setOrderType("retail");
      setStartDate(new Date());
      setPaymentMethod("");
      setInvoiceId(randomString(8).toUpperCase());
    } catch (err) {
      console.log(err);
      setIsloading(false);
      toast.error("Failed to generate invoice");
    }
  };

  // Fetch products
  useEffect(() => {
    if (!products) {
      // Fetch products from cookies
      const cookieProducts = getCookie("products");
      if (cookieProducts) {
        console.log("Fetching products from cookies");
        setProducts(JSON.parse(cookieProducts));
        setItems([
          {
            name: JSON.parse(cookieProducts)[0].name,
            quantity: 0,
            price: JSON.parse(cookieProducts)[0].price.retail,
            total: 0,
          },
        ]);
      } else {
        // Fetch products
        console.log("Fetching products from API");
        const URL = process.env.NEXT_PUBLIC_API_URL + "/product/all";

        axiosInstance.get(URL).then((res) => {
          const products = res.data.products;
          setProducts(products);
          setCookie("products", JSON.stringify(products), {
            maxAge: 60 * 60 * 24 * 7,
          });
          setItems([
            {
              name: JSON.parse(products)[0].name,
              quantity: 0,
              price: JSON.parse(products)[0].price.retail,
              total: 0,
            },
          ]);
        });
      }
    }
  }, [products]);

  return (
    <Wrapper name="Create Invoice">
      <div className="flex flex-col">
        <div className="flex justify-between items-start">
          {/* Form */}
          <div className="bg-white p-8 relative rounded-md shadow-sm flex flex-col w-full md:w-9/12">
            {/* Invoice ID */}
            <span className="text-xs text-slate-400 absolute left-8 top-3 text-right">
              ID: {invoiceId}
            </span>

            {/* Credentials */}
            <div className="grid gap-8 grid-cols-2 relative items-start mt-5 justify-between">
              {isLoading && (
                <div className="rounded-md absolute top-[40%] right-[2%] z-50">
                  <RiLoader5Line className="w-8 h-8 animate-spin" />
                </div>
              )}
              {/* Phone */}
              <div className="flex flex-col">
                <label className="text-md font-medium text-gray-700">
                  Phone Number
                </label>
                <input
                  disabled={isLoading}
                  onChange={(e) => {
                    setPhoneNumber(e.target.value);
                    setCustomer(undefined);
                    setBillTo("");
                    setAddress("");
                    setLandmark("");
                  }}
                  value={phoneNumber}
                  type="text"
                  className="border disabled:bg-gray-200 rounded-md px-3 py-2 mt-1.5 focus:outline-none focus:ring-2 focus:ring-gray-500 bg-gray-50"
                />
              </div>
              {/* Bill To */}
              <div className="flex flex-col">
                <label className="text-md font-medium text-gray-700 flex w-full items-center justify-between">
                  <span className="w-1/3">Bill To</span>
                  <span
                    className={`text-sm w-full text-right font-normal ${
                      customer && customer?.name === undefined
                        ? "text-yellow-500"
                        : customer === null
                        ? "text-red-500"
                        : ""
                    }`}
                  >
                    {customer && customer?.name === undefined
                      ? "Customer's name will be updated"
                      : customer === null
                      ? "Customer not found"
                      : ""}
                  </span>
                </label>
                <input
                  disabled={isLoading}
                  onChange={(e) => setBillTo(e.target.value)}
                  value={billTo}
                  type="text"
                  className="border disabled:bg-gray-200 rounded-md px-3 py-2 mt-1.5 focus:outline-none focus:ring-2 focus:ring-gray-500 bg-gray-50"
                />
                <span className="text-xs text-slate-400 mt-1 text-right w-full">
                  Name on the invoice
                </span>
              </div>
            </div>
            {/* Order Detail */}
            <div className="grid gap-8 grid-cols-2 items-start my-3 justify-between">
              {/* Order Type */}
              <div className="flex flex-col">
                <label className="text-md font-medium text-gray-700">
                  Order Type
                </label>
                <select
                  onChange={handleOrderType}
                  className="border rounded-md px-3 py-2 mt-1.5 bg-gray-50"
                >
                  <option selected={orderType === "retail"} value="retail">
                    Retail
                  </option>
                  <option selected={orderType === "delivery"} value="delivery">
                    Delivery
                  </option>
                </select>
              </div>
              {/* Sale Date */}
              <div className="flex flex-col">
                <label className="text-md font-medium text-gray-700">
                  Sale Date
                </label>
                <DatePicker
                  dateFormat={"dd/MM/yyyy"}
                  className="border rounded-md cursor-pointer px-3 py-2 mt-1.5 bg-gray-50 w-full"
                  selected={startDate}
                  onChange={(date) => setStartDate(date as Date)}
                />
              </div>
            </div>
            {/* Items */}
            <div className="relative mt-10 overflow-x-auto shadow-sm rounded-lg">
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
                      Quantity
                    </th>
                    <th className="text-md font-medium py-1.5 px-4 text-gray-700">
                      Price
                    </th>
                    <th className="text-md font-medium py-1.5 px-4 text-gray-700">
                      Total
                    </th>
                    <th className="text-md font-medium py-1.5 px-4 text-gray-700"></th>
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
                        <td className="text-md font-medium text-gray-700 px-4 py-2">
                          <select
                            onChange={(e) => {
                              const newItems = [...items];
                              newItems[index].name = e.target.value;

                              const product = products?.find(
                                (product: Product) =>
                                  product.name === e.target.value
                              );

                              if (product === undefined) return;

                              if (orderType === "retail") {
                                newItems[index].price =
                                  parseInt(product?.price.retail) || 0;
                              } else if (orderType === "delivery") {
                                newItems[index].price = 25;
                              }
                              newItems[index].price =
                                parseInt(product?.price.delivery) || 0;
                              newItems[index].total =
                                newItems[index].quantity *
                                newItems[index].price;
                              setItems(newItems);
                            }}
                            className="border text-md rounded-md capitalize px-2 md:pr-14 md:pl-4 py-2 mt-1 bg-white"
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
                                newItems[index].price;
                              setItems(newItems);
                            }}
                            className="border md:w-1/2 text-md rounded-md px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-gray-500 bg-white"
                          />
                        </td>
                        {/* Price */}
                        <td className="text-md font-normal text-gray-700 px-4 py-2">
                          @{item.price}
                        </td>
                        {/* Total */}
                        <td className="text-md font-medium text-gray-700 px-4 py-2">
                          <CurrencyFormat
                            value={isNaN(item.total) ? 0 : item.total}
                            displayType={"text"}
                            thousandSeparator={true}
                            prefix={"₹"}
                            renderText={(value: string) => <>{value}</>}
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
            <div className="flex justify-end mt-4 mb-6">
              <button
                onClick={() => {
                  setItems([
                    ...items,
                    {
                      name: products ? products[0].name : "jar",
                      quantity: 0,
                      price: products
                        ? orderType === "retail"
                          ? parseInt(products[0].price.retail)
                          : parseInt(products[0].price.delivery)
                        : 25,
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

            {/* Deliver Details */}
            {orderType === "retail" ? null : (
              <DeliveryDetails
                setAddress={setAddress}
                setVehicle={setVehicle}
                vehicle={vehicle}
                landmark={landmark}
                address={address}
                setLandmark={setLandmark}
              />
            )}
          </div>

          {/* Summary */}
          <Summary
            handleGenerateBill={handleGenerateBill}
            total={total}
            isLoading={isLoading}
            subTotal={subTotal}
            tax={tax}
            paymentMethod={paymentMethod}
            setPaymentMethod={setPaymentMethod}
          />
        </div>
      </div>
      {/*
       * RECENT INVOICES
       */}
      {recentInvoices?.length != undefined && recentInvoices.length > 0 && (
        <div className="pb-24 mt-8">
          <p className="text-xl font-normal capitalize text-black">Recents</p>
          <div className="grid grid-cols-4 gap-5 mt-5 overflow-x-auto">
            {recentInvoices?.map((invoice: RecentCard, index: number) => {
              return (
                <Card
                  key={index}
                  paid={invoice.paid}
                  amount={invoice.amount}
                  date={invoice.date}
                  id={invoice.id}
                />
              );
            })}
          </div>
        </div>
      )}
    </Wrapper>
  );
};

export default Invoice;
