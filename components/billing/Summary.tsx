import { paymentMethods } from "@/lib/constants";
import React, { FC, useEffect } from "react";
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
  setTotal: (value: number) => void;
  discount: string;
  setDiscount: (value: string) => void;
  partialPayment: string;
  setPartialPayment: (value: string) => void;
  isPartialPayment: boolean;
  setIsPartialPayment: (value: boolean) => void;
  paymentPlan: string | undefined;
}

const Summary: FC<IProps> = ({
  subTotal,
  tax,
  total,
  setPaymentMethod,
  handleGenerateBill,
  isLoading,
  paymentMethod,
  setTotal,
  discount,
  setDiscount,
  partialPayment,
  setPartialPayment,
  isPartialPayment,
  setIsPartialPayment,
  paymentPlan,
}) => {
  useEffect(() => {
    const discountValue = parseFloat(discount) || 0;
    const totalValue = subTotal + tax - discountValue || 0;
    setTotal(totalValue);
  }, [discount, subTotal, tax, setTotal]);

  return (
    <div className="bg-white mt-4 md:mt-0 mb-20 md:mb-0 md:ml-3.5 p-5 pb-8 relative rounded-md shadow-sm flex flex-col w-full md:w-3/12">
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
        {/* Discount */}
        <div className="flex justify-between items-center mt-5">
          <span className="text-md font-normal text-gray-500">Discount</span>

          <div>
            <span className="mx-1 text-lg">₹</span>
            <input
              type="text"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              className="border text-right font-semibold rounded-md px-1 w-16 py-2 mt-1.5 bg-gray-50"
            />
          </div>
        </div>
        {/* Total */}
        <div className="flex justify-between border-t items-center mt-10 pt-2">
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
          <span className="text-md font-medium text-gray-700">
            Payment Plan
          </span>
          <input
            type="text"
            className={`border-2 rounded-md px-3 py-2 mt-1.5 bg-gray-50
            ${
              paymentPlan === "M" || !paymentPlan
                ? "border-green-500"
                : paymentPlan === "W"
                ? "border-yellow-500"
                : "border-red-500"
            }
            `}
            disabled
            value={
              paymentPlan === "M" || !paymentPlan
                ? "Monthly"
                : paymentPlan === "W"
                ? "Weekly"
                : "Daily"
            }
          />

          <label className="text-md font-medium text-gray-700 mt-6">
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

        {/* Partial Pay Amount */}

        <div className="my-4 flex items-center justify-end">
          <label className="text-md font-medium text-gray-700">
            Partial Payment
          </label>
          <input
            disabled={isLoading || !paymentMethod}
            type="checkbox"
            id="partialPayment"
            name="partialPayment"
            className="mx-2 text-2xl"
            checked={isPartialPayment}
            onChange={(e) => setIsPartialPayment(e.target.checked)}
          />
        </div>

        {isPartialPayment && (
          <>
            <div className="flex my-5 items-center justify-between">
              <label className="text-md font-medium text-gray-700">
                Partial Pay
              </label>
              <div>
                <span className="mx-1 text-lg">₹</span>
                <input
                  type="text"
                  value={partialPayment}
                  onChange={(e) => setPartialPayment(e.target.value)}
                  className="border text-right font-semibold rounded-md px-1 w-16 py-2 mt-1.5 bg-gray-50"
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <label className="text-md font-medium text-gray-700">
                Due Amount
              </label>
              <span className="text-xl font-medium text-gray-700">
                ₹ {total - parseFloat(partialPayment) || 0}
              </span>
            </div>
          </>
        )}

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
