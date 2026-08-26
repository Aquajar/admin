import React, { FC, useEffect, useMemo, useState } from "react";
import type { AxiosInstance } from "axios";
import toast from "react-hot-toast";
import { Loader2, Save } from "lucide-react";
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
import { VehicleLog } from "@/types/types";
import TagSelect from "@/components/VehicleLog/TagSelect";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  axiosInstance: AxiosInstance;
  areaNames: string[];
  staffNames: string[];
  onSaved: () => void;
  editing?: VehicleLog | null;
  defaultDate?: string; // YYYY-MM-DD to prefill for new logs
}

const toDateInput = (iso?: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const num = (s: string) => {
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};

const AddLogDialog: FC<Props> = ({
  open,
  onOpenChange,
  axiosInstance,
  areaNames,
  staffNames,
  onSaved,
  editing,
  defaultDate,
}) => {
  const [saving, setSaving] = useState(false);
  const [date, setDate] = useState("");
  const [departureTime, setDepartureTime] = useState("");
  const [arrivalTime, setArrivalTime] = useState("");
  const [out, setOut] = useState("");
  const [returned, setReturned] = useState("");
  const [filled, setFilled] = useState("");
  const [engaged, setEngaged] = useState("");
  const [empty, setEmpty] = useState("");
  // Once the user edits Engaged/Empty, stop auto-filling them from the formula.
  const [engagedTouched, setEngagedTouched] = useState(false);
  const [emptyTouched, setEmptyTouched] = useState(false);
  const [recorded, setRecorded] = useState("");
  const [cash, setCash] = useState("");
  const [staff, setStaff] = useState<string[]>([]);
  const [location, setLocation] = useState<string[]>([]);
  const [note, setNote] = useState("");

  // Load values when opening (edit → prefill from log; new → today/browsed month).
  useEffect(() => {
    if (!open) return;
    if (editing) {
      setDate(toDateInput(editing.date));
      setDepartureTime(editing.departureTime || "");
      setArrivalTime(editing.arrivalTime || "");
      setOut(String(editing.out ?? ""));
      setReturned(String(editing.returned ?? ""));
      setFilled(String(editing.filled ?? ""));
      // Keep the stored Engaged/Empty exactly as saved (treat as user-set so the
      // auto-fill doesn't overwrite them on open).
      setEngaged(String(editing.engaged ?? ""));
      setEmpty(String(editing.empty ?? ""));
      setEngagedTouched(true);
      setEmptyTouched(true);
      setRecorded(String(editing.recorded ?? ""));
      setCash(String(editing.cash ?? ""));
      setStaff(editing.staff || []);
      setLocation(editing.location || []);
      setNote(editing.note || "");
    } else {
      const today = new Date();
      const pad = (n: number) => String(n).padStart(2, "0");
      setDate(
        defaultDate ||
          `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(
            today.getDate()
          )}`
      );
      setDepartureTime("");
      setArrivalTime("");
      setOut("");
      setReturned("");
      setFilled("");
      setEngaged("");
      setEmpty("");
      setEngagedTouched(false);
      setEmptyTouched(false);
      setRecorded("");
      setCash("");
      setStaff([]);
      setLocation([]);
      setNote("");
    }
  }, [open, editing, defaultDate]);

  const derivedEngaged = useMemo(() => num(returned) - num(out), [returned, out]);
  const derivedEmpty = useMemo(
    () => num(returned) - num(filled),
    [returned, filled]
  );

  // Auto-fill Engaged/Empty from the formula until the user overrides them.
  useEffect(() => {
    if (!engagedTouched) {
      setEngaged(out === "" && returned === "" ? "" : String(derivedEngaged));
    }
  }, [derivedEngaged, engagedTouched, out, returned]);

  useEffect(() => {
    if (!emptyTouched) {
      setEmpty(returned === "" && filled === "" ? "" : String(derivedEmpty));
    }
  }, [derivedEmpty, emptyTouched, returned, filled]);

  const handleSubmit = async () => {
    if (!date) {
      toast.error("Date is required");
      return;
    }
    setSaving(true);
    try {
      const base = process.env.NEXT_PUBLIC_API_URL;
      const payload = {
        date,
        departureTime,
        arrivalTime,
        out: num(out),
        returned: num(returned),
        filled: num(filled),
        engaged: engaged === "" ? derivedEngaged : num(engaged),
        empty: empty === "" ? derivedEmpty : num(empty),
        recorded: num(recorded),
        cash: num(cash),
        staff,
        location,
        note,
      };
      if (editing?._id) {
        await axiosInstance.put(`${base}/vehicle-log/${editing._id}`, payload);
        toast.success("Log updated");
      } else {
        await axiosInstance.post(`${base}/vehicle-log`, payload);
        toast.success("Log added");
      }
      onOpenChange(false);
      onSaved();
    } catch (error) {
      console.error(error);
      toast.error("Failed to save log");
    } finally {
      setSaving(false);
    }
  };

  const numField = (
    label: string,
    val: string,
    setVal: (v: string) => void
  ) => (
    <div>
      <Label className="text-xs text-gray-600">{label}</Label>
      <Input
        type="number"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        className="mt-1"
        placeholder="0"
      />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Log" : "Add Vehicle Log"}</DialogTitle>
        </DialogHeader>

        <div className="max-h-[65vh] space-y-4 overflow-y-auto px-1 py-1">
          {/* Date + times */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs text-gray-600">Date</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-gray-600">Departure</Label>
              <Input
                type="time"
                value={departureTime}
                onChange={(e) => setDepartureTime(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-gray-600">Arrival</Label>
              <Input
                type="time"
                value={arrivalTime}
                onChange={(e) => setArrivalTime(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          {/* Jar counts */}
          <div className="grid grid-cols-3 gap-3">
            {numField("Out", out, setOut)}
            {numField("Return", returned, setReturned)}
            {numField("Filled", filled, setFilled)}
          </div>

          {/* Engaged / Empty — auto-filled from the formula, but editable */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs text-gray-600">Engaged</Label>
              <Input
                type="number"
                value={engaged}
                onChange={(e) => {
                  setEngaged(e.target.value);
                  setEngagedTouched(true);
                }}
                className={`mt-1 ${
                  num(engaged) < 0 && engaged !== "" ? "text-red-600" : ""
                }`}
                placeholder="0"
              />
            </div>
            <div>
              <Label className="text-xs text-gray-600">Empty</Label>
              <Input
                type="number"
                value={empty}
                onChange={(e) => {
                  setEmpty(e.target.value);
                  setEmptyTouched(true);
                }}
                className="mt-1"
                placeholder="0"
              />
            </div>
            {numField("Recorded", recorded, setRecorded)}
          </div>
          <p className="-mt-2 text-[11px] text-gray-400">
            Engaged &amp; Empty auto-fill from Out / Return / Filled — edit them
            if the actual value differs.
          </p>

          {/* Cash */}
          <div className="grid grid-cols-3 gap-3">
            {numField("Cash (₹)", cash, setCash)}
          </div>

          {/* Staff + location */}
          <div>
            <Label className="text-xs text-gray-600">Staff</Label>
            <div className="mt-1">
              <TagSelect
                value={staff}
                options={staffNames}
                onChange={setStaff}
                placeholder="Add staff…"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs text-gray-600">Location</Label>
            <div className="mt-1">
              <TagSelect
                value={location}
                options={areaNames}
                onChange={setLocation}
                placeholder="Add location…"
              />
            </div>
          </div>

          {/* Note */}
          <div>
            <Label className="text-xs text-gray-600">Note (optional)</Label>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="mt-1"
              placeholder="Any remarks"
            />
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleSubmit} disabled={saving} className="w-full sm:w-auto">
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                {editing ? "Update Log" : "Add Log"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddLogDialog;
