import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function AdminSourcingRedirect() {
  redirect("/hq/pipeline/catalog");
}
