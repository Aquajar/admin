import { SidebarItems } from "@/lib/constants";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/router";
import React, { useEffect } from "react";
import { LogOut } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

const Brand = () => (
  <>
    <div className="flex aspect-square size-8 shrink-0 items-center justify-center overflow-hidden rounded-md bg-white">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/logo.png"
        alt="Aquajar"
        className="size-8 object-contain"
      />
    </div>
    <span className="truncate text-[15px] font-bold tracking-tight">
      Aquajar
    </span>
  </>
);

// Phone-only top bar. Below md the sidebar is an off-canvas sheet that starts
// closed, so the toggle inside its header can't open it; this one can.
export const MobileTopBar = () => (
  <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b bg-white px-4 md:hidden">
    <SidebarTrigger className="size-9 shrink-0 text-[#64748B]" />
    <Link href="/" className="flex min-w-0 items-center gap-2">
      <Brand />
    </Link>
  </header>
);

// Nav grouped into labelled sections. Items are looked up from SidebarItems by
// name; any item not placed in a group falls into a trailing "More" section, so
// nothing disappears if the item list changes.
const GROUPS: { label: string; names: string[] }[] = [
  { label: "General", names: ["Dashboard", "Map"] },
  { label: "Sales", names: ["Billing", "Customers", "Orders", "Invoices", "Account Groups"] },
  { label: "Team", names: ["HR Manager", "Attendance", "Payouts", "Vehicle Log"] },
  { label: "Catalog", names: ["Areas", "Products"] },
  { label: "Insights", names: ["Analytics", "Reports", "Activity"] },
  { label: "System", names: ["Settings"] },
];

const AppSidebar = () => {
  const router = useRouter();
  const { setOpenMobile } = useSidebar();

  // On phones the sheet stays open over the new page after a link tap; close it.
  useEffect(() => {
    setOpenMobile(false);
  }, [router.asPath, setOpenMobile]);

  const isActive = (href: string) =>
    href === "/" ? router.pathname === "/" : router.pathname.startsWith(href);

  const byName = new Map(SidebarItems.map((i) => [i.name, i]));
  const usedNames = new Set(GROUPS.flatMap((g) => g.names));
  const otherItems = SidebarItems.filter((i) => !usedNames.has(i.name));
  const groups = otherItems.length
    ? [...GROUPS, { label: "More", names: otherItems.map((i) => i.name) }]
    : GROUPS;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
          <Link
            href="/"
            className="flex min-w-0 flex-1 items-center gap-2 rounded-md p-1 group-data-[collapsible=icon]:hidden"
          >
            <Brand />
          </Link>
          <SidebarTrigger className="size-8 shrink-0 text-[#64748B]" />
        </div>
      </SidebarHeader>

      <SidebarContent>
        {groups.map((g) => (
          <SidebarGroup key={g.label}>
            <SidebarGroupLabel>{g.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {g.names.map((n) => {
                  const item = byName.get(n);
                  if (!item) return null;
                  const Icon = item.icon;
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive(item.href)}
                        tooltip={item.name}
                      >
                        <Link href={item.href}>
                          <Icon />
                          <span>{item.name}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Logout"
              onClick={() => signOut()}
              className="text-sidebar-foreground/80 hover:bg-red-50 hover:text-red-600"
            >
              <LogOut />
              <span>Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
};

export default AppSidebar;
