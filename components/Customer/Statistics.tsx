import React, { FC } from "react";

interface IProps {
  assets:
    | {
        jars: string;
        dispensers: string;
        stands: string;
      }
    | undefined;
}

const Statistics: FC<IProps> = ({ assets }) => {
  return (
    <div className="flex w-full">
      <table className="w-full text-sm text-left">
        <thead className="text-sm uppercase bg-gray-300">
          <tr>
            <th scope="col" className="px-2 md:px-4 py-3">
              SL No.
            </th>
            <th scope="col" className="px-2 md:px-4 py-3">
              Item
            </th>
            <th scope="col" className="px-2 md:px-4 py-3">
              Quantity
            </th>
          </tr>
        </thead>
        <tbody className="">
          <tr className="bg-gray-100">
            <td className="px-2 md:px-4 py-4 text-md">1</td>
            <td className="px-2 md:px-4 py-4 text-md">Stand</td>
            <td className="px-2 md:px-4 py-4 text-lg font-semibold">{assets?.stands}</td>
          </tr>
          <tr className="bg-gray-100">
            <td className="px-2 md:px-4 py-4 text-md">2</td>
            <td className="px-2 md:px-4 py-4 text-md">Dispenser</td>
            <td className="px-2 md:px-4 py-4 text-lg font-semibold">{assets?.dispensers}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default Statistics;
