import { paymentMethods } from "@/lib/constants";
import React, { FC } from "react";
import CurrencyFormat from "react-currency-format";
import { MdOutlineLock } from "react-icons/md";

interface IProps {
  subTotal: number;
  tax: number;
  total: number;
  setPaymentMethod: (value: string) => void;
  handleGenerateBill: () => void;
  isLoading: boolean;
  paymentMethod: string;
}

const Summary: FC<IProps> = ({
  subTotal,
  tax,
  total,
  setPaymentMethod,
  handleGenerateBill,
  isLoading,
  paymentMethod,
}) => {
  return (
    <div className="bg-white ml-3.5 p-5 pb-8 relative rounded-md shadow-sm flex flex-col w-full md:w-3/12">
      <h1 className="text-xl font-bold text-gray-700">Summary</h1>
      <div className="flex flex-col">
        {/* Sub Total */}
        <div className="flex justify-between items-center mt-10">
          <span className="text-md font-normal text-gray-500">Sub Total</span>
          <CurrencyFormat
            value={subTotal}
            displayType={"text"}
            thousandSeparator={true}
            prefix={"₹"}
            renderText={(value: string) => (
              <span className="text-md font-medium text-gray-700">{value}</span>
            )}
          />
        </div>
        {/* Tax */}
        <div className="flex justify-between items-center mt-5">
          <span className="text-md font-normal text-gray-500">Tax (12%)</span>
          <CurrencyFormat
            value={tax}
            displayType={"text"}
            thousandSeparator={true}
            prefix={"₹"}
            renderText={(value: string) => (
              <span className="text-md font-medium text-gray-700">{value}</span>
            )}
          />
        </div>
        {/* Total */}
        <div className="flex justify-between border-t items-center mt-16 pt-2">
          <span className="text-md font-normal text-gray-500">
            Total (incl. tax)
          </span>
          <CurrencyFormat
            value={total}
            displayType={"text"}
            thousandSeparator={true}
            prefix={"₹"}
            renderText={(value: string) => (
              <span className="text-xl font-semibold text-gray-700">
                {value}
              </span>
            )}
          />
        </div>

        {/* Payment Method */}
        <div className="flex flex-col mt-10">
          <label className="text-md font-medium text-gray-700">
            Payment Method
          </label>
          <select
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="border rounded-md px-3 py-2 mt-1.5 bg-gray-50"
          >
            <option value="card" disabled selected={paymentMethod === ""}>
              Select Payment Method
            </option>
            {paymentMethods.map((method) => (
              <option
                key={method.value}
                value={method.value}
                selected={paymentMethod === method.value}
              >
                {method.label}
              </option>
            ))}
          </select>
        </div>
        {/* Complete Button */}
        <button
          disabled={isLoading}
          onClick={handleGenerateBill}
          className="bg-primary text-white rounded-md px-3 py-3 mt-10 flex items-center justify-center disabled:opacity-75 disabled:bg-gray-400"
        >
          Complete
          <MdOutlineLock className="w-5 h-5 ml-2" />
        </button>
      </div>
    </div>
  );
};

export default Summary;
