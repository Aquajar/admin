import React, { FC } from "react";

interface IProps {
  children: React.ReactNode;
  title: string;
}

const Card: FC<IProps> = ({ children, title }) => {
  return (
    <div className="flex w-full justify-between space-y-1 py-3 px-4 bg-white  border  shadow rounded-3xl">
      {children}
    </div>
  );
};

export default Card;
