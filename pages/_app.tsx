import Sidebar from "@/components/Sidebar";
import { StoreProvider as CustomerStoreProvider } from "@/store/customers.store";
import { StoreProvider as InvoiceStoreProvider } from "@/store/invoices.store";
import { StoreProvider as AuthUserStoreProvider } from "@/store/authUser.store";
import { StoreProvider as DashboardStoreProvider } from "@/store/dashboardData.store";
import "@/styles/globals.css";
import { SessionProvider } from "next-auth/react";
import type { AppProps } from "next/app";
import { Toaster } from "react-hot-toast";
import { QueryClient, QueryClientProvider } from "react-query";
import { ReactQueryDevtools } from "react-query/devtools";
import { PagesProgressBar as ProgressBar } from "next-nprogress-bar";

export default function App({
  Component,
  pageProps: { session, ...pageProps },
}: AppProps) {
  const queryClient = new QueryClient();

  return (
    <SessionProvider session={session}>
      <AuthUserStoreProvider>
        <CustomerStoreProvider>
          <DashboardStoreProvider>
            <InvoiceStoreProvider>
              <QueryClientProvider client={queryClient}>
                <div className="bg-quaternary">
                  <Toaster position="top-center" reverseOrder={false} />
                  <Sidebar />
                  <Component {...pageProps} />
                  <ProgressBar
                    height="4px"
                    color="#2463EB"
                    options={{ showSpinner: false }}
                    shallowRouting
                  />
                </div>
                {process.env.NODE_ENV === "development" && (
                  <ReactQueryDevtools initialIsOpen={false} />
                )}
              </QueryClientProvider>
            </InvoiceStoreProvider>
          </DashboardStoreProvider>
        </CustomerStoreProvider>
      </AuthUserStoreProvider>
    </SessionProvider>
  );
}
