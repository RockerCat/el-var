import BottomNav from "@/components/layout/BottomNav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="pb-16 md:pb-0">{children}</div>
      <BottomNav />
    </>
  );
}
