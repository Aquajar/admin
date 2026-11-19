import Wrapper from "@/components/Wrapper";
import useAxiosInstance from "@/lib/hooks/useAxiosInstance";
import { useSession } from "next-auth/react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Wallet,
  Banknote,
  HandCoins,
  Plus,
  Loader2,
  CheckCircle2,
  Clock,
  MapPin,
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
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

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
  type?: PayType;
  settledBy?: string | null;
  notifiedAt?: string | null;
  receipt?: {
    at?: string | null;
    lat?: number | null;
    lng?: number | null;
    accuracy?: number | null;
    fixAt?: string | null;
    mocked?: boolean;
    deviceId?: string;
    model?: string;
    platform?: string;
    osVersion?: string;
    appVersion?: string;
    ip?: string;
    userAgent?: string;
  };
};
type PayType = "salary" | "advance";
type StaffTotal = {
  employeeID: number;
  name: string;
  role: string;
  active: boolean;
  salary: number;
  advance: number;
  total: number;
  count: number;
  pending: number;
};
type Summary = { total: number; salary: number; advance: number; pending: number };

const inr = (n: number) => "₹" + Math.round(n || 0).toLocaleString("en-IN");
const dayLabel = (d: string) =>
  new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });

const timeLabel = (d: string) =>
  new Date(d).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
const isPending = (p: Payout) => !!p.notifiedAt && !p.receipt?.at;
const typeOf = (p: Payout): PayType => p.type || "salary";

// Text + colour, never colour alone.
const TypeBadge = ({ p }: { p: Payout }) =>
  typeOf(p) === "advance" ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800 ring-1 ring-inset ring-amber-200">
      <HandCoins size={12} /> Advance
    </span>
  ) : (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-200"
      title={p.settledBy ? "Paid as an advance, settled into a later salary" : undefined}
    >
      <Banknote size={12} /> Salary{p.settledBy ? " · was advance" : ""}
    </span>
  );

// Money cell: right-aligned tabular figures; zero shows a quiet dash so rows line up.
const Money = ({ n, strong, tone }: { n: number; strong?: boolean; tone?: string }) =>
  n ? (
    <span className={`tabular-nums ${strong ? "font-semibold text-gray-900" : tone || "text-gray-700"}`}>{inr(n)}</span>
  ) : (
    <span className="text-gray-300" aria-label="none">—</span>
  );

