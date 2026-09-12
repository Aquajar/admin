import React, { FC, useEffect, useState } from "react";
import type { AxiosInstance } from "axios";
import toast from "react-hot-toast";
import { Loader2, KeyRound, Eye, EyeOff } from "lucide-react";
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

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  axiosInstance: AxiosInstance;
  staff: { employeeID: number; name: string } | null;
}

// Admin dialog to set / reset a staff member's staff-app login password.
// Posts to PATCH /staff/set-password; the backend hashes it before storing.
const SetPasswordDialog: FC<Props> = ({ open, onOpenChange, axiosInstance, staff }) => {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);

  // Reset the form each time the dialog opens.
  useEffect(() => {
    if (open) {
      setPassword("");
      setConfirm("");
      setShow(false);
    }
  }, [open]);

  const save = async () => {
    if (!staff) return;
    if (password.length < 4) {
      toast.error("Password must be at least 4 characters");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    setSaving(true);
    try {
      await axiosInstance.patch(
        `${process.env.NEXT_PUBLIC_API_URL}/staff/set-password`,
        { employeeID: staff.employeeID, password }
      );
      toast.success(`Password set for ${staff.name}`);
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      const message =
        (error as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message || "Failed to set password";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Set login password</DialogTitle>
          <DialogDescription>
            {staff ? (
              <>
                Set the staff-app password for{" "}
                <span className="font-medium capitalize text-gray-800">
                  {staff.name}
                </span>{" "}
                (employee ID {staff.employeeID}). They sign in to the mobile app
                with their employee ID and this password.
              </>
            ) : null}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-xs text-gray-600">New password</Label>
            <div className="mt-1 flex items-center rounded-md border border-gray-300 pr-2 focus-within:ring-1 focus-within:ring-blue-500">
              <Input
                type={show ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="border-0 focus-visible:ring-0"
                placeholder="At least 4 characters"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShow((v) => !v)}
                className="text-gray-400 hover:text-gray-600"
                aria-label={show ? "Hide password" : "Show password"}
              >
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div>
            <Label className="text-xs text-gray-600">Confirm password</Label>
            <Input
              type={show ? "text" : "password"}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="mt-1"
              placeholder="Re-enter password"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !saving) save();
              }}
            />
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
                <KeyRound className="mr-2 h-4 w-4" />
                Set Password
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SetPasswordDialog;
