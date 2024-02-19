import useRefreshTokenRotation from "@/lib/hooks/useRefreshToken";
import axios from "axios";
import { signOut, useSession } from "next-auth/react";
import toast from "react-hot-toast";

export default function Home() {
  return (
    <main className="h-screen ml-48">
      <h1 className="text-4xl font-bold text-center pt-10 text-primary">
        Welcome to the admin panel
      </h1>
    </main>
  );
}
