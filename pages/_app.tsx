import Sidebar from "@/components/Sidebar";
import "@/styles/globals.css";
import { SessionProvider } from "next-auth/react";
import type { AppProps } from "next/app";
import { Toaster } from "react-hot-toast";
import { QueryClient, QueryClientProvider } from "react-query";

export default function App({
  Component,
  pageProps: { session, ...pageProps },
}: AppProps) {
  const queryClient = new QueryClient();

  return (
    <SessionProvider session={session}>
      <QueryClientProvider client={queryClient}>
        <div className="bg-quaternary">
          <Toaster position="top-center" reverseOrder={false} />
          <Sidebar />
          <Component {...pageProps} />;
        </div>
      </QueryClientProvider>
    </SessionProvider>
  );
}
