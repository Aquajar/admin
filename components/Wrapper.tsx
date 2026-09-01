import React, { FC, Suspense } from "react";

interface WrapperProps {
  children: React.ReactNode;
}

const Wrapper: FC<WrapperProps> = ({ children }) => {
  return (
    <Suspense fallback={<span>Loading...</span>}>
      <div className="flex flex-1 flex-col w-full px-4 md:px-8 pt-4 mb-28 bg-[#FFFFFF]">
        {children}
      </div>
    </Suspense>
  );
};

export default Wrapper;
