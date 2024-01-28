import { SideBarItem } from "@/types/types";
import { RxDashboard } from "react-icons/rx";
import { FaUsers } from "react-icons/fa";
import { RiBillLine } from "react-icons/ri";
import { IoMdSettings } from "react-icons/io";
import { FaShop } from "react-icons/fa6";
import { FaFileInvoice } from "react-icons/fa";

export const SidebarItems: SideBarItem[] = [
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
    name: "Settings",
    icon: IoMdSettings,
    href: "/settings",
  },
  {
    name: "Invoices",
    icon: FaFileInvoice,
    href: "/invoices",
  },
];
