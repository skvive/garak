import { requireSession } from "../auth/admin";
import { StudioError } from "./domain";

export async function studioActor(req: Request) {
  const host = new URL(req.url).hostname;
  if (process.env.NODE_ENV === "development" && process.env.SELLER_STUDIO_LOCAL === "1" && ["localhost", "127.0.0.1", "[::1]"].includes(host)) {
    return { id: "local:seller-studio", label: "로컬 작업공간", local: true, catalog: true };
  }
  // Existing storefront has a development fallback secret; never use it for tenant data.
  if ((process.env.AUTH_SECRET?.length ?? 0) < 32) throw new StudioError("Seller Studio 로그인용 AUTH_SECRET 설정이 필요합니다.", 503);
  const session = await requireSession();
  if (!session?.user?.id || session.user.id === "demo:admin") throw new StudioError("로그인이 필요합니다.", 401);
  const allow = (process.env.ADMIN_EMAILS || "").split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
  return { id: session.user.id, label: session.user.email || "판매자", local: false, catalog: Boolean(session.user.email && allow.includes(session.user.email.toLowerCase())) };
}
