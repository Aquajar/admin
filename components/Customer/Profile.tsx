import { Area, Customer } from "@/types/types";
import axios, { AxiosInstance } from "axios";
import { getCookie } from "cookies-next";
import React, { FC, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

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
    <div className="w-full flex justify-center">
      <form
        className="w-full space-y-8 px-3"
        onSubmit={(e) => e.preventDefault()}
      >

        {/* Basic Information */}
        <div className="space-y-6">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Basic Information
          </h3>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Customer Name</Label>
              <Input
                type="text"
                id="name"
                name="name"
                value={customer?.name}
                onChange={handleChange}
                placeholder="Enter customer name"
              />
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                type="text"
                id="phone"
                name="phone"
                value={customer?.phone}
                onChange={handleChange}
                placeholder="Enter phone number"
              />
            </div>
          </div>
        </div>

        {/* Jar Configuration */}
        <div className="space-y-6">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Jar Configuration
          </h3>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Engaged Jars */}
            <div className="space-y-2">
              <Label htmlFor="engagedJars">Engaged Jars</Label>
              <Select
                value={
                  customer?.engagedJars === 0 || customer?.engagedJars === undefined
                    ? "null"
                    : String(customer.engagedJars)
                }
                onValueChange={(value) => {
                  if (!customer) return;

                  setCustomer({
                    ...customer,
                    engagedJars: value === "null" ? 0 : Number(value),
                  });
                }}
              >
                <SelectTrigger id="engagedJars">
                  <SelectValue placeholder="Select jars engaged" />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="null">Null</SelectItem>

                  {[1, 2, 3, 4, 5].map((num) => (
                    <SelectItem key={num} value={String(num)}>
                      {num}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Number of jars currently in circulation with the customer
              </p>
            </div>

            {/* Jar Owned */}
            <div className="space-y-2">
              <Label htmlFor="jarOwnedByCustomer">Jars Owned by Customer</Label>
              <Select
                value={
                  customer?.jarOwnedByCustomer === 0 || customer?.jarOwnedByCustomer === undefined
                    ? "null"
                    : String(customer.jarOwnedByCustomer)
                }
                onValueChange={(value) => {
                  if (!customer) return;

                  setCustomer({
                    ...customer,
                    jarOwnedByCustomer: value === "null" ? 0 : Number(value),
                  });
                }}
              >
                <SelectTrigger id="jarOwnedByCustomer">
                  <SelectValue placeholder="Select owned jars" />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="null">Null</SelectItem>

                  {[1, 2, 3, 4, 5].map((num) => (
                    <SelectItem key={num} value={String(num)}>
                      {num}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Profile Rate */}
            <div className="space-y-2">
              <Label htmlFor="profileRate">Delivery Rate</Label>
              <Input
                type="number"
                id="profileRate"
                name="profileRate"
                onChange={handleChange}
                required
                value={customer?.profileRate || 25}
                placeholder="Rate per jar"
              />
              <p className="text-xs text-muted-foreground">
                Delivery rate per jar
              </p>
            </div>
          </div>
        </div>

        {/* Address */}
        <div className="space-y-6">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Address
          </h3>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Area */}
            <div className="space-y-2">
              <Label htmlFor="area">Area</Label>
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
                  <SelectValue placeholder="Select delivery area" />
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

            {/* Coordinates */}
            <div className="space-y-2">
              <Label>Map Coordinates</Label>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  type="number"
                  step="any"
                  id="latitude"
                  name="latitude"
                  value={customer?.coordinates?.lat ?? ""}
                  onChange={(e) => {
                    if (!customer) return;
                    const raw = e.target.value;
                    setCustomer({
                      ...customer,
                      coordinates: {
                        lat: raw === "" ? null : Number(raw),
                        lng: customer.coordinates?.lng ?? null,
                      },
                    });
                  }}
                  placeholder="Latitude"
                />
                <Input
                  type="number"
                  step="any"
                  id="longitude"
                  name="longitude"
                  value={customer?.coordinates?.lng ?? ""}
                  onChange={(e) => {
                    if (!customer) return;
                    const raw = e.target.value;
                    setCustomer({
                      ...customer,
                      coordinates: {
                        lat: customer.coordinates?.lat ?? null,
                        lng: raw === "" ? null : Number(raw),
                      },
                    });
                  }}
                  placeholder="Longitude"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Optional. Used to plot the customer on the Map view.
              </p>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end border-t pt-6">
          <Button
            type="submit"
            onClick={handleSave}
            disabled={loading}
            className="px-6"
          >
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default Profile;
