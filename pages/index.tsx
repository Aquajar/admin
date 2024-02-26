import Wrapper from "@/components/Wrapper";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";
import useAxiosInstance from "@/lib/hooks/useAxiosInstance";
import useCustomers from "@/lib/hooks/useCustomers";
import useInvoice from "@/lib/hooks/useInvoice";
import useRefreshTokenRotation from "@/lib/hooks/useRefreshToken";
import { useCustomersStore } from "@/store/customers.store";
import { useInvoicesStore } from "@/store/invoices.store";
import { signOut, useSession } from "next-auth/react";
import CurrencyFormat from "react-currency-format";
import { getLastNDays } from "@/lib/helpers";
import { useEffect, useState } from "react";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export const options = {
  responsive: true,
  plugins: {
    legend: {
      position: "top" as const,
    },
    title: {
      display: true,
      // text: "Chart.js Line Chart",
    },
  },
};

export default function Home() {
  const { data: session } = useSession();
  const axiosInstance = useAxiosInstance(session);
  useInvoice(axiosInstance, session);
  useCustomers(axiosInstance, session);
  useRefreshTokenRotation(axiosInstance);

  const { invoices } = useInvoicesStore();
  const { customers } = useCustomersStore();
  const [Salesdata, setSalesData] = useState([0, 0, 0, 0, 0, 0, 0]);
  const [DueData, setDueData] = useState([0, 0, 0, 0, 0, 0, 0]);
  const [itemsQuantity, setItemsQuantity] = useState([0, 0, 0, 0, 0, 0, 0]);

  const last7Days: string[] = getLastNDays(7);

  const dataChart1 = {
    labels: last7Days.reverse(),
    datasets: [
      {
        label: "Paid Sales",
        data: [...Salesdata],
        fill: false,
        borderColor: "#0c70e8",
        tension: 0.1,
      },
      {
        label: "Due Sales",
        data: [...DueData],
        fill: false,
        borderColor: "red",
        tension: 0.1,
      },
    ],
  };

  const dataChart2 = {
    labels: last7Days,
    datasets: [
      {
        label: "Items",
        data: [...itemsQuantity],
        fill: false,
        borderColor: "0199fe",
        tension: 0.1,
      },
    ],
  };

  useEffect(() => {
    if (invoices) {
      //  get paid sales for each day in the last 7 days
      const salesData = last7Days.map((date) => {
        const sales = invoices.reduce((acc, invoice) => {
          let invoiceDate = new Date(invoice.invoiceDate).toLocaleDateString();
          if (invoiceDate === date && invoice.status === "paid") {
            return acc + invoice.total;
          }
          return acc;
        }, 0);

        return sales;
      });

      //  get due sales for each day in the last 7 days
      const dueData = last7Days.map((date) => {
        const sales = invoices.reduce((acc, invoice) => {
          let invoiceDate = new Date(invoice.invoiceDate).toLocaleDateString();
          if (invoiceDate === date && invoice.status === "pending") {
            return acc + invoice.total;
          }
          return acc;
        }, 0);

        return sales;
      });

      setDueData(dueData);

      // get an array of number of invoices generated each day in last 7 days
      const itemsQuantity = last7Days.map((date) => {
        const items = invoices.reduce((acc, invoice) => {
          let invoiceDate = new Date(invoice.invoiceDate).toLocaleDateString();
          if (invoiceDate === date) {
            return acc + invoice.products.length;
          }
          return acc;
        }, 0);

        return items;
      });

      setItemsQuantity(itemsQuantity);

      setSalesData(salesData);
    }
  }, [invoices]);

  return (
    <Wrapper name="Dashboard">
      {/* <button className="" onClick={() => signOut()}>
      Logout
    </button> */}
      <div className="grid grid-cols-1 w-full md:grid-cols-4 gap-8">
        {/* Total Sales */}
        <div className="p-6 bg-blue-200 rounded-lg flex flex-col w-full shadow-sm">
          <span className="text-md text-gray-800 mb-5">Total Sales</span>

          <CurrencyFormat
            value={invoices?.reduce((acc, invoice) => {
              return acc + invoice.total;
            }, 0)}
            displayType={"text"}
            thousandSeparator={true}
            prefix={"₹"}
            decimalScale={0}
            fixedDecimalScale={true}
            renderText={(value) => (
              <p className="text-3xl font-semibold text-gray-800">{value}</p>
            )}
          />
        </div>
        {/* Total Dues */}
        <div className="p-6 bg-red-200 rounded-lg flex flex-col w-full shadow-sm">
          <span className="text-md text-gray-800 mb-5">Total Dues</span>
          <CurrencyFormat
            value={invoices?.reduce((acc, invoice) => {
              if (invoice.status === "paid") return acc;
              return acc + invoice.total;
            }, 0)}
            displayType={"text"}
            thousandSeparator={true}
            prefix={"₹"}
            decimalScale={0}
            fixedDecimalScale={true}
            renderText={(value) => (
              <p className="text-3xl font-semibold text-gray-800">{value}</p>
            )}
          />
        </div>
        {/* Total Collected */}
        <div className="p-6 bg-green-200 rounded-lg flex flex-col w-full shadow-sm">
          <span className="text-md text-gray-800 mb-5">Total Collected</span>
          <CurrencyFormat
            value={invoices?.reduce((acc, invoice) => {
              if (invoice.status === "pending") return acc;
              return acc + invoice.total;
            }, 0)}
            displayType={"text"}
            thousandSeparator={true}
            prefix={"₹"}
            decimalScale={0}
            fixedDecimalScale={true}
            renderText={(value) => (
              <p className="text-3xl font-semibold text-gray-800">{value}</p>
            )}
          />
        </div>
        {/* Total Customers */}
        <div className="p-6 bg-zinc-300 rounded-lg flex flex-col w-full shadow-sm">
          <span className="text-md text-gray-800 mb-5">Total Customers</span>

          <CurrencyFormat
            value={customers?.length}
            displayType={"text"}
            thousandSeparator={true}
            // prefix={"₹"}
            decimalScale={0}
            fixedDecimalScale={true}
            renderText={(value) => (
              <p className="text-3xl font-semibold text-gray-800">{value}</p>
            )}
          />
        </div>
      </div>
      <div className="flex flex-col w-9/12 mt-5">
        <div className="w-full mt-10 rounded-2xl shadow p-5 bg-white">
          <span className="text-2xl font-semibold text-gray-800">
            Sales in the last 7 days
          </span>
          <Line data={dataChart1} options={options} />
        </div>
        <div className="w-full mt-10 rounded-2xl shadow p-5 bg-white">
          <span className="text-2xl font-semibold text-gray-800">
            Items sold in the last 7 days
          </span>
          <Line data={dataChart2} options={options} />
        </div>
      </div>
    </Wrapper>
  );
}
