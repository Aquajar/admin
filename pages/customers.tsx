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
import CurrencyFormat from "react-currency-format";
import { Area, Customer } from "@/types/types";
import { getCookie, setCookie } from "cookies-next";

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
    padding: "1rem",
    background: "none",
    alignItems: "center",
    justifyContent: "center",
    display: "flex",
  },
};

const Customers = () => {
  const { customers, setCustomers } = useCustomersStore();
  const { data: session } = useSession();
  const [modalIsOpen, setIsOpen] = useState(false);
  const [selectedCustomerID, setSelectedCustomerID] = useState<Number>();
  const [showSummary, setShowSummary] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>();
  const { invoices, setInvoices } = useInvoicesStore();
  const [customersState, setCustomersState] = useState(customers);
  const [areas, setAreas] = useState<Area[] | undefined>(undefined);

  function openModal() {
    setIsOpen(true);
  }

  function closeModal() {
    setIsOpen(false);
  }

  // Create axios instance
  const axiosInstance = useAxiosInstance(session);

  console.log("session", session);

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

  return (
    <Wrapper name="Cutomers">
      <Modal
        isOpen={modalIsOpen}
        onRequestClose={closeModal}
        style={customStyles}
        contentLabel="Summary Modal"
      >
        <div className="bg-white h-[90%] relative md:h-10/12 w-full md:w-1/3 rounded-lg">
          <MdCancelPresentation
            onClick={closeModal}
            className="absolute top-2 right-2 cursor-pointer text-4xl text-black"
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
                value={selectedCustomer?.address?.text}
                onChange={(e) =>
                  setSelectedCustomer({
                    ...selectedCustomer,
                    address: { text: e.target.value },
                  })
                }
                className="w-full p-2 mt-2 border border-gray-300 rounded-lg"
              >
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
                    address: { landmark: e.target.value },
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
            <iframe
              className="rounded-xl"
              src={`https://link.aquajar.in/bills/${selectedCustomerID}`}
              width="100%"
              height="100%"
              allowFullScreen
            ></iframe>
          )}
        </div>
      </Modal>
      {/*
       * Render Search Bar
       */}
      <HeaderMenu
        onSearch={handleOnsearch}
        customers={customersState}
        setCustomers={setCustomersState}
      />

      <div className="relative overflow-x-auto mt-5 shadow-md sm:rounded-lg">
        {/*
         * Render Table
         */}
        <table className="w-full text-sm text-left text-gray-500 ">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50">
            <tr className="">
              <th scope="col" className="p-4">
                <div className="flex items-center">
                  <input
                    id="checkbox-all-search"
                    type="checkbox"
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded"
                  />
                  <label htmlFor="checkbox-all-search" className="sr-only">
                    checkbox
                  </label>
                </div>
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
                CreatedAt
              </th>

              <th scope="col" className="px-6 py-3">
                Address
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
                return (
                  <tr
                    key={customer._id}
                    className="bg-white  border-b 0  hover:bg-gray-50 "
                  >
                    <td className="w-4 p-4">
                      <div className="flex items-center">
                        <input
                          id="checkbox-table-search-1"
                          type="checkbox"
                          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded "
                        />
                        <label
                          htmlFor="checkbox-table-search-1"
                          className="sr-only"
                        >
                          checkbox
                        </label>
                      </div>
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
                    <td className="px-6 py-4">
                      {new Date(customer.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">{customer.address?.text}</td>
                    <td className="flex items-center px-6 py-4">
                      <span
                        onClick={() => {
                          setShowSummary(false);
                          setSelectedCustomer(customer);
                          setSelectedCustomerID(customer.userID);
                          openModal();
                        }}
                        className="font-medium text-blue-600 cursor-pointer  hover:underline"
                      >
                        Edit
                      </span>
                      <span
                        onClick={() => {
                          setShowSummary(true);
                          setSelectedCustomerID(customer.userID);
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
