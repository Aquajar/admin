import { RecentCard } from "@/types/types";
import React, { FC } from "react";
import CurrencyFormat from "react-currency-format";
import { IoPrintSharp } from "react-icons/io5";

const Card: FC<RecentCard> = ({ paid, amount, date, id }) => {
  return (
    <div className="flex flex-col w-[250px] bg-gray-200 rounded-md">
      <div className={`w-full h-3 ${paid ? "bg-green-500" : "bg-red-500"}`} />
      <div className="flex flex-col p-3 items-end">
        <span className="text-xs text-gray-400">{id}</span>

        <span className="text-3xl w-full mt-2 flex justify-between">
          <IoPrintSharp className="text-3xl text-gray-700 cursor-pointer" />
          <CurrencyFormat
            value={amount}
            displayType={"text"}
            thousandSeparator={true}
            prefix={"₹"}
          />
        </span>

        <span className="text-xs mt-3 text-gray-400">
          {new Date(date).toLocaleString()}
        </span>
      </div>
    </div>
  );
};

export default Card;
