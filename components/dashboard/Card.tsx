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
      className="px-5 py-6 bg-white shadow rounded-2xl flex flex-col w-full"
    >
      <span className="text-md text-gray-600 font-light mb-4">{title}</span>
      {children}
    </motion.div>
  );
};

export default Card;
