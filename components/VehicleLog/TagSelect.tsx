import React, { FC, useState } from "react";
import { X } from "lucide-react";

// Multi-value tag picker: choose from cached suggestions (area / staff names)
// or type a custom value. Selected tags are joined with "/" on export, matching
// the sheet ("Moloy/Rabi/Abhijit").
interface Props {
  value: string[];
  options: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
}

const TagSelect: FC<Props> = ({ value, options, onChange, placeholder }) => {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const add = (name: string) => {
    const v = name.trim();
    if (!v) return;
    if (!value.some((x) => x.toLowerCase() === v.toLowerCase())) {
      onChange([...value, v]);
    }
    setQuery("");
  };

  const remove = (name: string) =>
    onChange(value.filter((x) => x !== name));

  const filtered = options
    .filter((o) => !value.some((v) => v.toLowerCase() === o.toLowerCase()))
    .filter((o) => o.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 8);

  const canAddCustom =
    query.trim().length > 0 &&
    !options.some((o) => o.toLowerCase() === query.trim().toLowerCase()) &&
    !value.some((v) => v.toLowerCase() === query.trim().toLowerCase());

  return (
    <div className="relative">
      <div className="flex flex-wrap items-center gap-1 rounded-md border border-gray-300 bg-white p-1.5 focus-within:ring-1 focus-within:ring-blue-500">
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700"
          >
            {tag}
            <button
              type="button"
              onClick={() => remove(tag)}
              className="text-blue-400 hover:text-blue-700"
              aria-label={`Remove ${tag}`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (query.trim()) add(query);
            } else if (e.key === "Backspace" && !query && value.length) {
              remove(value[value.length - 1]);
            }
          }}
          placeholder={value.length === 0 ? placeholder : ""}
          className="min-w-[100px] flex-1 border-none p-0.5 text-sm outline-none"
        />
      </div>

      {open && (filtered.length > 0 || canAddCustom) && (
        <div className="absolute z-20 mt-1 max-h-52 w-full overflow-y-auto rounded-md border border-gray-200 bg-white py-1 shadow-lg">
          {filtered.map((o) => (
            <button
              key={o}
              type="button"
              // onMouseDown so it fires before the input's blur closes this list
              onMouseDown={(e) => {
                e.preventDefault();
                add(o);
              }}
              className="block w-full px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-blue-50"
            >
              {o}
            </button>
          ))}
          {canAddCustom && (
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                add(query);
              }}
              className="block w-full px-3 py-1.5 text-left text-sm font-medium text-blue-600 hover:bg-blue-50"
            >
              + Add “{query.trim()}”
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default TagSelect;
