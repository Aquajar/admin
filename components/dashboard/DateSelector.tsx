import { monthsInAnYear } from "@/lib/constants";
import React, { Dispatch, FC, SetStateAction } from "react";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { SlCalender } from "react-icons/sl";

interface IProps {
  handlePrevDay: () => void;
  handleNextDay: () => void;
  handleChangeMonth: (month: string) => void;
  handleChangeYear: (year: number) => void;
  setShowMonthOptions: Dispatch<SetStateAction<boolean>>;
  setShowYearOptions: Dispatch<SetStateAction<boolean>>;
  showMonthOptions: boolean;
  showYearOptions: boolean;
  currDayIndex: number;
  currMonth: string | undefined;
  currDay: string | undefined;
  currYear: number | undefined;
  totalDataLength: number | undefined;
}

const DateSelector: FC<IProps> = ({
  handlePrevDay,
  handleNextDay,
  handleChangeMonth,
  handleChangeYear,
  setShowMonthOptions,
  setShowYearOptions,
  showYearOptions,
  showMonthOptions,
  currDayIndex,
  totalDataLength,
  currDay,
  currMonth,
  currYear,
}) => {
  return (
    <div className="flex justify-between my-3">
      <div className="flex justify-between space-x-2 items-center">
        <button
          onClick={handlePrevDay}
          disabled={currDayIndex + 1 === totalDataLength}
          className="disabled:opacity-50"
        >
          <FaChevronLeft className="text-lg" />
        </button>
        <span className={`text-lg font-semibold`}>{currDay}</span>
        <button
          onClick={handleNextDay}
          disabled={currDayIndex === 0}
          className="disabled:opacity-50"
        >
          <FaChevronRight className="text-lg" />
        </button>
      </div>
      <div>
        <div className="inline-flex rounded-md shadow-md" role="group">
          <button
            type="button"
            disabled={showYearOptions}
            onClick={() => setShowMonthOptions(true)}
            className="px-4 py-2 flex justify-center text-sm font-medium text-gray-900 bg-white border border-gray-200 rounded-s-lg hover:bg-gray-100 hover:text-blue-700"
          >
            <SlCalender size={16} className="mr-3" />
            {currMonth}
          </button>

          <button
            type="button"
            disabled={showMonthOptions}
            onClick={() => setShowYearOptions(true)}
            className="px-4 py-2 text-sm font-medium text-gray-900 bg-white border border-gray-200 rounded-e-lg hover:bg-gray-100 hover:text-blue-700"
          >
            {currYear}
          </button>
        </div>

        {showMonthOptions && (
          <div className="w-48 absolute text-sm font-medium text-gray-900 bg-white border border-gray-200 rounded-lg">
            {monthsInAnYear.map((month) => (
              <button
                onClick={() => handleChangeMonth(month)}
                key={month}
                // disabled={month === currMonth}
                aria-current="true"
                className="block w-full disabled:bg-gray-200 px-4 py-2 border-b border-gray-200 cursor-pointer hover:bg-gray-100 hover:text-blue-700"
              >
                {month}
              </button>
            ))}
          </div>
        )}
        {showYearOptions && !showMonthOptions && (
          <div className="w-48 absolute text-sm font-medium text-gray-900 bg-white border border-gray-200 rounded-lg">
            {[2024, 2025].map((year) => (
              <button
                onClick={() => handleChangeYear(year)}
                key={year}
                disabled={year > new Date().getFullYear()}
                aria-current="true"
                className={`block w-full disabled:bg-gray-100 disabled:opacity-60 px-4 py-2 border-b border-gray-200 cursor-pointer hover:bg-gray-100 hover:text-blue-700 ${
                  year === currYear && "bg-blue-600 text-white"
                }`}
              >
                {year}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DateSelector;
