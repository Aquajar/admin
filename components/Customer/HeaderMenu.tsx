"use client"

import useAxiosInstance from "@/lib/hooks/useAxiosInstance"
import { Area, Customer, Invoice } from "@/types/types"
import { getCookie, setCookie } from "cookies-next"
import { useSession } from "next-auth/react"
import React, { ChangeEvent, Dispatch, SetStateAction, useEffect, useState } from "react"
import toast from "react-hot-toast"
import { FaSearch } from "react-icons/fa"
import { LuFileSpreadsheet } from "react-icons/lu"
import { MdOutlineRefresh } from "react-icons/md"
import { utils, writeFileXLSX } from "xlsx"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Search } from "lucide-react"

interface HeaderMenuProps {
  onSearch: (searchTerm: string, searchBy: "id" | "name") => void
  customers: Customer[] | null | undefined
  MasterCustomersState: Customer[] | null | undefined
  setCustomers: React.Dispatch<React.SetStateAction<Customer[] | null | undefined>>
  resetCustomers: () => void
  invoices: Invoice[] | null | undefined
  purchasePatternData: {
    customerID: string
    averageIntervalDays?: number
    purchasePattern: "daily" | "irregular"
    isNeedToday?: boolean
  }[]
  tableRef: React.RefObject<HTMLTableElement>
  sortByRegularity: "all" | "true" | "false"
  setSortByRegularity: Dispatch<SetStateAction<"all" | "true" | "false">>
  setSortByArea: Dispatch<SetStateAction<"all" | Area["name"]>>
  sortByArea: Area["name"]
  loading: boolean
}

const HeaderMenu: React.FC<HeaderMenuProps> = ({
  onSearch,
  customers,
  setCustomers,
  resetCustomers,
  MasterCustomersState,
  tableRef,
  sortByRegularity,
  setSortByRegularity,
  setSortByArea,
  sortByArea,
  loading,
}) => {
  const [searchTerm, setSearchTerm] = useState("")
  const [searchBy, setSearchBy] = useState<"id" | "name">("name")
  const [areas, setAreas] = useState<Area[] | null>(null)

  const { data: session } = useSession()
  const axiosInstance = useAxiosInstance(session)

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value)
  }

  const handleSearch = (e: ChangeEvent<HTMLFormElement>) => {
    e.preventDefault()
    onSearch(searchTerm, searchBy)
  }

  const handleSortByRegularity = (val: "all" | "true" | "false") => {
    setSortByRegularity(val)

    if (val === "all") {
      setCustomers(MasterCustomersState)
      setSortByArea("all")
      return
    }
    const isRegular = val === "true"
    let n = customers?.filter((customer) => isRegular === customer.isRegular)
    setCustomers(n)
  }

  const handleSortByArea = (area: string) => {
    setSortByArea(area)
    if (area === "all") {
      setCustomers(MasterCustomersState)
      setSortByRegularity("all")
      return
    }
    let n = customers?.filter((customer) => area === customer.address?.text)
    setCustomers(n)
  }

  useEffect(() => {
    if (!areas) {
      const cookieAreas = getCookie("areas")
      if (cookieAreas) {
        let areas: Area[] = JSON.parse(cookieAreas)
        setAreas(areas)
        setSortByArea("all")
      } else {
        const URL = process.env.NEXT_PUBLIC_API_URL + "/area/all"
        axiosInstance.get(URL).then((res) => {
          const areas: Area[] = res.data
          setAreas(areas)
          setSortByArea("all")
          setCookie("areas", JSON.stringify(areas), { maxAge: 60 * 60 * 24 * 7 })
        })
      }
    }
  }, [areas])

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 items-end">
        {/* Search */}
        <form onSubmit={handleSearch} className="relative flex col-span-2">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            <Search className="w-4 h-4" />
          </span>

          <Input
            type="text"
            disabled={loading}
            style={{
              boxShadow: "none",
              outline: "none",
            }}
            className="pl-9 text-lg pr-4 h-10 rounded-r-none" // same height as button
            placeholder="Search customers..."
            value={searchTerm}
            onChange={handleInputChange}
          />

          <Button
            disabled={loading}
            type="submit"
            size="sm"
            className="h-10 rounded-l-none shadow-none" // same height as input
          >
            {loading ? "..." : "Go"}
          </Button>
        </form>


        {/* Search By */}
        <div>
          <Label className="text-xs mb-1">Search By</Label>
          <Select value={searchBy} onValueChange={(val: "id" | "name") => setSearchBy(val)}>
            <SelectTrigger >
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="id">ID</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Regularity */}
        <div>
          <Label className="text-xs mb-1">Regularity</Label>
          <Select value={sortByRegularity} onValueChange={handleSortByRegularity}>
            <SelectTrigger >
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="true">Regular</SelectItem>
              <SelectItem value="false">Unregular</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Area */}
        <div>
          <Label className="text-xs mb-1">Area</Label>
          <Select value={sortByArea} onValueChange={handleSortByArea}>
            <SelectTrigger >
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {areas?.map((area, idx) => (
                <SelectItem key={idx} value={area.name}>
                  {area.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Refresh */}
        {/* <Button
          variant="outline"
          className="w-full"
          onClick={() => {
            resetCustomers()
            setSortByArea("all")
            setSortByRegularity("all")
          }}
        >
          <MdOutlineRefresh className="mr-2 h-4 w-4" />
          Reset
        </Button> */}

        {/* Export */}
        <Button
          className="bg-green-600 hover:bg-green-700 w-full"
          onClick={() => {
            const wb = utils.table_to_book(tableRef.current)
            writeFileXLSX(wb, `${+new Date()}.xlsx`)
            toast.success("Exported to XLSX")
          }}
        >
          <LuFileSpreadsheet className="mr-2 h-4 w-4" />
          Export
        </Button>
      </div>
      <div className="flex justify-between items-center mt-6 pt-3 text-sm">
        <span className="text-muted-foreground">Total Customers</span>
        <span className="font-medium">{customers?.length ?? 0}</span>
      </div>
    </>
  )
}

export default HeaderMenu