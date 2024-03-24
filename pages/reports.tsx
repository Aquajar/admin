import Wrapper from "@/components/Wrapper";
import useAxiosInstance from "@/lib/hooks/useAxiosInstance";
import useRefreshTokenRotation from "@/lib/hooks/useRefreshToken";
import { Area } from "@/types/types";
import { getCookie, setCookie } from "cookies-next";
import { useSession } from "next-auth/react";
import React, { useEffect, useRef, useState } from "react";
import ReactDatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { FaSort } from "react-icons/fa";
import { utils, writeFileXLSX } from "xlsx";
import { Menu, MenuItem, MenuButton } from "@szhsin/react-menu";
import "@szhsin/react-menu/dist/index.css";
import "@szhsin/react-menu/dist/transitions/slide.css";
import { LuFileSpreadsheet } from "react-icons/lu";
import toast from "react-hot-toast";

const Reports = () => {
  const [startDate, setStartDate] = useState(new Date(new Date()));
  const [endDate, setEndDate] = useState(new Date());
  const [reportData, setReportData] = useState([]) as any[];
  const [areas, setAreas] = useState<Area[] | null>(null);
  const [address, setAddress] = useState("all");

  const { data: session } = useSession();

  // Create axios instance
  const axiosInstance = useAxiosInstance(session);

  // Hooks
  useRefreshTokenRotation(axiosInstance);

  const tableRef = useRef(null);

  const getInvoices = async () => {
    setReportData([]);

    let fromDate = +new Date(startDate);
    let toDate = +new Date(endDate);
    let area: string = address;
    let area_names = areas?.map((area) => area.name);

    if (address === "all") area = JSON.stringify(area_names);
    const URL =
      process.env.NEXT_PUBLIC_API_URL +
      `/report/generate?fromDate=${fromDate}&toDate=${toDate}&area=${area}`;
    const promise = axiosInstance.get(URL);
    toast
      .promise(promise, {
        loading: "Fetching Data...",
        success: "Report Generated",
        error: "Failed to generate report",
      })
      .then((res) => {
        setReportData(res.data);
      });
  };

  // Sort by total due
  const filterByTotalDue = (order: string) => {
    let sortedData = [];

    if (order === "asc") {
      sortedData = reportData.data.sort(
        (a: any, b: any) => a.totalDue - b.totalDue
      );
    } else {
      sortedData = reportData.data.sort(
        (a: any, b: any) => b.totalDue - a.totalDue
      );
    }

    setReportData({ data: sortedData });
  };

  // Fetch Areas
  useEffect(() => {
    if (!areas) {
      // Fetch products from cookies
      const cookieAreas = getCookie("areas");
      if (cookieAreas) {
        console.log("Fetching areas from cookies");
        let areas: Area[] = JSON.parse(cookieAreas);
        setAreas(areas);
        setAddress("all");
      } else {
        // Fetch products
        console.log("Fetching products from API");
        const URL = process.env.NEXT_PUBLIC_API_URL + "/area/all";

        axiosInstance.get(URL).then((res) => {
          const areas: Area[] = res.data;
          setAreas(areas);
          setAddress("all");
          setCookie("areas", JSON.stringify(areas), {
            maxAge: 60 * 60 * 24 * 7,
          });
        });
      }
    }
  }, [areas]);

  return (
    <Wrapper name="Reports">
      <div className="mb-28">
        {/*
         * Menu
         */}
        <div className="flex flex-col md:flex-row space-y-5 md:space-y-0 md:space-x-8 md:justify-items-center mt-2">
          <div className="flex flex-col">
            <label>From Date</label>
            <ReactDatePicker
              wrapperClassName="w-full"
              dateFormat={"dd/MM/yyyy"}
              className="border rounded-md cursor-pointer px-3 py-2 mt-1.5 bg-gray-50 w-full"
              selected={startDate}
              onChange={(date) => setStartDate(date as Date)}
            />
          </div>
          {/*
           * Date Picker
           */}
          <div className="flex flex-col">
            <label>To Date</label>
            <ReactDatePicker
              dateFormat={"dd/MM/yyyy"}
              className="border rounded-md cursor-pointer px-3 py-2 mt-1.5 bg-gray-50 w-full"
              selected={endDate}
              wrapperClassName="w-full"
              onChange={(date) => setEndDate(date as Date)}
            />
          </div>
          {/*
           *  Area Selector
           */}
          <div className="flex flex-col">
            <label>Select Area</label>
            <select
              onChange={(e) => setAddress(e.target.value)}
              className="border rounded-md cursor-pointer pl-3 pr-10 py-2 mt-1.5 bg-gray-50 w-full"
            >
              <option selected={address === "all"} value="all">
                All
              </option>
              {areas &&
                areas.map((area: Area, index: number) => (
                  <option selected={area.name === address} key={index}>
                    {area.name}
                  </option>
                ))}
            </select>
          </div>
          {/*
           * Action Buttons
           */}
          <div className="flex items-center justify-center md:items-end">
            <button
              onClick={getInvoices}
              className="bg-blue-500 text-white px-3 py-2 h-fit rounded-md"
            >
              Generate Report
            </button>
            {reportData.data && (
              <button
                className="bg-green-500 flex items-center text-white px-3 mx-5 py-2 h-fit rounded-md"
                onClick={() => {
                  // generate workbook from table element
                  const wb = utils.table_to_book(tableRef.current);
                  // write to XLSX
                  writeFileXLSX(
                    wb,
                    `${address.toUpperCase()}_${+new Date()}.xlsx`
                  );
                  toast.success("Exported to XLSX");
                }}
              >
                <LuFileSpreadsheet size={20} className="mr-1" />
                Export XLSX
              </button>
            )}
          </div>
        </div>

        {/*
         * Table
         */}
        {reportData.data && (
          <div className="relative overflow-x-auto mt-10">
            <table
              ref={tableRef}
              className="w-full text-sm text-left rtl:text-right text-gray-900"
            >
              <thead className="text-sm text-gray-700 uppercase bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3">
                    SL No.
                  </th>
                  <th scope="col" className="px-6 py-3">
                    ID
                  </th>
                  <th scope="col" className="px-6 py-3">
                    Name
                  </th>
                  <th scope="col" className="px-6 py-3">
                    Phone
                  </th>
                  <th scope="col" className="px-6 py-3 flex items-center">
                    Total Due
                    <Menu
                      menuButton={
                        <MenuButton className="flex items-center">
                          <FaSort className="inline-block ml-1" size={16} />
                        </MenuButton>
                      }
                      transition
                    >
                      <MenuItem
                        onClick={() => filterByTotalDue("desc")}
                        className="text-xs"
                      >
                        High to Low
                      </MenuItem>
                      <MenuItem
                        onClick={() => filterByTotalDue("asc")}
                        className="text-xs"
                      >
                        Low to High
                      </MenuItem>
                    </Menu>
                  </th>
                </tr>
              </thead>
              <tbody>
                {reportData.data &&
                  reportData.data.map((item: any, index: number) => (
                    <tr className="bg-white border-b " key={index}>
                      <th className="px-6 py-4 font-medium whitespace-nowrap">
                        {index + 1}
                      </th>
                      <th className="px-6 py-4 font-medium whitespace-nowrap">
                        {item.id}
                      </th>
                      <td className="px-6 py-4">{item.name}</td>
                      <td className="px-6 py-4">{item.phone}</td>
                      <td className="px-6 py-4">
                        {item.totalDue === 0 ? "---" : item.totalDue}
                      </td>
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
