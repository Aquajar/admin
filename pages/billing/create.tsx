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
  const [recentInvoices, setRecentInvoices] = useState<
    InvoiceType[] | [] | null
  >(null);
  const [products, setProducts] = useState<Product[] | undefined>(undefined);
  const [areas, setAreas] = useState<Area[] | undefined>(undefined);
  const [discount, setDiscount] = useState<string>("0");
  const [partialPayment, setPartialPayment] = useState<string>("0");
  const [isPartialPayment, setIsPartialPayment] = useState<boolean>(false);
  const [customersResults, setCustomersResults] = useState<Customer[] | []>([]);
  const [drivers, setDrivers] = useState<Driver[] | undefined>(undefined);
  const [driverID, setDriverID] = useState<string | undefined>(undefined);

  const { data: session } = useSession();
  const { setInvoices } = useInvoicesStore();

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
    const { data } = await axios.get(
      process.env.NEXT_PUBLIC_API_URL! + "/driver"
    );
    setCookie("_driversD", data.data);
    setDrivers(data.data);
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
  useEffect(() => {
    if (recentInvoices === null) {
      let rawData = getCookie("recentInvoice");

      let parsedDate = rawData ? JSON.parse(rawData) : [];

      parsedDate = parsedDate.sort(
        (a: InvoiceType, b: InvoiceType) =>
          new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime()
      );

      setRecentInvoices(parsedDate);
    }
  }, [recentInvoices]);

  // Fetch driver information from cookies
  useEffect(() => {
    if (drivers === undefined) {
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
  }, [drivers]);

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

  // Fetch customer information from phone number or customer ID

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
          : 25,
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

  // handle send activity to the server
  const craeteBillingActivity = async () => {
    const URL = process.env.NEXT_PUBLIC_API_URL + "/activity";
    const payload = {
      activity: "You have created a new invoice for " + billTo,
      tag: "create",
      // @ts-ignore
      userID: user?._id,
    };

    // console.log(payload);

    // try {
    //   const res = await axiosInstance.post(URL, payload);
    //   console.log(res);
    // } catch (e) {
    //   console.log(e);
    // }
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
      phone: phoneNumber || Math.floor(Math.random() * 10000000000)?.toString(),
      address: {
        text: address ? address : null,
        landmark: landmark ? landmark : null,
      },
      invoices: invoices,
    };

    // create payload
    let payload: InvoiceType = {
      user: user,
      invoiceID: invoiceId,
      invoiceDate: +startDate,
      customerID: customer?._id,
      vehicleID: orderType === "delivery" ? vehicle : null,
      driver: orderType === "delivery" ? driverID : null,
      total: total,
      products: newProducts,
      address: orderType === "delivery" ? address : null,
      landmark: orderType === "delivery" ? landmark : null,
      dueDate: +dueDate,
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

      craeteBillingActivity();

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
        <div className="flex flex-col md:flex-row justify-between items-start">
          {/* Form */}
          <div className="bg-white p-8 relative rounded-md shadow-sm flex flex-col w-full md:w-9/12">
            {/* Invoice ID */}
            <span className="text-xs text-slate-400 absolute left-8 top-3 text-right">
              ID: {invoiceId}
            </span>

            {/* Credentials */}
            <div className="grid gap-8 grid-cols-1 md:grid-cols-2 relative items-center md:items-start mt-5 justify-between">
              {isLoading && (
                <div className="rounded-md absolute top-[40%] right-[2%] z-50">
                  <RiLoader5Line className="w-8 h-8 animate-spin" />
                </div>
              )}
              {/* Phone */}
              <div className="flex flex-col">
                <select
                  onChange={(e) => {
                    setSearchByPhone(e.target.value !== "ID");
                    // resetCustomer();
                  }}
                  className="rounded-md  w-fit pr-8"
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
                      : setCustomerID(e.target.value);
                    setCustomer(undefined);
                    setBillTo("");
                    setAddress(areas ? areas[0].name : "");
                    setLandmark("");
                  }}
                  value={
                    searchByPhone
                      ? phoneNumber
                      : customerID === ""
                      ? ""
                      : customerID
                  }
                  maxLength={searchByPhone ? 10 : 4}
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
                <DebounceInput
                  minLength={2}
                  debounceTimeout={800}
                  disabled={isLoading}
                  onChange={(e) => {
                    setBillTo(e.target.value);
                    searchCustomer(e.target.value);
                  }}
                  value={billTo}
                  type="text"
                  className="border disabled:bg-gray-200 rounded-md px-3 py-2 mt-1.5 focus:outline-none focus:ring-2 focus:ring-gray-500 bg-gray-50"
                />
                {customersResults.length > 0 && (
                  <div className="absolute top-20 bg-white w-fit z-50 border rounded-md shadow-md">
                    {customersResults.map(
                      (customer: Customer, index: number) => {
                        return (
                          <div
                            key={index}
                            className="p-3 hover:bg-gray-100 cursor-pointer"
                          >
                            <p
                              className="text-md font-medium text-gray-700"
                              onClick={() => {
                                setCustomerID(
                                  customer?.userID?.toString() || ""
                                );
                                setCustomer(customer);
                                setBillTo(customer.name as string);
                                setPhoneNumber(customer.phone);
                                setAddress(customer.address?.text || "");
                                setLandmark(customer.address?.landmark || "");
                                setCustomersResults([]);
                              }}
                            >
                              {customer.name}
                            </p>
                          </div>
                        );
                      }
                    )}
                  </div>
                )}
                <span className="text-xs text-slate-400 mt-1 text-right w-full">
                  Name on the invoice
                </span>
              </div>
            </div>
            {/* Order Detail */}
            <div className="grid gap-8 grid-cols-1 md:grid-cols-2 items-start my-3 justify-between">
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
                  onChange={(date) => {
                    setStartDate(date as Date);
                    setCookie("invoiceSalesDate", date, {
                      maxAge: 60 * 60 * 24 * 7,
                    });
                  }}
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
                                  parseInt(product?.price.retail as string) ||
                                  0;
                              } else if (orderType === "delivery") {
                                newItems[index].price = 25;
                              }
                              newItems[index].price =
                                parseInt(product?.price.delivery as string) ||
                                0;
                              newItems[index].total =
                                newItems[index].quantity *
                                newItems[index].price;
                              setItems(newItems);
                            }}
                            className="border text-md rounded-md capitalize px-2 w-24 md:pr-14 md:pl-4 py-2 mt-1 bg-white"
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
                            className="border w-16 text-md rounded-md px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-gray-500 bg-white"
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
                          ? products[0].price.retail
                            ? parseInt(products[0].price.retail)
                            : 0
                          : products[0].price.delivery
                          ? parseInt(products[0].price.delivery)
                          : 0
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
                customer={customer}
                drivers={drivers}
                driverID={driverID}
                setDriverID={setDriverID}
                areas={areas}
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
      {/*
       * RECENT INVOICES
       */}
      {recentInvoices?.length != undefined && recentInvoices.length > 0 && (
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
      )}
    </Wrapper>
  );
};

export default Invoice;
