import React, { FC, useMemo, useState } from "react";
import type { AxiosInstance } from "axios";
import toast from "react-hot-toast";
import CurrencyFormat from "react-currency-format";
import { AlertCircle, Loader2, SquarePen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Customer, Invoice, Product } from "@/types/types";

interface IProps {
  invoice: Invoice;
  products: Product[] | undefined;
  customer: Customer | null;
  axiosInstance: AxiosInstance;
  // Called with the saved invoice. `dateChanged` lets the parent re-sort the list.
  onSaved: (invoice: Invoice, dateChanged: boolean) => void;
}

interface Line {
  _id: string;
  id: string;
  name: string;
  quantity: string;
  rate: string;
}

// <input type="date"> value ("YYYY-MM-DD") for a given Date, in local time.
const toInputValue = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

const num = (v: string) => {
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
};

const formatDate = (d: Date) =>
  d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

const currency = (value: number, className = "") => (
  <CurrencyFormat
    value={value}
    displayType={"text"}
    thousandSeparator={true}
    prefix={"₹"}
    renderText={(v: string) => <span className={className}>{v}</span>}
  />
);

// Build editable lines from the stored invoice. The per-unit rate isn't stored,
// so derive it: a single-product invoice uses total / quantity (preserves any
// discount); otherwise fall back to the customer's rate or the product price,
// mirroring how the billing page prices items.
const buildLines = (
  invoice: Invoice,
  products: Product[] | undefined,
  customer: Customer | null
): Line[] => {
  const nonZero = invoice.products.filter((p) => p.quantity > 0);
  return invoice.products.map((p) => {
    const product = products?.find((item) => item._id === p.id);
    const fallbackRate =
      customer?.profileRate || parseFloat(product?.price.delivery || "") || 0;
    const rate =
      nonZero.length === 1 && nonZero[0] === p
        ? round2(invoice.total / p.quantity)
        : fallbackRate;
    return {
      _id: p._id,
      id: p.id,
      name: product?.name || "Unknown product",
      quantity: String(p.quantity),
      rate: String(rate),
    };
  });
};

