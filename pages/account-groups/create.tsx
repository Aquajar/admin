import Wrapper from "@/components/Wrapper";
import React, { useState } from "react";
import { IoMdAdd } from "react-icons/io";
import { FaMinusCircle } from "react-icons/fa";
import useAxiosInstance from "@/lib/hooks/useAxiosInstance";
import { useSession } from "next-auth/react";
import useRefreshTokenRotation from "@/lib/hooks/useRefreshToken";
import axios from "axios";
import { Customer } from "@/types/types";
import toast from "react-hot-toast";

const Create = () => {
  const [accountGroup, setAccountGroup] = useState({
    accountGroupName: "",
    accountGroupDescription: "",
    accountGroupContact: "",
  });

  const handleOnChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setAccountGroup({ ...accountGroup, [e.target.name]: e.target.value });
  };

  const [inputID, setInputID] = useState<string>("");

  const [resultUser, setResultUser] = useState<Customer[]>([]);

  const { data: session } = useSession();

  // Create axios instance
  const axiosInstance = useAxiosInstance(session);

  // Hooks
  useRefreshTokenRotation(axiosInstance);

  // Function to find the user by ID
  const findUser = async () => {
    const url =
      process.env.NEXT_PUBLIC_API_URL + "/user/find-by-userid/" + inputID;

    if (inputID.length !== 4) {
      toast.error("ID must be 4 characters long");
      return;
    }

    try {
      const { data } = await axios.get(url);
      setResultUser((prev) => [...prev, data.user]);
    } catch (err) {
      console.log(err);
      toast.error("No user found with the specified ID");
    } finally {
      setInputID("");
    }
  };

  // Function to delete the user from state
  const deleteUser = (userID: number) => {
    const index = resultUser.findIndex((user) => user.userID === userID);
    if (index !== -1) {
      setResultUser((prev) => prev.filter((_, i) => i !== index));
    }
  };

  // Function to create the account group
  const createAccountGroup = async () => {
    const url = process.env.NEXT_PUBLIC_API_URL + "/user/account-group/create";

    // Get all selected accounts id
    let users: string[];
    if (resultUser.length > 0) {
      users = resultUser.map((user) => user._id);
    } else {
      users = [];
    }

    const payload = {
      name: accountGroup.accountGroupName,
      description: accountGroup.accountGroupDescription,
      users: users,
      contact: accountGroup.accountGroupContact,
      logo: "",
    };

    try {
      console.log(payload);
      const { data } = await axiosInstance.post(url, payload);
      if (data.groupID) {
        toast.success(`Account group [${data.groupID}] created successfully`);
        setAccountGroup({
          accountGroupName: "",
          accountGroupDescription: "",
          accountGroupContact: "",
        });
        setResultUser([]);
        setInputID("");
      }
    } catch (err) {
      console.log(err);
      toast.error("Failed to create account group");
    }
  };

  return (
    <Wrapper>
      <div className="w-full h-full mb-20 flex items-center justify-center">
        {/* Form */}
        <div className="flex flex-col bg-white rounded-xl p-8 mt-4 md:w-1/2">
          <div className="mb-5">
            <label
              htmlFor="accountGroupName"
              className="block mb-2  font-medium text-gray-900"
            >
              Name
            </label>
            <input
              type="text"
              value={accountGroup.accountGroupName}
              id="accountGroupName"
              name="accountGroupName"
              onChange={handleOnChange}
              className="bg-gray-50 border border-gray-300 text-gray-900  rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
              // required
            />
          </div>
          <div className="mb-5">
            <label
              htmlFor="accountGroupDescription"
              className="block mb-2  font-medium text-gray-900 "
            >
              Description
            </label>
            <textarea
              value={accountGroup.accountGroupDescription}
              id="accountGroupDescription"
              name="accountGroupDescription"
              onChange={handleOnChange}
              className="bg-gray-50 border border-gray-300 text-gray-900  rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 "
              // required
            />
          </div>
          <div className="mb-5">
            <label
              htmlFor="accountGroupContact"
              className="block mb-2  font-medium text-gray-900 "
            >
              Contact
            </label>
            <input
              value={accountGroup.accountGroupContact}
              name="accountGroupContact"
              onChange={handleOnChange}
              type="contact"
              id="accountGroupContact"
              className="bg-gray-50 border border-gray-300 text-gray-900  rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 "
              // required
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
                value={inputID}
                onChange={(e) => setInputID(e.target.value)}
                type="text"
                className="w-full mr-4 bg-transparent"
                placeholder="Type user ID"
              />
              <button
                onClick={findUser}
                className="bg-gray-200 hover:bg-green-400 rounded-lg px-3 py-1.5 flex items-center justify-center"
              >
                Add
                <IoMdAdd size={20} className="ml-1" />
              </button>
            </div>
            {/* Result */}
            <div
              hidden={resultUser.length === 0}
              className="w-full bg-gray-100 mt-3 rounded-lg border-gray-300 p-3"
            >
              <ul className="max-w-md divide-y divide-gray-200 dark:divide-gray-700">
                {resultUser?.map((user) => {
                  return (
                    <li className="py-2" key={user._id}>
                      <div className="flex items-center space-x-4 rtl:space-x-reverse">
                        <div className="flex-shrink-0"></div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate dark:text-white">
                            {user.name}
                          </p>
                          <p className="text-sm text-gray-500 truncate dark:text-gray-400">
                            {user.userID}
                          </p>
                        </div>
                        <div className="inline-flex items-center text-base font-semibold text-gray-900 dark:text-white">
                          <button
                            className=""
                            onClick={() => deleteUser(user.userID)}
                          >
                            <FaMinusCircle size={28} className="text-red-500" />
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          <button
            type="submit"
            onClick={createAccountGroup}
            className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg  w-full sm:w-auto mt-2 px-5 py-2.5 text-center"
          >
            Create
          </button>
        </div>
      </div>
    </Wrapper>
  );
};

export default Create;
