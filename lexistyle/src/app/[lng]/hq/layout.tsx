import { redirect } from "next/navigation";
import { HqAppShell } from "@/components/hq/HqAppShell";
import { requireAdmin, requireSession } from "@/lib/auth/admin";
import { hasDb, isLocalDb } from "@/db";

export const dynamic = "force-dynamic";

function resolveDbMode(): "neon" | "local-file" | "memory" {
  if (!hasDb()) return "local-file";
  if (isLocalDb()) return "local-file";
  return "neon";
}

export default async function HqLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  const admin = await requireAdmin();
  const allowAnon = process.env.HQ_ALLOW_ANON === "1" || process.env.NODE_ENV !== "production";

  if (!admin && !allowAnon) {
    if (!session) redirect("/auth/sign-in?next=/hq");
    redirect("/account");
  }

  return (
    <HqAppShell
      email={admin?.user?.email ?? session?.user?.email ?? null}
      dbMode={resolveDbMode()}
    >
      {children}
    </HqAppShell>
  );
}
