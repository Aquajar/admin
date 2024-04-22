import React, { FC } from "react";
import BreadCrumb from "./BreadCrumb";
import { BreadCrumbProps, SideBarItem } from "@/types/types";

interface WrapperProps {
  children: React.ReactNode;
  breadcrumb: {
    href: string;
    name: string;
  }[];
}

const Wrapper: FC<WrapperProps> = ({ children, breadcrumb }) => {
  return (
    <div className="flex flex-col w-full h-full px-4 mb-28 md:pl-48 md:pr-8 pt-4">
      <BreadCrumb items={breadcrumb} />
      {children}
    </div>
  );
};

export default Wrapper;
