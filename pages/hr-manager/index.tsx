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
import EarningsTab from "@/components/HR/EarningsTab";


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

const HRManager = () => {
  const { data: session } = useSession();

  const axiosInstance = useAxiosInstance(session);

  const [staffs, setStaffs] = useState<Staff[] | null>(null);
  const [selectedID, setSelectedID] = useState<number | null>(null);
  const [staffAttendance, setStaffAttendance] = useState<EmployeeData[] | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [tab, setTab] = useState<"employees" | "earnings">("employees");

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
    <Wrapper>
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

      {/* Tabs */}
      <div className="mb-6 flex items-center gap-6 border-b border-[#EAEAEA]">
        {(
          [
            { id: "employees", label: "Employees" },
            { id: "earnings", label: "Earnings" },
          ] as { id: "employees" | "earnings"; label: string }[]
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`-mb-px border-b-2 px-1 py-3 text-[15px] font-medium transition-colors ${
              tab === t.id
                ? "border-[#2563EB] text-[#2563EB]"
                : "border-transparent text-[#6B7280] hover:text-[#0A0A0A]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "earnings" && (
        <EarningsTab session={session} axiosInstance={axiosInstance} />
      )}

      {tab === "employees" && (
      <div className="rounded-2xl border border-[#EAEAEA] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div>
          <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6">
            <h2 className="text-xl font-semibold text-[#0A0A0A] mb-3 md:mb-0">All Employees</h2>
            <div className="flex w-full md:w-fit flex-col md:flex-row gap-3">
              <Select defaultValue="all-status">
                <SelectTrigger className="h-11 w-[180px] rounded-xl border-[#EAEAEA] text-[15px] text-[#0A0A0A]">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent className="">
                  <SelectItem value="all-status">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>

              <Select defaultValue="all-role">
                <SelectTrigger className="h-11 w-[180px] rounded-xl border-[#EAEAEA] text-[15px] text-[#0A0A0A]">
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
                className="flex h-11 items-center rounded-xl border-[#EAEAEA] px-5 text-[15px] font-medium text-[#0A0A0A] shadow-none hover:bg-[#FAFAFA]"
              >
                <PiExport size={18} className="mr-2" />
                Export
              </Button>
            </div>
          </div>

          <div className="relative overflow-x-auto rounded-xl border border-[#EAEAEA]">
            <table className="w-full text-left text-[15px]">
              <thead className="border-b border-[#EAEAEA] bg-[#FAFAFA]">
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
                  <th scope="col" className="px-6 py-4 text-[15px] font-medium text-[#0A0A0A]">
                    Employee ID
                  </th>
                  <th scope="col" className="px-6 py-4 text-[15px] font-medium text-[#0A0A0A]">
                    Name
                  </th>
                  <th scope="col" className="px-6 py-4 text-[15px] font-medium text-[#0A0A0A]">
                    Contact
                  </th>

                  <th scope="col" className="px-6 py-4 text-[15px] font-medium text-[#0A0A0A]">
                    Address
                  </th>
                  <th scope="col" className="px-6 py-4 text-[15px] font-medium text-[#0A0A0A]">
                    Joining Date
                  </th>
                  <th scope="col" className="px-6 py-4 text-[15px] font-medium text-[#0A0A0A]">
                    Role
                  </th>
                  <th scope="col" className="px-6 py-4 text-[15px] font-medium text-[#0A0A0A]">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-4 text-[15px] font-medium text-[#0A0A0A]">
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
                        className="border-b border-[#EAEAEA] transition-colors hover:bg-[#FAFAFA]"
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
                            <div className="font-medium text-[15px] text-[#0A0A0A]">
                              {staff.employeeID}
                            </div>
                          </div>
                        </th>
                        <td className="px-6 py-4 text-[15px] text-[#0A0A0A]">
                          <div className="font-medium text-[15px] text-[#0A0A0A] capitalize">
                            {staff.name}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-[15px] text-[#0A0A0A]">
                          {staff.phone}
                        </td>
                        <td className="px-6 py-4 text-[15px] text-[#0A0A0A]">
                          {staff.address}
                        </td>
                        <td className="px-6 py-4 text-[15px] text-[#0A0A0A]">
                          {new Date(staff.joiningDate).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-block rounded-full px-3 py-1 text-[13px] font-medium capitalize ${
                              staff.type === "driver"
                                ? "bg-blue-100 text-blue-900"
                                : staff.type === "manager"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {staff.type}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-block rounded-full px-3 py-1 text-[13px] font-medium capitalize ${
                              staff.status === "active"
                                ? "bg-green-100 text-green-800"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {staff.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <Button
                            variant="outline"
                            onClick={() => {
                              setSelectedID(staff.employeeID);
                              setIsSheetOpen(!isSheetOpen)
                            }}
                            className="h-9 rounded-xl border-[#EAEAEA] px-4 text-[15px] font-medium text-[#0A0A0A] shadow-none hover:bg-[#FAFAFA]"
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
      )}
    </Wrapper>
  );
};

export default HRManager;
