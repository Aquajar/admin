import React, { FC } from "react";

interface IProps {
  children: React.ReactNode;
  title: string;
}

const Card: FC<IProps> = ({ children, title }) => {
  return (
    <div className="flex w-full justify-between space-y-1 py-4 px-5 bg-white border border-black/5 shadow-sm rounded-2xl">
      {children}
    </div>
  );
};

export default Card;
