import React, { FC } from "react";
import { motion } from "framer-motion";

interface IProps {
  children: React.ReactNode;
  title: string;
}

const Card: FC<IProps> = ({ children, title }) => {
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      className="px-4 py-5 bg-white rounded-2xl flex flex-col w-full"
    >
      <span className="text-md text-gray-600 font-light mb-5">{title}</span>
      {children}
    </motion.div>
  );
};

export default Card;
