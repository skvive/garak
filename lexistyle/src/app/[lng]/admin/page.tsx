import { redirect } from "next/navigation";
import { ADMIN_TO_HQ } from "@/lib/hq/nav";

export const dynamic = "force-dynamic";

/** 구 Admin → HQ */
export default function AdminRedirectPage() {
  redirect(ADMIN_TO_HQ["/admin"] ?? "/hq");
}
