import Sidebar from "@/components/Sidebar";
import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { Toaster } from "react-hot-toast";

export default function App({
  Component,
  pageProps: { session, ...pageProps },
}: AppProps) {
  return (
    <div className="bg-quaternary">
      <Toaster position="top-center" reverseOrder={false} />
      <Sidebar />
      <Component {...pageProps} />;
    </div>
  );
}
