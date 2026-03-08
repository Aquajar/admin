import { Area, Customer } from "@/types/types";
import axios, { AxiosInstance } from "axios";
import { getCookie } from "cookies-next";
import React, { FC, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface IProps {
  customer: Customer | null;
  axiosInstance: AxiosInstance;
  setCustomer: React.Dispatch<React.SetStateAction<Customer | null>>;
}

const Profile: FC<IProps> = ({ customer, axiosInstance, setCustomer }) => {
  const [areas, setAreas] = useState<Area[] | null>(null);
  const [loading, setLoading] = useState(false);

  console.log(customer);

  const handleSave = () => {
    if (!customer) return;
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
    if (!customer) return;
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


          {/* Name */}
          <div>
            <Label htmlFor="name" className="mb-2 block text-sm font-medium">
              Name
            </Label>
            <Input
              type="text"
              id="name"
              name="name"
              value={customer?.name}
              onChange={handleChange}
              placeholder=""
            />
          </div>


          {/* Phone */}
          <div>
            <Label htmlFor="phone" className="mb-2 block text-sm font-medium">
              Phone
            </Label>
            <Input
              type="text"
              id="phone"
              name="phone"
              value={customer?.phone}
              onChange={handleChange}
            />
          </div>


          {/* Profile Rate */}
          <div>
            <Label htmlFor="profileRate" className="mb-2 block text-sm font-medium">
              Profile Rate
            </Label>
            <Input
              type="number"
              id="profileRate"
              name="profileRate"
              onChange={handleChange}
              required
              value={customer?.profileRate || 25}
            />
          </div>


          {/* Area */}
          <div>
            <Label htmlFor="area" className="mb-2 block text-sm font-medium">
              Area
            </Label>


            <Select
              value={customer?.address?.text || ""}
              onValueChange={(value) => {
                if (!customer) return;
                setCustomer({
                  ...customer,
                  address: {
                    text: value,
                    landmark: customer.address?.landmark || "",
                    pincode: customer.address?.pincode || "",
                    latitude: customer.address?.latitude || "",
                    longitude: customer.address?.longitude || "",
                  },
                });
              }}
            >
              <SelectTrigger id="area">
                <SelectValue placeholder="Select area" />
              </SelectTrigger>
              <SelectContent>
                {areas?.map((area) => (
                  <SelectItem key={area._id} value={area.name}>
                    {area.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>


        {/* Save Button */}
        <div className="flex flex-row-reverse">
          <Button
            type="submit"
            onClick={handleSave}
            disabled={loading}
            className="mt-8"
          >
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
};

export default Profile;
