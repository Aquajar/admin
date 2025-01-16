import React, { FC } from "react";
import CurrencyFormat from "react-currency-format";
import { FaCircle } from "react-icons/fa";

interface IProps {
  totalSales: number;
  totalDue: number;
  totalCollected: number;
}

const SalesSummary: FC<IProps> = ({ totalSales, totalDue, totalCollected }) => {
  return (
    <div className="flex flex-col p-6 bg-black rounded-2xl">
      <div className="flex flex-col">
        <span className="text-sm text-gray-300 font-medium">Total Sales</span>
        <CurrencyFormat
          value={totalSales}
          displayType={"text"}
          thousandSeparator={true}
          prefix={"₹"}
          renderText={(value) => (
            <span className="text-3xl mt-2 text-white font-semibold">
              {value}
            </span>
          )}
        />
      </div>
      {/* Progress Bar */}
      <div className="w-full h-4 mt-5 bg-gray-600 rounded-xl">
        <div
          className={`h-4 bg-gray-300 rounded-xl transition-all duration-500 ease-in-out`}
          style={{
            width: `${(totalDue / totalSales) * 100}%`,
          }}
        >
          {}
        </div>
      </div>
      <div className="mt-5 w-full flex justify-between items-center">
        {/* Collected */}
        <div className="flex flex-col justify-between items-center">
          <div className="text-gray-300 text-sm w-full flex items-center">
            <FaCircle />
            <span className="text-white text-sm ml-2">Due</span>
          </div>
          <CurrencyFormat
            value={totalDue}
            displayType={"text"}
            thousandSeparator={true}
            prefix={"₹"}
            renderText={(value) => (
              <span className="text-white text-lg mt-2 font-semibold">
                {value}
              </span>
            )}
            decimalScale={0}
            fixedDecimalScale={true}
          />
        </div>

        {/* Due */}
        <div className="flex flex-col justify-between items-center mt-2">
          <div className="text-gray-300 text-sm w-full flex items-center">
            <span className="text-white text-sm mr-2">Collected</span>
            <FaCircle className="text-gray-600" />
          </div>
          <CurrencyFormat
            value={totalCollected}
            displayType={"text"}
            thousandSeparator={true}
            prefix={"₹"}
            renderText={(value) => (
              <span className="text-white text-lg mr-2 font-semibold">
                {value}
              </span>
            )}
            decimalScale={0}
            fixedDecimalScale={true}
          />
        </div>
      </div>
    </div>
  );
};

export default SalesSummary;
