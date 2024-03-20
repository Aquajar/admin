import { Area } from "@/types/types";
import React, { FC } from "react";

interface IProps {
  setAddress: (value: string) => void;
  address: string;
  setLandmark: (value: string) => void;
  landmark: string;
  vehicle: string;
  setVehicle: (value: string) => void;
  areas: Area[] | undefined;
}

const DeliveryDetails: FC<IProps> = ({
  setAddress,
  setLandmark,
  setVehicle,
  address,
  landmark,
  vehicle,
  areas,
}) => {
  console.log(areas)
  return (
    <div className={`flex flex-col mb-6 border-t`}>
      {/* Address */}
      <label className="text-md mt-4 font-medium text-gray-700">Address</label>
      <select
        onChange={(e) => setAddress(e.target.value)}
        className="border rounded-md px-3 py-2 mt-1.5 bg-gray-50"
      >
        {areas?.map((area) => (
          <option
            disabled={!area.serviceable}
            key={area._id}
            selected={address === area.name}
            value={area.name}
          >
            {area.name}
          </option>
        ))}
      </select>
      <div className="grid mt-6 gap-8 grid-cols-2 items-start my-3 justify-between">
        {/* Land Mark */}
        <div className="flex flex-col">
          <label className="text-md font-medium text-gray-700">Landmark</label>
          <input
            onChange={(e) => setLandmark(e.target.value)}
            value={landmark}
            type="text"
            className="border rounded-md px-3 py-2 mt-1.5 focus:outline-none focus:ring-2 focus:ring-gray-500 bg-gray-50"
          />
        </div>
        {/* Driver */}
        <div className="flex flex-col">
          <label className="text-md font-medium text-gray-700">Vehicle</label>
          <select
            defaultValue={"WB73E3666"}
            onChange={(e) => setVehicle(e.target.value)}
            className="border rounded-md px-3 py-2 mt-1.5 bg-gray-50"
          >
            <option selected={vehicle === "WB73E3666"} value="WB73E3666">
              WB73E3666
            </option>
          </select>
        </div>
      </div>
    </div>
  );
};

export default DeliveryDetails;
