import Wrapper from "@/components/Wrapper";
import { Product } from "@/types/types";
import axios from "axios";
import React, { useEffect } from "react";
import CurrencyFormat from "react-currency-format";

const BreadCrumb = [
  {
    href: "/products",
    name: "Products",
  },
];

const Products = () => {
  const [products, setProducts] = React.useState<Product[] | null>(null);
  const [newProduct, setNewProduct] = React.useState<Product | null>({
    _id: "",
    name: "",
    price: {
      retail: "0",
      delivery: "0",
    },
  });

  const getAllProducts = async () => {
    const URL = process.env.NEXT_PUBLIC_API_URL;
    const { data } = await axios.get(`${URL}/product/all`);
    setProducts(data.products);
  };

  useEffect(() => {
    if (!products) getAllProducts();
  }, [products]);

  return (
    <Wrapper breadcrumb={BreadCrumb}>
      <div className="relative overflow-x-auto">
        <table className="w-full text-sm text-left rtl:text-right text-gray-900 ">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50 ">
            <tr>
              <th scope="col" className="px-6 py-3">
                Product name
              </th>
              <th scope="col" className="px-6 py-3">
                Retail Rate
              </th>
              <th scope="col" className="px-6 py-3">
                Delivery Rate
              </th>
              <th scope="col" className="px-6 py-3">
                ID
              </th>
            </tr>
          </thead>
          <tbody>
            {products &&
              products.map((product) => (
                <tr
                  key={product._id}
                  className="bg-white border-b dark:bg-gray-800 dark:border-gray-700"
                >
                  <th
                    scope="row"
                    className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white"
                  >
                    {product.name}
                  </th>
                  <td className="px-6 py-4">
                    <CurrencyFormat
                      value={product.price.retail}
                      displayType={"text"}
                      thousandSeparator={true}
                      renderText={(value) => <div>{value}</div>}
                      prefix={"₹"}
                    />
                  </td>
                  <td className="px-6 py-4">
                    <CurrencyFormat
                      value={product.price.delivery}
                      displayType={"text"}
                      thousandSeparator={true}
                      renderText={(value) => <div>{value}</div>}
                      prefix={"₹"}
                    />
                  </td>
                  <td className="px-6 py-4">{product._id}</td>
                </tr>
              ))}
            <tr className="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
              <th
                scope="row"
                className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white"
              >
                <input
                  type="text"
                  value={newProduct?.name}
                  className="w-full p-2 border-2 border-gray-300 rounded-md bg-gray-100"
                />
              </th>
              <td className="px-6 py-4">
                <input
                  type="text"
                  onChange={(e) => {}}
                  value={newProduct?.price?.retail}
                  className="w-full p-2 border-2 border-gray-300 rounded-md bg-gray-100"
                />
              </td>
              <td className="px-6 py-4">
                <input
                  type="text"
                  value={newProduct?.price?.delivery}
                  className="w-full p-2 border-2 border-gray-300 rounded-md bg-gray-100"
                />
              </td>
              <td className="px-6 py-4">
                <button className="px-16 text-lg py-2 bg-blue-500 text-white rounded-md">
                  Add
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Wrapper>
  );
};

export default Products;
