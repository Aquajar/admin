import Wrapper from "@/components/Wrapper";
import React from "react";
import { IoMdAdd } from "react-icons/io";
import { FaMinusCircle } from "react-icons/fa";

const BreadCrumb = [
  {
    name: "Create Account Group",
    href: "/account-groups/create",
  },
];

const create = () => {
  return (
    <Wrapper breadcrumb={BreadCrumb}>
      <div className="w-full h-full mb-20 flex items-center justify-center">
        {/* Form */}
        <form className="flex flex-col bg-white rounded-xl p-8 mt-4 md:w-1/2">
          <div className="mb-5">
            <label
              htmlFor="name"
              className="block mb-2  font-medium text-gray-900"
            >
              Name
            </label>
            <input
              type="email"
              id="name"
              className="bg-gray-50 border border-gray-300 text-gray-900  rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
              required
            />
          </div>
          <div className="mb-5">
            <label
              htmlFor="description"
              className="block mb-2  font-medium text-gray-900 "
            >
              Description
            </label>
            <textarea
              id="description"
              className="bg-gray-50 border border-gray-300 text-gray-900  rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 "
              required
            />
          </div>
          <div className="mb-5">
            <label
              htmlFor="contact"
              className="block mb-2  font-medium text-gray-900 "
            >
              Contact
            </label>
            <input
              type="contact"
              id="contact"
              className="bg-gray-50 border border-gray-300 text-gray-900  rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 "
              required
            />
          </div>
          <div className="mb-5">
            <label
              htmlFor="contact"
              className="block mb-2  font-medium text-gray-900 "
            >
              Members
            </label>
            <div className="flex justify-between w-full bg-gray-50 border border-gray-300 text-gray-900  rounded-lg p-3">
              <input
                type="text"
                className="w-full mr-4 bg-transparent"
                placeholder="Type user ID"
              />
              <button className="bg-gray-200 rounded-lg px-3 py-1.5 flex items-center justify-center">
                Add
                <IoMdAdd size={20} className="ml-1" />
              </button>
            </div>
            {/* Result */}
            <div className="w-full bg-gray-100 mt-3 rounded-lg border-gray-300 p-3">
              <ul className="max-w-md divide-y divide-gray-200 dark:divide-gray-700">
                <li className="py-2">
                  <div className="flex items-center space-x-4 rtl:space-x-reverse">
                    <div className="flex-shrink-0"></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate dark:text-white">
                        Bonnie Green
                      </p>
                      <p className="text-sm text-gray-500 truncate dark:text-gray-400">
                        email@flowbite.com
                      </p>
                    </div>
                    <div className="inline-flex items-center text-base font-semibold text-gray-900 dark:text-white">
                      <button className="">
                        <FaMinusCircle size={28} className="text-red-500" />
                      </button>
                    </div>
                  </div>
                </li>
              </ul>
            </div>
          </div>

          <button
            type="submit"
            className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg  w-full sm:w-auto mt-2 px-5 py-2.5 text-center"
          >
            Create
          </button>
        </form>
      </div>
    </Wrapper>
  );
};

export default create;
