import Wrapper from "@/components/Wrapper";
import useAxiosInstance from "@/lib/hooks/useAxiosInstance";
import useCustomers from "@/lib/hooks/useCustomers";
import useRefreshTokenRotation from "@/lib/hooks/useRefreshToken";
import { useCustomersStore } from "@/store/customers.store";
import { useSession } from "next-auth/react";

const Customers = () => {
  const { customers } = useCustomersStore();
  const { data: session } = useSession();

  // Create axios instance
  const axiosInstance = useAxiosInstance(session);

  // Hooks
  useRefreshTokenRotation(axiosInstance);
  useCustomers(axiosInstance, session);

  return (
    <Wrapper name="Cutomers">
      <div className="relative overflow-x-auto shadow-md sm:rounded-lg">
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
            {customers &&
              customers.map((customer) => {
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
                    <td className="px-6 py-4">
                      {customer.address?.landmark +
                        ", " +
                        customer.address?.text}
                    </td>
                    <td className="px-6 py-4">{customer._id}</td>
                    <td className="flex items-center px-6 py-4">
                      <a
                        href="#"
                        className="font-medium text-blue-600  hover:underline"
                      >
                        Edit
                      </a>
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
