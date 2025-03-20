import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import copy from "copy-to-clipboard";
import toast from "react-hot-toast";

export const copyTextToKeyboard = (text: string) => {
  copy(text);
  toast.success("Copied to clipboard");
};

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
