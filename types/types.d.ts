import type { MarketSegment } from "@/lib/constants";

export type SideBarItem = {
  name: string;
  icon: IconType;
  href: string;
};

type CustomerAddress = {
  landmark: string;
  pincode: string;
  text: string;
  longitude: string;
  latitude: string;
};

export interface Customer {
  _id: string;
  name?: string;
  phone: string;
  invoices: string[];
  address?: CustomerAddress;
  createdAt: string;
  userID: number;
  isRegular: boolean;
  jarOwnedByCustomer?: number;
  engagedJars?: number;
  marketSegment?: MarketSegment;
  isCardReceived: boolean;
  paymentPlan: string;
  profileRate: number | null;
  invoices: Invoice[];
  lastPurchaseDate?: Date;
  coordinates?: {
    lat: number | null;
    lng: number | null;
  };
}

export type MapMode = "sales" | "finance";
export type MapStatus = "green" | "yellow" | "red" | "none";

export interface MapCustomer {
  _id: string;
  userID: number;
  name: string | null;
  phone: string | null;
  area: string | null;
  landmark: string | null;
  isRegular: boolean;
  paymentPlan: string | null;
  coordinates: {
    lat: number;
    lng: number;
  };
  sales: {
    lastDeliveryDate: string | null;
    daysSinceLastDelivery: number | null;
    status: MapStatus;
  };
  finance: {
    totalDue: number;
    oldestDueDate: string | null;
    daysSinceOldestDue: number | null;
    status: MapStatus;
  };
}

export type Product = {
  _id: string;
  name: string;
  description?: string;
  price: {
    retail: string | undefined;
    delivery: string | undefined;
  };
};

export interface Item {
  name: string;
  quantity: number;
  price: number;
  total: number;
}

export interface Area {
  _id: string;
  name: string;
  serviceable: boolean;
}

export interface IPaymentMethod {
  value: string;
  label: string;
}

export type RecentCard = {
  paid: boolean;
  amount: number;
  date: string;
  id?: string;
};

export interface Invoice {
  _id?: string;
  user: {
    name: string;
    phone: string;
    address: {
      text: string | null;
      landmark: string | null;
    };
    invoices: string[];
  };
  invoiceID: invoiceId;
  invoiceDate: string | null;
  customerID: string | undefined;
  customerName?: string;
  vehicleID: string | null;
  total: number;
  products: {
    id: string;
    _id: string;
    quantity: number;
  }[];
  address?: sting | null;
  landmark?: sting | null;
  // dueDate: number;
  status: string;
  paymentMethod: string;
  due: number;
  paymentDate?: number | null;
  isBulkOrder?: boolean | undefined;
  driver: string | null | undefined;
}

export interface BreadCrumbProps {
  items: {
    name: string;
    href: string;
  }[];
}

export interface VehicleLog {
  _id?: string;
  date: string; // ISO date
  departureTime: string; // "HH:mm"
  arrivalTime: string; // "HH:mm"
  out: number;
  returned: number; // "Return"
  engaged: number; // returned - out (derived)
  filled: number;
  empty: number; // returned - filled (derived)
  recorded: number;
  cash: number;
  staff: string[];
  location: string[];
  note?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface VehicleLogAnalytics {
  range: { start: string; end: string };
  totals: {
    trips: number;
    out: number;
    returned: number;
    filled: number;
    empty: number;
    engaged: number;
    recorded: number;
    cash: number;
  };
  byDay: {
    date: string;
    trips: number;
    out: number;
    filled: number;
    cash: number;
  }[];
  topLocations: { name: string; trips: number }[];
  topStaff: { name: string; trips: number }[];
}

interface MonthlyData {
  month: string; // The name of the month (e.g., "February")
  sales: number; // Total sales for the month
  due: number; // Pending due amount for the month
  collected: number; // Collected amount for the month
  jars: number; // Number of jars sold in the month
}

interface YearlyData {
  year: number; // The year (e.g., 2024)
  data: MonthlyData[]; // Array of monthly data for the year
}

export interface DriverSummary {
  name: string; // Customer's name
  invoices: any[]; // Array of invoices (replace 'any' with a more specific type if invoice details are known)
  totalSales: number; // Total sales amount
  due: number; // Due amount
  collection: number; // Collected amount
  jars: number; // Number of jars sold
}

export type DashBoardData = {
  customers: {
    total: number;
    regular: number;
    new: number;
    top: Array<{
      name: string;
      phone: string;
      totalSales: number;
    }>;
  };
  summary: {
    monthly: YearlyData[];
    total: {
      sales: number;
      jars: number;
      collected: number;
      due: number;
    };
    last7Days: {
      refilling: Array<{
        date: string;
        sales: number;
        jars: number;
        due: number;
        collected: number;
        driverSummary: { name: string; invoices: Invoice[] }[];
      }>;
    };
  };
  suggestion: {
    customerID: string;
    customerName: string;
    lastPurchaseDate: number;
    daysFromLastPurchase: number;
  }[];
  iat: string;
};

export interface Driver {
  name: string;
  phone: string;
  address: string;
  licenseNumber: string;
  salary: number;
  joiningDate: string; // ISO 8601 format
  status: "active" | "inactive"; // only possible statuses
  _id: string; // MongoDB ObjectID as a string
  createdAt: string; // ISO 8601 format
  updatedAt: string; // ISO 8601 format
}

export interface Account extends Customer {
  totalSales: number;
  totalOutstanding: number;
}

export interface AccoutGroup {
  _id: string;
  name: string;
  description: string;
  contact: string;
  logo: string;
  accounts: Account[];
}

export interface Activity {
  _id: string;
  message: string;
  createdAt: Date;
  author: string;
  tag: string;
  updatesAt: Date;
}

export interface Order {
  _id: string;
  orderDate: Date;
  customer: {
    name: string;
    phone: string;
    address: string;
    userID: number;
  };
  note?: string; // Optional field
  status: "pending" | "delivered"; // Enum for status
  deliveryDate?: Date | null; // Optional field, can be null
}

interface BankAccount {
  holderName: string;
  accountNumber: string;
  ifscCode: string;
  bankName: string;
  address: string;
  vpa?: string; // Optional
}

interface Salary {
  value: number;
  startDate: Date;
}

export interface Staff {
  _id: string;
  employeeID: number;
  name: string;
  phone: string;
  address: string;
  licenseNumber?: string; // Optional, only required for 'driver'
  bankAccount?: BankAccount; // Optional
  salary: Salary[]; // Array of salary objects
  joiningDate: Date;
  status: "active" | "inactive"; // Enum for status
  type: "driver" | "labour" | "manager" | "salesman"; // Enum for type
  createdAt?: Date; // Automatically added by Mongoose with timestamps
  updatedAt?: Date; // Automatically added by Mongoose with timestamps
}
