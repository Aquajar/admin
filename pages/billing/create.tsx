import Wrapper from "@/components/Wrapper";
import React, { useEffect, useState } from "react";
import { RiAddCircleLine } from "react-icons/ri";
import CurrencyFormat from "react-currency-format";
import { MdOutlineDeleteForever } from "react-icons/md";
import DatePicker from "react-datepicker";
import { v4 as uuidv4 } from "uuid";
import { MdOutlineLock } from "react-icons/md";
import "react-datepicker/dist/react-datepicker.css";

const Invoice = () => {
  const [items, setItems] = useState([
    {
      name: "Jar",
      quantity: 0,
      price: 20,
      total: 0,
    },
  ]);
  const [orderType, setOrderType] = useState("retail");
  const [startDate, setStartDate] = useState(new Date());
  const [invoiceId, setInvoiceId] = useState(uuidv4().slice(0, 12));
  const [subTotal, setSubTotal] = useState<number>(0);
  const [tax, setTax] = useState<number>(0);
  const [total, setTotal] = useState<number>(0);
  const [address, setAddress] = useState<string>("");
  const [landmark, setLandmark] = useState<string>("");
  const [driver, setDriver] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [phoneNumber, setPhoneNumber] = useState<string>("");
  const [billTo, setBillTo] = useState<string>("");

  // Calculate total, subtotal and tax
  useEffect(() => {
    let total = 0;
    let subTotal = 0;

    items.forEach((item) => {
      if (isNaN(item.total)) item.total = 0;
      total += item.total;
    });

    const tax = total - total * (100 / (100 + 12));
    subTotal = total - tax;

    setSubTotal(parseFloat(subTotal.toFixed(2)));
    setTax(parseFloat(tax.toFixed(2)));
    setTotal(parseFloat(total.toFixed(2)));
  }, [items]);

  return (
    <Wrapper name="Create Invoice">
      <div className="flex">
        {/* Form */}
        <div className="bg-white p-8 mb-20 relative rounded-md shadow-sm flex flex-col w-full md:w-9/12">
          {/* Invoice ID */}
          <span className="text-xs text-slate-400 absolute left-8 top-3 text-right">
            ID: {invoiceId}
          </span>

          {/* Credentials */}
          <div className="grid gap-8 grid-cols-2 items-start mt-5 justify-between">
            <div className="flex flex-col">
              <label className="text-md font-medium text-gray-700">
                Phone Number
              </label>
              <input
                onChange={(e) => setPhoneNumber(e.target.value)}
                value={phoneNumber}
                type="text"
                className="border rounded-md px-3 py-2 mt-1.5 focus:outline-none focus:ring-2 focus:ring-gray-500 bg-gray-50"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-md font-medium text-gray-700">
                Bill To
              </label>
              <input
                onChange={(e) => setBillTo(e.target.value)}
                value={billTo}
                type="text"
                className="border rounded-md px-3 py-2 mt-1.5 focus:outline-none focus:ring-2 focus:ring-gray-500 bg-gray-50"
              />
              <span className="text-xs text-slate-400 mt-1 text-right w-full">
                Name on the invoice
              </span>
            </div>
          </div>
          {/* Order Detail */}
          <div className="grid gap-8 grid-cols-2 items-start my-3 justify-between">
            {/* Order Type */}
            <div className="flex flex-col">
              <label className="text-md font-medium text-gray-700">
                Order Type
              </label>
              <select
                onChange={(e) => setOrderType(e.target.value)}
                className="border rounded-md px-3 py-2 mt-1.5 bg-gray-50"
              >
                <option selected={orderType === "retail"} value="retail">
                  Retail
                </option>
                <option selected={orderType === "delivery"} value="delivery">
                  Delivery
                </option>
              </select>
            </div>
            {/* Sale Date */}
            <div className="flex flex-col">
              <label className="text-md font-medium text-gray-700">
                Sale Date
              </label>
              <DatePicker
                dateFormat={"dd/MM/yyyy"}
                className="border rounded-md cursor-pointer px-3 py-2 mt-1.5 bg-gray-50 w-full"
                selected={startDate}
                onChange={(date) => setStartDate(date as Date)}
              />
            </div>
          </div>
          {/* Items */}
          <div className="relative mt-10 overflow-x-auto shadow-sm rounded-lg">
            <table className="w-full text-justify">
              <thead className="bg-slate-200">
                <tr className="">
                  {/* Sl no. */}
                  <th className="text-md font-medium py-1.5 px-4 text-gray-700">
                    Sl No.
                  </th>
                  <th className="text-md font-medium py-1.5 px-4 text-gray-700">
                    Item Name
                  </th>
                  <th className="text-md font-medium py-1.5 px-4 text-gray-700">
                    Quantity
                  </th>
                  <th className="text-md font-medium py-1.5 px-4 text-gray-700">
                    Price
                  </th>
                  <th className="text-md font-medium py-1.5 px-4 text-gray-700">
                    Total
                  </th>
                  <th className="text-md font-medium py-1.5 px-4 text-gray-700"></th>
                </tr>
              </thead>
              <tbody className="bg-slate-100">
                {items.map((item, index) => {
                  return (
                    <tr key={index}>
                      {/* Sl no. */}
                      <td className="text-md font-medium text-gray-700 px-4 py-2">
                        {index + 1}.
                      </td>
                      {/* Item Name */}
                      <td className="text-md font-medium text-gray-700 px-4 py-2">
                        <select
                          onChange={(e) => {
                            const newItems = [...items];
                            newItems[index].name = e.target.value;
                            setItems(newItems);

                            if (e.target.value === "jar") {
                              newItems[index].price = 20;
                              newItems[index].total =
                                newItems[index].quantity * 20;
                            } else if (e.target.value === "dispenser") {
                              newItems[index].price = 160;
                              newItems[index].total =
                                newItems[index].quantity * 160;
                            } else if (e.target.value === "set") {
                              newItems[index].price = 500;
                              newItems[index].total =
                                newItems[index].quantity * 500;
                            }
                            setItems(newItems);
                          }}
                          className="border text-md rounded-md px-2 md:pr-14 md:pl-4 py-2 mt-1 bg-white"
                        >
                          <option selected={item.name === "jar"} value="jar">
                            Jar
                          </option>
                          <option
                            selected={item.name === "dispenser"}
                            value="dispenser"
                          >
                            Dispenser
                          </option>
                          <option selected={item.name === "set"} value="set">
                            Set
                          </option>
                        </select>
                      </td>
                      {/* Quantity */}
                      <td className="text-md font-medium text-gray-700 px-4 py-2">
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => {
                            const newItems = [...items];
                            newItems[index].quantity = parseInt(e.target.value);
                            newItems[index].total =
                              parseInt(e.target.value) * newItems[index].price;
                            setItems(newItems);
                          }}
                          className="border md:w-1/2 text-md rounded-md px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-gray-500 bg-white"
                        />
                      </td>
                      {/* Price */}
                      <td className="text-md font-normal text-gray-700 px-4 py-2">
                        @{item.price}
                      </td>
                      {/* Total */}
                      <td className="text-md font-medium text-gray-700 px-4 py-2">
                        <CurrencyFormat
                          value={isNaN(item.total) ? 0 : item.total}
                          displayType={"text"}
                          thousandSeparator={true}
                          prefix={"₹"}
                          renderText={(value: string) => <>{value}</>}
                        />
                      </td>
                      {/* Delete Button */}
                      <td className="text-md font-medium text-gray-700 px-4 py-2">
                        <button
                          onClick={() => {
                            const newItems = [...items];
                            newItems.splice(index, 1);
                            setItems(newItems);
                          }}
                          className="text-[#ED5E68]"
                        >
                          <MdOutlineDeleteForever className="w-6 h-6" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Add Item */}
          <div className="flex justify-end mt-4 mb-6">
            <button
              onClick={() => {
                setItems([
                  ...items,
                  {
                    name: "jar",
                    quantity: 1,
                    price: 20,
                    total: 20,
                  },
                ]);
              }}
              className="py-2 flex items-center justify-start"
            >
              <RiAddCircleLine className="w-6 h-6 mx-2" />
              Add Item
            </button>
          </div>

          {/* Address */}
          <div
            className={`flex flex-col mb-6 border-t ${
              orderType === "retail" ? "hidden" : ""
            }`}
          >
            {/* Address */}
            <label className="text-md mt-4 font-medium text-gray-700">
              Address
            </label>
            <textarea
              onChange={(e) => setAddress(e.target.value)}
              value={address}
              className="border rounded-md px-3 py-2 mt-1.5 focus:outline-none focus:ring-2 focus:ring-gray-500 bg-gray-50"
              rows={2}
            ></textarea>

            <div className="grid mt-6 gap-8 grid-cols-2 items-start my-3 justify-between">
              {/* Land Mark */}
              <div className="flex flex-col">
                <label className="text-md font-medium text-gray-700">
                  Landmark
                </label>
                <input
                  onChange={(e) => setLandmark(e.target.value)}
                  value={landmark}
                  type="text"
                  className="border rounded-md px-3 py-2 mt-1.5 focus:outline-none focus:ring-2 focus:ring-gray-500 bg-gray-50"
                />
              </div>
              {/* Driver */}
              <div className="flex flex-col">
                <label className="text-md font-medium text-gray-700">
                  Driver
                </label>
                <select className="border rounded-md px-3 py-2 mt-1.5 bg-gray-50">
                  <option value="driver1">Driver 1</option>
                  <option value="driver2">Driver 2</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="bg-white ml-3.5 p-5 mb-20 h-[70vh] relative rounded-md shadow-sm flex flex-col w-full md:w-3/12">
          <h1 className="text-xl font-bold text-gray-700">Summary</h1>
          <div className="flex flex-col">
            {/* Sub Total */}
            <div className="flex justify-between items-center mt-10">
              <span className="text-md font-normal text-gray-500">
                Sub Total
              </span>
              <CurrencyFormat
                value={subTotal}
                displayType={"text"}
                thousandSeparator={true}
                prefix={"₹"}
                renderText={(value: string) => (
                  <span className="text-md font-medium text-gray-700">
                    {value}
                  </span>
                )}
              />
            </div>
            {/* Tax */}
            <div className="flex justify-between items-center mt-5">
              <span className="text-md font-normal text-gray-500">
                Tax (12%)
              </span>
              <CurrencyFormat
                value={tax}
                displayType={"text"}
                thousandSeparator={true}
                prefix={"₹"}
                renderText={(value: string) => (
                  <span className="text-md font-medium text-gray-700">
                    {value}
                  </span>
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
                <option value="card" disabled selected>
                  Select Payment Method
                </option>
                <option value="cash">Cash</option>
                <option value="due">Due</option>
                <option value="online">Online (UPI)</option>
                <option value="account">Account Transfer</option>
              </select>
            </div>
            {/* Complete Button */}
            <button className="bg-primary text-white rounded-md px-3 py-3 mt-10 flex items-center justify-center">
              Complete
              <MdOutlineLock className="w-5 h-5 ml-2" />
            </button>
          </div>
        </div>
      </div>
    </Wrapper>
  );
};

export default Invoice;
