import React, { useState, ReactElement, ReactNode } from "react";
import { FaAngleDown } from "react-icons/fa6";

// Accordion Component
interface AccordionProps {
  children: ReactElement<AccordionItemProps>[]; // Ensure children are AccordionItem elements
  allowMultiple?: boolean; // Option to allow multiple items to be open at once
  className?: string; // Custom class for the Accordion
}

const Accordion: React.FC<AccordionProps> = ({
  children,
  allowMultiple = false,
  className = "",
}) => {
  const [openItems, setOpenItems] = useState<number[]>([0]);

  const toggleItem = (index: number) => {
    if (allowMultiple) {
      setOpenItems((prev) =>
        prev.includes(index)
          ? prev.filter((i) => i !== index)
          : [...prev, index]
      );
    } else {
      setOpenItems((prev) => (prev.includes(index) ? [] : [index]));
    }
  };

  return (
    <div className={`accordion ${className} divide-y divide-gray-400`}>
      {React.Children.map(children, (child, index) => {
        if (React.isValidElement<AccordionItemProps>(child)) {
          return React.cloneElement(child, {
            isOpen: openItems.includes(index),
            onToggle: () => toggleItem(index),
          });
        }
        return child;
      })}
    </div>
  );
};

// AccordionItem Component
interface AccordionItemProps {
  header: ReactNode;
  children: ReactNode;
  isOpen?: boolean; // Whether the item is open
  onToggle?: () => void; // Callback for toggle
  className?: string; // Custom class for the AccordionItem
}

const AccordionItem: React.FC<AccordionItemProps> = ({
  header,
  children,
  isOpen = false,
  onToggle,
  className = "",
}) => {
  return (
    <div className={`accordion-item ${className} p-4`}>
      <button
        onClick={onToggle}
        className="w-full text-left text-lg font-medium text-gray-800 hover:text-gray-600 focus:outline-none flex justify-between"
      >
        {header}
        <span
          className={`float-right transition-transform ${
            isOpen ? "rotate-180" : "rotate-0"
          }`}
        >
          <FaAngleDown />
        </span>
      </button>
      <div
        className={`mt-2 bg-white  rounded-lg text-gray-800 overflow-hidden transition-all duration-300 ${
          isOpen
            ? "max-h-screen overflow-y-auto border border-gray-400"
            : "max-h-0"
        }`}
      >
        {children}
      </div>
    </div>
  );
};

export { Accordion, AccordionItem };