const EditInvoiceDialog: FC<IProps> = ({
  invoice,
  products,
  customer,
  axiosInstance,
  onSaved,
}) => {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [date, setDate] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  // The stored total is kept until a quantity or rate is actually edited, so a
  // date-only change never re-prices the invoice.
  const [linesTouched, setLinesTouched] = useState(false);

  const originalDate = useMemo(
    () => new Date(invoice.invoiceDate as string),
    [invoice.invoiceDate]
  );

  const handleOpenChange = (o: boolean) => {
    setOpen(o);
    if (o) {
      setDate(toInputValue(originalDate));
      setLines(buildLines(invoice, products, customer));
      setLinesTouched(false);
    }
  };

  const updateLine = (index: number, field: "quantity" | "rate", value: string) => {
    setLines((prev) =>
      prev.map((line, i) => (i === index ? { ...line, [field]: value } : line))
    );
    setLinesTouched(true);
  };

  const newTotal = linesTouched
    ? round2(lines.reduce((sum, l) => sum + num(l.quantity) * num(l.rate), 0))
    : invoice.total;

  // Whatever the customer already paid against this invoice stays paid; the
  // remaining due is re-derived from the new total.
  const prevDue =
    invoice.status === "paid" ? 0 : invoice.due ?? invoice.total;
  const alreadyPaid = Math.max(0, invoice.total - prevDue);
  const newDue = round2(Math.max(0, newTotal - alreadyPaid));
  const overpaid = round2(Math.max(0, alreadyPaid - newTotal));

  const dateChanged = date !== toInputValue(originalDate);
  const quantitiesChanged = lines.some(
    (l, i) => num(l.quantity) !== invoice.products[i]?.quantity
  );
  const hasChanges =
    dateChanged || quantitiesChanged || newTotal !== invoice.total;

  const handleSave = async () => {
    if (!date) {
      toast.error("Please select a date");
      return;
    }
    if (lines.some((l) => num(l.quantity) < 0 || num(l.rate) < 0)) {
      toast.error("Quantity and rate cannot be negative");
      return;
    }
    if (!lines.some((l) => num(l.quantity) > 0)) {
      toast.error("At least one product needs a quantity. Delete the invoice instead.");
      return;
    }

    // Keep the original time of day; only the calendar date changes.
    const [y, m, d] = date.split("-").map(Number);
    const nextDate = new Date(originalDate);
    nextDate.setFullYear(y, m - 1, d);

    const status = newDue > 0 ? "pending" : "paid";
    const paymentDate =
      status === "paid" ? invoice.paymentDate || +new Date() : null;

    const payload = {
      invoiceDate: nextDate.toISOString(),
      products: lines.map((l) => ({
        _id: l._id,
        id: l.id,
        quantity: Math.round(num(l.quantity)),
      })),
      total: newTotal,
      due: newDue,
      status,
      paymentDate,
    };

    setSaving(true);
    let saved: Invoice;
    try {
      const URL =
        process.env.NEXT_PUBLIC_API_URL + `/invoice/update/${invoice._id}`;
      const { data } = await axiosInstance.put(URL, payload);
      saved = data.invoice;
    } catch (error) {
      console.log(error);
      toast.error("Failed to update invoice");
      setSaving(false);
      return;
    }

    toast.success("Invoice updated successfully!");
    onSaved(saved, dateChanged);
    setOpen(false);
    setSaving(false);

    // Activity log, with a short summary of what changed.
    try {
      const changes: string[] = [];
      if (dateChanged) {
        changes.push(`date ${formatDate(originalDate)} → ${formatDate(nextDate)}`);
      }
      lines.forEach((l, i) => {
        const before = invoice.products[i]?.quantity;
        if (num(l.quantity) !== before) {
          changes.push(`${l.name} ${before} → ${Math.round(num(l.quantity))}`);
        }
      });
      if (newTotal !== invoice.total) {
        changes.push(`total ₹${invoice.total} → ₹${newTotal}`);
      }
      await axiosInstance.post(
        process.env.NEXT_PUBLIC_API_URL + `/activity`,
        {
          message: `Invoice ID ${invoice.invoiceID} edited (${changes.join(", ")}), customer ref no. ${invoice.customerID}`,
          tag: "entry",
        },
        { headers: { "Content-Type": "application/json" } }
      );
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="icon" variant="outline">
          <SquarePen size={16} />
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Invoice {invoice.invoiceID}</DialogTitle>
          <DialogDescription>
            Change the sale date or product quantities. Total and due are
            recalculated automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 text-left">
          {/* Date */}
          <div className="space-y-2">
            <Label htmlFor={`invoice-date-${invoice._id}`}>Date</Label>
            <Input
              id={`invoice-date-${invoice._id}`}
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          {/* Products */}
          <div className="space-y-2">
            <Label>Products</Label>
            <div className="overflow-hidden rounded-lg border border-gray-200">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Item</th>
                    <th className="w-24 px-3 py-2 text-left font-medium">Qty</th>
                    <th className="w-24 px-3 py-2 text-left font-medium">Rate</th>
                    <th className="w-24 px-3 py-2 text-right font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {lines.map((line, index) => (
                    <tr key={line._id || index}>
                      <td className="px-3 py-2 text-gray-800">{line.name}</td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          min={0}
                          step={1}
                          value={line.quantity}
                          onChange={(e) =>
                            updateLine(index, "quantity", e.target.value)
                          }
                          className="h-8 w-20"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          min={0}
                          step="any"
                          value={line.rate}
                          onChange={(e) =>
                            updateLine(index, "rate", e.target.value)
                          }
                          className="h-8 w-20"
                        />
                      </td>
                      <td className="px-3 py-2 text-right font-medium text-gray-900">
                        {currency(round2(num(line.quantity) * num(line.rate)))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals */}
          <div className="grid grid-cols-2 gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm">
            <div>
              <div className="text-xs text-gray-500">Total</div>
              <div className="text-lg font-semibold text-gray-900">
                {currency(newTotal)}
              </div>
              {newTotal !== invoice.total && (
                <div className="text-xs text-gray-400 line-through">
                  {currency(invoice.total)}
                </div>
              )}
            </div>
            <div>
              <div className="text-xs text-gray-500">Due</div>
              {newDue > 0 ? (
                <div className="text-lg font-semibold text-red-500">
                  {currency(newDue)}
                </div>
              ) : (
                <div className="text-lg font-semibold text-green-600">Paid</div>
              )}
              {alreadyPaid > 0 && (
                <div className="text-xs text-gray-500">
                  {currency(alreadyPaid)} already paid
                </div>
              )}
            </div>
          </div>

          {overpaid > 0 && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                The customer already paid {currency(alreadyPaid)} for this
                invoice. The extra {currency(overpaid)} won&apos;t be credited
                automatically.
              </span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !hasChanges}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditInvoiceDialog;
