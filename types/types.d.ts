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
  isCardReceived: boolean;
  paymentPlan: string;
  profileRate: number | null;
  invoices: Invoice[];
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
  invoiceDate: number;
  customerID: string | undefined;
  vehicleID: string | null;
  total: number;
  products: {
    id: string;
    _id: string;
    quantity: number;
  }[];
  address: sting | null;
  landmark: sting | null;
  dueDate: number;
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

export type DashBoardData = {
  customers: {
    total: number;
    regular: number;
    new: Array<{
      month: string;
      customers: number;
    }>;
    top: Array<{
      name: string;
      phone: string;
      totalSales: number;
    }>;
  };
  summary: {
    monthly: Array<{
      month: string;
      sales: number;
      due: number;
      collected: number;
      jars: number;
    }>;
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
      }>;
    };
  };
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
