import React, { FC, useEffect, useState } from "react";
import type { AxiosInstance } from "axios";
import toast from "react-hot-toast";
import { Loader2, Save } from "lucide-react";
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
import { TripRateConfig } from "@/types/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  axiosInstance: AxiosInstance;
  config: TripRateConfig | null;
  onSaved: () => void;
}

const num = (s: string) => {
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};

const RatesDialog: FC<Props> = ({
  open,
  onOpenChange,
  axiosInstance,
  config,
  onSaved,
}) => {
  const [dA, setDA] = useState("");
  const [dL, setDL] = useState("");
  const [lA, setLA] = useState("");
  const [lL, setLL] = useState("");
  const [keyword, setKeyword] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && config) {
      setDA(String(config.rates.driver.airport));
      setDL(String(config.rates.driver.local));
      setLA(String(config.rates.labour.airport));
      setLL(String(config.rates.labour.local));
      setKeyword(config.airportKeyword);
    }
  }, [open, config]);

  const save = async () => {
    setSaving(true);
    try {
      await axiosInstance.put(`${process.env.NEXT_PUBLIC_API_URL}/trip-rate`, {
        rates: {
          driver: { airport: num(dA), local: num(dL) },
          labour: { airport: num(lA), local: num(lL) },
        },
        airportKeyword: keyword,
      });
      toast.success("Rates updated");
      onOpenChange(false);
      onSaved();
    } catch (error) {
      console.error(error);
      toast.error("Failed to update rates");
    } finally {
      setSaving(false);
    }
  };

  const field = (
    label: string,
    val: string,
    setVal: (v: string) => void
  ) => (
    <div>
      <Label className="text-xs text-gray-600">{label}</Label>
      <div className="mt-1 flex items-center rounded-md border border-gray-300 pl-2 focus-within:ring-1 focus-within:ring-blue-500">
        <span className="text-sm text-gray-400">₹</span>
        <Input
          type="number"
          step="0.05"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          className="border-0 focus-visible:ring-0"
        />
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Trip Rates (₹ per jar)</DialogTitle>
          <DialogDescription>
            Trip pay = jars delivered (Out − Filled) × the rate for the staff&apos;s
            role and route.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <div className="mb-1 text-sm font-semibold text-gray-700">Driver</div>
            <div className="grid grid-cols-2 gap-3">
              {field("Airport", dA, setDA)}
              {field("Local", dL, setDL)}
            </div>
          </div>
          <div>
            <div className="mb-1 text-sm font-semibold text-gray-700">Labour</div>
            <div className="grid grid-cols-2 gap-3">
              {field("Airport", lA, setLA)}
              {field("Local", lL, setLL)}
            </div>
          </div>
          <div>
            <Label className="text-xs text-gray-600">Airport keyword</Label>
            <Input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="mt-1"
              placeholder="Airport"
            />
            <p className="mt-1 text-[11px] text-gray-400">
              A trip whose location contains this word is paid the Airport rate;
              everything else is Local.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={save} disabled={saving} className="w-full sm:w-auto">
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Rates
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RatesDialog;
