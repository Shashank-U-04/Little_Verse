"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, LineChart, Settings } from "lucide-react";

const NAV_ITEMS = [
  { href: "/parent", label: "Overview", icon: LayoutDashboard },
  { href: "/parent/progress", label: "Progress", icon: LineChart },
  { href: "/parent/settings", label: "Settings", icon: Settings },
] as const;

export default function ParentNav(): React.ReactElement {
  const pathname = usePathname();

  function isActive(href: string): boolean {
    if (href === "/parent") return pathname === "/parent";
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <nav className="flex min-w-0 max-w-full items-center gap-1.5 overflow-x-auto py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Parent dashboard">
      {NAV_ITEMS.map((item) => {
        const active = isActive(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={
              active
                ? "inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#205C43] px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#205C43] focus-visible:ring-offset-2"
                : "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold text-[#205C43]/90 hover:bg-[#205C43]/[0.06] hover:text-[#205C43] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#205C43] focus-visible:ring-offset-2"
            }
          >
            <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
