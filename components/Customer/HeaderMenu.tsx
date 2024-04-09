import useAxiosInstance from "@/lib/hooks/useAxiosInstance";
import { Area, Customer, Invoice } from "@/types/types";
import { getCookie, setCookie } from "cookies-next";
import { useSession } from "next-auth/react";
import React, { ChangeEvent, useEffect, useState } from "react";
import { FaSearch } from "react-icons/fa";
import { MdOutlineRefresh } from "react-icons/md";

interface HeaderMenuProps {
  onSearch: (searchTerm: string, searchBy: "id" | "name") => void;
  customers: Customer[] | null | undefined;
  MasterCustomersState: Customer[] | null | undefined;
  setCustomers: React.Dispatch<
    React.SetStateAction<Customer[] | null | undefined>
  >;
  resetCustomers: () => void;
  invoices: Invoice[] | null | undefined;
}

const HeaderMenu: React.FC<HeaderMenuProps> = ({
  onSearch,
  customers,
  setCustomers,
  resetCustomers,
  MasterCustomersState,
  invoices,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchBy, setSearchBy] = useState<"id" | "name">("name");
  const [areas, setAreas] = useState<Area[] | null>(null);
  const [address, setAddress] = useState("all");

  const { data: session } = useSession();

  // Create axios instance
  const axiosInstance = useAxiosInstance(session);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  // Handle search bar
  const handleSearch = (e: ChangeEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSearch(searchTerm, searchBy);
  };

  // Handle search label change
  const handleSearchByChange = (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    setSearchBy(event.target.value as "id" | "name");
  };

  // Handle sort by regularity
  const handleSortByRegularity = (isRegular: boolean) => {
    let n = MasterCustomersState?.filter(
      (customer) => isRegular === customer.isRegular
    );
    setCustomers(n);
  };

  // Handle sort by area
  const handleSortByArea = (area: string) => {
    if (area === "all") {
      setCustomers(MasterCustomersState);
      return;
    }
    let n = MasterCustomersState?.filter(
      (customer) => area === customer.address?.text
    );
    setCustomers(n);
  };

  // Handle sort by
  const handleSortBy = (sortBy: string) => {
    
  };

  useEffect(() => {
    if (customers) {
      // sort by totaldue
    }
  }, [customers]);

  // Fetch Areas
  useEffect(() => {
    if (!areas) {
      // Fetch products from cookies
      const cookieAreas = getCookie("areas");
      if (cookieAreas) {
        console.log("Fetching areas from cookies");
        let areas: Area[] = JSON.parse(cookieAreas);
        setAreas(areas);
        setAddress("all");
      } else {
        // Fetch products
        console.log("Fetching products from API");
        const URL = process.env.NEXT_PUBLIC_API_URL + "/area/all";

        axiosInstance.get(URL).then((res) => {
          const areas: Area[] = res.data;
          setAreas(areas);
          setAddress("all");
          setCookie("areas", JSON.stringify(areas), {
            maxAge: 60 * 60 * 24 * 7,
          });
        });
      }
    }
  }, [areas]);

  return (
    <div className="flex flex-col md:flex-row justify-between items-end">
      {/*
       * Search Bar
       */}
      <form onSubmit={handleSearch} className="relative  max-w-md w-full md:w-fit">
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          <FaSearch className="w-5 h-5 text-gray-500" />
        </div>
        <input
          type="text"
          className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full pl-10 pr-36 p-2.5"
          placeholder="Search..."
          value={searchTerm}
          onChange={handleInputChange}
        />
        <button
          type="submit"
          className="absolute inset-y-0 right-0 flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-r-md shadow-sm text-white bg-blue-600 hover:bg-indigo-700"
        >
          Search
        </button>
      </form>
      {/*
       * Search by
       */}
      <div className="flex w-full md:w-fit mt-5 md:mt-0 flex-col">
        <label htmlFor="searchBy" className="text-xs text-gray-500">
          Search By
        </label>
        <select
          id="searchBy"
          className="bg-gray-50 border mt-1.5 cursor-pointer border-gray-300 text-gray-900 text-sm rounded-lg block p-2.5 pr-8"
          value={searchBy}
          onChange={handleSearchByChange}
        >
          <option value="name">Name</option>
          <option value="id">ID</option>
        </select>
      </div>
      {/*
       * Sort by regularity
       */}
      <div className="flex  w-full md:w-fit mt-5 md:mt-0 flex-col">
        <label htmlFor="searchBy" className="text-xs text-gray-500">
          Regularity
        </label>
        <select
          id="searchBy"
          className="bg-gray-50 border cursor-pointer mt-1.5 border-gray-300 text-gray-900 text-sm rounded-lg block p-2.5 pr-4"
          onChange={(e) => handleSortByRegularity(e.target.value === "true")}
        >
          <option value="true">Regular</option>
          <option value="false">Unregular</option>
        </select>
      </div>
      {/*
       * Sort by Area
       */}
      <div className="flex w-full md:w-fit mt-5 md:mt-0 flex-col">
        <label htmlFor="searchBy" className="text-xs text-gray-500">
          Area
        </label>
        <select
          onChange={(e) => handleSortByArea(e.target.value)}
          className="bg-gray-50 border border-gray-300 mt-1.5 text-gray-900 text-sm rounded-lg block p-2.5 pr-8 cursor-pointer"
        >
          <option selected={address === "all"} value="all">
            All
          </option>
          {areas &&
            areas.map((area: Area, index: number) => (
              <option value={area.name} key={index}>
                {area.name}
              </option>
            ))}
        </select>
      </div>
      {/*
       * Sort by
       */}
      <div className="flex w-full md:w-fit mt-5 md:mt-0 flex-col">
        <label htmlFor="searchBy" className="text-xs text-gray-500">
          Sort By
        </label>
        <select
          onChange={(e) => handleSortBy(e.target.value)}
          className="bg-gray-50 border border-gray-300 mt-1.5 text-gray-900 text-sm rounded-lg block p-2.5 pr-8 cursor-pointer"
        >
          <option value="dateCreated">Created Date</option>
          <option value="dueHtoL">Due High to Low</option>
          <option value="dueLtoH">Due Low to High</option>
        </select>
      </div>
      {/*
       * Refresh Button
       */}
      <button
        onClick={resetCustomers}
        className="p-2.5 bg-blue-700 rounded-md text-sm font-medium text-gray-900 w-full md:w-fit mt-6 md:mt-0 flex items-center justify-center"
      >
        <span className="mr-1 text-white">Refresh</span>
        <MdOutlineRefresh className="w-5 h-5 text-white" />
      </button>
    </div>
  );
};

export default HeaderMenu;
