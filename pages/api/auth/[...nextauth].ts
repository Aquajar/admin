import axios from "axios";
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

export const authOptions = {
  // Configure one or more authentication providers
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        phone: { label: "Phone", type: "text" },
        otp: { label: "Otp", type: "text" },
      },
      async authorize(credentials, req) {
        const URL = process.env.NEXT_PUBLIC_API_URL + "/auth/verify";

        const payload = {
          phone: credentials?.phone,
          otp: credentials?.otp,
        };

        try {
          const { data } = await axios.post(URL, payload, {
            headers: {
              "Content-Type": "application/json",
            },
          });
          if (data) {
            return data;
          } else {
            return null;
          }
        } catch (err) {
          console.log(err);
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60 * 30,
  },
  callbacks: {
    async jwt({
      token,
      user,
      trigger,
      session,
    }: {
      token: any;
      user: any;
      trigger: any;
      session: any;
    }) {
      // update server session with user data
      if (trigger === "update") {
        return { ...token, ...session.user };
      }
      return { ...token, ...user };
    },
    async session({
      session,
      token,
      user,
    }: {
      session: any;
      token: any;
      user: any;
    }) {
      session.user = token;
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/auth/login",
    signOut: "/auth/login",
  },
};

// @ts-ignore
export default NextAuth(authOptions);
