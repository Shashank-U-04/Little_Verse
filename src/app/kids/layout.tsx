import SiteHeader from "@/components/nav/SiteHeader";

export default function KidsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-[#FFF8E9]">
      <SiteHeader />
      <main className="flex-1">{children}</main>
    </div>
  );
}
