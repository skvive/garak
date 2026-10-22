import { ShortsNav } from "./shorts-nav";

export default function ShortsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-paper text-ink" style={{ wordBreak: "keep-all", lineHeight: 1.6 }}>
      <ShortsNav />
      {children}
    </div>
  );
}
