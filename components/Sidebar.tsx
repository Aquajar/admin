import { SidebarItems } from "@/lib/constants";
import useAuthUser from "@/lib/hooks/useAuthUser";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";
import { GiHamburgerMenu } from "react-icons/gi";
import { IoPower } from "react-icons/io5";

const Sidebar = () => {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuthUser();

  return (
    <>
      {!router.pathname.includes("/auth/login") && (
        <GiHamburgerMenu
          className="w-8 h-8 mt-5 md:hidden absolute right-4 z-10 cursor-pointer "
          onClick={() => setIsOpen(!isOpen)}
        />
      )}
      <div
        className={`w-72 md:w-40 h-screen ${
          isOpen ? "translate-x-0" : "-translate-x-72"
        } z-50 md:translate-x-0 ${
          !router.pathname.includes("/auth/login") ? "md:flex" : "hidden"
        } fixed bg-black px-5 shadow-sm flex-col`}
      >
        <div className="h-full flex flex-col justify-between">
          {/* Render Items */}
          <div className="flex flex-col mt-10">
            {SidebarItems.map((item, index) => {
              const IconComponent = item.icon;
              return (
                <Link
                  href={item.href}
                  key={index}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center my-3"
                >
                  <IconComponent className="w-6 h-6 text-white" />
                  <p className="text-lg text-white md:text-sm mt-2 mx-2">
                    {item.name}
                  </p>
                </Link>
              );
            })}
          </div>

          {/* Logout */}
          <div
            className="flex items-center mb-8 w-fit cursor-pointer"
            onClick={() => signOut()}
          >
            <IoPower className="w-6 h-6" />
            <p className="text-lg md:text-sm mx-2">Logout</p>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
