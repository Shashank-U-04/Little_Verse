"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, LineChart, Plus, Settings } from "lucide-react";
import { ChildAvatar } from "@/components/family/ChildAvatar";
import { setActiveChild, useFamily } from "@/lib/family";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/parent", label: "Overview", icon: LayoutDashboard },
  { href: "/parent/progress", label: "Progress", icon: LineChart },
  { href: "/parent/settings", label: "Settings", icon: Settings },
] as const;

export default function ParentNav(): React.ReactElement {
  const pathname = usePathname();
  const family = useFamily();

  function isActive(href: string): boolean {
    if (href === "/parent") return pathname === "/parent";
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <>
      <nav className="flex min-w-0 max-w-full items-center gap-1.5 overflow-x-auto py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Parent dashboard">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#205C43] focus-visible:ring-offset-2",
                active ? "bg-[#205C43] text-white shadow-sm" : "text-[#205C43]/90 hover:bg-[#205C43]/[0.06] hover:text-[#205C43]",
              )}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {family.parent && (
        <div className="flex items-center gap-1.5" role="group" aria-label="Choose a child">
          {family.children.map((child, i) => {
            const active = child.id === family.activeChild?.id;
            return (
              <button
                key={child.id}
                type="button"
                onClick={() => setActiveChild(child.id)}
                aria-pressed={active}
                className={cn(
                  "inline-flex min-h-9 items-center gap-1.5 rounded-full border py-0.5 pl-0.5 pr-3 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#205C43]",
                  active ? "border-[#205C43] bg-[#E8F5E9] text-[#205C43]" : "border-transparent text-[#53645B] hover:bg-[#205C43]/[0.06]",
                )}
              >
                <ChildAvatar avatar={child.avatar} size={28} tone={i} />
                {child.name}
              </button>
            );
          })}
          <Link
            href="/onboarding"
            aria-label="Add a child"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-dashed border-[#205C43]/30 text-[#205C43] hover:bg-[#205C43]/[0.06]"
          >
            <Plus className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      )}
    </>
  );
}
