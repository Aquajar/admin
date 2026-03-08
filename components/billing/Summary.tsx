import { paymentMethods } from "@/lib/constants";
import { Item } from "@/types/types";
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
  items: Item[];
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
  items,
}) => {
  useEffect(() => {
    const discountValue = parseFloat(discount) || 0;
    const totalValue = subTotal + tax - discountValue || 0;
    setTotal(totalValue);
  }, [discount, subTotal, tax, setTotal]);

  return (
    <div className="bg-white border border-gray-200 mt-4 md:mt-0 mb-20 md:mb-0 md:ml-3.5 p-6 relative rounded-xl shadow-sm flex flex-col w-full">

      <h1 className="text-lg font-semibold text-gray-800">Order Summary</h1>

      <div className="flex flex-col">

        {/* Items */}
        <div className="mt-6 border rounded-lg divide-y bg-gray-50">
          <table className="w-full">
            <tbody>
              {items.map((item, index) => (
                <tr key={index}>
                  <td className="px-3 py-2 text-sm text-gray-600">
                    {item.name} <span className="text-gray-400">×</span> {item.quantity}
                  </td>

                  <td className="px-3 py-2 text-right text-sm font-medium text-gray-700">
                    <CurrencyFormat
                      value={item.total}
                      displayType={"text"}
                      thousandSeparator={true}
                      prefix={"₹"}
                      renderText={(value: string) => <span>{value}</span>}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Discount */}
        <div className="flex justify-between items-center mt-6">
          <span className="text-sm text-gray-600 font-medium">Discount</span>

          <div className="flex items-center border rounded-lg bg-white px-2">
            <span className="text-gray-500 mr-1">₹</span>
            <input
              type="text"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              className="w-16 text-right py-2 text-sm font-semibold outline-none"
            />
          </div>
        </div>

        {/* Total */}
        <div className="flex justify-between border-t mt-6 pt-4 items-center">
          <span className="text-sm font-medium text-gray-600">
            Total (incl. tax)
          </span>

          <CurrencyFormat
            value={total}
            displayType={"text"}
            thousandSeparator={true}
            prefix={"₹"}
            renderText={(value: string) => (
              <span className="text-xl font-semibold text-gray-900">{value}</span>
            )}
          />
        </div>

        {/* Payment Plan */}
        <div className="flex flex-col mt-8">
          <label className="text-sm font-medium text-gray-700">
            Payment Plan
          </label>

          <input
            type="text"
            disabled
            className={`mt-2 px-3 py-2 rounded-lg border text-sm font-medium bg-gray-50
        ${paymentPlan === "M" || !paymentPlan
                ? "border-green-500 text-green-700"
                : paymentPlan === "W"
                  ? "border-yellow-500 text-yellow-700"
                  : "border-red-500 text-red-700"
              }`}
            value={
              paymentPlan === "M" || !paymentPlan
                ? "Monthly"
                : paymentPlan === "W"
                  ? "Weekly"
                  : "Daily"
            }
          />

          {/* Payment Method */}
          <label className="text-sm font-medium text-gray-700 mt-6">
            Payment Method
          </label>

          <select
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="mt-2 px-3 py-2 rounded-lg border bg-white text-sm outline-none"
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

        {/* Partial Payment Toggle */}
        <div className="flex items-center justify-between mt-6 border-t pt-4">
          <label className="text-sm font-medium text-gray-700">
            Partial Payment
          </label>

          <input
            disabled={isLoading || !paymentMethod}
            type="checkbox"
            checked={isPartialPayment}
            onChange={(e) => setIsPartialPayment(e.target.checked)}
            className="w-4 h-4 accent-gray-800"
          />
        </div>

        {isPartialPayment && (
          <>
            {/* Partial Amount */}
            <div className="flex items-center justify-between mt-5">
              <label className="text-sm font-medium text-gray-700">
                Partial Pay
              </label>

              <div className="flex items-center border rounded-lg bg-white px-2">
                <span className="text-gray-500 mr-1">₹</span>
                <input
                  type="text"
                  value={partialPayment}
                  onChange={(e) => setPartialPayment(e.target.value)}
                  className="w-16 text-right py-2 text-sm font-semibold outline-none"
                />
              </div>
            </div>

            {/* Due Amount */}
            <div className="flex items-center justify-between mt-4">
              <label className="text-sm font-medium text-gray-700">
                Due Amount
              </label>

              <span className="text-lg font-semibold text-gray-900">
                ₹ {total - parseFloat(partialPayment) || 0}
              </span>
            </div>
          </>
        )}

        {/* Complete Button */}
        <button
          disabled={isLoading}
          onClick={handleGenerateBill}
          className="mt-8 w-full flex items-center justify-center gap-2 bg-blue-600 text-white rounded-lg py-3 text-sm font-medium hover:bg-green-600 transition disabled:bg-gray-400"
        >
          Complete Order
          <MdOutlineLock className="w-4 h-4" />
        </button>

      </div>
    </div>
  );
};

export default Summary;
