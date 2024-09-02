import Wrapper from "@/components/Wrapper";
import React from "react";

const BreadCrumb = [
    {
      href: "/fueling",
      name: "Fueling",
    },
  ];

const Fueling = () => {
  return (
    <Wrapper breadcrumb={BreadCrumb}>
      <div className="relative overflow-x-auto"></div>
    </Wrapper>
  );
};

export default Fueling;
