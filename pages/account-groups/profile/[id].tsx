import Wrapper from "@/components/Wrapper";
import { decryptData } from "@/lib/helpers";
import useAxiosInstance from "@/lib/hooks/useAxiosInstance";
import useRefreshTokenRotation from "@/lib/hooks/useRefreshToken";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";

const BreadCrumb = [
  {
    name: "Account Groups",
    href: "/account-groups",
  },
  {
    name: "Profile",
    href: "/account-groups/profile",
  },
];

const Detail = () => {
  const [accountData, setAccountData] = useState<string | null>(null);
  const router = useRouter();
  const { data: session } = useSession();

  // Create axios instance
  const axiosInstance = useAxiosInstance(session);

  // Hooks
  useRefreshTokenRotation(axiosInstance);
  const { query } = router;

  // Get Account Groups information
  const getAccountGroups = async (id: string) => {
    const url = process.env.NEXT_PUBLIC_API_URL + "/user/account-group/" + id;
    try {
      const { data } = await axiosInstance.get(url);
      console.log(data);
      setAccountData(data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (query.id && accountData === null) {
      if (typeof query.id === "string") {
        getAccountGroups(query.id);
      }
    }
  }, [router]);

  return (
    <Wrapper breadcrumb={BreadCrumb}>
      <div className="flex w-full">
        <div className="w-full mt-10">
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse border border-gray-300 text-left">
              <thead>
                <tr>
                  <th className="border border-gray-300 px-4 py-2 bg-gray-100 text-sm font-semibold text-gray-700">
                    SNo.
                  </th>
                  <th className="border border-gray-300 px-4 py-2 bg-gray-100 text-sm font-semibold text-gray-700">
                    Location
                  </th>
                  <th className="border border-gray-300 px-4 py-2 bg-gray-100 text-sm font-semibold text-gray-700">
                    Amount (Rs)
                  </th>
                </tr>
              </thead>
              <tbody>
                {/* {tableData.map((row, index) => (
                  <tr
                    key={index}
                    className={index % 2 === 0 ? "bg-gray-50" : "bg-white"}
                  >
                    <td className="border border-gray-300 px-4 py-2 text-gray-700">
                      {row.column1}
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-gray-700">
                      {row.column2}
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-gray-700">
                      {row.column3}
                    </td>
                  </tr>
                ))} */}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Wrapper>
  );
};

export default Detail;
