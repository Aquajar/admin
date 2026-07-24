import { paymentMethods } from "@/lib/constants";
import { Item } from "@/types/types";
import React, { FC, useEffect } from "react";
import CurrencyFormat from "react-currency-format";
import { ShoppingCart, Lock, Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

const currency = (value: number, className = "") => (
  <CurrencyFormat
    value={isNaN(value) ? 0 : value}
    displayType={"text"}
    thousandSeparator={true}
    prefix={"₹"}
    renderText={(v: string) => <span className={className}>{v}</span>}
  />
);

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

  const planLabel =
    paymentPlan === "M" || !paymentPlan
      ? "Monthly"
      : paymentPlan === "W"
        ? "Weekly"
        : "Daily";

  const planClass =
    paymentPlan === "M" || !paymentPlan
      ? "border-green-200 bg-green-50 text-green-700"
      : paymentPlan === "W"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-red-200 bg-red-50 text-red-700";

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
          <ShoppingCart className="h-5 w-5" />
        </span>
        <h2 className="text-sm font-semibold text-gray-900">Order Summary</h2>
      </div>

      <div className="p-5">
        {/* Items */}
        {items.length === 0 ? (
          <p className="rounded-lg border border-dashed border-gray-200 py-6 text-center text-sm text-gray-400">
            No items added yet
          </p>
        ) : (
          <div className="divide-y divide-gray-100 rounded-lg border border-gray-100 bg-gray-50/60">
            {items.map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between px-3 py-2 text-sm"
              >
                <span className="text-gray-600">
                  {item.name} <span className="text-gray-400">×</span>{" "}
                  {item.quantity}
                </span>
                {currency(item.total, "font-medium text-gray-800")}
              </div>
            ))}
          </div>
        )}

        {/* Breakdown */}
        <div className="mt-5 space-y-2.5 text-sm">
          <div className="flex items-center justify-between text-gray-600">
            <span>Subtotal</span>
            {currency(subTotal)}
          </div>
          <div className="flex items-center justify-between text-gray-600">
            <span>Tax (12%)</span>
            {currency(tax)}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Discount</span>
            <div className="relative w-24">
              <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                ₹
              </span>
              <Input
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                inputMode="decimal"
                className="h-8 pl-6 text-right text-sm font-medium"
              />
            </div>
          </div>
        </div>

        {/* Total */}
        <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
          <span className="text-sm font-medium text-gray-700">Total</span>
          {currency(total, "text-2xl font-bold text-gray-900")}
        </div>

        {/* Payment plan + method */}
        <div className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label>Payment plan</Label>
            <div
              className={`rounded-md border px-3 py-2 text-sm font-medium ${planClass}`}
            >
              {planLabel}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Payment method</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger>
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>
              <SelectContent>
                {paymentMethods.map((method) => (
                  <SelectItem key={method.value} value={method.value}>
                    {method.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Partial payment */}
        <div className="mt-6 border-t border-gray-100 pt-4">
          <div className="flex items-center justify-between">
            <Label
              htmlFor="partial-payment"
              className="cursor-pointer text-sm font-medium text-gray-700"
            >
              Partial payment
            </Label>
            <Checkbox
              id="partial-payment"
              checked={isPartialPayment}
              disabled={isLoading || !paymentMethod}
              onCheckedChange={(c) => setIsPartialPayment(Boolean(c))}
            />
          </div>

          {isPartialPayment && (
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-gray-600">Amount paid</Label>
                <div className="relative w-28">
                  <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                    ₹
                  </span>
                  <Input
                    value={partialPayment}
                    onChange={(e) => setPartialPayment(e.target.value)}
                    inputMode="decimal"
                    className="h-8 pl-6 text-right text-sm font-medium"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Due</span>
                <span className="text-lg font-semibold text-red-600">
                  ₹ {total - parseFloat(partialPayment) || 0}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Complete button */}
        <Button
          onClick={handleGenerateBill}
          disabled={isLoading}
          size="lg"
          className="mt-6 w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              Complete order
              <Lock className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default Summary;
