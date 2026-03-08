import Wrapper from "@/components/Wrapper";
import React, { useEffect, useState } from "react";
import { RiAddCircleLine, RiLoader5Line } from "react-icons/ri";
import CurrencyFormat from "react-currency-format";
import { MdOutlineDeleteForever } from "react-icons/md";
import DatePicker from "react-datepicker";
// @ts-ignore
import "react-datepicker/dist/react-datepicker.css";
import Summary from "@/components/billing/Summary";
import axios from "axios";
import { randomString } from "@/lib/helpers";
import toast from "react-hot-toast";

import {
  Area,
  Customer,
  Driver,
  Invoice as InvoiceType,
  Item,
  Product,
} from "@/types/types";
import { getCookie, setCookie } from "cookies-next";
import Card from "@/components/Recents/Card";
import { useSession } from "next-auth/react";
import useRefreshTokenRotation from "@/lib/hooks/useRefreshToken";
import { DebounceInput } from "react-debounce-input";
import useInvoice from "@/lib/hooks/useInvoice";
import { useInvoicesStore } from "@/store/invoices.store";
import useAuthUser from "@/lib/hooks/useAuthUser";

const BreadCrumb = [
  {
    href: "/billing",
    name: "Billing",
  },
  {
    href: "/billing/create",
    name: "Invoice",
  },
];

interface ItemProps {
  id: string;
  _id: string;
  quantity: number;
}

import { fromZonedTime, toZonedTime, format } from "date-fns-tz";

