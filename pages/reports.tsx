import Wrapper from "@/components/Wrapper";
import axios from "axios";
import React, { useRef, useState } from "react";
import ReactDatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { DownloadTableExcel } from "react-export-table-to-excel";

const Reports = () => {
  const [startDate, setStartDate] = useState(new Date(new Date()));
  const [endDate, setEndDate] = useState(new Date());
  const [reportData, setReportData] = useState([]) as any[];

  const tableRef = useRef(null);

  const getInvoices = async () => {
    let landmark = "Mamta Nagar";
    const { data } = await axios.get(
      process.env.NEXT_PUBLIC_API_URL + "/report/generate?landmark=" + landmark
    );
    setReportData(data);
  };

  return (
    <Wrapper name="Reports">
      <div>
        <div className="flex w-1/2 justify-between">
          <ReactDatePicker
            dateFormat={"dd/MM/yyyy"}
            className="border rounded-md cursor-pointer px-3 py-2 mt-1.5 bg-gray-50 w-full"
            selected={startDate}
            onChange={(date) => setStartDate(date as Date)}
          />
          <ReactDatePicker
            dateFormat={"dd/MM/yyyy"}
            className="border rounded-md cursor-pointer px-3 py-2 mt-1.5 bg-gray-50 w-full"
            selected={endDate}
            onChange={(date) => setEndDate(date as Date)}
          />
        </div>
        <div className="flex justify-between w-1/2">
          <DownloadTableExcel
            filename="users table"
            sheet="users"
            currentTableRef={tableRef.current}
          >
            <button> Export excel </button>
          </DownloadTableExcel>
          <button
            onClick={getInvoices}
            className="bg-blue-500 text-white px-3 py-2 rounded-md mt-10"
          >
            Generate Report
          </button>
        </div>
        {reportData.data && (
          <div className="relative overflow-x-auto mt-10">
            <table
              ref={tableRef}
              className="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400"
            >
              <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                <tr>
                  <th scope="col" className="px-6 py-3">
                    ID
                  </th>
                  <th scope="col" className="px-6 py-3">
                    Name
                  </th>
                  <th scope="col" className="px-6 py-3">
                    Phone
                  </th>
                  <th scope="col" className="px-6 py-3">
                    Total Due
                  </th>
                </tr>
              </thead>
              <tbody>
                {reportData.data &&
                  reportData.data.map((item: any, index: number) => (
                    <tr className="bg-white border-b " key={index}>
                      <th
                        scope="row"
                        className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white"
                      >
                        {item.id}
                      </th>
                      <td className="px-6 py-4">{item.name}</td>
                      <td className="px-6 py-4">{item.phone}</td>
                      <td className="px-6 py-4">{item.totalDue}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Wrapper>
  );
};

export default Reports;
