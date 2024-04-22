import Wrapper from "@/components/Wrapper";
import { Area } from "@/types/types";
import axios from "axios";
import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL + "/area";

const BreadCrumb = [
  {
    name: "Service Areas",
    href: "/area",
  },
];

const Areas = () => {
  const [name, setName] = useState("");
  const [serviceable, setserviceable] = useState(true);
  const [areas, setAreas] = useState<Area[] | null>(null);
  const [loading, setLoading] = useState(false);

  // Add area
  const handleAddArea = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!name) {
      toast.error("Area name is required");
      setLoading(false);
      return;
    }

    // Promise
    const promise = axios.post(BASE_URL + "/new", {
      name,
      serviceable,
    });

    toast.promise(promise, {
      loading: "Saving area...",
      success: (res) => {
        setName("");
        setLoading(false);
        setserviceable(true);
        handleFetchAreas();
        return "Area saved successfully";
      },
      error: (err) => {
        setLoading(false);
        console.log(err);
        return err.response.data.error.message;
      },
    });
  };

  const handleFetchAreas = async () => {
    try {
      const { data } = await axios(BASE_URL + "/all");
      setAreas(data);
    } catch (error) {
      toast.error("Failed to fetch areas");
    }
  };

  useEffect(() => {
    if (!areas) {
      handleFetchAreas();
    }
  }, [areas]);

  return (
    <Wrapper breadcrumb={BreadCrumb}>
      <div className="w-full flex flex-col md:flex-row md:space-x-8 justify-between h-full">
        {/*
         * Add Area Form
         */}
        <form
          className="w-full md:w-1/3 bg-white rounded-lg p-5"
          onSubmit={handleAddArea}
        >
          <h1 className="text-xl font-semibold">Add Area</h1>
          <div className="flex flex-col mt-8">
            <label htmlFor="name" className="text-sm text-gray-600">
              Area Name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              type="text"
              id="name"
              className="border border-gray-200 p-2 rounded mt-2"
            />
          </div>
          <div className="flex flex-col mt-4">
            <label htmlFor="description" className="text-sm text-gray-600">
              serviceable
            </label>
            <select
              onChange={(e) => setserviceable(e.target.value === "yes")}
              id="description"
              className="border border-gray-200 p-2 rounded mt-2"
            >
              <option selected={serviceable} value="yes">
                Yes
              </option>
              <option value="no" selected={!serviceable}>
                No
              </option>
            </select>
          </div>
          <button
            disabled={loading}
            className="bg-blue-500 disabled:bg-gray-400 text-white py-2 rounded mt-8 w-full"
          >
            Save
          </button>
        </form>
        {/*
         * Render Areas
         */}
        <div className="w-full md:w-1/2 mt-16 md:mt-0">
          <h1 className="text-xl font-semibold">All Areas</h1>
          <div className="mt-6">
            {areas?.map((area) => (
              <div
                key={area._id}
                className="flex justify-between items-center border-b border-gray-200 py-2"
              >
                <div>
                  <p className="text-lg font-semibold">{area.name}</p>
                  <p className="text-sm text-gray-600">
                    Serviceable: {area.serviceable ? "Yes" : "No"}
                  </p>
                </div>
                <div>
                  <button className="text-red-500">Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Wrapper>
  );
};

export default Areas;
