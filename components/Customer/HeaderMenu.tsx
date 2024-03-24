import { sortByOptions } from "@/lib/constants";
import { Customer, Invoice } from "@/types/types";
import React, { ChangeEvent, useEffect, useState } from "react";
import { FaSearch } from "react-icons/fa";

interface HeaderMenuProps {
  onSearch: (searchTerm: string, searchBy: "id" | "name") => void;
  customers: Customer[] | null | undefined;
  setCustomers: React.Dispatch<
    React.SetStateAction<Customer[] | null | undefined>
  >;
}

const HeaderMenu: React.FC<HeaderMenuProps> = ({
  onSearch,
  customers,
  setCustomers,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchBy, setSearchBy] = useState<"id" | "name">("name");
  const [sortBy, setSortBy] = useState<number>(1);

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

  useEffect(() => {
    if (customers) {
      // sort by totaldue
    }
  }, [customers]);

  return (
    <div className="flex flex-col md:flex-row items-center ">
      {/*
       * Search Bar
       */}
      <form onSubmit={handleSearch} className="relative w-full max-w-md">
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          <FaSearch className="w-5 h-5 text-gray-500" />
        </div>
        <input
          type="text"
          className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full pl-10 pr-28 p-2.5"
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
       * Filter by
       */}
      <div className="md:ml-6 flex items-center w-full md:w-fit mt-5 md:mt-0 flex-row md:flex-row">
        <label
          htmlFor="searchBy"
          className="mr-2 ml-3 md:ml-0 text-sm font-medium text-gray-900"
        >
          Search by
        </label>
        <select
          id="searchBy"
          className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block p-2.5"
          value={searchBy}
          onChange={handleSearchByChange}
        >
          <option value="name">Name</option>
          <option value="id">ID</option>
        </select>
      </div>
    </div>
  );
};

export default HeaderMenu;
