import { getGreeting } from "@/lib/helpers";
import React from "react";

const Greetings = ({ name, right }: { name: string | undefined; right?: React.ReactNode }) => {
  const today = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          {getGreeting()}
          {name ? `, ${name.split(" ")[0]}` : ""}
        </h1>
        <p className="text-sm text-gray-500">{today}</p>
      </div>
      {right}
    </div>
  );
};

export default Greetings;
