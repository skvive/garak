export type AccountBadgeTone = "neutral" | "express" | "fresh";

const STATUS: Record<string, { label: string; tone: AccountBadgeTone; step: number }> = {
  pending_payment: { label: "결제 대기", tone: "neutral", step: 0 },
  pending: { label: "결제 대기", tone: "neutral", step: 0 },
  payment_failed: { label: "결제 실패", tone: "neutral", step: 0 },
  paid: { label: "결제 완료", tone: "express", step: 1 },
  preparing: { label: "상품 준비 중", tone: "express", step: 2 },
  shipped: { label: "배송 중", tone: "express", step: 3 },
  customs: { label: "통관 중", tone: "express", step: 3 },
  delivered: { label: "배송 완료", tone: "fresh", step: 4 },
  cancelled: { label: "취소", tone: "neutral", step: 0 },
  refunded: { label: "환불 완료", tone: "neutral", step: 0 },
};

export function presentOrderStatus(status: string) {
  return STATUS[status] ?? { label: status, tone: "neutral" as const, step: 0 };
}

export function formatUsd(value: string | number) {
  const amount = Number(value);
  return Number.isFinite(amount)
    ? new Intl.NumberFormat("ko-KR", { style: "currency", currency: "USD" }).format(amount)
    : "$0.00";
}

export function formatKrw(value: number) {
  return new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW", maximumFractionDigits: 0 }).format(value);
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function maskName(value: string) {
  if (!value) return "";
  if (value.length < 2) return value;
  return `${value.slice(0, 1)}${"*".repeat(Math.min(3, value.length - 1))}`;
}

function maskPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 4) return value ? "****" : "";
  return `***-****-${digits.slice(-4)}`;
}

function maskAddress(value: string) {
  if (!value) return "";
  const visible = value.slice(0, Math.min(8, Math.max(3, Math.floor(value.length / 2))));
  return value.length > visible.length ? `${visible}…` : visible;
}

export type SafeShippingAddress = {
  name?: string;
  address1?: string;
  city?: string;
  postal?: string;
  country?: string;
  phone?: string;
};

/** 고객 화면에는 배송 확인에 필요한 필드만 마스킹해 노출한다. */
export function safeShippingAddress(value: unknown): SafeShippingAddress | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const safe: SafeShippingAddress = {
    name: maskName(text(row.name)),
    address1: maskAddress(text(row.address1)),
    city: text(row.city),
    postal: maskAddress(text(row.postal)),
    country: text(row.country),
    phone: maskPhone(text(row.phone)),
  };
  return Object.values(safe).some(Boolean) ? safe : null;
}

const TIER_LABELS: Record<string, string> = {
  bronze: "Bronze",
  silver: "Silver",
  gold: "Gold",
  platinum: "Platinum",
};

export function presentTier(tier: string) {
  return TIER_LABELS[tier.toLowerCase()] ?? tier;
}
