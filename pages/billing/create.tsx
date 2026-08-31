import Wrapper from "@/components/Wrapper";
import React, { FC, useEffect, useState } from "react";
import { RiLoader5Line } from "react-icons/ri";
import CurrencyFormat from "react-currency-format";
import DatePicker from "react-datepicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  UserRound,
  IdCard,
  Phone,
  Search,
  Package,
  ShoppingCart,
  Truck,
  CalendarDays,
  MapPin,
  Plus,
  Trash2,
  UserPlus,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
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
import { MARKET_SEGMENTS, MarketSegment } from "@/lib/constants";
import MarketSegmentBadge from "@/components/Customer/MarketSegmentBadge";
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

// Consistent card wrapper used for every block on the billing form, giving the
// page a clean, sectioned, professional layout.
const Section: FC<{
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}> = ({ icon, title, description, action, children }) => (
  <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
    <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
          {icon}
        </span>
        <div>
          <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
          {description && (
            <p className="text-xs text-gray-500">{description}</p>
          )}
        </div>
      </div>
      {action}
    </div>
    <div className="p-5">{children}</div>
  </section>
);

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
  const [jarsOwnedByCustomer, setJarsOwnedByCustomer] = useState<number>(0);
  const [engagedJars, setEngagedJars] = useState<number>(0);
  const [marketSegment, setMarketSegment] = useState<MarketSegment>("b2c");
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

  // Always fetch a fresh active-driver list so a stale cache can't surface
  // drivers who have since been deactivated.
  useEffect(() => {
    if (drivers === undefined && session) {
      const selectedDriverID = getCookie("_selectedDriverID");
      setDriverID(selectedDriverID);
      getDrivers();
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
  const handleOrderType = (value: string) => {
    setOrderType(value);

    // reset jar price
    const newItems = [...items];
    newItems.forEach((item) => {
      const product = products?.find(
        (product: Product) => product.name === item.name
      );

      if (product === undefined) return;

      if (value === "retail") {
        item.price = product?.price.retail
          ? parseInt(product?.price.retail)
          : 0;
      } else if (value === "delivery") {
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
    setMarketSegment("b2c");
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
    else if (customer === null && engagedJars === 0) {
      return toast.error("Engaged jars cannot be 0 for new customers")
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
    let user: {
      name: string;
      phone: string;
      address: {
        text: string | null;
        landmark: string | null;
      };
      invoices: string[];
      engagedJars?: number;
      jarOwnedByCustomer?: number;
      marketSegment?: MarketSegment;
    } = {
      name: billTo,
      phone: phoneNumber || Math.floor(Math.random() * 10000000000)?.toString(),
      address: {
        text: address ? address : null,
        landmark: landmark ? landmark : null,
      },
      invoices: invoices,
    };

    if (customer === null) {
      user = {
        ...user,
        engagedJars: engagedJars,
        jarOwnedByCustomer: jarsOwnedByCustomer,
        marketSegment: marketSegment
      }
    }

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
      <div className="mx-auto w-full pb-24">
        {/* Page header */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Create Invoice</h1>
            {/* <p className="text-sm text-gray-500">
              Look up a customer, add items, and generate the bill.
            </p> */}
          </div>
          <span className="inline-flex w-fit items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-500">
            Invoice ID
            <span className="font-mono font-semibold text-gray-900">{invoiceId}</span>
          </span>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">

          {/* LEFT: form */}
          <div className="space-y-6 xl:col-span-2">


            {/* CUSTOMER */}
            <Section
              icon={<UserRound className="h-5 w-5" />}
              title="Customer"
              description="Search an existing customer or bill a new one."
            >
              <div className="relative">
                {isLoading && (
                  <div className="absolute right-0 -top-1 z-50 rounded-full bg-white p-1.5 shadow">
                    <RiLoader5Line className="h-5 w-5 animate-spin text-gray-700" />
                  </div>
                )}

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

                  {/* Find existing customer */}
                  <div className="space-y-2">
                    <Label>Find customer</Label>
                    <div className="flex gap-2">
                      <Select
                        value={searchByPhone ? "phone" : "ID"}
                        onValueChange={(v) => setSearchByPhone(v !== "ID")}
                      >
                        <SelectTrigger className="w-[132px] shrink-0">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ID">Customer ID</SelectItem>
                          <SelectItem value="phone">Phone</SelectItem>
                        </SelectContent>
                      </Select>

                      <div className="relative flex-1">
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                          {searchByPhone ? (
                            <Phone className="h-4 w-4" />
                          ) : (
                            <IdCard className="h-4 w-4" />
                          )}
                        </span>
                        <Input
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
                          placeholder={searchByPhone ? "Enter phone number" : "Enter 4-digit ID"}
                          className="pl-9"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Bill To */}
                  <div className="space-y-2 pb-5">
                    <Label>Bill to (name)</Label>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                        <Search className="h-4 w-4" />
                      </span>
                      <DebounceInput
                        minLength={2}
                        debounceTimeout={800}
                        disabled={isLoading}
                        onChange={(e) => {
                          setBillTo(e.target.value)
                          searchCustomer(e.target.value)
                        }}
                        value={billTo}
                        placeholder="Search or enter customer name"
                        className="flex h-9 w-full rounded-md border border-input bg-transparent py-1 pl-9 pr-3 text-sm shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                      />

                      {/* Autocomplete */}
                      {customersResults.length > 0 && (
                        <div className="absolute top-full mt-1 z-50 max-h-52 w-full overflow-y-auto rounded-md border bg-white shadow-lg">
                          {customersResults.map((c: Customer, index: number) => (
                            <button
                              type="button"
                              key={index}
                              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50"
                              onClick={() => {
                                setCustomerID(c?.userID?.toString() || "")
                                setCustomer(c)
                                setBillTo(c.name as string)
                                setPhoneNumber(c.phone)
                                setAddress(c.address?.text || "")
                                setLandmark(c.address?.landmark || "")
                                setCustomersResults([])
                              }}
                            >
                              <UserRound className="h-4 w-4 shrink-0 text-gray-400" />
                              {c.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {/* <p className="text-xs text-gray-400">Name printed on the invoice.</p> */}
                  </div>
                </div>

                {/* Customer status */}
                {customer !== undefined && (
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    {customer === null ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                        <UserPlus className="h-3.5 w-3.5" />
                        New customer — a profile will be created
                      </span>
                    ) : (
                      <>
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Existing customer
                        </span>
                        <MarketSegmentBadge segment={customer.marketSegment} />
                        {customer?.name === undefined && (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                            <AlertCircle className="h-3.5 w-3.5" />
                            Name will be updated
                          </span>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            </Section>


            {/* NEW CUSTOMER DETAILS — only shown when creating a customer */}
            {customer === null && (
              <Section
                icon={<UserPlus className="h-5 w-5" />}
                title="New customer details"
                description="Captured only when creating a new customer."
              >
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Jars owned by customer</Label>
                    <Select
                      value={String(jarsOwnedByCustomer)}
                      onValueChange={(v) => setJarsOwnedByCustomer(Number(v))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[0, 1, 2, 3, 4, 5].map((n) => (
                          <SelectItem key={n} value={String(n)}>
                            {n}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Engaged jars</Label>
                    <Select
                      value={String(engagedJars)}
                      onValueChange={(v) => setEngagedJars(Number(v))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[0, 1, 2, 3, 4, 5].map((n) => (
                          <SelectItem key={n} value={String(n)}>
                            {n}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Market segment</Label>
                    <Select
                      value={marketSegment}
                      onValueChange={(v) => setMarketSegment(v as MarketSegment)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MARKET_SEGMENTS.map((segment) => (
                          <SelectItem key={segment.id} value={segment.id}>
                            {segment.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </Section>
            )}

            {/* ORDER DETAILS */}
            <Section
              icon={<CalendarDays className="h-5 w-5" />}
              title="Order details"
            >
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div className="space-y-2 flex flex-col">
                  <Label>Order type</Label>
                  <Select value={orderType} onValueChange={handleOrderType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="retail">Retail</SelectItem>
                      <SelectItem value="delivery">Delivery</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 flex flex-col">
                  <Label>Sale date</Label>
                  <DatePicker
                    dateFormat={"dd/MM/yyyy"}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm outline-none transition-colors focus:ring-1 focus:ring-ring"
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
            </Section>



            {/* ITEMS */}
            <Section
              icon={<Package className="h-5 w-5" />}
              title="Items"
              description="Products included on this invoice."
              action={
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
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
                >
                  <Plus className="mr-1 h-4 w-4" />
                  Add item
                </Button>
              }
            >
              {items.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-200 py-10 text-center text-sm text-gray-400">
                  No items yet. Click “Add item” to get started.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[620px] text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs uppercase tracking-wide text-gray-500">
                        <th className="w-10 px-3 py-2 font-medium">#</th>
                        <th className="px-3 py-2 font-medium">Item</th>
                        <th className="w-28 px-3 py-2 font-medium">Qty</th>
                        <th className="w-24 px-3 py-2 font-medium">Price</th>
                        <th className="w-28 px-3 py-2 text-right font-medium">Total</th>
                        <th className="w-12 px-3 py-2"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {items.map((item, index) => (
                        <tr key={index} className="hover:bg-gray-50/60">
                          <td className="px-3 py-2 text-gray-400">{index + 1}</td>
                          <td className="px-3 py-2">
                            <Select
                              value={item.name}
                              onValueChange={(value) => {
                                const newItems = [...items]
                                newItems[index].name = value
                                const product = products?.find(
                                  (product: Product) => product.name === value
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
                            >
                              <SelectTrigger className="min-w-[150px]">
                                <SelectValue placeholder="Select item" />
                              </SelectTrigger>
                              <SelectContent>
                                {products?.map((product: Product) => (
                                  <SelectItem key={product._id} value={product.name}>
                                    {product.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-3 py-2">
                            <Input
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
                              className="w-24"
                            />
                          </td>
                          <td className="px-3 py-2 text-gray-600">
                            ₹{item.name === "Refill" ? customer?.profileRate : item.price}
                          </td>
                          <td className="px-3 py-2 text-right font-semibold text-gray-900">
                            <CurrencyFormat
                              value={isNaN(item.total) ? 0 : item.total}
                              displayType={"text"}
                              thousandSeparator
                              prefix={"₹"}
                              renderText={(value: string) => <>{value}</>}
                            />
                          </td>
                          <td className="px-3 py-2 text-right">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="text-gray-400 hover:text-red-600"
                              onClick={() => {
                                const newItems = [...items]
                                newItems.splice(index, 1)
                                setItems(newItems)
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Section>

            {/* DELIVERY & DRIVER */}
            <Section
              icon={<Truck className="h-5 w-5" />}
              title="Delivery & driver"
            >
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                {orderType !== "retail" && customer === null && (
                  <>
                    <div className="space-y-2">
                      <Label>Area</Label>
                      <Select value={address} onValueChange={(v) => setAddress(v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select area" />
                        </SelectTrigger>
                        <SelectContent>
                          {areas?.map((area) => (
                            <SelectItem
                              key={area._id}
                              value={area.name}
                              disabled={!area.serviceable}
                            >
                              {area.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Landmark</Label>
                      <div className="relative">
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                          <MapPin className="h-4 w-4" />
                        </span>
                        <Input
                          value={landmark}
                          onChange={(e) => setLandmark(e.target.value)}
                          placeholder="Nearby landmark"
                          className="pl-9"
                        />
                      </div>
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <Label>Driver</Label>
                  <Select
                    value={driverID}
                    onValueChange={(v) => {
                      setDriverID(v);
                      setCookie("_selectedDriverID", v);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select driver" />
                    </SelectTrigger>
                    <SelectContent>
                      {drivers
                        ?.filter((driver) => driver.status === "active")
                        .map((driver) => (
                          <SelectItem key={driver._id} value={driver._id}>
                            {driver.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Section>
          </div>

          {/* RIGHT: order summary */}
          <div className="xl:col-span-1">
            <div className="xl:sticky xl:top-6">
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