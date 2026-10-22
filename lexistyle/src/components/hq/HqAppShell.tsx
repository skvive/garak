import { HqSidebar } from "./HqSidebar";
import { HqTopbar } from "./HqTopbar";

export function HqAppShell({
  children,
  email,
  dbMode,
}: {
  children: React.ReactNode;
  email?: string | null;
  dbMode: "neon" | "local-file" | "memory";
}) {
  return (
    <div className="flex min-h-screen bg-fog">
      <HqSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <HqTopbar email={email} dbMode={dbMode} />
        <main className="min-w-0 flex-1 overflow-x-hidden px-4 py-5 md:px-6 md:py-6">{children}</main>
      </div>
    </div>
  );
}
