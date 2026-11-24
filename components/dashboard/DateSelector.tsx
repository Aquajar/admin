"use client"

import { monthsInAnYear } from "@/lib/constants"
import React, { Dispatch, FC, SetStateAction } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react"

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
  showPeriod?: boolean
}

// 2024 is the first year with data.
const YEARS = Array.from({ length: new Date().getFullYear() - 2023 }, (_, i) => 2024 + i)

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
  showPeriod,
}) => {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Day navigation (last 7 days) */}
      <div className="flex items-center rounded-lg border bg-white shadow-sm">
        <Button
          variant="ghost"
          size="icon"
          className="size-9 rounded-r-none"
          onClick={handlePrevDay}
          disabled={currDayIndex + 1 === totalDataLength}
          aria-label="Previous day"
        >
          <ChevronLeft size={18} />
        </Button>
        <span className="min-w-[72px] whitespace-nowrap px-1 text-center text-sm font-semibold tabular-nums" aria-live="polite">
          {currDay}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="size-9 rounded-l-none"
          onClick={handleNextDay}
          disabled={currDayIndex === 0}
          aria-label="Next day"
        >
          <ChevronRight size={18} />
        </Button>
      </div>

      {/* Month + year: drive the super admin monthly figures */}
      {showPeriod && <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="h-9 gap-2 shadow-sm" aria-label={`Month: ${currMonth}`}>
            <CalendarDays size={16} />
            {currMonth}
            <ChevronDown size={14} className="text-gray-500" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          {monthsInAnYear.map((month) => (
            <DropdownMenuItem key={month} onClick={() => handleChangeMonth(month)}>
              {month}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="h-9 gap-2 shadow-sm tabular-nums" aria-label={`Year: ${currYear}`}>
            {currYear}
            <ChevronDown size={14} className="text-gray-500" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-32">
          {YEARS.map((year) => (
            <DropdownMenuItem key={year} onClick={() => handleChangeYear(year)}>
              {year}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      </>}
    </div>
  )
}

export default DateSelector
