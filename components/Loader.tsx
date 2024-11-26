import React, { FC } from "react";
import { CgSpinner } from "react-icons/cg";

const Loader: FC<{
  visible: boolean;
}> = ({ visible }) => {
  if (!visible) return null; // Render nothing if loader is not visible

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="loader">
        <CgSpinner className="animate-spin text-white" size={60} />
      </div>
    </div>
  );
};

export default Loader;