// Whether the staff member confirmed receipt, with the proof they left.
const ReceiptStatus = ({ p }: { p: Payout }) => {
  const r = p.receipt;
  if (r?.at) {
    const device = [r.model, r.platform && `${r.platform} ${r.osVersion || ""}`.trim(), r.appVersion && `app ${r.appVersion}`]
      .filter(Boolean)
      .join(" · ");
    return (
      <div className="mt-1 text-sm text-gray-500">
        <span className="inline-flex items-center gap-1 font-medium text-green-700">
          <CheckCircle2 size={14} /> Received · confirmed {timeLabel(r.at)}
        </span>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5">
          {r.lat != null && r.lng != null ? (
            <a
              href={`https://www.google.com/maps?q=${r.lat},${r.lng}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-blue-600 hover:underline"
            >
              <MapPin size={13} /> Location{r.accuracy != null ? ` (±${Math.round(r.accuracy)} m)` : ""}
              {r.fixAt && Math.abs(new Date(r.at).getTime() - new Date(r.fixAt).getTime()) > 120000
                ? `, fix from ${timeLabel(r.fixAt)}`
                : ""}
            </a>
          ) : (
            <span>No location</span>
          )}
          {r.mocked && <span className="font-medium text-red-600">Mock location</span>}
          {device && <span>{device}</span>}
          {r.ip && <span title={[r.deviceId && `Device ID ${r.deviceId}`, r.userAgent].filter(Boolean).join("\n")}>IP {r.ip}</span>}
        </div>
      </div>
    );
  }
  if (isPending(p))
    return (
      <span className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-amber-600">
        <Clock size={14} /> Awaiting confirmation
      </span>
    );
  return null;
};

const now = new Date();

const Payouts = () => {
  const { data: session } = useSession();
  const axiosInstance = useAxiosInstance(session);
  const api = process.env.NEXT_PUBLIC_API_URL;

  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [loading, setLoading] = useState(true);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [byStaff, setByStaff] = useState<StaffTotal[]>([]);
  const [sum, setSum] = useState<Summary>({ total: 0, salary: 0, advance: 0, pending: 0 });
  const [openId, setOpenId] = useState<number | null>(null);
  const [changing, setChanging] = useState<string | null>(null);

  // record-payout dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formStaff, setFormStaff] = useState<string>("");
  const [formType, setFormType] = useState<PayType>("advance");
  const [formAmount, setFormAmount] = useState("");
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    try {
      const { data } = await axiosInstance.get(`${api}/payout?year=${year}&month=${month}`);
      setPayouts(data.payouts || []);
      setByStaff(data.byStaff || []);
      setSum({ total: data.total || 0, salary: data.salary || 0, advance: data.advance || 0, pending: data.pending || 0 });
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
    setOpenId(null);
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

  const activeStaff = byStaff.filter((s) => s.active);
  const formStaffName = activeStaff.find((s) => String(s.employeeID) === formStaff)?.name;

  const record = async () => {
    if (!formStaff) return toast.error("Pick a staff member");
    if (!formAmount || Number(formAmount) <= 0) return toast.error("Enter an amount");
    setSaving(true);
    try {
      const { data } = await axiosInstance.post(`${api}/payout`, {
        employeeID: Number(formStaff),
        amount: Number(formAmount),
        type: formType,
        date: new Date(formDate).toISOString(),
      });
      toast.success(
        formType === "salary"
          ? `Salary recorded${data.settled ? ` · ${data.settled} advance${data.settled === 1 ? "" : "s"} settled` : ""}`
          : "Advance recorded"
      );
      setDialogOpen(false);
      setFormStaff("");
      setFormAmount("");
      setFormType("advance");
      setFormDate(new Date().toISOString().slice(0, 10));
      load();
    } catch (e) {
      toast.error("Failed to record payout");
    } finally {
      setSaving(false);
    }
  };

  const changeType = async (p: Payout, type: PayType) => {
    setChanging(p._id);
    try {
      const { data } = await axiosInstance.patch(`${api}/payout/${p._id}`, { type });
      if (data.payout?.type !== type) toast("Kept as salary: a later salary already covers this payment.");
      else if (type === "salary")
        toast.success(`Marked as salary${data.settled ? ` · ${data.settled} advance${data.settled === 1 ? "" : "s"} settled` : ""}`);
      else toast.success("Marked as advance");
      load();
    } catch (e) {
      toast.error("Could not change the payment type");
    } finally {
      setChanging(null);
    }
  };

  const tiles = [
    { label: "Total paid", value: sum.total, sub: `${payouts.length} payment${payouts.length === 1 ? "" : "s"}`, Icon: Wallet, primary: true },
    { label: "Salary", value: sum.salary, sub: "Includes settled advances", Icon: Banknote },
    { label: "Advance", value: sum.advance, sub: "Not yet settled by a salary", Icon: HandCoins },
    { label: "Awaiting confirmation", value: sum.pending, sub: "Payments staff haven’t confirmed", Icon: Clock, count: true },
  ];

  return (
    <Wrapper>
      {/* Header: month nav + record */}
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => shift(-1)}
            aria-label="Previous month"
            className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-gray-200 hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"
          >
            <ChevronLeft size={20} />
          </button>
          <h1 className="min-w-[170px] text-center text-xl font-semibold text-gray-900">
            {MONTHS[month - 1]} {year}
          </h1>
          <button
            onClick={() => shift(1)}
            disabled={isCurrentMonth}
            aria-label="Next month"
            className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-gray-200 hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronRight size={20} />
          </button>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="h-11 gap-2">
          <Plus size={18} />
          Record payout
        </Button>
      </div>

      {/* Summary tiles */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map(({ label, value, sub, Icon, primary, count }) => (
          <div
            key={label}
            className={`rounded-2xl p-4 md:p-5 ${primary ? "bg-blue-600 text-white" : "border border-gray-200 bg-white"}`}
          >
            <div className="flex items-center gap-2">
              <Icon size={18} className={primary ? "text-blue-100" : count && value ? "text-amber-600" : "text-gray-400"} />
              <p className={`text-sm font-medium ${primary ? "text-blue-100" : "text-gray-500"}`}>{label}</p>
            </div>
            <p
              className={`mt-2 text-2xl font-bold tabular-nums md:text-3xl ${
                primary ? "" : count && value ? "text-amber-700" : "text-gray-900"
              }`}
            >
              {loading ? "…" : count ? value : inr(value)}
            </p>
            <p className={`mt-1 text-xs ${primary ? "text-blue-100" : "text-gray-500"}`}>{sub}</p>
          </div>
        ))}
      </div>

      {/* All staff, one uniform table */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50 hover:bg-gray-50">
              <TableHead className="text-gray-600">Staff</TableHead>
              <TableHead className="text-right text-gray-600">Salary</TableHead>
              <TableHead className="text-right text-gray-600">Advance</TableHead>
              <TableHead className="text-right text-gray-600">Total</TableHead>
              <TableHead className="hidden text-right text-gray-600 sm:table-cell">Payments</TableHead>
              <TableHead className="hidden text-gray-600 md:table-cell">Confirmation</TableHead>
              <TableHead className="hidden w-10 sm:table-cell"><span className="sr-only">Details</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={7}>
                      <Skeleton className="h-9 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              : byStaff.map((s) => {
                  const open = openId === s.employeeID;
                  const list = payoutsFor.get(s.employeeID) || [];
                  const asked = list.some((p) => p.notifiedAt);
                  return (
                    <React.Fragment key={s.employeeID}>
                      <TableRow
                        className={`cursor-pointer ${open ? "bg-blue-50/40" : ""}`}
                        onClick={() => s.count && setOpenId(open ? null : s.employeeID)}
                      >
                        <TableCell className="py-3">
                          <p className="text-base font-semibold capitalize text-gray-900">{s.name}</p>
                          <p className="text-xs text-gray-500">
                            ID {s.employeeID}
                            {s.role ? ` · ${s.role}` : ""}
                            {!s.active && (
                              <span className="ml-1.5 rounded bg-gray-100 px-1.5 py-0.5 font-medium text-gray-600">inactive</span>
                            )}
                          </p>
                          {s.pending > 0 && (
                            <p className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-amber-700 md:hidden">
                              <Clock size={12} /> {s.pending} awaiting
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="text-right"><Money n={s.salary} /></TableCell>
                        <TableCell className="text-right"><Money n={s.advance} tone="font-medium text-amber-700" /></TableCell>
                        <TableCell className="text-right"><Money n={s.total} strong /></TableCell>
                        <TableCell className="hidden text-right tabular-nums text-gray-600 sm:table-cell">
                          {s.count || <span className="text-gray-300">—</span>}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {s.pending > 0 ? (
                            <span className="inline-flex items-center gap-1 text-sm font-medium text-amber-700">
                              <Clock size={14} /> {s.pending} awaiting
                            </span>
                          ) : asked ? (
                            <span className="inline-flex items-center gap-1 text-sm font-medium text-green-700">
                              <CheckCircle2 size={14} /> All confirmed
                            </span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </TableCell>
                        <TableCell className="hidden text-right sm:table-cell">
                          {s.count > 0 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenId(open ? null : s.employeeID);
                              }}
                              aria-expanded={open}
                              aria-label={`${open ? "Hide" : "Show"} ${s.name}'s payments`}
                              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"
                            >
                              <ChevronDown size={18} className={`text-gray-500 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
                            </button>
                          )}
                        </TableCell>
                      </TableRow>
                      {open && (
                        <TableRow className="hover:bg-transparent">
                          <TableCell colSpan={7} className="bg-gray-50/70 px-3 py-2 md:px-6">
                            <ul className="divide-y divide-gray-200">
                              {list.map((p) => (
                                <li key={p._id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start sm:justify-between">
                                  <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="w-14 text-sm font-medium text-gray-700">{dayLabel(p.date)}</span>
                                      <TypeBadge p={p} />
                                      <span className="font-semibold tabular-nums text-gray-900">{inr(p.amount)}</span>
                                    </div>
                                    <ReceiptStatus p={p} />
                                  </div>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={changing !== null}
                                    onClick={() => changeType(p, typeOf(p) === "advance" ? "salary" : "advance")}
                                    className="h-9 shrink-0 self-start"
                                  >
                                    {changing === p._id && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                                    Mark as {typeOf(p) === "advance" ? "salary" : "advance"}
                                  </Button>
                                </li>
                              ))}
                            </ul>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })}
            {!loading && byStaff.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-gray-500">
                  No active staff, and no payouts in {MONTHS[month - 1]} {year}.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
          {!loading && byStaff.length > 0 && (
            <TableFooter>
              <TableRow className="bg-gray-50 font-semibold hover:bg-gray-50">
                <TableCell>Total</TableCell>
                <TableCell className="text-right"><Money n={sum.salary} /></TableCell>
                <TableCell className="text-right"><Money n={sum.advance} tone="text-amber-700" /></TableCell>
                <TableCell className="text-right"><Money n={sum.total} strong /></TableCell>
                <TableCell className="hidden text-right tabular-nums sm:table-cell">{payouts.length}</TableCell>
                <TableCell className="hidden md:table-cell">
                  {sum.pending > 0 ? <span className="text-amber-700">{sum.pending} awaiting</span> : null}
                </TableCell>
                <TableCell className="hidden sm:table-cell" />
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </div>

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
                  {activeStaff.map((s) => (
                    <SelectItem key={s.employeeID} value={String(s.employeeID)}>
                      {s.name} · {s.employeeID}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label id="pay-type" className="text-sm text-gray-600">Type</Label>
              <div role="radiogroup" aria-labelledby="pay-type" className="mt-1 grid grid-cols-2 gap-2">
                {(["advance", "salary"] as PayType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    role="radio"
                    aria-checked={formType === t}
                    onClick={() => setFormType(t)}
                    className={`flex h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 ${
                      formType === t
                        ? t === "salary"
                          ? "border-blue-600 bg-blue-50 text-blue-700"
                          : "border-amber-500 bg-amber-50 text-amber-800"
                        : "border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {t === "salary" ? <Banknote size={16} /> : <HandCoins size={16} />}
                    {t === "salary" ? "Salary" : "Advance"}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-xs text-gray-500">
                {formType === "salary"
                  ? `All advances paid to ${formStaffName || "this staff member"} on or before this date will count as salary.`
                  : "Stays an advance until a salary is recorded on or after this date."}
              </p>
            </div>
            <div>
              <Label htmlFor="pay-amount" className="text-sm text-gray-600">Amount (₹)</Label>
              <Input
                id="pay-amount"
                type="number"
                inputMode="numeric"
                value={formAmount}
                onChange={(e) => setFormAmount(e.target.value)}
                className="mt-1"
                placeholder="0"
              />
            </div>
            <div>
              <Label htmlFor="pay-date" className="text-sm text-gray-600">Date</Label>
              <Input
                id="pay-date"
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
              Record {formType}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Wrapper>
  );
};

export default Payouts;
