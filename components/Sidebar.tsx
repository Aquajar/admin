import { SidebarItems } from "@/lib/constants";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/router";
import React, { useState } from "react";
import { Menu, X, LogOut } from "lucide-react";

// Nav grouped into labelled sections. Items are looked up from SidebarItems by
// name; any item not placed in a group falls into a trailing "More" section, so
// nothing ever disappears if the item list changes.
const GROUPS: { label: string; names: string[] }[] = [
  { label: "Overview", names: ["Dashboard", "Map"] },
  { label: "Sales", names: ["Billing", "Customers", "Invoices", "Account Groups"] },
  { label: "Team", names: ["HR Manager", "Attendance", "Vehicle Log"] },
  { label: "Catalog", names: ["Areas", "Products"] },
  { label: "Insights", names: ["Reports", "Activity"] },
  { label: "System", names: ["Settings"] },
];

const Sidebar = () => {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  if (router.pathname.includes("/auth/login")) return null;

  const isActive = (href: string) =>
    href === "/"
      ? router.pathname === "/"
      : router.pathname.startsWith(href);

  const byName = new Map(SidebarItems.map((i) => [i.name, i]));
  const usedNames = new Set(GROUPS.flatMap((g) => g.names));
  const otherItems = SidebarItems.filter((i) => !usedNames.has(i.name));
  const groups = otherItems.length
    ? [...GROUPS, { label: "More", names: otherItems.map((i) => i.name) }]
    : GROUPS;

  const close = () => setIsOpen(false);

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setIsOpen(true)}
        aria-label="Open menu"
        className="fixed left-4 top-3 z-30 flex h-10 w-10 items-center justify-center rounded-xl border border-[#EAEAEA] bg-white text-[#0A0A0A] shadow-sm md:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 md:hidden"
          onClick={close}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-[#EAEAEA] bg-white transition-transform duration-200 md:w-60 md:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand */}
        <div className="flex h-16 shrink-0 items-center gap-2.5 border-b border-[#EAEAEA] px-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/logo.png"
            alt="Aquajar"
            className="h-8 w-8 rounded-lg object-contain"
          />
          <span className="text-lg font-bold tracking-tight text-[#0A0A0A]">
            Aquajar
          </span>
          <button
            onClick={close}
            aria-label="Close menu"
            className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg text-[#6B7280] hover:bg-[#F5F5F5] md:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
          {groups.map((g) => (
            <div key={g.label}>
              <div className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#9CA3AF]">
                {g.label}
              </div>
              <div className="space-y-0.5">
                {g.names.map((n) => {
                  const item = byName.get(n);
                  if (!item) return null;
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={close}
                      className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium transition-colors ${
                        active
                          ? "bg-[#2563EB] text-white shadow-sm"
                          : "text-[#6B7280] hover:bg-[#F5F5F5] hover:text-[#0A0A0A]"
                      }`}
                    >
                      <Icon
                        className={`h-5 w-5 shrink-0 ${
                          active
                            ? "text-white"
                            : "text-[#9CA3AF] group-hover:text-[#6B7280]"
                        }`}
                      />
                      <span className="truncate">{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="shrink-0 border-t border-[#EAEAEA] p-3">
          <button
            onClick={() => signOut()}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium text-[#6B7280] transition-colors hover:bg-red-50 hover:text-[#DC2626]"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
