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
  ArcElement,
} from "chart.js";
import { Line, Pie } from "react-chartjs-2";
import useAxiosInstance from "@/lib/hooks/useAxiosInstance";
import useCustomers from "@/lib/hooks/useCustomers";
import useInvoice from "@/lib/hooks/useInvoice";
import useRefreshTokenRotation from "@/lib/hooks/useRefreshToken";
import { useCustomersStore } from "@/store/customers.store";
import { useInvoicesStore } from "@/store/invoices.store";
import { useSession } from "next-auth/react";
import CurrencyFormat from "react-currency-format";
import { getLastNDays } from "@/lib/helpers";
import { useEffect, useState } from "react";
import Card from "@/components/dashboard/Card";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
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
  const [totalSales, setTotalSales] = useState(0);
  const [totalDues, setTotalDues] = useState(0);
  const [totalCollected, setTotalCollected] = useState(0);

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

  const todaySalesData = {
    labels: ["Due Sale", "Paid Sale"],
    datasets: [
      {
        label: "Rupees",
        data: [
          invoices?.reduce((acc, invoice) => {
            let invoiceDate = new Date(
              invoice.invoiceDate
            ).toLocaleDateString();
            if (
              invoice.status === "pending" &&
              invoiceDate === new Date().toLocaleDateString()
            ) {
              return acc + invoice.due;
            }
            return acc;
          }, 0),
          invoices?.reduce((acc, invoice) => {
            let invoiceDate = new Date(
              invoice.invoiceDate
            ).toLocaleDateString();
            if (
              invoice.status === "paid" &&
              invoiceDate === new Date().toLocaleDateString()
            )
              return acc + invoice.total;
            return acc;
          }, 0),
          // due payments collected today
          // invoices?.reduce((acc, invoice) => {
          //   let paymentDate = new Date(
          //     invoice.paymentDate as number
          //   ).toLocaleDateString();
          //   if (
          //     invoice.status === "pending" &&
          //     paymentDate === new Date().toLocaleDateString()
          //   ) {
          //     return acc + (invoice.total - invoice.due);
          //   }
          //   return acc;
          // }, 0),
        ],
        backgroundColor: ["rgb(255,82,82)", "#1E90FF"],
        borderWidth: 1,
      },
    ],
  };

  useEffect(() => {
    if (invoices) {
      //  get total sales
      setTotalSales(
        invoices?.reduce((acc, invoice) => {
          return acc + invoice.total;
        }, 0)
      );

      //  get total dues
      setTotalDues(
        invoices?.reduce((acc, invoice) => {
          if (invoice.status === "paid") return acc;
          return acc + invoice.total;
        }, 0)
      );

      // get total collected
      setTotalCollected(
        invoices?.reduce((acc, invoice) => {
          if (invoice.status === "pending") return acc;
          return acc + invoice.total;
        }, 0)
      );

      //  get paid sales for each day in the last 7 days
      const salesData = last7Days.map((date) => {
        const sales = invoices.reduce((acc, invoice) => {
          let invoiceDate = new Date(invoice.invoiceDate).toLocaleDateString();
          if (invoiceDate === date) {
            let t: number = 0;
            if (invoice.status === "pending") {
              t = invoice.total - invoice.due;
            } else if (invoice.status === "paid") {
              t = invoice.total;
            }
            return acc + t;
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
            return acc + invoice.due;
          }
          return acc;
        }, 0);

        return sales;
      });

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
      setDueData(dueData);
      setSalesData(salesData);
    }
  }, [invoices]);

  return (
    <Wrapper name="Dashboard">
      {/* <button className="" onClick={() => signOut()}>
      Logout
    </button> */}
      <div className="flex flex-col md:flex-row w-full mb-20">
        <div className="flex flex-col w-full md:w-[60%]">
          {/*
           * TOTAL SALES, TOTAL DUES, TOTAL COLLECTED, TOTAL CUSTOMERS
           */}
          <div className="grid grid-cols-1 w-full md:grid-cols-2 md:grid-rows-2 gap-3">
            {/* Total Sales */}
            <Card title="Total Sales">
              <CurrencyFormat
                value={totalSales}
                displayType={"text"}
                thousandSeparator={true}
                prefix={"₹"}
                decimalScale={0}
                fixedDecimalScale={true}
                renderText={(value) => (
                  <p className="text-4xl font-normal ">{value}</p>
                )}
              />
            </Card>
            {/* Total Dues */}
            <Card title="Total Dues">
              <div className="flex justify-between items-start">
                <CurrencyFormat
                  value={totalDues}
                  displayType={"text"}
                  thousandSeparator={true}
                  prefix={"₹"}
                  decimalScale={0}
                  fixedDecimalScale={true}
                  renderText={(value) => (
                    <p className="text-4xl font-normal ">{value}</p>
                  )}
                />
                <span className="mt-2.5 text-sm border border-red-500 bg-red-50 px-4 py-1 rounded-2xl inline-flex items-center text-red-500">
                  {((totalDues / totalSales) * 100).toFixed(1)}%
                </span>
              </div>
            </Card>
            {/* Total Collected */}
            <Card title="Total Collected">
              <CurrencyFormat
                value={totalCollected}
                displayType={"text"}
                thousandSeparator={true}
                prefix={"₹"}
                decimalScale={0}
                fixedDecimalScale={true}
                renderText={(value) => (
                  <p className="text-4xl font-normal ">{value}</p>
                )}
              />
            </Card>
            {/* Total Customers */}
            <Card title="Total Customers">
              <CurrencyFormat
                value={customers?.length}
                displayType={"text"}
                thousandSeparator={true}
                // prefix={"₹"}
                decimalScale={0}
                fixedDecimalScale={true}
                renderText={(value) => (
                  <p className="text-4xl font-normal ">{value}</p>
                )}
              />
            </Card>
          </div>
          {/*
           * SALES CHART
           */}
          <div className="w-full mt-6 rounded-2xl shadow p-5 bg-white">
            <span className="text-2xl font-semibold ">
              Sales in the last 7 days
            </span>
            <Line data={dataChart1} options={options} />
          </div>
        </div>
        <div className="flex flex-col w-full md:w-[40%]">
          {/*
           * PIE CHART
           */}
          <div className="w-full mt-5 md:ml-5 md:mt-0">
            <div className="w-full rounded-2xl shadow p-5 bg-white">
              <span className="text-2xl font-semibold ">Sales today</span>
              <Pie
                style={{
                  height: "60%",
                }}
                data={todaySalesData}
                options={options}
              />
            </div>
          </div>
          {/*
           * SALES CHART
           */}
          {/* 
        <div className="w-full mt-10 rounded-2xl shadow p-5 bg-white">
          <span className="text-2xl font-semibold ">
            Items sold in the last 7 days
          </span>
          <Line data={dataChart2} options={options} />
        </div> */}
        </div>
      </div>
    </Wrapper>
  );
}
