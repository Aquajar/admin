import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import Link from "next/link";
import toast from "react-hot-toast";
import { ArrowLeft } from "lucide-react";
import Wrapper from "@/components/Wrapper";
import useAxiosInstance from "@/lib/hooks/useAxiosInstance";
import useRefreshTokenRotation from "@/lib/hooks/useRefreshToken";
import { VehicleLogAnalytics } from "@/types/types";
import AnalysisPanel from "@/components/VehicleLog/AnalysisPanel";
import MonthSelect, { currentMonthKey, monthLabel } from "@/components/VehicleLog/MonthSelect";

const VehicleLogAnalysisPage = () => {
  const { data: session } = useSession();
  const axiosInstance = useAxiosInstance(session);
  useRefreshTokenRotation(axiosInstance);
  const router = useRouter();

  // The month lives in the URL so the log page can link straight to the one it is showing.
  const q = router.query.month;
  const month = typeof q === "string" && /^\d{4}-\d{2}$/.test(q) ? q : currentMonthKey();

  const [months, setMonths] = useState<string[]>([]);
  const [analytics, setAnalytics] = useState<VehicleLogAnalytics | null>(null);
  const [loading, setLoading] = useState(false);

  const base = process.env.NEXT_PUBLIC_API_URL;

  useEffect(() => {
    if (!session) return;
    axiosInstance
      .get(`${base}/vehicle-log/months`)
      .then(({ data }) => setMonths((data.months || []).map((m: { month: string }) => m.month)))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  useEffect(() => {
    if (!session) return;
    setLoading(true);
    axiosInstance
      .get(`${base}/vehicle-log/analytics?month=${month}`)
      .then(({ data }) => setAnalytics(data || null))
      .catch(() => toast.error("Failed to load the analysis"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, month]);

  return (
    <Wrapper>
      <div className="flex w-full flex-col gap-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <Link
              href="/vehicle-log"
              className="mb-1 inline-flex items-center gap-1 text-sm text-[#6B7280] hover:text-[#2563EB]"
            >
              <ArrowLeft className="h-4 w-4" />
              Vehicle Log
            </Link>
            <h1 className="text-2xl font-semibold tracking-tight text-[#0A0A0A]">
              Vehicle Log Analysis
            </h1>
            <p className="text-[15px] text-[#6B7280]">
              {monthLabel(month)} · approved trips only
            </p>
          </div>
          <MonthSelect
            value={month}
            onChange={(m) => router.replace({ query: { month: m } }, undefined, { shallow: true })}
            months={months}
          />
        </div>
        <AnalysisPanel analytics={analytics} loading={loading} />
      </div>
    </Wrapper>
  );
};

export default VehicleLogAnalysisPage;
