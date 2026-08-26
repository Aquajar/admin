import { IPaymentMethod, SideBarItem } from "@/types/types";
import { RxDashboard } from "react-icons/rx";
import { FaUsers } from "react-icons/fa";
import { RiBillLine } from "react-icons/ri";
import { IoMdSettings } from "react-icons/io";
import { FaPeopleGroup } from "react-icons/fa6";
import { FaFileInvoice, FaFileAlt, FaMapMarkedAlt, FaTruck } from "react-icons/fa";
import { TbLocationFilled } from "react-icons/tb";
import { MdProductionQuantityLimits } from "react-icons/md";
import { GrOrganization } from "react-icons/gr";
import { LuFuel } from "react-icons/lu";
import { FiActivity } from "react-icons/fi";

const SidebarItems: SideBarItem[] = [
  {
    name: "Dashboard",
    icon: RxDashboard,
    href: "/",
  },

  {
    name: "Map",
    icon: FaMapMarkedAlt,
    href: "/map",
  },
  {
    name: "Billing",
    icon: RiBillLine,
    href: "/billing/create",
  },
  {
    name: "Customers",
    icon: FaUsers,
    href: "/customers",
  },
  {
    name: "Invoices",
    icon: FaFileInvoice,
    href: "/invoices",
  },
  {
    name: "Account Groups",
    icon: GrOrganization,
    href: "/account-groups",
  },
  {
    name: "HR Manager",
    icon: FaPeopleGroup,
    href: "/hr-manager",
  },
  {
    name: "Fueling",
    icon: LuFuel,
    href: "/fueling",
  },
  {
    name: "Vehicle Log",
    icon: FaTruck,
    href: "/vehicle-log",
  },
  {
    name: "Areas",
    icon: TbLocationFilled,
    href: "/area",
  },
  {
    name: "Products",
    icon: MdProductionQuantityLimits,
    href: "/products",
  },
  {
    name: "Reports",
    icon: FaFileAlt,
    href: "/reports",
  },
  {
    name: "Activity",
    icon: FiActivity,
    href: "/activity",
  },
  {
    name: "Settings",
    icon: IoMdSettings,
    href: "/settings",
  },
];

const paymentMethods: IPaymentMethod[] = [
  {
    value: "cash",
    label: "Cash",
  },
  {
    value: "due",
    label: "Due",
  },
  {
    value: "upi",
    label: "Online (UPI)",
  },
  {
    value: "account",
    label: "Account",
  },
];

const sortByOptions = [
  {
    id: 1,
    name: "Highest due",
  },
  {
    id: 2,
    name: "Lowest due",
  },
];

const reportTypes: {
  name: string;
  value: string;
}[] = [
  {
    name: "Sales Report",
    value: "salesReport",
  },
  {
    name: "Customer Analytics",
    value: "customerAnalytics",
  },
];

const monthAbbr: { [key: string]: string } = {
  January: "Jan",
  February: "Feb",
  March: "Mar",
  April: "Apr",
  May: "May",
  June: "Jun",
  July: "Jul",
  August: "Aug",
  September: "Sep",
  October: "Oct",
  November: "Nov",
  December: "Dec",
};

export const ActivityTypes: {
  id: "all" | "payment" | "log" | "user" | "entry";
  name: string;
  color: string;
}[] = [
  {
    id: "all",
    name: "All",
    color: "gray-200",
  },
  {
    id: "payment",
    name: "Payment",
    color: "#6ACF65",
  },
  {
    id: "entry",
    name: "Entry",
    color: "#379dff",
  },
  {
    id: "log",
    name: "log",
    color: "yellow-500",
  },
  {
    id: "user",
    name: "User",
    color: "orange-500",
  },
];

const monthsInAnYear = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export const MARKET_SEGMENTS = [
  { id: "b2c", label: "Individual (B2C)", description: "Households and individuals buying for personal use" },
  { id: "b2b", label: "Business (B2B)", description: "Companies buying for operations or resale" },
  { id: "b2g", label: "Government (B2G)", description: "Departments, municipalities, PSUs — tender based" },
  { id: "b2b2c", label: "Reseller (B2B2C)", description: "Distributors and retailers selling onward to consumers" },
  { id: "inst", label: "Institutional", description: "Schools, hospitals, hotels, offices — contract based" },
  { id: "ngo", label: "Non-profit", description: "Trusts, societies, NGOs" },
] as const;

export type MarketSegment = (typeof MARKET_SEGMENTS)[number]["id"];

export const customModalStyles = {
  overlay: {
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  content: {
    top: "50%",
    left: "50%",
    right: "auto",
    bottom: "auto",
    marginRight: "-50%",
    padding: "2rem",
    transform: "translate(-50%, -50%)",
    backgroundColor: "white",
    borderRadius: "0.5rem",
    border: "1px solid #ccc",
  },
};

export {
  SidebarItems,
  paymentMethods,
  sortByOptions,
  reportTypes,
  monthAbbr,
  monthsInAnYear,
};
