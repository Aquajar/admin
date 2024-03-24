export { default } from "next-auth/middleware";

export const config = {
  matcher: ["/billing/create", "/", "/customers", "/invoices", "/reports"],
};
