import { Customer, Invoice } from "@/types/types";
import moment from "moment"; // Ensure to install moment with 'npm install moment'

interface PurchasePattern {
  customerID: string;
  averageIntervalDays?: number;
  purchasePattern: "daily" | "irregular";
  isNeedToday?: boolean;
}

export const calculatePurchasePattern = (
  customers: Customer[],
  allInvoices: Invoice[]
): PurchasePattern[] => {
  return customers.map((customer) => {
    const customerInvoices = allInvoices.filter(
      (invoice) =>
        invoice.customerID === customer._id &&
        invoice.products.map(
          (product) => product.id === "65c1271bd78bb1922f9b1a63"
        )
    );

    const customerInvoiceDates = customerInvoices.map((invoice) =>
      moment(invoice.invoiceDate)
    );

    if (customerInvoiceDates.length <= 1) {
      return { customerID: customer._id, purchasePattern: "irregular" };
    }

    const intervals = [];
    for (let i = 1; i < customerInvoiceDates.length; i++) {
      const intervalDays = customerInvoiceDates[i].diff(
        customerInvoiceDates[i - 1],
        "days"
      );
      intervals.push(intervalDays);
    }

    const averageIntervalDays =
      intervals.reduce((total, current) => total + current, 0) /
      intervals.length;

    // check if the customer needs to purchase today
    const lastInvoiceDate = moment(
      customerInvoiceDates[customerInvoiceDates.length - 1]
    );
    const today = moment();
    const daysSinceLastPurchase = today.diff(lastInvoiceDate, "days");
    console.log("daysSinceLastPurchase: ", daysSinceLastPurchase);
    const isNeedToday = daysSinceLastPurchase >= averageIntervalDays;

    return {
      customerID: customer._id,
      averageIntervalDays,
      isNeedToday: isNeedToday,
      purchasePattern:
        Math.round(averageIntervalDays) <= 1 ? "daily" : "irregular",
    };
  });
};
