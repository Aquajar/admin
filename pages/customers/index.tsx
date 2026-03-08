import Wrapper from "@/components/Wrapper";
import useAxiosInstance from "@/lib/hooks/useAxiosInstance";
import useRefreshTokenRotation from "@/lib/hooks/useRefreshToken";
import { useCustomersStore } from "@/store/customers.store";
import { useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { BiLoaderAlt } from "react-icons/bi";
import toast from "react-hot-toast";
import HeaderMenu from "@/components/Customer/HeaderMenu";
import useInvoice from "@/lib/hooks/useInvoice";
import { useInvoicesStore } from "@/store/invoices.store";
import { Area, Customer, Invoice, Product } from "@/types/types";
import { getCookie, setCookie } from "cookies-next";
import CustomerInvoicesData from "@/components/Customer/CustomerInvoicesData";
import { calculatePurchasePattern } from "@/lib/calculateCustomerPurchasePattern";
import CurrencyFormat from "react-currency-format";
import {
  Cloud,
  CreditCard,
  Github,
  Keyboard,
  LifeBuoy,
  LogOut,
  Mail,
  MessageSquare,
  Plus,
  PlusCircle,
  Settings,
  User,
  UserPlus,
  Users,
  EllipsisVertical,
  MessageCirclePlus,
  MessageSquareCode,
  ReceiptText,
  FileUp,
  ClipboardCopy
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"


import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

import { daysAgo } from "@/lib/helpers";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/router";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";

const BreadCrumb = [
  {
    name: "Customers",
    href: "/customers",
  },
];

const Customers = () => {
  const { customers, setCustomers, customersState, setCustomersState } = useCustomersStore();
  const [limit, setLimit] = useState(20);
  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false)
  const [isUploadCardModalOpen, setIsUploadCardModalOpen] = useState(false)
  const [selectedPhoneForMessage, setSelectedPhoneForMessage] = useState("")
  const [selectedLanguage, setSelectedLanguage] = useState<"eng" | "hindi" | "bng">("eng");
  const [page, setPage] = useState(1);
  const { data: session } = useSession();
  const { invoices } = useInvoicesStore();
  // const [customersState, setCustomersState] = useState(customers);
  const [areas, setAreas] = useState<Area[] | undefined>(undefined);
  const [products, setProducts] = useState<Product[] | undefined>(undefined);
  const [purchasePatternData, setPurchasePatternData] = useState<
    {
      customerID: string;
      averageIntervalDays?: number;
      purchasePattern: "daily" | "irregular";
      isNeedToday?: boolean;
    }[]
  >([]);
  const [hasMore, setHasMore] = useState(true); // Check if more data is available
  const [loading, setLoading] = useState(false); // Manage loading state
  const [autoLoad, setAutoLoad] = useState(true);

  // Filter key states
  const [sortByArea, setSortByArea] = useState<"all" | Area["name"]>("all");
  const [sortByRegularity, setSortByRegularity] = useState<
    "all" | "true" | "false"
  >("all");

  const initialLoad = useRef<boolean>(true); // Track initial render
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);
  const tableRef = useRef<HTMLTableElement | null>(null);
  const loaderRef = useRef<HTMLDivElement | null>(null);


  function createWhatsAppWebURL(phone: string, message: string): string {
    const encodedMessage = encodeURIComponent(message);
    return `https://web.whatsapp.com/send?phone=91${phone}&text=${encodedMessage}`;
  }

  function generateUpiLink(
    upiId: string, // Your UPI ID (e.g., "yourupi@upi")
    name: string, // Payee name
    amount?: number, // Amount (optional)
    transactionId?: string, // Unique transaction ID (optional)
    note?: string // Payment note (optional)
  ): string {
    const baseUrl = "upi://pay?";
    const params = new URLSearchParams({
      pa: upiId, // Payee UPI ID
      pn: name, // Payee Name
      tr: Math.floor(100000000000 + Math.random() * 900000000000).toString(), // Unique transaction ID
      tn: note || "Payment", // Transaction note
      cu: "INR", // Currency
    });

    if (amount) {
      params.append("am", amount.toString()); // Add amount if provided
    }

    return `${baseUrl}${params.toString()}`;
  }


  const handleSendPaymentRequest = async () => {

    const upiUrl = generateUpiLink("sid86harth-7@okaxis", "AQUAJAR", 0)

    const response = await fetch("https://api.tinyurl.com/create", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.NEXT_PUBLIC_TINYURL_ACCESS_TOKEN}`, // Replace with your TinyURL API Key
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: upiUrl,
      }),
    });

    const data = await response.json();

    const paymentLink = data.data.tiny_url; // Returns the shortened link

    let message;
    switch (selectedLanguage) {
      case "eng":
        message = `Dear Customer, kindly clear your outstanding amount for *water bill* at your earliest convenience.\n\nClick below to pay securely:\n${paymentLink} \n\nThank you for choosing Aquajar!`;
        break;
      case "hindi":
        message = `प्रिय ग्राहक, कृपया *पानी के बिल* की बकाया राशि को यथाशीघ्र भुगतान करें।\n\nसुरक्षित रूप से भुगतान करने के लिए नीचे क्लिक करें:\n${paymentLink}\n\nAquajar को चुनने के लिए धन्यवाद!`;
        break;
      case "bng":
        message = `প্রিয় গ্রাহক, অনুগ্রহ করে *পানির বিলের* বকেয়া পরিমাণ যত দ্রুত সম্ভব পরিশোধ করুন।\n\nনিরাপদে টাকা দেওয়ার জন্য নিচে ক্লিক করুন:\n${paymentLink}\n\nAquajar বেছে নেওয়ার জন্য ধন্যবাদ!`;
        break;
      default:
        message = `Dear Customer, kindly clear your pending amount at the earliest.\n\nClick below to pay securely:\n${paymentLink} \n\nThank you for choosing Aquajar!`;
        break;
    }

    const link = createWhatsAppWebURL(selectedPhoneForMessage, message);

    window.open(link, "_blank");

    setIsLanguageModalOpen(false);
    setSelectedLanguage("eng");
  }

  const router = useRouter()

  // Reset Customer State
  const resetCustomerState = () => {
    setAutoLoad(true);
    setCustomersState(customers);
    toast.success("Data updated successfully");
  };

  // Create axios instance
  const axiosInstance = useAxiosInstance(session);

  // Hooks
  useRefreshTokenRotation(axiosInstance);
  useInvoice(axiosInstance, session);

  // Fetch customers
  const getCustomers = async (pageNumber: number) => {
    console.log("Getting customers...");
    if (!hasMore || loading) return; // Avoid duplicate calls while loading or if no more data
    if (!autoLoad) return;

    setLoading(true); // Set loading state

    try {
      const URL =
        process.env.NEXT_PUBLIC_API_URL +
        `/user/all?limit=${limit}&page=${pageNumber}`;

      const { data } = await axiosInstance.get(URL);

      if (data?.users.length > 0) {
        setCustomers((prev) => {
          if (!prev) return data.users;

          // Filter out the customers that already exist in the previous state
          const uniqueCustomers = [...prev, ...data.users].filter(
            (value, index, self) =>
              index === self.findIndex((t) => t.userID === value.userID) // Assuming `userID` is the unique identifier
          );

          return uniqueCustomers;
        });

        setCustomersState((prev) => {
          if (!prev) return data.users;

          // Filter out the customers that already exist in the previous state
          const uniqueCustomers = [...prev, ...data.users].filter(
            (value, index, self) =>
              index === self.findIndex((t) => t.userID === value.userID) // Assuming `userID` is the unique identifier
          );

          return uniqueCustomers;
        });

        setPage(pageNumber + 1); // Increment page for the next request
        setHasMore(data.hasMore); // Update `hasMore` based on API response
      } else {
        setHasMore(false); // No more data available
      }
    } catch (error) {
      console.error("Error fetching customers:", error);
      toast.error("Failed to fetch customers");
    } finally {
      setLoading(false); // Reset loading state
    }
  };

  // Initial data load
  useEffect(() => {
    if (initialLoad.current && customers === undefined) {
      // Load customers on initial render
      getCustomers(1);
      initialLoad.current = false;
    }
  }, []);

  // Intersection Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            debounceTimeout.current = setTimeout(() => {
              getCustomers(page);
              debounceTimeout.current = null;
            }, 1000); // Debounce with 1200ms delay
          }
        });
      },
      {
        root: null, // Viewport
        threshold: 0.1, // Trigger when 10% is visible
      }
    );

    if (loaderRef.current) {
      observer.observe(loaderRef.current);
    }

    return () => {
      if (loaderRef.current) {
        observer.unobserve(loaderRef.current);
      }
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, [page, hasMore]);

  // Fetch Areas
  useEffect(() => {
    if (!areas) {
      // Fetch area from cookies
      const cookieAreas = getCookie("areas");
      if (cookieAreas) {
        console.log("Fetching areas from cookies");
        let areas: Area[] = JSON.parse(cookieAreas);
        setAreas(areas);
      } else {
        // Fetch products
        console.log("Fetching products from API");
        const URL = process.env.NEXT_PUBLIC_API_URL + "/area/all";

        axiosInstance.get(URL).then((res) => {
          const areas: Area[] = res.data;
          setAreas(areas);
          setCookie("areas", JSON.stringify(areas), {
            maxAge: 60 * 60 * 24 * 7,
          });
        });
      }
    }
  }, [areas]);

  // Fetch products
  useEffect(() => {
    if (!products) {
      // Fetch products from cookies
      const cookieProducts = getCookie("products");
      if (cookieProducts) {
        setProducts(JSON.parse(cookieProducts));
      } else {
        // Fetch products
        const URL = process.env.NEXT_PUBLIC_API_URL + "/product/all";

        axiosInstance.get(URL).then((res) => {
          const products = res.data.products;
          setProducts(products);
          setCookie("products", JSON.stringify(products), {
            maxAge: 60 * 60 * 24 * 7,
          });
        });
      }
    }
  }, [products]);

  // Handle Search Trigger
  const handleOnsearch = async (
    searchTerm: string,
    searchBy: "id" | "name"
  ) => {
    setAutoLoad(false);
    setLoading(true);
    try {
      if (!customers) return;
      if (searchBy === "id") {
        if (searchTerm.length === 4) {
          const URL =
            process.env.NEXT_PUBLIC_API_URL +
            "/user/find-by-userid/" +
            searchTerm;
          const { data } = await axiosInstance.get(URL);
          console.log(data);
          setCustomersState([data.user]);
        } else {
          toast.error("User ID should be 4 characters.");
        }
      } else {
        let term = searchTerm;
        console.log("Term: " + term);
        if (searchTerm === "") term = "all";
        const URL =
          process.env.NEXT_PUBLIC_API_URL +
          "/user/find-by-name/" +
          term +
          `?area=${sortByArea}&regularity=${sortByRegularity}`;
        const { data } = await axiosInstance.get(URL);
        console.log(data);
        setCustomersState(data.user);
      }
    } catch (error) {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  // handle update regularity
  const handleUpdateRegularity = (userID: number, isRegular: boolean) => {
    const URL = process.env.NEXT_PUBLIC_API_URL + "/user/update";
    const payload = {
      userID,
      isRegular: !isRegular,
    };
    const promise = axiosInstance.put(URL, payload);

    toast.promise(promise, {
      loading: "Updating Customer",
      success: (res) => {
        // Update the customer in the store
        // setCustomers((prev) => {
        //   if (!prev) return;
        //   const index = prev.findIndex(
        //     (customer) => customer?.userID === userID
        //   );
        //   prev[index].isRegular = !isRegular;
        //   return prev;
        // });

        const user = customersState && customersState[0];

        // Update the customer in the store
        setCustomersState((prev) => {
          if (!prev) return;
          const index = prev.findIndex(
            (customer) => customer?.userID === userID
          );
          prev[index] = { ...prev[index], isRegular: !isRegular };
          return prev;
        });

        if (user) {
          user.isRegular = !isRegular;
          setCustomersState((prev) => {
            if (!prev) return;
            const index = prev.findIndex(
              (customer) => customer?.userID === userID
            );
            prev[index] = { ...prev[index], isRegular: !isRegular };
            return prev;
          });
        }

        return res.data.message;
      },
      error: "Error Updating Customer",
    });
  };

  useEffect(() => {
    if (customers) {
      // add new property to customers
      const c = customers.map((customer) => {
        let totalDue = invoices
          ?.filter(
            (invoice) =>
              invoice.customerID === customer?._id &&
              invoice.status === "pending"
          )
          .reduce((acc, curr) => acc + curr.due, 0)
          .toFixed(2)
          .toString()
          ?.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
          .split(".")[0];
        return { ...customer, totalDue };
      });
      setCustomersState(c);
    }
  }, [customers]);

  // Calculate Purchase Pattern
  useEffect(() => {
    if (customers && invoices) {
      const purchasePatternData = calculatePurchasePattern(customers, invoices);
      setPurchasePatternData(purchasePatternData);
    }
  }, [customers, invoices]);

  return (
    <Wrapper breadcrumb={BreadCrumb}>
      {/*
       * Render Search Bar
       */}
      <HeaderMenu
        loading={loading}
        sortByArea={sortByArea}
        setSortByArea={setSortByArea}
        sortByRegularity={sortByRegularity}
        setSortByRegularity={setSortByRegularity}
        tableRef={tableRef}
        purchasePatternData={purchasePatternData}
        invoices={invoices}
        resetCustomers={resetCustomerState}
        onSearch={handleOnsearch}
        customers={customersState}
        MasterCustomersState={customers}
        setCustomers={setCustomersState}
      />

      {/* Language Modal */}
      <Dialog open={isLanguageModalOpen} onOpenChange={setIsLanguageModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Prefered Language</DialogTitle>
            <DialogDescription>
              Choose a language to send the message.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center pb-4 justify-between space-x-5">
            <Select value={selectedLanguage} onValueChange={(value) => setSelectedLanguage(value as "eng" | "hindi" | "bng")}>
              <SelectTrigger>
                <SelectValue placeholder="Select Language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="eng">English</SelectItem>
                <SelectItem value="hindi">Hindi</SelectItem>
                <SelectItem value="bng">Bengali</SelectItem>
              </SelectContent>
            </Select>
            <Button className="px-3" onClick={handleSendPaymentRequest}>
              Continue
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Upload Card Dialog */}
      <Dialog open={isUploadCardModalOpen} onOpenChange={setIsUploadCardModalOpen}>
        <form>
          <DialogContent className="sm:max-w-[425px]">
            <div>
              <InputGroup>
                <InputGroupInput placeholder="Type to search..." />
                <InputGroupAddon align="inline-end">
                  <InputGroupButton variant="secondary">
                    <ClipboardCopy />
                  </InputGroupButton>
                </InputGroupAddon>
              </InputGroup>
            </div>
          </DialogContent>
        </form>
      </Dialog>

      <div className="relative overflow-x-auto mt-2 shadow-md sm:rounded-lg  border border-gray-200">
        {/*
         * Render Table
         */}
        <table
          ref={tableRef}
          className="w-full text-sm text-left text-gray-500 relative"
        >
          <thead className="text-xs text-gray-700 uppercase bg-gray-100 top-0">
            <tr className="text-center">
              <th scope="col" className="px-6 py-3">
                Regular
              </th>
              <th scope="col" className="px-6 py-3">
                ID
              </th>
              <th scope="col" className="px-6 py-3">
                Name
              </th>
              <th scope="col" className="px-6 py-3">
                Phone
              </th>

              {/* <th scope="col" className="px-6 py-3">
                Total Due
              </th> */}

              {/* <th scope="col" className="px-6 py-3">
                Purchase Interval
              </th> */}
              <th scope="col" className="px-6 py-3">
                Last Purchase
              </th>

              {/* <th scope="col" className="px-6 py-3">
                Total Due (Rs.)
              </th> */}
              {/* <th scope="col" className="px-6 py-3">
                Plan
              </th> */}

              {/* <th scope="col" className="px-6 py-3">
                Jar Purchased
              </th> */}

              <th scope="col" className="px-6 py-3">
                Address
              </th>

              <th scope="col" className="px-6 py-3">
                Profile Rate
              </th>

              <th scope="col" className="px-6 py-3">
                CreatedAt
              </th>

              <th scope="col" className="px-6 py-3">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {customersState &&
              customersState.map((customer) => {
                // let purchasedJar = checkIfUserPurchasedJar(customer?._id);

                // let lastPurchaseDate = new Date(
                //   invoices
                //     .filter((invoice) => invoice.customerID === customer?._id)
                //     .sort((a, b) => {
                //       return (
                //         new Date(b.invoiceDate!).getTime() -
                //         new Date(a.invoiceDate!).getTime()
                //       );
                //     })[0]?.invoiceDate!
                // );

                // let todayDate = new Date();

                // let purchaseInterval = purchasePatternData
                //   .filter((pattern) => pattern.customerID === customer?._id)
                //   .map((pattern) => {
                //     if (!pattern.averageIntervalDays) return 0;
                //     return Math.abs(Math.round(pattern.averageIntervalDays));
                //   })[0];

                // const diffTime = Math.abs(
                //   lastPurchaseDate.getTime() - todayDate.getTime()
                // );

                // Calculate the interval between today and last purchase date
                // let differenceInDays =
                //   Math.ceil(diffTime / (1000 * 60 * 60 * 24)) - 1;

                const lastPurchaseDate = customer?.lastPurchaseDate
                  ? daysAgo(new Date(customer?.lastPurchaseDate))
                  : 1;

                return (
                  <tr
                    key={customer?._id}
                    className="bg-white  border-b 0  hover:bg-gray-50 "
                  >
                    <td className="px-2 text-center text-gray-900 w-full h-full mt-6 flex justify-center">
                      <input
                        id={`regular-${customer?.userID}`}
                        type="checkbox"
                        value=""
                        onChange={() =>
                          handleUpdateRegularity(
                            customer?.userID,
                            customer?.isRegular
                          )
                        }
                        checked={customer?.isRegular}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded"
                      />
                    </td>
                    <td className="px-2 text-center py-4 text-gray-900 font-medium">
                      {customer?.userID?.toString()}
                    </td>
                    {/* Name */}
                    <th
                      scope="row"
                      className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap "
                    >
                      {customer?.name}
                    </th>

                    {/* Phone */}
                    <td className="px-2 text-center py-4 text-gray-900">
                      <a href={`tel:+91 ${customer?.phone}`}>
                        {customer?.phone}
                      </a>
                    </td>

                    {/* Total Due */}
                    {/* <td className="px-2 text-center py-4 text-gray-900">
                      <CurrencyFormat
                        value={invoices
                          .filter(
                            (invoice) =>
                              invoice.status === "pending" &&
                              invoice.customerID === customer?._id
                          )
                          .reduce((acc, curr) => acc + curr.due, 0)
                          .toString()}
                        displayType={"text"}
                        thousandSeparator={true}
                        prefix={"₹"}
                        decimalScale={0}
                        fixedDecimalScale={true}
                      />
                    </td> */}

                    {/* Purchase Pattern */}
                    {/* <td className="px-2 text-center py-4 text-gray-900">
                      <span className="font-semibold">
                        {purchaseInterval}
                        <span className="text-xs font-normal"> day/s</span>
                      </span>
                    </td> */}

                    {/* Purchase Interval */}
                    <td className="px-2 text-center py-4 text-gray-900">
                      {
                        <span
                          className={`font-semibold ${customer?.isRegular
                            ? lastPurchaseDate >= 5
                              ? "text-red-500"
                              : "text-green-600"
                            : "text-gray-500"
                            }`}
                        >
                          {
                            <span className="text-sm font-medium ml-1">
                              {lastPurchaseDate} day/s
                            </span>
                          }
                        </span>
                      }
                    </td>

                    {/* Total Due */}
                    {/* <td className="px-2  text-center py-4 text-gray-900 font-medium">
                      <CurrencyFormat
                        value={totalDue}
                        displayType={"text"}
                        thousandSeparator={true}
                        prefix={""}
                        decimalScale={0}
                        fixedDecimalScale={true}
                      />
                    </td> */}

                    {/* Payment Plan */}
                    {/* <td className="px-2  text-center py-4 text-gray-900">
                      {customer?.paymentPlan}
                    </td> */}

                    {/* Jar Purchased */}
                    {/* <td
                      className={`px-2 text-center py-4 font-medium ${
                        purchasedJar ? "text-green-600" : "text-red-500"
                      }`}
                    >
                      {purchasedJar ? "Yes" : "No"}
                    </td> */}

                    {/* Address */}
                    <td className="px-2 w-52 text-center py-4 text-xs text-gray-900">
                      {customer?.address?.landmark !==
                        customer?.address?.text &&
                        `${customer?.address?.landmark}, `}
                      {customer?.address?.text}
                    </td>

                    {/* Profile Rate */}
                    <td className="px-2 text-center py-4 text-gray-900">
                      <CurrencyFormat
                        value={
                          customer?.profileRate ? customer?.profileRate : 25
                        }
                        displayType={"text"}
                        thousandSeparator={true}
                        prefix={"₹"}
                        decimalScale={0}
                        fixedDecimalScale={true}
                      />
                    </td>

                    {/* Created At */}
                    <td className="px-2 text-center py-4 text-gray-900">
                      {new Date(customer?.createdAt).toLocaleDateString()}
                    </td>
                    {/* Action Button */}
                    <td className="flex items-center justify-center px-2 text-center py-4">
                      <DropdownMenu >
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="icon">
                            <EllipsisVertical />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-36">
                          <DropdownMenuLabel>Menu</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuGroup>
                            <DropdownMenuItem
                              onClick={() => router.push("/customers/" + customer.userID + "?tab=profile")}
                            >
                              <User />
                              <span>Profile</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setIsUploadCardModalOpen(true)}>
                              <FileUp />
                              <span>Upload Card</span>
                            </DropdownMenuItem>
                            <DropdownMenuSub>
                              <DropdownMenuSubTrigger>
                                <MessageSquareCode />
                                <span>Message</span>
                              </DropdownMenuSubTrigger>
                              <DropdownMenuPortal>
                                <DropdownMenuSubContent>
                                  <DropdownMenuItem onClick={
                                    () => {
                                      setSelectedPhoneForMessage(customer.phone)
                                      setIsLanguageModalOpen(true)
                                    }
                                  }>
                                    <ReceiptText />
                                    <span>Payment Request</span>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => {
                                    const link = createWhatsAppWebURL(customer.phone, "Hi, greetings from Aquajar!")
                                    window.open(link, '_blank')
                                  }
                                  }>
                                    <MessageSquare />
                                    <span>Message</span>
                                  </DropdownMenuItem>
                                  {/* <DropdownMenuSeparator />
                                  <DropdownMenuItem>
                                    <PlusCircle />
                                    <span>More...</span>
                                  </DropdownMenuItem> */}
                                </DropdownMenuSubContent>
                              </DropdownMenuPortal>
                            </DropdownMenuSub>
                            <DropdownMenuItem
                              onClick={() => router.push("/customers/" + customer.userID + "?tab=monthwise_summary")}
                            >
                              <CreditCard />
                              <span>Billing</span>
                            </DropdownMenuItem>


                          </DropdownMenuGroup>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      {/* <Link
                        href={"/customers/" + customer.userID + "?tab=invoices"}
                        className="font-medium cursor-pointer text-green-600 hover:underline ms-3"
                      >
                        Summary
                      </Link>
                      <a
                        href="#"
                        className="font-medium text-red-600 hover:underline ms-3"
                      >
                        Remove
                      </a> */}
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
      {/*
       * Loader
       */}
      <div ref={loaderRef} className={`mt-8 ${!autoLoad && "hidden"}`}>
        <BiLoaderAlt className="text-4xl mx-auto animate-spin" />
      </div>
    </Wrapper>
  );
};

export default Customers;
