import Wrapper from "@/components/Wrapper";
import useAxiosInstance from "@/lib/hooks/useAxiosInstance";
import CurrencyFormat from "react-currency-format";
import useRefreshTokenRotation from "@/lib/hooks/useRefreshToken";
import { AccoutGroup } from "@/types/types";
import { useSession } from "next-auth/react";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { IoMdAdd } from "react-icons/io";
import { FaUsersBetweenLines } from "react-icons/fa6";

const BreadCrumb = [
  {
    name: "Account Groups",
    href: "/account-groups",
  },
];

const AccountGroup = () => {
  const [accountGroups, setAccountGroups] = useState<AccoutGroup[] | null>(
    null
  );

  const { data: session } = useSession();

  // Create axios instance
  const axiosInstance = useAxiosInstance(session);

  // Hooks
  useRefreshTokenRotation(axiosInstance);

  // Get Account Groups information
  const getAccountGroups = async () => {
    const url = process.env.NEXT_PUBLIC_API_URL + "/user/account-groups";
    try {
      const { data } = await axiosInstance.get(url);
      console.log(data.groups);
      setAccountGroups(data.groups);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (session && accountGroups === null) {
      getAccountGroups();
    }
  }, [accountGroups, session]);

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
        <table className="w-full text-sm text-left rtl:text-right text-black">
          <thead className="text-sm text-black uppercase bg-gray-50">
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
            {accountGroups?.map((group) => {
              return (
                <tr
                  key={group._id}
                  className="bg-white border-b"
                >
                  <th
                    scope="row"
                    className="px-6 py-4 font-medium whitespace-nowrap"
                  >
                    {group.name}
                  </th>
                  <td className="px-6 py-4 text-black font-medium">
                    <CurrencyFormat
                      value={group.accounts
                        .map((account) => account.totalSales)
                        .reduce((a, b) => a + b, 0)
                        .toString()}
                      displayType={"text"}
                      thousandSeparator={true}
                      prefix={"₹"}
                      decimalScale={0}
                      fixedDecimalScale={true}
                    />
                  </td>
                  <td className="px-6 py-4 text-black font-medium">
                    <CurrencyFormat
                      value={group.accounts
                        .map((account) => account.totalOutstanding)
                        .reduce((a, b) => a + b, 0)
                        .toString()}
                      displayType={"text"}
                      thousandSeparator={true}
                      prefix={"₹"}
                      decimalScale={0}
                      fixedDecimalScale={true}
                    />
                  </td>
                  <td className="px-6 py-4">{group.contact}</td>
                  <td className="px-6 py-4">
                    <button
                      type="button"
                      className="relative inline-flex items-center px-5 py-2.5 text-sm font-medium text-center text-white bg-blue-700 rounded-lg hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
                    >
                      <FaUsersBetweenLines size={22} className="mx-2" />
                      <span className="sr-only">Accounts</span>
                      View
                      <div className="absolute inline-flex items-center justify-center w-6 h-6 text-xs font-bold text-white bg-red-500 border-2 border-white rounded-full -top-2 -end-2 dark:border-gray-900">
                        {group.accounts.length}
                      </div>
                    </button>
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

export default AccountGroup;
