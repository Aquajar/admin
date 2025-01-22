import Wrapper from "@/components/Wrapper";
import { ActivityTypes } from "@/lib/constants";
import { formatTimeAgo } from "@/lib/helpers";
import useAxiosInstance from "@/lib/hooks/useAxiosInstance";
import useRefreshTokenRotation from "@/lib/hooks/useRefreshToken";
import { useActivityStore } from "@/store/activities.store";
import { Activity } from "@/types/types";
import { useSession } from "next-auth/react";
import React, { useEffect, useState } from "react";

const BreadCrumb = [
  {
    href: "/activity",
    name: "Activity",
  },
];

const ActivityMain = () => {
  const { activities, setActivities } = useActivityStore();
  const { data: session } = useSession();
  const [selectedTag, setSelectedTag] = useState<
    "all" | "payment" | "entry" | "log" | "user"
  >("all");
  const [filteredActivities, setFilteredActivities] = useState<
    Activity[] | undefined | null
  >(undefined);

  // Create axios instance
  const axiosInstance = useAxiosInstance(session);
  // Hooks
  useRefreshTokenRotation(axiosInstance);

  // Update the activities list with the current selected tag
  useEffect(() => {
    let filtered;
    if (selectedTag === "all") {
      filtered = activities;
    } else {
      filtered = activities?.filter((activity) => activity.tag === selectedTag);
    }
    setFilteredActivities(filtered);
  }, [selectedTag, activities]);

  // Fetch activities on component mount
  useEffect(() => {
    if (activities === undefined && session) {
      const URL = process.env.NEXT_PUBLIC_API_URL + `/activity`;
      axiosInstance.get(URL).then((response) => {
        if (response.data.length === 0) setActivities(null);
        else {
          setActivities(response.data);
        }
      });
    }
  }, [activities, session]);

  return (
    <Wrapper breadcrumb={BreadCrumb}>
      <div className="w-full flex flex-col md:flow-row mt-5">
        <div className="md:w-[75%] flex flex-col">
          {/* Navigation */}
          <div className="w-full grid grid-cols-5 p-2 bg-gray-200 rounded-t-lg">
            {ActivityTypes.map((activityType, index) => {
              return (
                <button
                  key={activityType.id}
                  className={`p-2 ${
                    selectedTag === activityType.id
                      ? "bg-white font-medium shadow rounded-lg text-black translate-x-1"
                      : `${
                          index !== 0 && "border-l"
                        } border-gray-300 text-sm md:text-md`
                  }`}
                  onClick={() => setSelectedTag(activityType.id)}
                >
                  {activityType.name}
                </button>
              );
            })}
          </div>
          {/* Render Activities */}
          <div className="h-[34rem] overflow-y-auto bg-gray-200">
            <div className="space-y-2 p-3">
              {(filteredActivities &&
                filteredActivities.map((activity, index) => {
                  let activityType = ActivityTypes.find(
                    (a) => a.id === activity.tag
                  );

                  return (
                    <div
                      key={index}
                      style={{
                        borderColor: activityType?.color,
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
        </div>
        <div className="md:w-[25%]"></div>
      </div>
    </Wrapper>
  );
};

export default ActivityMain;
