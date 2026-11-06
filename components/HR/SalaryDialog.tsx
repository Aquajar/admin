import React, { FC, useCallback, useEffect, useState } from "react";
import type { AxiosInstance } from "axios";
import toast from "react-hot-toast";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Entry = { value: number; startDate: string };
type Change = { at: string; by: string; before: Entry[]; after: Entry[] };

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  axiosInstance: AxiosInstance;
  staff: { _id: string; name: string } | null;
  onSaved: () => void;
}

const inr = (n: number) => "₹" + Math.round(n || 0).toLocaleString("en-IN");
const day = (v: string) => new Date(v).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
const firstOfMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
};

// Set a staff member's monthly salary from a start date. Earlier salaries stay in
// force for earlier days, so past payouts don't change. Every change is logged.
const SalaryDialog: FC<Props> = ({ open, onOpenChange, axiosInstance, staff, onSaved }) => {
  const base = process.env.NEXT_PUBLIC_API_URL;
  const [value, setValue] = useState("");
  const [startDate, setStartDate] = useState(firstOfMonth());
  const [history, setHistory] = useState<Entry[]>([]);
  const [changes, setChanges] = useState<Change[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!staff) return;
    setLoading(true);
    try {
      const { data } = await axiosInstance.get(`${base}/staff/${staff._id}/salary-log`);
      setHistory([...(data.salary || [])].sort((a: Entry, b: Entry) => +new Date(b.startDate) - +new Date(a.startDate)));
      setChanges(data.changes || []);
    } catch (e: any) {
      toast.error(e?.response?.data?.error?.message || "Failed to load salary");
    } finally {
      setLoading(false);
    }
  }, [axiosInstance, base, staff]);

  useEffect(() => {
    if (open) {
      setValue("");
      setStartDate(firstOfMonth());
      load();
    }
  }, [open, load]);

  const save = async () => {
    if (!staff) return;
    if (!value || Number(value) < 0) return void toast.error("Enter the monthly salary");
    if (!startDate) return void toast.error("Pick the date it starts from");
    setSaving(true);
    try {
      await axiosInstance.put(`${base}/staff/${staff._id}/salary`, { value: Number(value), startDate });
      toast.success(`Salary saved for ${staff.name}`);
      setValue("");
      await load();
      onSaved();
    } catch (e: any) {
      toast.error(e?.response?.data?.error?.message || "Failed to save salary");
    } finally {
      setSaving(false);
    }
  };

  const current = history.find((h) => +new Date(h.startDate) <= Date.now());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Salary</DialogTitle>
          <DialogDescription>
            <span className="capitalize">{staff?.name}</span> · current{" "}
            <b>{current ? inr(current.value) : "not set"}</b> per month. Pay per day = monthly salary ÷ days in that month.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>New monthly salary (₹)</Label>
            <Input type="number" min={0} value={value} onChange={(e) => setValue(e.target.value)} placeholder="e.g. 12000" />
          </div>
          <div>
            <Label>Starts from</Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
        </div>

        <div className="max-h-64 overflow-y-auto rounded-lg border border-[#EAEAEA]">
          <p className="border-b bg-[#FAFAFA] px-3 py-2 text-sm font-medium">Salary history</p>
          {loading ? (
            <p className="px-3 py-3 text-sm text-gray-400">Loading…</p>
          ) : history.length === 0 ? (
            <p className="px-3 py-3 text-sm text-gray-400">No salary set yet.</p>
          ) : (
            <ul className="divide-y text-sm">
              {history.map((h) => (
                <li key={h.startDate} className="flex justify-between px-3 py-2">
                  <span>from {day(h.startDate)}</span>
                  <span className="font-medium">{inr(h.value)}</span>
                </li>
              ))}
            </ul>
          )}
          {changes.length > 0 && (
            <>
              <p className="border-y bg-[#FAFAFA] px-3 py-2 text-sm font-medium">Change log</p>
              <ul className="divide-y text-xs text-gray-600">
                {changes.map((c, i) => {
                  const added = c.after.find((a) => !c.before.some((b) => b.startDate === a.startDate && b.value === a.value));
                  return (
                    <li key={i} className="px-3 py-2">
                      {day(c.at)} {new Date(c.at).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })} · <b>{c.by}</b>
                      {added ? ` set ${inr(added.value)} from ${day(added.startDate)}` : " changed the salary"}
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button disabled={saving} onClick={save}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save salary
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SalaryDialog;
