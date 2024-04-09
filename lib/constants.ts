import { IPaymentMethod, SideBarItem } from "@/types/types";
import { RxDashboard } from "react-icons/rx";
import { FaUsers } from "react-icons/fa";
import { RiBillLine } from "react-icons/ri";
import { IoMdSettings } from "react-icons/io";
import { FaShop } from "react-icons/fa6";
import { FaFileInvoice, FaFileAlt } from "react-icons/fa";
import { TbLocationFilled } from "react-icons/tb";
import { MdProductionQuantityLimits } from "react-icons/md";

const SidebarItems: SideBarItem[] = [
  {
    name: "Dashboard",
    icon: RxDashboard,
    href: "/",
  },

  {
    name: "Orders",
    icon: FaShop,
    href: "/orders",
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
    name: "Reports",
    icon: FaFileAlt,
    href: "/reports",
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

export { SidebarItems, paymentMethods, sortByOptions, reportTypes };
