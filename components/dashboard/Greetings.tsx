import { getGreeting } from "@/lib/helpers";
import React from "react";

const Greetings = ({ name }: { name: string | undefined }) => {
  return (
    <div className="bg-gray-50 rounded-xl p-5 md:hidden mb-3">
      <h1 className="text-xl font-semibold text-start">
        {getGreeting()}, {name}
      </h1>
    </div>
  );
};

export default Greetings;
