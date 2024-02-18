import { NextRequest, NextResponse } from "next/server";
import { getCookie, setCookie } from "cookies-next";
import { verifyJWTToken } from "./lib/helpers";
import { JWTPayload, JWTVerifyResult } from "jose";

export default async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const loginRedirect = NextResponse.redirect(
    process.env.NEXTAUTH_URL + "/auth/login"
  );

  // GET COOKIES
  const accessToken = getCookie("accessToken", { req, res });
  const refreshToken = getCookie("refreshToken", { req, res });

  // CHECK IF COOKIES EXIST
  if (accessToken && refreshToken) {
    try {
      // VERIFY ACCESS TOKEN
      const data: JWTVerifyResult<JWTPayload> = await verifyJWTToken(
        accessToken as string
      );
      console.log("Access token is valid.");

      let expire = new Date(data.payload.exp! * 1000);
      let current = new Date();

      let different = expire.getTime() - current.getTime();

      console.log(
        "Time left: " + (different / 1000 / 60).toFixed(2) + " Minutes"
      );

      if (new Date(data.payload.exp! * 1000) < new Date()) {
        throw new Error("Token has expired");
      }
    } catch (err) {
      // IF ACCESS TOKEN IS INVALID, REFRESH TOKEN
      console.log("Access token is invalid. Refreshing token...");
      try {
        const URL = process.env.NEXT_PUBLIC_API_URL + "/auth/refresh-token";
        const response = await fetch(URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            refreshToken: refreshToken,
          }),
        });
        const data = await response.json();

        // IF REFRESH TOKEN IS INVALID, REDIRECT TO LOGIN PAGE
        if (data.error) {
          return loginRedirect;
        }

        // SET NEW COOKIES
        setCookie("accessToken", data.accessToken, {
          res,
          req,
        });
        setCookie("refreshToken", data.refreshToken, {
          res,
          req,
        });

        console.log("Tokens refreshed successfully.");

        return res;
      } catch (err) {
        console.log(err);
        return NextResponse.redirect(process.env.NEXTAUTH_URL + "/auth/login");
      }
    }
  } else {
    return loginRedirect;
  }
}

export const config = {
  matcher: ["/billing/create", "/"],
};
