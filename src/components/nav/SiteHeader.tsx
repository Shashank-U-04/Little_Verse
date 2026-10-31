"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { LayoutDashboard, LogOut, Menu, Trees, Trophy, Users, X } from "lucide-react";
import { ChildAvatar } from "@/components/family/ChildAvatar";
import { computeProgress } from "@/features/gamification/progression";
import { signOut, useFamily } from "@/lib/family";
import { cn } from "@/lib/utils";

type NavLink = { href: string; label: string; icon?: typeof Trees };

const SIGNED_OUT: NavLink[] = [
  { href: "/#adventures", label: "Adventures" },
  { href: "/#rewards", label: "Rewards" },
  { href: "/#parents", label: "For grown-ups" },
];

const SIGNED_IN: NavLink[] = [
  { href: "/kids", label: "Kids Zone", icon: Trees },
  { href: "/kids/trophies", label: "Trophies", icon: Trophy },
  { href: "/parent", label: "Parent Dashboard", icon: LayoutDashboard },
];

function isActive(pathname: string, href: string): boolean {
  if (href.startsWith("/#")) return false;
  if (href === "/kids") return pathname === "/kids";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link
      href="/"
      aria-label="LittleVerse AI home"
      className="flex shrink-0 items-center gap-2 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#205C43] focus-visible:ring-offset-2"
    >
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-[#77B96A] to-[#205C43] text-white shadow-[0_4px_12px_rgba(32,92,67,0.35)]">
        <Trees className="h-5 w-5" aria-hidden />
      </span>
      <span className={cn("font-display text-xl font-semibold tracking-tight", light ? "text-white" : "text-[#205C43]")}>
        LittleVerse
      </span>
    </Link>
  );
}

/** The one navigation bar for the landing page, the kids' side and the parent side. */
export default function SiteHeader({ transparent = false }: { transparent?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const family = useFamily();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (!transparent) return;
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [transparent]);

  // Close the mobile menu whenever the route changes.
  const [menuPath, setMenuPath] = useState(pathname);
  if (menuPath !== pathname) {
    setMenuPath(pathname);
    setOpen(false);
  }

  const signedIn = family.ready && family.parent !== null;
  const links = signedIn ? SIGNED_IN : SIGNED_OUT;
  const child = family.activeChild;
  const level = child ? computeProgress(family.sessions).level : null;
  const solid = !transparent || scrolled || open;

  const handleSignOut = () => {
    signOut();
    setOpen(false);
    router.push("/");
  };

  return (
    <header
      className={cn(
        "top-0 z-50 transition-colors duration-300",
        transparent ? "fixed inset-x-0" : "sticky",
        solid
          ? "border-b border-[#205C43]/10 bg-white/90 backdrop-blur-md supports-[backdrop-filter]:bg-white/75"
          : "border-b border-white/40 bg-white/55 backdrop-blur-md",
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Logo />

        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {links.map((link) => {
            const active = isActive(pathname, link.href);
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-10 items-center gap-1.5 rounded-full px-4 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#205C43] focus-visible:ring-offset-2",
                  active ? "bg-[#205C43] text-white shadow-sm" : "text-[#205C43] hover:bg-[#205C43]/[0.08]",
                )}
              >
                {Icon && <Icon className="h-4 w-4" aria-hidden />}
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          {signedIn ? (
            <>
              {child && level && (
                <Link
                  href="/profiles"
                  title="Switch explorer"
                  className="hidden items-center gap-2 rounded-full border border-[#205C43]/10 bg-white py-1 pl-1 pr-3 shadow-sm transition hover:border-[#205C43]/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#205C43] sm:inline-flex"
                >
                  <ChildAvatar avatar={child.avatar} size={32} />
                  <span className="flex flex-col leading-none">
                    <span className="text-sm font-extrabold text-[#24352B]">{child.name}</span>
                    <span className="text-[11px] font-bold text-[#7a5a00]">Lv {level.level} · {level.title}</span>
                  </span>
                </Link>
              )}
              <button
                type="button"
                onClick={handleSignOut}
                className="hidden min-h-10 items-center gap-1.5 rounded-full border border-[#205C43]/15 bg-white px-4 text-sm font-bold text-[#205C43] transition hover:bg-[#FFF4D6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#205C43] focus-visible:ring-offset-2 md:inline-flex"
              >
                <LogOut className="h-4 w-4" aria-hidden />
                Sign out
              </button>
            </>
          ) : (
            family.ready && (
              <>
                <Link
                  href="/login"
                  className="hidden min-h-10 items-center rounded-full px-4 text-sm font-bold text-[#205C43] hover:bg-[#205C43]/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#205C43] sm:inline-flex"
                >
                  Sign in
                </Link>
                <Link
                  href="/signup"
                  className="inline-flex min-h-10 items-center rounded-full bg-gradient-to-r from-[#FF8A72] to-[#FF6B6B] px-5 text-sm font-extrabold text-white shadow-[0_6px_16px_rgba(255,107,107,0.35)] transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#205C43] focus-visible:ring-offset-2"
                >
                  Get started
                </Link>
              </>
            )
          )}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#205C43]/15 bg-white text-[#205C43] md:hidden"
          >
            {open ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.nav
            id="mobile-menu"
            aria-label="Main"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden border-t border-[#205C43]/10 bg-white md:hidden"
          >
            <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3">
              {links.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    aria-current={isActive(pathname, link.href) ? "page" : undefined}
                    className="flex min-h-12 items-center gap-3 rounded-2xl px-3 text-base font-bold text-[#205C43] hover:bg-[#E8F5E9]"
                  >
                    {Icon && <Icon className="h-5 w-5" aria-hidden />}
                    {link.label}
                  </Link>
                );
              })}
              {signedIn ? (
                <>
                  <Link href="/profiles" onClick={() => setOpen(false)} className="flex min-h-12 items-center gap-3 rounded-2xl px-3 text-base font-bold text-[#205C43] hover:bg-[#E8F5E9]">
                    <Users className="h-5 w-5" aria-hidden />
                    Switch explorer
                  </Link>
                  <button type="button" onClick={handleSignOut} className="flex min-h-12 items-center gap-3 rounded-2xl px-3 text-left text-base font-bold text-[#B4442F] hover:bg-[#FFE4DE]">
                    <LogOut className="h-5 w-5" aria-hidden />
                    Sign out
                  </button>
                </>
              ) : (
                <Link href="/login" onClick={() => setOpen(false)} className="flex min-h-12 items-center rounded-2xl px-3 text-base font-bold text-[#205C43] hover:bg-[#E8F5E9]">
                  Sign in
                </Link>
              )}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
