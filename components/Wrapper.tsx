import React, { FC, Suspense } from "react";
import BreadCrumb from "./BreadCrumb";

interface WrapperProps {
  children: React.ReactNode;
  breadcrumb: {
    href: string;
    name: string;
  }[];
}

const Wrapper: FC<WrapperProps> = ({ children, breadcrumb }) => {
  return (
    <Suspense fallback={<span>Loading...</span>}>
      <div className="flex flex-1 flex-col w-full h-full px-4 mb-28 md:pl-48 md:pr-8 pt-4 bg-[#f9f9f9]">
        <BreadCrumb items={breadcrumb} />
        {children}
      </div>
    </Suspense>
  );
};

export default Wrapper;
