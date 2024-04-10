import Wrapper from "@/components/Wrapper";
import useAxiosInstance from "@/lib/hooks/useAxiosInstance";
import useCustomers from "@/lib/hooks/useCustomers";
import useRefreshTokenRotation from "@/lib/hooks/useRefreshToken";
import { useCustomersStore } from "@/store/customers.store";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import Modal from "react-modal";
import { MdCancelPresentation } from "react-icons/md";
import toast from "react-hot-toast";
import HeaderMenu from "@/components/Customer/HeaderMenu";
import useInvoice from "@/lib/hooks/useInvoice";
import { useInvoicesStore } from "@/store/invoices.store";
import { Area, Invoice, Product } from "@/types/types";
import { getCookie, setCookie } from "cookies-next";
import CustomerInvoicesData from "@/components/Customer/CustomerInvoicesData";
import { calculatePurchasePattern } from "@/lib/calculateCustomerPurchasePattern";
import CurrencyFormat from "react-currency-format";
import { IoReturnUpBackOutline } from "react-icons/io5";

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

const Customers = () => {
  const { customers, setCustomers } = useCustomersStore();
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

  function openModal() {
    setModalIsOpen(true);
  }

  function closeModal() {
    setModalIsOpen(false);
  }

  // Reset Customer State
  const resetCustomerState = () => {
    setSelectedCustomer(undefined);
    setCustomersState(customers);
    setSelectedCustomerID(undefined);
    toast.success("Data updated successfully");
  };

  // Create axios instance
  const axiosInstance = useAxiosInstance(session);

  // Hooks
  useRefreshTokenRotation(axiosInstance);
  useCustomers(axiosInstance, session);
  useInvoice(axiosInstance, session);

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
            (customer) => customer.userID === selectedCustomer.userID
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

  const checkIfUserPurchasedJar = (customerID: string) => {
    if (!invoices) return false;
    const customerInvoices = invoices.filter(
      (invoice) => invoice.customerID === customerID
    );

    if (customerInvoices.length === 0) return false;

    const purchasedJar = customerInvoices.some((invoice) =>
      invoice.products.some(
        (product) =>
          product.id === "65d39d92e47ffdfd6db8c898" ||
          product.id === "65d1c8a73a2e530a5997ca57"
      )
    );

    return purchasedJar;
  };

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
  const handleOnsearch = (searchTerm: string, searchBy: "id" | "name") => {
    if (!searchTerm) {
      setCustomersState(customers);
    }
    if (!searchTerm) {
      setCustomersState((prev) => {
        if (!prev) return;
        return prev;
      });
    } else {
      if (!customers) return;
      setCustomersState(
        customers.filter((customer) => {
          if (searchBy === "id") {
            return customer.userID.toString().includes(searchTerm);
          } else {
            if (!customer.name) return;
            return customer.name
              .toLowerCase()
              .includes(searchTerm.toLowerCase());
          }
        })
      );
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
        setCustomers((prev) => {
          if (!prev) return;
          const index = prev.findIndex(
            (customer) => customer.userID === userID
          );
          prev[index].isRegular = !isRegular;
          return prev;
        });

        setCustomersState((prev) => {
          if (!prev) return;
          const index = prev.findIndex(
            (customer) => customer.userID === userID
          );
          prev[index].isRegular = !isRegular;
          return prev;
        });

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
              invoice.customerID === customer._id &&
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
    <Wrapper name="Cutomers">
      <Modal
        isOpen={modalIsOpen}
        onRequestClose={closeModal}
        style={customStyles}
        contentLabel="Summary Modal"
      >
        <div className="bg-white h-[90%] relative md:h-10/12 w-full md:w-1/2 rounded-lg">
          <MdCancelPresentation
            onClick={closeModal}
            className="absolute top-2 z-50 right-2 cursor-pointer text-4xl text-black"
          />
          {!showSummary ? (
            <div className="flex flex-col w-full px-6 md:px-10 pt-16">
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
                      ...selectedCustomer.address,
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
                      ...selectedCustomer.address,
                      landmark: e.target.value,
                    },
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
        purchasePatternData={purchasePatternData}
        invoices={invoices}
        resetCustomers={resetCustomerState}
        onSearch={handleOnsearch}
        customers={customersState}
        MasterCustomersState={customers}
        setCustomers={setCustomersState}
      />

      <div className="relative overflow-x-auto mt-10 shadow-md sm:rounded-lg">
        {/*
         * Render Table
         */}
        <table className="w-full text-sm text-left text-gray-500 ">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50">
            <tr className="">
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
              <th scope="col" className="px-6 py-3">
                Jar Purchased
              </th>

              <th scope="col" className="px-6 py-3">
                Purchase Interval
              </th>
              <th scope="col" className="px-6 py-3">
                Period since last
              </th>

              <th scope="col" className="px-6 py-3">
                Total Due
              </th>

              <th scope="col" className="px-6 py-3">
                Address
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
                if (!invoices) return null;
                let purchasedJar = checkIfUserPurchasedJar(customer._id);

                let lastPurchaseDate = new Date(
                  invoices
                    .filter((invoice) => invoice.customerID === customer._id)
                    .sort((a, b) => {
                      return (
                        new Date(b.invoiceDate).getTime() -
                        new Date(a.invoiceDate).getTime()
                      );
                    })[0]?.invoiceDate
                );

                let todayDate = new Date();

                let purchaseInterval = purchasePatternData
                  .filter((pattern) => pattern.customerID === customer._id)
                  .map((pattern) => {
                    if (!pattern.averageIntervalDays) return 0;
                    return Math.abs(Math.round(pattern.averageIntervalDays));
                  })[0];

                const diffTime = Math.abs(
                  lastPurchaseDate.getTime() - todayDate.getTime()
                );

                // Calculate the interval between today and last purchase date
                let differenceInDays = Math.ceil(
                  diffTime / (1000 * 60 * 60 * 24)
                );

                return (
                  <tr
                    key={customer._id}
                    className="bg-white  border-b 0  hover:bg-gray-50 "
                  >
                    <td className="px-6 text-gray-900 w-full h-full mt-6 flex justify-center">
                      <input
                        id={`regular-${customer.userID}`}
                        type="checkbox"
                        value=""
                        onChange={() =>
                          handleUpdateRegularity(
                            customer.userID,
                            customer.isRegular
                          )
                        }
                        checked={customer.isRegular}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded"
                      />
                    </td>
                    <td className="px-6 py-4 text-gray-900 font-medium">
                      {customer.userID.toString()}
                    </td>
                    <th
                      scope="row"
                      className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap "
                    >
                      {customer.name}
                    </th>
                    <td className="px-6 py-4 text-gray-900">
                      {customer.phone}
                    </td>

                    <td
                      className={`px-6 py-4 font-medium ${
                        purchasedJar ? "text-green-600" : "text-red-500"
                      }`}
                    >
                      {purchasedJar ? "Yes" : "No"}
                    </td>

                    {/* Purchase Pattern */}
                    <td className="px-6 py-4 text-gray-900">
                      <span className="font-semibold">
                        {purchaseInterval}
                        <span className="text-xs font-normal"> day/s</span>
                      </span>
                    </td>

                    <td className="px-6 py-4 text-gray-900">
                      {
                        <span
                          className={`font-semibold ${
                            differenceInDays <= purchaseInterval
                              ? "text-green-600"
                              : "text-red-500"
                          }`}
                        >
                          {differenceInDays}
                          <span className="text-xs font-normal"> day/s</span>
                        </span>
                      }
                    </td>

                    {/* Total Due */}
                    <td className="px-6 py-4 text-gray-900">
                      <CurrencyFormat
                        value={invoices
                          .filter(
                            (invoice) =>
                              invoice.status === "pending" &&
                              invoice.customerID === customer._id
                          )
                          .reduce((acc, curr) => acc + curr.due, 0)
                          .toString()}
                        displayType={"text"}
                        thousandSeparator={true}
                        prefix={"₹"}
                        decimalScale={0}
                        fixedDecimalScale={true}
                      />
                    </td>

                    {/* Address */}
                    <td className="px-6 py-4 text-gray-900">
                      {customer.address?.text}
                    </td>

                    {/* Created At */}
                    <td className="px-6 py-4 text-gray-900">
                      {new Date(customer.createdAt).toLocaleDateString()}
                    </td>

                    {/* Action Button */}
                    <td className="flex items-center px-6 py-4">
                      <span
                        onClick={async () => {
                          setSelectedCustomerID(customer.userID);
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
                          setSelectedCustomerID(customer.userID);
                          setShowSummary(true);
                          setSelectedCustomerInvoices(
                            invoices.filter(
                              (invoice) => invoice.customerID === customer._id
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
    </Wrapper>
  );
};

export default Customers;
