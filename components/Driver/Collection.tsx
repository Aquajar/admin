import { DriverSummary } from "@/types/types";
import React from "react";
import CurrencyFormat from "react-currency-format";
import { FaPerson } from "react-icons/fa6";
import { GoKebabHorizontal } from "react-icons/go";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";

const Collection = ({ data }: { data: DriverSummary[] }) => {
  return (
    <div className="w-full bg-white rounded-3xl border shadow-md p-4 pb-6">
      <div className="flex justify-between items-center pb-3 border-b">
        <span className="text-2xl font-medium">Driver Statistics</span>
        <DropdownMenu>
          <DropdownMenuTrigger>
            <GoKebabHorizontal size={20} className="cursor-pointer" />
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Details</DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/drivers/stats">
              View Stats
              </Link>
              </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Data */}
      {data?.map((driver) => {
        return (
          <div className="flex flex-col mt-5" key={driver.name}>
            <div className="flex items-center space-x-2">
              <span className="">
                <FaPerson className="text-" size={22} />
              </span>
              <span className="text-lg">{driver.name}</span>
            </div>

            <div className="p-1.5 bg-black rounded-lg mt-3">
              <dl className="grid max-w-screen-xl grid-cols-3 p-1 mx-auto text-gray-900">
                <div className="flex flex-col items-center">
                  <dt className="mb-2 text-xl text-white font-extrabold">
                    {driver.jars}
                  </dt>
                  <dd className="text-gray-200 ">Jars</dd>
                </div>
                <div className="flex flex-col items-center">
                  <dt className="mb-2 text-xl font-extrabold">
                    <CurrencyFormat
                      value={driver.collection}
                      displayType={"text"}
                      thousandSeparator={true}
                      prefix={"₹"}
                      renderText={(value: string) => (
                        <span className="text-md text-white  font-medium">
                          {value}
                        </span>
                      )}
                    />
                  </dt>
                  <dd className="text-gray-200 ">Cash</dd>
                </div>
                <div className="flex flex-col items-center">
                  <dt className="mb-2 text-xl font-extrabold">
                    <CurrencyFormat
                      value={driver.totalSales}
                      displayType={"text"}
                      thousandSeparator={true}
                      prefix={"₹"}
                      renderText={(value: string) => (
                        <span className="text-md font-medium text-white">
                          {value}
                        </span>
                      )}
                    />
                  </dt>
                  <dd className="text-gray-200">Sales</dd>
                </div>
              </dl>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default Collection;
