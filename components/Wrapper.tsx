import React, { FC } from "react";

interface WrapperProps {
  children: React.ReactNode;
  name: string;
}

const Wrapper: FC<WrapperProps> = ({ children, name }) => {
  return (
    <div className="flex flex-col w-full h-full px-4 mb-28 md:pl-48 md:pr-8 pt-6">
      <p className="text-xl font-normal capitalize text-black pb-5">{name}</p>
      {children}
    </div>
  );
};

export default Wrapper;
