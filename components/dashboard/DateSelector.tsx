"use client"

import { monthsInAnYear } from "@/lib/constants"
import React, { Dispatch, FC, SetStateAction } from "react"
import { FaChevronLeft, FaChevronRight } from "react-icons/fa"
import { SlCalender } from "react-icons/sl"
import {
  Button,
} from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface IProps {
  handlePrevDay: () => void
  handleNextDay: () => void
  handleChangeMonth: (month: string) => void
  handleChangeYear: (year: number) => void
  setShowMonthOptions: Dispatch<SetStateAction<boolean>>
  setShowYearOptions: Dispatch<SetStateAction<boolean>>
  showMonthOptions: boolean
  showYearOptions: boolean
  currDayIndex: number
  currMonth: string | undefined
  currDay: string | undefined
  currYear: number | undefined
  totalDataLength: number | undefined
}

const DateSelector: FC<IProps> = ({
  handlePrevDay,
  handleNextDay,
  handleChangeMonth,
  handleChangeYear,
  currDayIndex,
  totalDataLength,
  currDay,
  currMonth,
  currYear,
}) => {
  return (
    <div className="flex justify-between my-3 items-center">
      {/* Left: Day navigation */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="icon"
          className="w-7 h-7"
          onClick={handlePrevDay}
          disabled={currDayIndex + 1 === totalDataLength}
        >
          <ChevronLeft size={24} />
        </Button>
        <span className="text-lg font-medium">{currDay}</span>
        <Button
          variant="outline"
          size="icon"
          className="w-7 h-7"
          onClick={handleNextDay}
          disabled={currDayIndex === 0}
        >
          <ChevronRight size={24} />
        </Button>
      </div>

      {/* Right: Month + Year selection */}
      <div className="flex items-center gap-2">
        {/* Month Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="flex items-center gap-2">
              <SlCalender size={16} />
              {currMonth}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            {monthsInAnYear.map((month) => (
              <DropdownMenuItem
                key={month}
                onClick={() => handleChangeMonth(month)}
              >
                {month}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Year Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">{currYear}</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-32">
            {[2024, 2025].map((year) => (
              <DropdownMenuItem
                key={year}
                onClick={() => handleChangeYear(year)}
                disabled={year > new Date().getFullYear()}
              >
                {year}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}

export default DateSelector