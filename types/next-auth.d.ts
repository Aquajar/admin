import NextAuth from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      accessToken: string;
      exp: number;
      iat: number;
      jti: string;
      refreshToken: string;
    };
    expires: string;
  }
}
