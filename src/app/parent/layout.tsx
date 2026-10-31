import SiteHeader from "@/components/nav/SiteHeader";
import ParentNav from "./parent-nav";

export default function ParentLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="min-h-screen bg-[#FFF8E9] text-[#24352B]">
      <SiteHeader />
      <section aria-label="Dashboard sections and children" className="border-b border-[#FFF0C9] bg-white/70">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-2 sm:px-6">
          <ParentNav />
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>

      <footer className="mx-auto max-w-6xl px-4 pb-8 sm:px-6">
        <p className="text-center text-[11px] leading-relaxed tracking-wide text-[#24352B]/85">
          LittleVerse AI · Profiles and progress stay in this browser. Nothing is uploaded without your approval.
        </p>
      </footer>
    </div>
  );
}
