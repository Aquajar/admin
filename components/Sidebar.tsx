import { SidebarItems } from "@/lib/constants";
import Link from "next/link";
import React from "react";

const Sidebar = () => {
  return (
    <div className="w-40 h-screen hidden md:flex fixed bg-quaternary border px-5 shadow-sm flex-col">
      {/* Render Items */}
      <div className="flex flex-col mt-10">
        {SidebarItems.map((item, index) => {
          const IconComponent = item.icon;
          return (
            <Link
              href={item.href}
              key={index}
              className="flex items-center my-3"
            >
              <IconComponent className="w-6 h-6" />
              <p className="text-sm mt-2 mx-2">{item.name}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default Sidebar;
