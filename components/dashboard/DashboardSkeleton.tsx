import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";

// Bar heights (%) for the placeholder jars chart, so it reads as a bar chart.
const BAR_HEIGHTS = [55, 75, 40, 85, 65, 50, 70];

const TileSkeleton = () => (
  <div className="flex flex-col gap-2 rounded-xl border bg-white p-3 shadow-sm">
    <div className="flex items-center gap-2.5">
      <Skeleton className="size-7 rounded-md" />
      <Skeleton className="h-4 w-28" />
    </div>
    <Skeleton className="h-7 w-24" />
    <Skeleton className="h-4 w-40" />
  </div>
);

// Mirrors the dashboard layout (day tiles, live tiles, charts) so the page
// doesn't jump when the data arrives. The greeting header renders above it.
const DashboardSkeleton = ({ showAdminTools }: { showAdminTools?: boolean }) => {
  return (
    <div aria-busy="true" aria-label="Loading dashboard" className="flex w-full flex-col gap-6">
      {showAdminTools && <Skeleton className="h-11 w-full rounded-xl" />}

      <div className="flex flex-col gap-3">
        <Skeleton className="h-5 w-36" />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <TileSkeleton key={i} />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <Skeleton className="h-5 w-24" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <TileSkeleton key={i} />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <Skeleton className="h-5 w-20" />
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {[0, 1].map((i) => (
            <Card key={i} className="rounded-xl shadow-sm">
              <CardHeader className="p-4 pb-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-56" />
              </CardHeader>
              <CardContent className="px-4 pb-3">
                {i === 0 ? (
                  <div className="flex h-[170px] items-end gap-3">
                    {BAR_HEIGHTS.map((h, j) => (
                      <Skeleton key={j} className="flex-1 rounded-lg" style={{ height: `${h}%` }} />
                    ))}
                  </div>
                ) : (
                  <Skeleton className="h-[170px] w-full rounded-lg" />
                )}
              </CardContent>
              <CardFooter className="gap-3 p-4 pt-0">
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-8 w-20" />
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DashboardSkeleton;
