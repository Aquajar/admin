import React, { FC } from "react";

interface IProps {
  children: React.ReactNode;
}

const Card: FC<IProps> = ({ children }) => {
  return (
    <div className="p-6 bg-red-200 rounded-lg flex flex-col w-full">
      {children}
    </div>
  );
};

export default Card;
