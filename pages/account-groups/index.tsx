import Wrapper from "@/components/Wrapper";
import Link from "next/link";
import React from "react";
import { IoMdAdd } from "react-icons/io";

const BreadCrumb = [
  {
    name: "Account Groups",
    href: "/account-groups",
  },
];

const AccountGroup = () => {
  return (
    <Wrapper breadcrumb={BreadCrumb}>
      <div className="md:absolute right-20 md:right-10 flex justify-between space-x-4">
        <Link href={"/account-groups/create"}>
          <button className=" bg-green-400 px-3 shadow-sm py-2 rounded-md flex items-center justify-center">
            Create New <IoMdAdd size={20} className="ml-2" />
          </button>
        </Link>
      </div>
      <div className="relative overflow-x-auto shadow-md sm:rounded-lg mt-5">
        <table className="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
            <tr>
              <th scope="col" className="px-6 py-3">
                Parent name
              </th>
              <th scope="col" className="px-6 py-3">
                <div className="flex items-center">
                  Customer Lifetime Revenue (CLR)
                </div>
              </th>
              <th scope="col" className="px-6 py-3">
                <div className="flex items-center">Outstanding Balance</div>
              </th>
              <th scope="col" className="px-6 py-3">
                <div className="flex items-center">Contact</div>
              </th>
              <th scope="col" className="px-6 py-3">
                <div className="flex items-center">Members</div>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
              <th
                scope="row"
                className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white"
              >
                Apple MacBook Pro 17
              </th>
              <td className="px-6 py-4">Silver</td>
              <td className="px-6 py-4">Laptop</td>
              <td className="px-6 py-4">$2999</td>
              <td className="px-6 py-4">$2999</td>
            </tr>
          </tbody>
        </table>
      </div>
    </Wrapper>
  );
};

export default AccountGroup;
