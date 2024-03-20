import { IPaymentMethod, SideBarItem } from "@/types/types";
import { RxDashboard } from "react-icons/rx";
import { FaUsers } from "react-icons/fa";
import { RiBillLine } from "react-icons/ri";
import { IoMdSettings } from "react-icons/io";
import { FaShop } from "react-icons/fa6";
import { FaFileInvoice, FaFileAlt } from "react-icons/fa";
import { TbLocationFilled } from "react-icons/tb";

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

export { SidebarItems, paymentMethods, sortByOptions };
