import Wrapper from "@/components/Wrapper";
import { SidebarItems } from "@/lib/constants";
import { SideBarItem } from "@/types/types";
import React from "react";

const breadCrumbData: SideBarItem[] = [
  {
    name: "Orders",
    href: "/orders",
    icon: SidebarItems.filter((item) => item.name === "Orders")[0].icon,
  },
];

const Orders = () => {
  return (
    <Wrapper breadcrumb={breadCrumbData}>
      <div></div>
    </Wrapper>
  );
};

export default Orders;
