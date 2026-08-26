import { BreadCrumbProps } from "@/types/types";
import Link from "next/link";
import React, { FC } from "react";

const BreadCrumb: FC<BreadCrumbProps> = ({ items }) => {
  // No items → render nothing (and take no vertical space).
  if (!items || items.length === 0) return null;

  return (
    <nav
      className="flex px-5 py-0.5 text-gray-700 border border-gray-200 rounded-lg bg-gray-50 w-fit mb-3"
      aria-label="Breadcrumb"
    >
      <ol className="inline-flex items-center space-x-1 md:space-x-2 rtl:space-x-reverse">
        {items.map((item, index) => (
          <div key={index}>
            <li className="inline-flex items-center">
              <Link
                href={item.href}
                className="inline-flex items-center font-normal text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-white"
              >
                {item.name}
              </Link>
              {index !== items.length - 1 && (
                <li>
                  <div className="flex items-center">
                    <svg
                      className="rtl:rotate-180 block w-3 h-3 mx-2 text-gray-400 "
                      aria-hidden="true"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 6 10"
                    >
                      <path
                        stroke="currentColor"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        strokeWidth="2"
                        d="m1 9 4-4-4-4"
                      />
                    </svg>
                  </div>
                </li>
              )}
            </li>
          </div>
        ))}
      </ol>
    </nav>
  );
};

export default BreadCrumb;
