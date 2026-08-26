import { useEffect, useState } from "react";
import { Session } from "next-auth";
import useAxiosInstance from "@/lib/hooks/useAxiosInstance";
import { Area, Staff } from "@/types/types";

// Area names (from /area) and active-staff names (from /staff?status=active),
// cached in the browser (localStorage, 7-day TTL) so the Add-Log form's
// dropdowns are instant and survive reloads.

const TTL = 1000 * 60 * 60 * 24 * 7; // 7 days
const AREA_KEY = "vlog_area_names";
const STAFF_KEY = "vlog_staff_names";

const readCache = (key: string): string[] | null => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { ts, data } = JSON.parse(raw);
    if (!Array.isArray(data) || Date.now() - ts > TTL) return null;
    return data as string[];
  } catch {
    return null;
  }
};

const writeCache = (key: string, data: string[]) => {
  try {
    localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data }));
  } catch {
    /* storage full / disabled — options just won't be cached */
  }
};

const uniqSorted = (names: (string | undefined)[]) =>
  Array.from(new Set(names.map((n) => (n || "").trim()).filter(Boolean))).sort(
    (a, b) => a.localeCompare(b)
  );

interface Options {
  areaNames: string[];
  staffNames: string[];
  loading: boolean;
  /** Clear the cache and re-fetch from the API. */
  refresh: () => void;
}

export default function useVehicleLogOptions(session: Session | null): Options {
  const axiosInstance = useAxiosInstance(session);
  const [areaNames, setAreaNames] = useState<string[]>([]);
  const [staffNames, setStaffNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;

    const load = async () => {
      const cachedAreas = reloadKey === 0 ? readCache(AREA_KEY) : null;
      const cachedStaff = reloadKey === 0 ? readCache(STAFF_KEY) : null;
      if (cachedAreas) setAreaNames(cachedAreas);
      if (cachedStaff) setStaffNames(cachedStaff);
      if (cachedAreas && cachedStaff) return;

      setLoading(true);
      try {
        const base = process.env.NEXT_PUBLIC_API_URL;
        const [areaRes, staffRes] = await Promise.all([
          cachedAreas ? null : axiosInstance.get(`${base}/area/all`),
          cachedStaff
            ? null
            : axiosInstance.get(`${base}/staff?status=active`),
        ]);

        if (cancelled) return;

        if (areaRes) {
          const names = uniqSorted((areaRes.data as Area[]).map((a) => a?.name));
          setAreaNames(names);
          writeCache(AREA_KEY, names);
        }
        if (staffRes) {
          const names = uniqSorted(
            (staffRes.data as Staff[]).map((s) => s?.name)
          );
          setStaffNames(names);
          writeCache(STAFF_KEY, names);
        }
      } catch {
        /* leave whatever we have (possibly cached / empty) */
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
    // axiosInstance is recreated each render; intentionally excluded so this
    // runs on session / manual-refresh changes only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, reloadKey]);

  const refresh = () => {
    try {
      localStorage.removeItem(AREA_KEY);
      localStorage.removeItem(STAFF_KEY);
    } catch {
      /* ignore */
    }
    setReloadKey((k) => k + 1);
  };

  return { areaNames, staffNames, loading, refresh };
}
