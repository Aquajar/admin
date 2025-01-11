import copy from "copy-to-clipboard";
import toast from "react-hot-toast";

export const copyTextToKeyboard = (text: string) => {
  copy(text);
  toast.success("Copied to clipboard");
};

