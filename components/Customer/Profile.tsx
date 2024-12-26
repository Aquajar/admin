import { Area, Customer } from "@/types/types";
import axios, { AxiosInstance } from "axios";
import { getCookie } from "cookies-next";
import React, { FC, useEffect, useState } from "react";
import CurrencyFormat from "react-currency-format";
import toast from "react-hot-toast";

interface IProps {
  customer: Customer;
  axiosInstance: AxiosInstance;
  setCustomer: React.Dispatch<React.SetStateAction<Customer | null>>;
}

const Profile: FC<IProps> = ({ customer, axiosInstance, setCustomer }) => {
  const [areas, setAreas] = useState<Area[] | null>(null);
  const [loading, setLoading] = useState(false);

  console.log(customer);

  const handleSave = () => {
    setLoading(true);
    const payload = customer;

    const URL = process.env.NEXT_PUBLIC_API_URL + "/user/update";
    const promise = axiosInstance.put(URL, payload);

    toast.promise(promise, {
      loading: "Updating Customer",
      success: (res) => {
        setLoading(false);
        return res.data.message;
      },
      error: "Error Updating Customer",
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log(e.target.value);
    setCustomer({ ...customer, [e.target.name]: e.target.value });
  };

  const handleFetchAreas = async () => {
    try {
      const BASE_URL = process.env.NEXT_PUBLIC_API_URL + "/area";
      const { data } = await axios(BASE_URL + "/all");
      setAreas(data);
    } catch (error) {
      toast.error("Failed to fetch areas");
    }
  };

  useEffect(() => {
    if (!areas) {
      const cookieAreas = getCookie("areas");
      if (cookieAreas) {
        let areas: Area[] = JSON.parse(cookieAreas);
        setAreas(areas);
      } else {
        handleFetchAreas();
      }
    }
  }, [areas]);

  return (
    <div className="flex w-full">
      <form className="w-full md:w-10/12" onSubmit={(e) => e.preventDefault()}>
        <div className="grid md:grid-cols-2 gap-7">
          <div className="">
            <label
              htmlFor="email"
              className="block mb-2 text-sm font-medium text-gray-900 "
            >
              Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={customer.name}
              onChange={handleChange}
              className="shadow-sm bg-gray-50 border border-gray-300 text-gray-900 rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 "
              placeholder=""
            />
          </div>
          <div className="">
            <label
              htmlFor="phone"
              className="block mb-2 text-sm font-medium text-gray-900 "
            >
              Phone
            </label>
            <input
              type="text"
              id="phone"
              name="phone"
              value={customer?.phone}
              onChange={handleChange}
              className="shadow-sm bg-gray-50 border border-gray-300 text-gray-900 rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5
               "
            />
          </div>
          <div className="">
            <label
              htmlFor="profileRate"
              className="block mb-2 text-sm font-medium text-gray-900 "
            >
              Profile Rate
            </label>
            <input
              type="number"
              id="profileRate"
              name="profileRate"
              onChange={handleChange}
              className="shadow-sm bg-gray-50 border border-gray-300 text-gray-900  rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 "
              required
              value={customer?.profileRate || 25}
            />
          </div>
          <div className="">
            <label
              htmlFor="profileRate"
              className="block mb-2 text-sm font-medium text-gray-900 "
            >
              Area
            </label>
            <select
              id="area"
              name="area"
              className="shadow-sm bg-gray-50 border border-gray-300 text-gray-900  rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 "
              required
              value={customer?.address?.text || ""}
              onChange={(e) => {
                setCustomer({
                  ...customer,
                  address: {
                    text: e.target.value,
                    landmark: customer.address?.landmark || "",
                    pincode: customer.address?.pincode || "",
                    latitude: customer.address?.latitude || "",
                    longitude: customer.address?.longitude || "",
                  },
                });
              }}
            >
              {areas?.map((area) => (
                <option key={area._id} value={area.name}>
                  {area.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex flex-row-reverse">
          <button
            type="submit"
            onClick={handleSave}
            disabled={loading}
            className="text-white mt-8 bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center"
          >
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
};

export default Profile;
