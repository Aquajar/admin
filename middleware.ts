export { default } from "next-auth/middleware";

export const config = {
  // Every page needs a signed-in admin except the login page; static files, images, the PWA files and the auth API stay public.
  matcher: ["/((?!auth/login|api|_next|images|favicon.ico|manifest.json|sw.js|workbox-).*)"],
};
