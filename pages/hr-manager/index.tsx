import Wrapper from "@/components/Wrapper";
import React, { useEffect, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PiExport } from "react-icons/pi";
import { useSession } from "next-auth/react";
import useAxiosInstance from "@/lib/hooks/useAxiosInstance";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Staff } from "@/types/types";
import { Button } from "@/components/ui/button";
import axios from "axios";


interface MonthData {
  days: Record<number, number>;
  total: number;
}

interface Totals {
  yearlyTotal: number;
  activeMonths: number;
}

interface EmployeeData {
  employeeCode: string;
  employeeId: string;
  employeeName: string;
  year: number;
  months: Record<string, MonthData>;
  totals: Totals;
}

interface RawDataRow {
  [key: string]: string | number | undefined;
}

const BreadCrumb = [
  {
    href: "/hr-manager",
    name: "Human Resouce",
  },
];

const HRManager = () => {
  const { data: session } = useSession();

  const axiosInstance = useAxiosInstance(session);

  const [staffs, setStaffs] = useState<Staff[] | null>(null);
  const [selectedID, setSelectedID] = useState<number | null>(null);
  const [staffAttendance, setStaffAttendance] = useState<EmployeeData[] | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const getStaffData = async () => {
    const URL = process.env.NEXT_PUBLIC_API_URL;

    let { data } = await axiosInstance.get(`${URL}/staff`);
    console.log(data);
    setStaffs(data);
  };

  const getStaffAttendance = async () => {

    const rawDataResponse = await axios.get(
      `https://sheetdb.io/api/v1/97mwjbws8svwm`
    );

    const rawData = rawDataResponse.data;

    const YEAR = 2025;

    // --- Helper functions ---
    function parseAmount(value: string | number | undefined): number {
      if (!value) return 0;
      const num = Number(String(value).replace(/[₹,\s]/g, ""));
      return Number.isFinite(num) ? num : 0;
    }

    function extractEmployeeMonthInfo(
      key: string
    ): { code: string; id: string; month: string } | null {
      // Matches "MS-9218 (Oct)"
      const regex = /^([A-Za-z]+)-(\d+)\s*\((\w+)\)\s*$/;
      const match = key.match(regex);
      if (!match) return null;

      const [, code, id, monthShort] = match;
      const monthMap: Record<string, string> = {
        Jan: "January",
        Feb: "February",
        Mar: "March",
        Apr: "April",
        May: "May",
        Jun: "June",
        Jul: "July",
        Aug: "August",
        Sep: "September",
        Oct: "October",
        Nov: "November",
        Dec: "December",
      };
      const monthFull = monthMap[monthShort] || monthShort;
      return { code, id, month: monthFull };
    }

    // --- Main Transform ---
    const empMap = new Map<string, EmployeeData>();

    for (const row of rawData as RawDataRow[]) {
      const dayRaw = row[""];
      if (!dayRaw) continue;

      const dayStr = String(dayRaw).trim();
      if (dayStr.toLowerCase() === "total") continue;

      const dayNum = Number(dayStr);
      if (!Number.isFinite(dayNum) || dayNum <= 0) continue;

      for (const key of Object.keys(row)) {
        if (key === "") continue;
        const info = extractEmployeeMonthInfo(key);
        if (!info) continue;

        const { code, id, month } = info;
        const amount = parseAmount(row[key]);
        if (amount <= 0) continue; // skip zero or blank cells

        const empKey = `${code}-${id}`;

        // Initialize employee
        if (!empMap.has(empKey)) {
          empMap.set(empKey, {
            employeeCode: code,
            employeeId: id,
            employeeName: `${code}-${id}`,
            year: YEAR,
            months: {},
            totals: { yearlyTotal: 0, activeMonths: 0 },
          });
        }

        const emp = empMap.get(empKey)!;

        // Initialize month
        if (!emp.months[month]) {
          emp.months[month] = { days: {}, total: 0 };
        }

        // Record the transaction
        emp.months[month].days[dayNum] = amount;
        emp.months[month].total += amount;

        // Update yearly total
        emp.totals.yearlyTotal += amount;
      }
    }

    // --- Compute activeMonths ---
    // @ts-ignore
    for (const emp of empMap.values()) {
      emp.totals.activeMonths = Object.keys(emp.months).filter(
        (m) => emp.months[m].total > 0
      ).length;
    }

    // --- Final Output ---
    const result: EmployeeData[] = Array.from(empMap.values()).sort((a, b) =>
      a.employeeCode.localeCompare(b.employeeCode)
    );

    setStaffAttendance(result);

    console.log(result)

  };

  useEffect(() => {
    if (session && !staffs) getStaffData();
  }, [session, staffs]);

  useEffect(() => {
    if (!staffAttendance && staffs) getStaffAttendance();
  }, [staffAttendance, staffs]);

  return (
    <Wrapper breadcrumb={BreadCrumb}>
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="w-full sm:max-w-[700px]">
          <SheetHeader className="w-full">
            <SheetTitle className="font-medium">Employee ID:  {selectedID}</SheetTitle>
            <SheetDescription>
              <div className="space-y-1 mt-1 pt-4 text-lg border-t">
                <h4 className="leading-none font-medium text-gray-800">
                  {staffs?.find((staff) => staff.employeeID === selectedID)?.name}
                </h4>
                <p className="text-muted-foreground text-sm">
                  Name
                </p>
              </div>
              <div className="space-y-1 mt-6 text-lg">
                <h4 className="leading-none font-medium text-gray-800">
                  {new Date(staffs?.find((staff) => staff.employeeID === selectedID)?.joiningDate || "").toLocaleDateString()}, {staffs?.find((staff) => staff.employeeID === selectedID) ? Math.floor((new Date().getTime() - new Date(staffs.find((staff) => staff.employeeID === selectedID)!.joiningDate).getTime()) / (1000 * 60 * 60 * 24 * 30)) : 0} months
                </h4>
                <p className="text-muted-foreground text-sm">
                  Joining Date
                </p>
              </div>
            </SheetDescription>
          </SheetHeader>
        </SheetContent>
      </Sheet>
      <div className="p-3 border rounded-xl bg-white">
        <div className="rounded-lg md:p-4">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-4">
            <h2 className="text-lg font-semibold mb-2 md:mb-0">All Employees</h2>
            <div className="flex w-full md:w-fit flex-col md:flex-row gap-4">
              <Select defaultValue="all-status">
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent className="">
                  <SelectItem value="all-status">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>

              <Select defaultValue="all-role">
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-role">All Role</SelectItem>
                  <SelectItem value="driver">Driver</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                className="flex items-center"
              >
                <PiExport size={18} className="mr-2" />
                Export
              </Button>
            </div>
          </div>

          <div className="relative overflow-x-auto sm:rounded-lg">
            <table className="w-full text-left">
              <thead className="uppercase bg-gray-200">
                <tr>
                  {/* <th scope="col" className="p-4">
                    <div className="flex items-center">
                      <input
                        id="checkbox-all-search"
                        type="checkbox"
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 dark:focus:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                      />
                      <label htmlFor="checkbox-all-search" className="sr-only">
                        checkbox
                      </label>
                    </div>
                  </th> */}
                  <th scope="col" className="px-6 py-3 text-xs">
                    Employee ID
                  </th>
                  <th scope="col" className="px-6 py-3 text-xs">
                    Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-xs">
                    Contact
                  </th>

                  <th scope="col" className="px-6 py-3 text-xs">
                    Address
                  </th>
                  <th scope="col" className="px-6 py-3 text-xs">
                    Joining Date
                  </th>
                  <th scope="col" className="px-6 py-3 text-xs">
                    Role
                  </th>
                  <th scope="col" className="px-6 py-3 text-xs">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-xs">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {staffs &&
                  staffs.map((staff) => {
                    return (
                      <tr
                        key={staff._id}
                        className="bg-white border-b  hover:bg-gray-50 "
                      >
                        {/* <td className="w-4 p-4">
                          <div className="flex items-center">
                            <input
                              id="checkbox-table-search-1"
                              type="checkbox"
                              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600  focus:ring-2"
                            />
                            <label
                              htmlFor="checkbox-table-search-1"
                              className="sr-only"
                            >
                              checkbox
                            </label>
                          </div>
                        </td> */}
                        <th
                          scope="row"
                          className="flex items-center px-6 py-4 whitespace-nowrap"
                        >
                          <div className="ps-3">
                            <div className="font-medium text-sm">
                              {staff.employeeID}
                            </div>
                          </div>
                        </th>
                        <td className="px-6 py-4 text-sm text-black capitalize">
                          <div className="">
                            <div className="font-semibold text-sm underline">
                              {staff.name}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-black capitalize">
                          {staff.phone}
                        </td>
                        <td className="px-6 py-4 text-sm text-black capitalize">
                          {staff.address}
                        </td>
                        <td className="px-6 py-4 text-sm text-black capitalize">
                          {new Date(staff.joiningDate).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-sm text-black">
                          <button className="border border-gray-300 rounded-md px-3 font-medium py-0.5 capitalize bg-gray-100">
                            {staff.type}
                          </button>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div className="flex items-center capitalize">
                            <div
                              className={`h-2.5 w-2.5 rounded-full ${staff.status === "active"
                                ? "bg-green-500"
                                : "bg-yellow-500"
                                } me-2`}
                            ></div>{" "}
                            {staff.status}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <Button
                            variant="outline"
                            onClick={() => {
                              setSelectedID(staff.employeeID);
                              setIsSheetOpen(!isSheetOpen)
                            }}
                            className="font-medium hover:underline"
                          >
                            View
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Wrapper>
  );
};

export default HRManager;
