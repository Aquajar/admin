import React, { FC } from "react";
import { motion } from "framer-motion";

interface IProps {
  children: React.ReactNode;
  title: string;
}

const Card: FC<IProps> = ({ children, title }) => {
  return (
    <motion.div
      whileHover={{ scale: 1.3 }}
      className="px-4 py-5 bg-white border rounded-lg flex flex-col w-full shadow-sm"
    >
      <span className="text-md text-gray-600 font-light mb-5">{title}</span>
      {children}
    </motion.div>
  );
};

export default Card;
