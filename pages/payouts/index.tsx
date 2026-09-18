import Wrapper from "@/components/Wrapper";
import useAxiosInstance from "@/lib/hooks/useAxiosInstance";
import { useSession } from "next-auth/react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import CurrencyFormat from "react-currency-format";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Wallet,
  Plus,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Staff } from "@/types/types";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

type Payout = {
  _id: string;
  employeeID: number;
  name: string;
  date: string;
  amount: number;
  note?: string;
};
type StaffTotal = { employeeID: number; name: string; total: number; count: number };

const inr = (n: number) => "₹" + Math.round(n || 0).toLocaleString("en-IN");
const dayLabel = (d: string) =>
  new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });

const now = new Date();

const Payouts = () => {
  const { data: session } = useSession();
  const axiosInstance = useAxiosInstance(session);

  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [loading, setLoading] = useState(true);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [byStaff, setByStaff] = useState<StaffTotal[]>([]);
  const [total, setTotal] = useState(0);
  const [openId, setOpenId] = useState<number | null>(null);

  // record-payout dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [formStaff, setFormStaff] = useState<string>("");
  const [formAmount, setFormAmount] = useState("");
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    try {
      const { data } = await axiosInstance.get(
        `${process.env.NEXT_PUBLIC_API_URL}/payout?year=${year}&month=${month}`
      );
      setPayouts(data.payouts || []);
      setByStaff(data.byStaff || []);
      setTotal(data.total || 0);
    } catch (e) {
      toast.error("Failed to load payouts");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, year, month]);

  useEffect(() => {
    load();
  }, [load]);

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;
  const shift = (delta: number) => {
    let m = month + delta;
    let y = year;
    if (m < 1) { m = 12; y -= 1; } else if (m > 12) { m = 1; y += 1; }
    if (y > now.getFullYear() || (y === now.getFullYear() && m > now.getMonth() + 1)) return;
    setYear(y);
    setMonth(m);
  };

  const payoutsFor = useMemo(() => {
    const map = new Map<number, Payout[]>();
    for (const p of payouts) {
      const arr = map.get(p.employeeID) || [];
      arr.push(p);
      map.set(p.employeeID, arr);
    }
    return map;
  }, [payouts]);

  const openDialog = async () => {
    setDialogOpen(true);
    if (staffList.length === 0) {
      try {
        const { data } = await axiosInstance.get(`${process.env.NEXT_PUBLIC_API_URL}/staff`);
        setStaffList(data || []);
      } catch { /* ignore */ }
    }
  };

  const record = async () => {
    if (!formStaff) return toast.error("Pick a staff member");
    if (!formAmount || Number(formAmount) <= 0) return toast.error("Enter an amount");
    setSaving(true);
    try {
      await axiosInstance.post(`${process.env.NEXT_PUBLIC_API_URL}/payout`, {
        employeeID: Number(formStaff),
        amount: Number(formAmount),
        date: new Date(formDate).toISOString(),
      });
      toast.success("Payout recorded");
      setDialogOpen(false);
      setFormStaff("");
      setFormAmount("");
      setFormDate(new Date().toISOString().slice(0, 10));
      load();
    } catch (e) {
      toast.error("Failed to record payout");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Wrapper>
      {/* Header: month nav + record */}
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => shift(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 hover:bg-gray-50"
          >
            <ChevronLeft size={20} />
          </button>
          <span className="min-w-[170px] text-center text-xl font-semibold text-gray-900">
            {MONTHS[month - 1]} {year}
          </span>
          <button
            onClick={() => shift(1)}
            disabled={isCurrentMonth}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 hover:bg-gray-50 disabled:opacity-40"
          >
            <ChevronRight size={20} />
          </button>
        </div>
        <Button onClick={openDialog} className="gap-2">
          <Plus size={18} />
          Record payout
        </Button>
      </div>

      {/* Total */}
      <div className="mb-6 flex items-center justify-between rounded-2xl bg-blue-600 p-6 text-white">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20">
            <Wallet size={24} />
          </div>
          <div>
            <p className="text-blue-100">Total paid</p>
            <p className="text-3xl font-bold">{inr(total)}</p>
          </div>
        </div>
        <p className="text-right text-blue-100">
          {payouts.length} payment{payouts.length === 1 ? "" : "s"}
          <br />
          {byStaff.length} staff
        </p>
      </div>

      {/* Per-staff */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : byStaff.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-gray-50 py-16 text-center text-gray-500">
          No payouts in {MONTHS[month - 1]} {year}.
        </div>
      ) : (
        <div className="space-y-3">
          {byStaff.map((s) => {
            const open = openId === s.employeeID;
            return (
              <div key={s.employeeID} className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
                <button
                  onClick={() => setOpenId(open ? null : s.employeeID)}
                  className="flex w-full items-center justify-between p-5 text-left hover:bg-gray-50"
                >
                  <div>
                    <p className="text-lg font-semibold capitalize text-gray-900">{s.name}</p>
                    <p className="text-sm text-gray-500">
                      ID {s.employeeID} · {s.count} payment{s.count === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <CurrencyFormat
                      value={s.total}
                      displayType="text"
                      thousandSeparator
                      prefix="₹"
                      renderText={(v) => <span className="text-xl font-bold text-gray-900">{v}</span>}
                    />
                    <ChevronDown
                      size={20}
                      className={`text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
                    />
                  </div>
                </button>
                {open && (
                  <div className="border-t border-gray-100 bg-gray-50/60 px-5 py-2">
                    {(payoutsFor.get(s.employeeID) || []).map((p) => (
                      <div key={p._id} className="flex items-center justify-between border-b border-gray-100 py-3 last:border-0">
                        <span className="text-base text-gray-700">{dayLabel(p.date)}</span>
                        <span className="text-base font-semibold text-gray-900">{inr(p.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Record payout dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Record a payout</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm text-gray-600">Staff</Label>
              <Select value={formStaff} onValueChange={setFormStaff}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select staff" />
                </SelectTrigger>
                <SelectContent>
                  {staffList.map((s) => (
                    <SelectItem key={s._id} value={String(s.employeeID)}>
                      {s.name} · {s.employeeID}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm text-gray-600">Amount (₹)</Label>
              <Input
                type="number"
                value={formAmount}
                onChange={(e) => setFormAmount(e.target.value)}
                className="mt-1"
                placeholder="0"
              />
            </div>
            <div>
              <Label className="text-sm text-gray-600">Date</Label>
              <Input
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={record} disabled={saving} className="w-full sm:w-auto">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Wrapper>
  );
};

export default Payouts;
