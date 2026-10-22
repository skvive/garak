import { redirect } from "next/navigation";

export default function AdminOrdersRedirect() {
  redirect("/hq/orders");
}
