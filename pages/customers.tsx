import Wrapper from "@/components/Wrapper";
import useAxiosInstance from "@/lib/hooks/useAxiosInstance";
import useRefreshTokenRotation from "@/lib/hooks/useRefreshToken";
import { useCustomersStore } from "@/store/customers.store";
import { useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import Modal from "react-modal";
import { MdCancelPresentation } from "react-icons/md";
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

Modal.setAppElement("#__next");

const customStyles = {
  overlay: {
    backgroundColor: "rgba(0, 0, 0, 0.75)",
  },
  content: {
    top: "50%",
    left: "50%",
    right: "auto",
    bottom: "auto",
    width: "100%",
    marginRight: "-50%",
    transform: "translate(-50%, -50%)",
    height: "100%",
    padding: "0.5rem",
    background: "none",
    alignItems: "center",
    justifyContent: "center",
    display: "flex",
  },
};

const BreadCrumb = [
  {
    name: "Customers",
    href: "/customers",
  },
];

const Customers = () => {
  const { customers, setCustomers } = useCustomersStore();
  const [limit, setLimit] = useState(20);
  const [page, setPage] = useState(1);
  const { data: session } = useSession();
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [selectedCustomerID, setSelectedCustomerID] = useState<number>();
  const [showSummary, setShowSummary] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>();
  const { invoices, setInvoices } = useInvoicesStore();
  const [customersState, setCustomersState] = useState(customers);
  const [areas, setAreas] = useState<Area[] | undefined>(undefined);
  const [products, setProducts] = useState<Product[] | undefined>(undefined);
  const [selectedCustomerInvoices, setSelectedCustomerInvoices] = useState<
    Invoice[] | undefined
  >(undefined);
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

  const daysAgo = (date: Date): number =>
    Math.floor((new Date().getTime() - date.getTime()) / (24 * 60 * 60 * 1000));

  function openModal() {
    setModalIsOpen(true);
  }

  function closeModal() {
    setModalIsOpen(false);
  }

  // Reset Customer State
  const resetCustomerState = () => {
    setAutoLoad(true);
    setSelectedCustomer(undefined);
    setCustomersState(customers);
    setSelectedCustomerID(undefined);
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
    if (initialLoad.current) {
      // Load customers on initial render
      getCustomers(1);
      initialLoad.current = false;
    }
  }, []);

  // Update Customer Details
  const handleSave = () => {
    const payload = selectedCustomer;

    const URL = process.env.NEXT_PUBLIC_API_URL + "/user/update";
    const promise = axiosInstance.put(URL, payload);

    toast.promise(promise, {
      loading: "Updating Customer",
      success: (res) => {
        // Update the customer in the store
        setCustomers((prev) => {
          if (!prev) return;
          const index = prev.findIndex(
            (customer) => customer?.userID === selectedCustomer?.userID
          );
          prev[index] = selectedCustomer;
          return prev;
        });

        closeModal();
        return res.data.message;
      },
      error: "Error Updating Customer",
    });
  };

  // const checkIfUserPurchasedJar = (customerID: string) => {
  //   if (!invoices) return false;
  //   const customerInvoices = invoices.filter(
  //     (invoice) => invoice.customerID === customerID
  //   );

  //   if (customerInvoices.length === 0) return false;

  //   const purchasedJar = customerInvoices.some((invoice) =>
  //     invoice.products.some(
  //       (product) =>
  //         product.id === "65d39d92e47ffdfd6db8c898" ||
  //         product.id === "65d1c8a73a2e530a5997ca57"
  //     )
  //   );

  //   return purchasedJar;
  // };

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
      // Fetch products from cookies
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
          .replace(/\B(?=(\d{3})+(?!\d))/g, ",")
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
      <Modal
        isOpen={modalIsOpen}
        onRequestClose={closeModal}
        style={customStyles}
        contentLabel="Summary Modal"
      >
        <div className="bg-white h-fit relative md:h-10/12 w-full md:w-1/2 rounded-lg">
          <MdCancelPresentation
            onClick={closeModal}
            className="absolute top-2 z-50 mx-2 md:mx-0 md:right-2 cursor-pointer text-4xl text-black"
          />
          {!showSummary ? (
            <div className="flex flex-col w-full px-6 md:px-10 py-8">
              <label htmlFor="name" className="text-gray-600">
                Name
              </label>
              <input
                type="text"
                id="name"
                value={selectedCustomer?.name}
                onChange={(e) =>
                  setSelectedCustomer({
                    ...selectedCustomer,
                    name: e.target.value,
                  })
                }
                className="w-full p-2 mt-2 border border-gray-300 rounded-lg"
              />
              <label htmlFor="phone" className="text-gray-600 mt-5">
                Phone Number
              </label>
              <input
                type="text"
                id="phone"
                name="phone"
                value={selectedCustomer?.phone}
                onChange={(e) =>
                  setSelectedCustomer({
                    ...selectedCustomer,
                    phone: e.target.value,
                  })
                }
                className="w-full p-2 mt-2 border border-gray-300 rounded-lg"
              />
              <label htmlFor="address" className="text-gray-600 mt-5">
                Area
              </label>
              <select
                id="address"
                name="address"
                value={selectedCustomer?.address?.text || "Select Area"}
                onChange={(e) =>
                  setSelectedCustomer({
                    ...selectedCustomer,
                    address: {
                      ...selectedCustomer?.address,
                      text: e.target.value,
                    },
                  })
                }
                className="w-full p-2 mt-2 border border-gray-300 rounded-lg"
              >
                <option selected={!selectedCustomer?.address?.text} disabled>
                  Select Area
                </option>
                {areas?.map((area) => (
                  <option
                    disabled={area.serviceable === false}
                    selected={area.name === selectedCustomer?.address?.text}
                    key={area._id}
                    value={area.name}
                  >
                    {area.name}
                  </option>
                ))}
              </select>
              <label htmlFor="landmark" className="text-gray-600 mt-5">
                Landmark
              </label>
              <input
                type="text"
                id="landmark"
                name="landmark"
                value={selectedCustomer?.address?.landmark}
                onChange={(e) =>
                  setSelectedCustomer({
                    ...selectedCustomer,
                    address: {
                      ...selectedCustomer?.address,
                      landmark: e.target.value,
                    },
                  })
                }
                className="w-full p-2 mt-2 border border-gray-300 rounded-lg"
              />

              {/* Subscription Type */}
              <label htmlFor="address" className="text-gray-600 mt-5">
                Payment Plan
              </label>
              <select
                id="paymentPlan"
                name="paymentPlan"
                onChange={(e) =>
                  setSelectedCustomer({
                    ...selectedCustomer,
                    paymentPlan: e.target.value,
                  })
                }
                className="w-full p-2 mt-2 border border-gray-300 rounded-lg"
              >
                <option
                  value="D"
                  selected={selectedCustomer?.paymentPlan === "D"}
                >
                  Daily
                </option>
                <option
                  value="W"
                  selected={selectedCustomer?.paymentPlan === "W"}
                >
                  Weekly
                </option>
                <option
                  value="M"
                  selected={
                    selectedCustomer?.paymentPlan === "M" ||
                    selectedCustomer?.paymentPlan === undefined
                  }
                >
                  Monthly
                </option>
              </select>

              {/* Profile Rate */}
              <label htmlFor="profileRate" className="text-gray-600 mt-5">
                Profile Rate
              </label>
              <input
                type="number"
                id="profileRate"
                name="profileRate"
                value={selectedCustomer?.profileRate}
                onChange={(e) =>
                  setSelectedCustomer({
                    ...selectedCustomer,
                    profileRate: parseInt(e.target.value),
                  })
                }
                className="w-full p-2 mt-2 border border-gray-300 rounded-lg"
              />

              <button
                onClick={handleSave}
                className="w-full p-2 mt-10 bg-blue-600 text-white rounded-lg"
              >
                Save
              </button>
            </div>
          ) : (
            <CustomerInvoicesData
              resetCustomerState={resetCustomerState}
              products={products}
              invoices={selectedCustomerInvoices}
              setModalIsOpen={setModalIsOpen}
              setInvoices={setInvoices}
              selectedCustomerID={selectedCustomerID}
            />
          )}
        </div>
      </Modal>
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

      <div className="relative overflow-x-auto mt-2 shadow-md sm:rounded-lg">
        {/*
         * Render Table
         */}
        <table
          ref={tableRef}
          className="w-full text-sm text-left text-gray-500 "
        >
          <thead className="text-xs text-gray-700 uppercase bg-gray-50">
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

              <th scope="col" className="px-6 py-3">
                Total Due (Rs.)
              </th>
              <th scope="col" className="px-6 py-3">
                Plan
              </th>

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
                Action
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

                const customerInvoices = invoices?.filter((v) =>
                  customer.invoices.includes(v.invoiceID)
                );

                const totalDue = customerInvoices?.reduce(
                  (total, invoice) => total + invoice.due,
                  0
                );

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
                          className={`font-semibold ${
                            customer?.isRegular
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
                    <td className="px-2  text-center py-4 text-gray-900 font-medium">
                      <CurrencyFormat
                        value={totalDue}
                        displayType={"text"}
                        thousandSeparator={true}
                        prefix={""}
                        decimalScale={0}
                        fixedDecimalScale={true}
                      />
                    </td>

                    {/* Payment Plan */}
                    <td className="px-2  text-center py-4 text-gray-900">
                      {customer?.paymentPlan}
                    </td>

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
                    <td className="flex items-center px-2 text-center py-4">
                      <span
                        onClick={async () => {
                          setSelectedCustomerID(customer?.userID);
                          setSelectedCustomer(customer);
                          setShowSummary(false);
                          openModal();
                        }}
                        className="font-medium text-blue-600 cursor-pointer  hover:underline"
                      >
                        Edit
                      </span>
                      <span
                        onClick={() => {
                          setSelectedCustomerID(customer?.userID);
                          setShowSummary(true);
                          setSelectedCustomerInvoices(
                            invoices?.filter(
                              (invoice) => invoice.customerID === customer?._id
                            )
                          );
                          openModal();
                        }}
                        className="font-medium cursor-pointer text-green-600 hover:underline ms-3"
                      >
                        Summary
                      </span>
                      <a
                        href="#"
                        className="font-medium text-red-600 hover:underline ms-3"
                      >
                        Remove
                      </a>
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
