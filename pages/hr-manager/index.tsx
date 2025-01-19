import Wrapper from "@/components/Wrapper";
import React, { useEffect, useState } from "react";
import { MdOutlineRemoveRedEye } from "react-icons/md";
import { GoKebabHorizontal } from "react-icons/go";
import { PiExport } from "react-icons/pi";
import { useSession } from "next-auth/react";
import useAxiosInstance from "@/lib/hooks/useAxiosInstance";
import toast from "react-hot-toast";
import { Staff } from "@/types/types";

const BreadCrumb = [
  {
    href: "/hr-manager",
    name: "Human Resouce",
  },
];

const HRManager = () => {
  const { data: session } = useSession();

  const axiosInstance = useAxiosInstance(session);

  const [staffs, setStaffs] = useState<Staff[] | null>(null);

  const getStaffData = async () => {
    const URL = process.env.NEXT_PUBLIC_API_URL;

    let { data } = await axiosInstance.get(`${URL}/staff`);
    console.log(data);
    setStaffs(data);
  };

  useEffect(() => {
    if (session && !staffs) getStaffData();
  }, [session, staffs]);

  return (
    <Wrapper breadcrumb={BreadCrumb}>
      <div className="p-3 border rounded-xl bg-white">
        <div className="rounded-lg md:p-4">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-4">
            <h2 className="text-lg font-semibold mb-2 md:mb-0">All Employees</h2>
            <div className="flex w-full md:w-fit flex-col md:flex-row gap-4">
              <select className="border border-gray-300 rounded-lg px-4 py-2">
                <option>All Status</option>
                <option>Active</option>
                <option>Inactive</option>
              </select>
              <select className="border border-gray-300 rounded-lg px-4 py-2">
                <option>All Role</option>
                <option>Driver</option>
                <option>Manager</option>
              </select>
              <button className="border border-gray-300 flex items-center px-4 py-2 rounded-lg hover:bg-gray-300">
                <PiExport size={20} className="mr-2" /> Export
              </button>
            </div>
          </div>

          <div className="relative overflow-x-auto sm:rounded-lg">
            <table className="w-full text-left">
              <thead className="uppercase bg-gray-200">
                <tr>
                  {/* <th scope="col" className="p-4">
                    <div className="flex items-center">
                      <input
                        id="checkbox-all-search"
                        type="checkbox"
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 dark:focus:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                      />
                      <label htmlFor="checkbox-all-search" className="sr-only">
                        checkbox
                      </label>
                    </div>
                  </th> */}
                  <th scope="col" className="px-6 py-3 text-xs">
                    Employee ID
                  </th>
                  <th scope="col" className="px-6 py-3 text-xs">
                    Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-xs">
                    Contact
                  </th>

                  <th scope="col" className="px-6 py-3 text-xs">
                    Address
                  </th>
                  <th scope="col" className="px-6 py-3 text-xs">
                    Joining Date
                  </th>
                  <th scope="col" className="px-6 py-3 text-xs">
                    Role
                  </th>
                  <th scope="col" className="px-6 py-3 text-xs">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-xs">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {staffs &&
                  staffs.map((staff) => {
                    return (
                      <tr
                        key={staff._id}
                        className="bg-white border-b  hover:bg-gray-50 "
                      >
                        {/* <td className="w-4 p-4">
                          <div className="flex items-center">
                            <input
                              id="checkbox-table-search-1"
                              type="checkbox"
                              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600  focus:ring-2"
                            />
                            <label
                              htmlFor="checkbox-table-search-1"
                              className="sr-only"
                            >
                              checkbox
                            </label>
                          </div>
                        </td> */}
                        <th
                          scope="row"
                          className="flex items-center px-6 py-4 whitespace-nowrap"
                        >
                          <div className="ps-3">
                            <div className="text-base font-semibold">
                              {staff.employeeID}
                            </div>
                          </div>
                        </th>
                        <td className="px-6 py-4 text-sm text-black capitalize">
                          <div className="">
                            <div className="text-base font-semibold">
                              {staff.name}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-black capitalize">
                          {staff.phone}
                        </td>
                        <td className="px-6 py-4 text-sm text-black capitalize">
                          {staff.address}
                        </td>
                        <td className="px-6 py-4 text-sm text-black capitalize">
                          {new Date(staff.joiningDate).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-sm text-black">
                          <button className="border border-gray-300 rounded-md px-3 font-medium py-0.5 capitalize bg-gray-100">
                            {staff.type}
                          </button>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div className="flex items-center capitalize">
                            <div
                              className={`h-2.5 w-2.5 rounded-full ${
                                staff.status === "active"
                                  ? "bg-green-500"
                                  : "bg-yellow-500"
                              } me-2`}
                            ></div>{" "}
                            {staff.status}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <a
                            href="#"
                            className="font-medium text-blue-600 dark:text-blue-500 hover:underline"
                          >
                            Edit user
                          </a>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Wrapper>
  );
};

export default HRManager;
