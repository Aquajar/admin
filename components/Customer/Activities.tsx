import { formatTimeAgo } from "@/lib/helpers";
import { Activity } from "@/types/types";
import React, { FC } from "react";

interface IProps {
  activities: Activity[] | null;
}

const Activities: FC<IProps> = ({ activities }) => {
  return (
    <div className="md:w-[65%]">
      <div className="space-y-2 p-3">
        {(activities &&
          activities.map((activity, index) => {
            return (
              <div
                key={index}
                style={{
                  borderColor: "green",
                }}
                className={`p-3 md:p-5 border-l-[6px] bg-gray-100 flex justify-between rounded`}
              >
                <div className="font-medium text-sm w-[70%] md:w-[86%]">
                  {activity.message}
                </div>
                <div className="">
                  <span className="text-xs md:text-sm">
                    {formatTimeAgo(new Date(activity.createdAt))}
                  </span>
                </div>
              </div>
            );
          })) || <div className="text-center">No activities found.</div>}
      </div>
    </div>
  );
};

export default Activities;
