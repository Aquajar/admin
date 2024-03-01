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

interface Customer {
  _id: string;
  name?: string;
  phone: string;
  invoices: string[];
  address?: CustomerAddress;
  createdAt: string;
  userID: Number;
}

type Product = {
  _id: string;
  name: string;
  description?: string;
  price: {
    retail: string;
    delivery: string;
  };
};

interface Item {
  name: string;
  quantity: number;
  price: number;
  total: number;
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
  products: newProducts;
  address: sting | null;
  landmark: sting | null;
  dueDate: number;
  status: string;
  paymentMethod: string;
  due: number;
  paymentDate?: number | null;
}
