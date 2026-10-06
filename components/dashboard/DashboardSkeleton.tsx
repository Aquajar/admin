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

// Mirrors the dashboard layout (date selector, day summary cards, charts) so
// the page doesn't jump when the data arrives.
const DashboardSkeleton = ({ showAdminTools }: { showAdminTools?: boolean }) => {
  return (
    <div aria-busy="true" aria-label="Loading dashboard">
      {/* Date selector */}
      <div className="flex justify-between my-3 items-center">
        <div className="flex items-center gap-3">
          <Skeleton className="h-7 w-7" />
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-7 w-7" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-16" />
        </div>
      </div>

      <div className="flex flex-col space-y-5 w-full">
        {showAdminTools && <Skeleton className="h-6 w-44 mx-auto" />}

        <div className="grid md:grid-cols-12 gap-3">
          {/* Day summary cards */}
          <div className="md:col-span-3">
            <div className="w-full grid md:grid-cols-1 gap-5">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="flex flex-col space-y-3 p-4 bg-white border shadow-sm rounded-2xl"
                >
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-10 w-24" />
                  <Skeleton className="h-4 w-36" />
                </div>
              ))}
            </div>
          </div>

          {/* Charts */}
          <div className="md:col-span-9 grid md:grid-cols-2 gap-3">
            {[0, 1].map((i) => (
              <Card key={i} className="shadow-sm">
                <CardHeader>
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-56" />
                </CardHeader>
                <CardContent>
                  {i === 0 ? (
                    <div className="flex aspect-video items-end gap-3">
                      {BAR_HEIGHTS.map((h, j) => (
                        <Skeleton
                          key={j}
                          className="flex-1 rounded-lg"
                          style={{ height: `${h}%` }}
                        />
                      ))}
                    </div>
                  ) : (
                    <Skeleton className="aspect-video w-full rounded-lg" />
                  )}
                </CardContent>
                <CardFooter className="flex-col items-start space-y-3">
                  <Skeleton className="h-4 w-32" />
                  {[0, 1, 2].map((j) => (
                    <div key={j} className="flex w-full justify-between">
                      <Skeleton className="h-3 w-40" />
                      <Skeleton className="h-3 w-14" />
                    </div>
                  ))}
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardSkeleton;