const Invoice = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [orderType, setOrderType] = useState("delivery");
  const [startDate, setStartDate] = useState<null | Date>(null);
  const [invoiceId, setInvoiceId] = useState<string | null>(null);
  const [subTotal, setSubTotal] = useState<number>(0);
  const [tax, setTax] = useState<number>(0);
  const [total, setTotal] = useState<number>(0);
  const [address, setAddress] = useState<string>("");
  const [landmark, setLandmark] = useState<string>("");
  const [vehicle, setVehicle] = useState<string>("WB73E3666");
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [phoneNumber, setPhoneNumber] = useState<string>("");
  const [searchByPhone, setSearchByPhone] = useState<boolean>(false);
  const [billTo, setBillTo] = useState<string>("");
  const [customer, setCustomer] = useState<undefined | null | Customer>(
    undefined
  );
  const [customerID, setCustomerID] = useState<string>("");
  const [isLoading, setIsloading] = useState(false);
  // const [recentInvoices, setRecentInvoices] = useState<
  //   InvoiceType[] | [] | null
  // >(null);
  const [products, setProducts] = useState<Product[] | undefined>(undefined);
  const [areas, setAreas] = useState<Area[] | undefined>(undefined);
  const [discount, setDiscount] = useState<string>("0");
  const [partialPayment, setPartialPayment] = useState<string>("0");
  const [isPartialPayment, setIsPartialPayment] = useState<boolean>(false);
  const [customersResults, setCustomersResults] = useState<Customer[] | []>([]);
  const [drivers, setDrivers] = useState<Driver[] | undefined>(undefined);
  const [driverID, setDriverID] = useState<string | undefined>(undefined);

  const { data: session } = useSession();

  const { user } = useAuthUser();

  // Create an axios instance with the user's access token
  const axiosInstance = axios.create({
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session?.user.accessToken}`,
    },
  });

  // Fetch drivers
  const getDrivers = async () => {
    const { data } = await axiosInstance.get(
      process.env.NEXT_PUBLIC_API_URL! + "/staff?status=active&type=driver"
    );
    setCookie("_driversD", data);
    setDrivers(data);
  };

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
  // useEffect(() => {
  //   if (recentInvoices === null) {
  //     let rawData = getCookie("recentInvoice");

  //     let parsedDate = rawData ? JSON.parse(rawData) : [];

  //     parsedDate = parsedDate.sort(
  //       (a: InvoiceType, b: InvoiceType) =>
  //         new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime()
  //     );

  //     setRecentInvoices(parsedDate);
  //   }
  // }, [recentInvoices]);

  // Fetch driver information from cookies
  useEffect(() => {
    if (drivers === undefined && session) {
      let rawData = getCookie("_driversD");
      let selectedDriverID = getCookie("_selectedDriverID");

      setDriverID(selectedDriverID);

      if (rawData === undefined) {
        getDrivers();
      } else {
        let parsedData = rawData ? JSON.parse(rawData) : [];
        setDrivers(parsedData);
      }
    }
  }, [drivers, session]);

  // Fetch products from cookies
  useEffect(() => {
    if (products === undefined) {
      let rawData = getCookie("products");

      let parsedData = rawData ? JSON.parse(rawData) : [];

      setProducts(parsedData);
    }
  }, [products]);

  // Fetch areas from cookies
  useEffect(() => {
    if (areas === undefined) {
      let rawData = getCookie("areas");

      let parsedData = rawData ? JSON.parse(rawData) : [];

      setAreas(parsedData);
    }
  }, [areas]);

  // Auto Fetch customer details by phone number/customer ID
  useEffect(() => {
    if (customer === undefined && searchByPhone && phoneNumber.length === 10) {
      setIsloading(true);
      const URL =
        process.env.NEXT_PUBLIC_API_URL + "/user/find-by-phone/" + phoneNumber;
      axios
        .get(URL)
        .then((res) => {
          const customer: Customer = res.data.user;
          setCustomer(customer);
          customer?.userID && setCustomerID(customer?.userID?.toString() || "");
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
    } else if (
      customer === undefined &&
      !searchByPhone &&
      customerID.length === 4
    ) {
      setIsloading(true);
      const URL =
        process.env.NEXT_PUBLIC_API_URL + "/user/find-by-userid/" + customerID;
      axios
        .get(URL)
        .then((res) => {
          const customer: Customer = res.data.user;
          setCustomer(customer);
          customer.phone && setPhoneNumber(customer.phone);
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
  }, [phoneNumber, customer, customerID, searchByPhone]);

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
        item.price = product?.price.retail
          ? parseInt(product?.price.retail)
          : 0;
      } else if (e.target.value === "delivery") {
        item.price = product?.price.delivery
          ? parseInt(product?.price.delivery)
          : 0;
      }
      item.total = item.quantity * item.price;
    });

    setItems(newItems);
  };

  // Reset page state
  const resetBilling = () => {
    const cookieSalesDate = getCookie("invoiceSalesDate");
    setPhoneNumber("");
    setBillTo("");
    setCustomer(undefined);
    setAddress(areas ? areas[0].name : "");
    setLandmark("");
    setItems([
      {
        name: products ? products[0].name : "jar",
        quantity: 0,
        price: products
          ? orderType === "retail"
            ? products[0].price.retail
              ? parseInt(products[0].price.retail)
              : 0
            : products[0].price.delivery
              ? parseInt(products[0].price.delivery)
              : 0
          : 30,
        total: 0,
      },
    ]);
    setCustomerID("");
    setSearchByPhone(false);
    setOrderType("delivery");
    setStartDate(cookieSalesDate ? new Date(cookieSalesDate) : new Date());
    setPaymentMethod("");
    setInvoiceId(randomString(8).toUpperCase());
    setIsPartialPayment(false);
    setPartialPayment("0");
    setDiscount("0");
    setTotal(0);
    setSubTotal(0);
    setTax(0);
  };

  // Generate Bill
  const handleGenerateBill = async () => {
    if (phoneNumber.length !== 10 && billTo === "") {
      return toast.error("Please enter any identity detail");
    } else if (total === 0) {
      return toast.error("Please add items to the invoice");
    } else if (orderType === "delivery" && address === "") {
      return toast.error("Please enter the address");
    } else if (paymentMethod === "") {
      return toast.error("Please select a payment method");
    } else if (!startDate) {
      return toast.error("Please select a sale date");
    }
    if (orderType === "delivery" && !driverID) {
      return toast.error("Please select a driver");
    }

    let newProducts: ItemProps[] = [];
    let invoices: string[] = [];

    items.forEach((item) => {
      let product = products?.find(
        (product: Product) => product.name === item.name
      );

      const payload = {
        id: product?._id as string,
        quantity: item.quantity,
      };

      newProducts.push(payload as ItemProps);
    });

    customer?.invoices &&
      customer?.invoices.map((invoice) => invoices.push(invoice));
    invoices.push(invoiceId as string);

    // create user object
    let user = {
      name: billTo,
      phone: phoneNumber || Math.floor(Math.random() * 10000000000)?.toString(),
      address: {
        text: address ? address : null,
        landmark: landmark ? landmark : null,
      },
      invoices: invoices,
    };

    const asiaKolkataTimezone = "Asia/Kolkata";

    // Convert the date to the Asia/Kolkata timezone
    const kolkataDate = toZonedTime(startDate, asiaKolkataTimezone);

    // Format the date to ISO string with the Asia/Kolkata timezone
    const invoiceDate = format(kolkataDate, "yyyy-MM-dd'T'HH:mm:ssXXX", {
      timeZone: asiaKolkataTimezone,
    });

    // create payload
    let payload: InvoiceType = {
      user: user,
      invoiceID: invoiceId,
      invoiceDate: invoiceDate,
      customerID: customer?._id,
      customerName: customer?.name,
      vehicleID: orderType === "delivery" ? vehicle : null,
      driver: orderType === "delivery" ? driverID : null,
      total: total,
      products: newProducts,
      // address: orderType === "delivery" ? address : null,
      // landmark: orderType === "delivery" ? landmark : null,
      status:
        paymentMethod === "due"
          ? "pending"
          : isPartialPayment
            ? "pending"
            : "paid",
      paymentMethod: paymentMethod,
      due:
        paymentMethod === "due" && !isPartialPayment
          ? total
          : isPartialPayment
            ? total - parseFloat(partialPayment)
            : 0,
    };

    const URL = process.env.NEXT_PUBLIC_API_URL + "/invoice/generate";

    try {
      setIsloading(true);
      const res = await axiosInstance.post(URL, payload);

      try {
        // if (!invoices) return;
        // @ts-ignore
        // setInvoices((invoices) => [res.data.invoice, ...invoices]);
      } catch (e) {
        console.log(e);
      }

      // Update recent invoices
      // let _recentInvoices = recentInvoices ? recentInvoices : [];

      // let resultInvoice = res.data.invoice;

      // _recentInvoices.unshift(resultInvoice);
      // _recentInvoices = _recentInvoices.slice(0, 4);

      // // setRecentInvoices(_recentInvoices);

      // setCookie("recentInvoice", _recentInvoices, {
      //   maxAge: 60 * 60 * 24 * 7,
      // });
      setIsloading(false);
      toast.success("Invoice generated successfully", {
        duration: 3000,
      });

      // reset form
      resetBilling();
    } catch (err) {
      console.log(err);
      setIsloading(false);
      toast.error("Failed to generate invoice");
    }
  };

  // Search customer with name keyword
  const searchCustomer = (keyword: string) => {
    const value = keyword;

    if (value.length < 2) {
      setCustomersResults([]);
      return;
    }

    const URL = process.env.NEXT_PUBLIC_API_URL + "/user/find-by-name/" + value;

    axiosInstance
      .get(URL)
      .then((res) => {
        setCustomersResults(res.data.user);
      })
      .catch((err) => {
        console.log(err);
      });
  };

  // Fetch products
  useEffect(() => {
    if (!products) {
      // Fetch products from cookies
      const cookieProducts = getCookie("products");
      if (cookieProducts) {
        setProducts(JSON.parse(cookieProducts));
        setItems([
          {
            name: JSON.parse(cookieProducts)[0].name,
            quantity: 0,
            price: JSON.parse(cookieProducts)[0].price.delivery,
            total: 0,
          },
        ]);
      } else {
        // Fetch products
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
              price: JSON.parse(products)[0].price.delivery,
              total: 0,
            },
          ]);
        });
      }
    }
  }, [products]);

  // Fetch Areas
  useEffect(() => {
    if (!areas) {
      // Fetch products from cookies
      const cookieAreas = getCookie("areas");
      if (cookieAreas) {
        let areas: Area[] = JSON.parse(cookieAreas);
        setAreas(areas);
        setAddress(areas[0].name);
      } else {
        // Fetch products
        const URL = process.env.NEXT_PUBLIC_API_URL + "/area/all";

        axiosInstance.get(URL).then((res) => {
          const areas: Area[] = res.data;
          setAreas(areas);
          setAddress(areas[0].name);
          setCookie("areas", JSON.stringify(areas), {
            maxAge: 60 * 60 * 24 * 7,
          });
        });
      }
    }
  }, [areas]);

  // Get sales date from cookies
  useEffect(() => {
    const cookieSalesDate = getCookie("invoiceSalesDate");
    if (!cookieSalesDate) {
      setStartDate(new Date());
    } else {
      setStartDate(new Date(cookieSalesDate));
    }
  }, [vehicle]);

  return (
    <Wrapper breadcrumb={BreadCrumb}>
      <div className="flex flex-col">
        <div className="flex flex-col xl:flex-row gap-1">

          {/* LEFT PANEL */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col w-full xl:w-[70%] relative">

            {/* Invoice ID */}
            <span className="absolute right-6 top-4 text-xs text-gray-400">
              ID: {invoiceId}
            </span>


            {/* ---------------- CUSTOMER SECTION ---------------- */}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 relative">

              {isLoading && (
                <div className="absolute right-4 top-4 z-50 bg-white shadow rounded-full p-2">
                  <RiLoader5Line className="w-6 h-6 animate-spin text-gray-700" />
                </div>
              )}

              {/* Search Customer */}
              <div className="flex flex-col gap-2">

                <label className="text-[15px] font-medium text-gray-700">
                  Search Customer
                </label>

                <div className="flex gap-2">

                  <select
                    onChange={(e) => {
                      setSearchByPhone(e.target.value !== "ID")
                    }}
                    className="border rounded-lg px-3 py-2 text-[15px] bg-white focus:ring-2 focus:ring-gray-200 outline-none"
                  >
                    <option selected={!searchByPhone} value="ID">
                      Customer ID
                    </option>

                    <option selected={searchByPhone} value="phone">
                      Phone
                    </option>
                  </select>

                  <input
                    disabled={isLoading}
                    onChange={(e) => {
                      searchByPhone
                        ? setPhoneNumber(e.target.value)
                        : setCustomerID(e.target.value)

                      setCustomer(undefined)
                      setBillTo("")
                      setAddress(areas ? areas[0].name : "")
                      setLandmark("")
                    }}
                    value={
                      searchByPhone
                        ? phoneNumber
                        : customerID === "" ? "" : customerID
                    }
                    maxLength={searchByPhone ? 10 : 4}
                    placeholder={searchByPhone ? "Enter phone" : "Enter ID"}
                    className="flex-1 bg-gray-50 border rounded-lg px-3 py-2 text-[15px] focus:ring-2 focus:ring-gray-200 outline-none"
                  />

                </div>

              </div>


              {/* Bill To */}
              <div className="flex flex-col gap-2 relative">

                <label className="flex justify-between text-[15px] font-medium text-gray-700">

                  <span>Bill To</span>

                  <span
                    className={`text-xs ${customer && customer?.name === undefined
                      ? "text-yellow-500"
                      : customer === null
                        ? "text-red-500"
                        : ""
                      }`}
                  >
                    {customer && customer?.name === undefined
                      ? "Customer name will be updated"
                      : customer === null
                        ? "Customer not found"
                        : ""}
                  </span>

                </label>

                <DebounceInput
                  minLength={2}
                  debounceTimeout={800}
                  disabled={isLoading}
                  onChange={(e) => {
                    setBillTo(e.target.value)
                    searchCustomer(e.target.value)
                  }}
                  value={billTo}
                  placeholder="Enter customer name"
                  className="border rounded-lg px-3 py-2 text-[15px] bg-gray-50 focus:ring-2 focus:ring-gray-200 outline-none"
                />

                {/* Autocomplete */}
                {customersResults.length > 0 && (
                  <div className="absolute top-[72px] w-full bg-white border rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">

                    {customersResults.map((customer: Customer, index: number) => {

                      return (
                        <div
                          key={index}
                          className="px-3 py-2 text-[15px] hover:bg-gray-100 cursor-pointer"
                          onClick={() => {
                            setCustomerID(customer?.userID?.toString() || "")
                            setCustomer(customer)
                            setBillTo(customer.name as string)
                            setPhoneNumber(customer.phone)
                            setAddress(customer.address?.text || "")
                            setLandmark(customer.address?.landmark || "")
                            setCustomersResults([])
                          }}
                        >
                          {customer.name}
                        </div>
                      )

                    })}

                  </div>
                )}

                <span className="text-xs text-gray-400">
                  Name printed on invoice
                </span>

              </div>

            </div>



            {/* ---------------- ORDER DETAILS ---------------- */}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">

              {/* Order Type */}
              <div className="flex flex-col gap-2">

                <label className="text-[15px] font-medium text-gray-700">
                  Order Type
                </label>

                <select
                  onChange={handleOrderType}
                  className="border rounded-lg px-3 py-2 text-[15px] focus:ring-2 focus:ring-gray-200 outline-none"
                >
                  <option selected={orderType === "retail"} value="retail">
                    Retail
                  </option>

                  <option selected={orderType === "delivery"} value="delivery">
                    Delivery
                  </option>

                </select>

              </div>


              {/* Date */}
              <div className="flex flex-col gap-2">

                <label className="text-[15px] font-medium text-gray-700">
                  Sale Date
                </label>

                <DatePicker
                  dateFormat={"dd/MM/yyyy"}
                  className="border rounded-lg bg-gray-50 px-3 py-2 text-[15px] w-full focus:ring-2 focus:ring-gray-200 outline-none"
                  selected={startDate}
                  onChange={(date) => {

                    if (!date) return

                    let currentTime = new Date()
                    let originalDate = new Date(date)

                    originalDate.setHours(currentTime.getHours())
                    originalDate.setMinutes(currentTime.getMinutes())
                    originalDate.setSeconds(currentTime.getSeconds())
                    originalDate.setMilliseconds(currentTime.getMilliseconds())

                    setStartDate(originalDate)

                    setCookie("invoiceSalesDate", originalDate, {
                      maxAge: 60 * 60 * 24 * 7
                    })

                  }}
                />

              </div>

            </div>



            {/* ---------------- ITEMS TABLE ---------------- */}

            <div className="mt-10 border rounded-xl overflow-hidden">

              <div className="overflow-x-auto">

                <table className="w-full min-w-[700px] text-[15px]">

                  <thead className="bg-gray-50 border-b">

                    <tr>
                      <th className="px-4 py-3 text-gray-600 font-medium">#</th>
                      <th className="px-4 py-3 text-gray-600 font-medium">Item</th>
                      <th className="px-4 py-3 text-gray-600 font-medium">Qty</th>
                      <th className="px-4 py-3 text-gray-600 font-medium">Price</th>
                      <th className="px-4 py-3 text-gray-600 font-medium">Total</th>
                      <th></th>
                    </tr>

                  </thead>


                  <tbody className="divide-y">

                    {items.map((item, index) => {

                      return (

                        <tr key={index} className="hover:bg-gray-50">

                          <td className="px-4 py-3">{index + 1}</td>

                          <td className="px-4 py-3">

                            <select
                              onChange={(e) => {

                                const newItems = [...items]

                                newItems[index].name = e.target.value

                                const product = products?.find(
                                  (product: Product) => product.name === e.target.value
                                )

                                if (product === undefined) return

                                if (orderType === "retail") {
                                  newItems[index].price = parseInt(product?.price.retail as string) || 0
                                }
                                else if (orderType === "delivery") {
                                  newItems[index].price = 30
                                }

                                newItems[index].price =
                                  parseInt(product?.price.delivery as string) || 0

                                newItems[index].total =
                                  newItems[index].quantity * newItems[index].price

                                setItems(newItems)

                              }}
                              className="border rounded-lg px-3 py-2 text-[15px] w-full"
                            >

                              {products?.map((product: Product) => (
                                <option key={product._id} value={product.name}>
                                  {product.name}
                                </option>
                              ))}

                            </select>

                          </td>


                          <td className="px-4 py-3">

                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => {

                                const newItems = [...items]

                                newItems[index].quantity = parseInt(e.target.value)

                                newItems[index].total =
                                  parseInt(e.target.value) *
                                  (customer?.profileRate
                                    ? customer?.profileRate
                                    : newItems[index].price)

                                setItems(newItems)

                              }}
                              className="w-20 border rounded-lg px-3 py-2"
                            />

                          </td>


                          <td className="px-4 py-3">

                            @{item.name === "Refill"
                              ? customer?.profileRate
                              : item.price}

                          </td>


                          <td className="px-4 py-3 font-semibold">

                            <CurrencyFormat
                              value={isNaN(item.total) ? 0 : item.total}
                              displayType={"text"}
                              thousandSeparator
                              prefix={"₹"}
                              renderText={(value: string) => <>{value}</>}
                            />

                          </td>


                          <td className="px-4 py-3">

                            <button
                              onClick={() => {

                                const newItems = [...items]

                                newItems.splice(index, 1)

                                setItems(newItems)

                              }}
                              className="p-2 rounded-lg hover:bg-red-50 text-red-500"
                            >
                              <MdOutlineDeleteForever className="w-5 h-5" />
                            </button>

                          </td>

                        </tr>

                      )

                    })}

                  </tbody>

                </table>

              </div>

            </div>



            {/* Add Item */}
            <button
              onClick={() => {
                setItems([
                  ...items,
                  {
                    name: products ? products[0].name : "jar",
                    quantity: 0,
                    price: products
                      ? orderType === "retail"
                        ? products[0].price.retail
                          ? parseInt(products[0].price.retail)
                          : 0
                        : products[0].price.delivery
                          ? parseInt(products[0].price.delivery)
                          : 0
                      : 30,
                    total: 0,
                  },
                ]);
              }}
              className="flex items-center gap-2 mt-4 text-[15px] font-medium text-blue-600 hover:text-blue-700"
            >
              <RiAddCircleLine className="w-5 h-5" />
              Add Item
            </button>

            {/* Delivery Details */}
            {orderType === "retail" ? null : customer === null ? (
              <div className="flex flex-col mt-8 pt-6 border-t border-gray-200">

                <h3 className="text-[15px] font-semibold text-gray-800 mb-4">
                  Delivery Details
                </h3>

                {/* Address */}
                <div className="flex flex-col gap-2">

                  <label className="text-[15px] font-medium text-gray-700">
                    Area
                  </label>

                  <select
                    onChange={(e) => setAddress(e.target.value)}
                    className="border rounded-lg px-3 py-2 text-[15px] bg-white focus:ring-2 focus:ring-gray-200 outline-none"
                  >
                    {areas?.map((area) => (
                      <option
                        key={area._id}
                        value={area.name}
                        disabled={!area.serviceable}
                        selected={address === area.name}
                      >
                        {area.name}
                      </option>
                    ))}
                  </select>

                </div>


                {/* Landmark */}
                <div className="flex flex-col gap-2 mt-5">

                  <label className="text-[15px] font-medium text-gray-700">
                    Landmark
                  </label>

                  <input
                    onChange={(e) => setLandmark(e.target.value)}
                    value={landmark}
                    type="text"
                    placeholder="Nearby landmark"
                    className="border rounded-lg px-3 py-2 text-[15px] bg-white focus:ring-2 focus:ring-gray-200 outline-none"
                  />

                </div>

              </div>
            ) : null}

            {/* Driver */}
            <div className="flex flex-col mt-8">
              <label className="text-[15px] font-medium text-gray-700">
                Driver
              </label>

              <select
                value={driverID}
                onChange={(e) => {
                  setDriverID(e.target.value);
                  setCookie("_selectedDriverID", e.target.value);
                }}
                className="border rounded-lg px-3 py-2 mt-2 text-[15px]"
              >
                {drivers?.map((driver) => (
                  <option key={driver._id} value={driver._id}>
                    {driver.name}
                  </option>
                ))}
              </select>
            </div>

          </div>


          {/* SUMMARY PANEL */}

          <div className="w-full xl:w-[30%]">

            <Summary
              items={items}
              isPartialPayment={isPartialPayment}
              setIsPartialPayment={setIsPartialPayment}
              partialPayment={partialPayment}
              setPartialPayment={setPartialPayment}
              handleGenerateBill={handleGenerateBill}
              total={total}
              discount={discount}
              setDiscount={setDiscount}
              setTotal={setTotal}
              isLoading={isLoading}
              subTotal={subTotal}
              tax={tax}
              paymentMethod={paymentMethod}
              setPaymentMethod={setPaymentMethod}
              paymentPlan={customer?.paymentPlan}
            />

          </div>

        </div>
      </div>
      {/*
       * RECENT INVOICES
       */}
      {/* {recentInvoices?.length != undefined && recentInvoices.length > 0 && (
        <div className="pb-24 mt-8 hidden md:block">
          <p className="text-xl font-normal capitalize text-black">Recents</p>
          <div className="grid grid-cols-4 gap-5 mt-5 overflow-x-auto">
            {recentInvoices?.map((invoice: InvoiceType, index: number) => {
              return (
                <Card
                  key={index}
                  paid={invoice?.status === "paid"}
                  amount={invoice?.total}
                  date={invoice.invoiceDate?.toString() || ""}
                  id={invoice?.invoiceID}
                />
              );
            })}
          </div>
        </div>
      )} */}
    </Wrapper>
  );
};

export default Invoice;