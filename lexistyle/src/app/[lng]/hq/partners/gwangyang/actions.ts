"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { sql } from "drizzle-orm";
import { requireVerifiedNeonAdmin } from "@/lib/auth/admin";
import { db, hasDb } from "@/db";

const MERCHANT_TYPES = [
  "business_registration",
  "signed_merchant_contract",
  "photo_usage_rights",
  "cold_chain_plan",
  "shipping_fee_policy",
  "returns_refund_policy",
  "pg_settlement_reconciliation",
  "pg_refund_rehearsal",
] as const;
const PRODUCT_TYPES = [
  "product_real_photo",
  "product_origin_weight",
  "product_price_agreement",
  "product_stock_confirmation",
] as const;

export async function submitGwangyangEvidence(form: FormData): Promise<void> {
  const session = await requireVerifiedNeonAdmin();
  const email = session?.user?.email?.trim();
  if (!email || !hasDb()) redirect("/auth/sign-in?next=/hq/partners/gwangyang");

  const type = String(form.get("evidenceType") ?? "");
  const sku = String(form.get("sku") ?? "").trim().toUpperCase();
  const rawUrl = String(form.get("sourceUrl") ?? "").trim();
  const details = String(form.get("details") ?? "").trim();

  if (details.length > 1000 || rawUrl.length > 1000) {
    redirect("/hq/partners/gwangyang?evidence=invalid");
  }
  const productType = PRODUCT_TYPES.some((t) => t === type);
  const merchantType = MERCHANT_TYPES.some((t) => t === type);
  if (!productType && !merchantType) redirect("/hq/partners/gwangyang?evidence=invalid");
  if (productType !== /^GYS-0(?:1[1-9]|2[0-9]|3[0-9]|4[0-7])$/.test(sku)) {
    redirect("/hq/partners/gwangyang?evidence=invalid");
  }
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    redirect("/hq/partners/gwangyang?evidence=invalid");
  }
  // Only authenticated Google Drive documents can act as a review reference.
  // The record is never itself proof of rights or legal agreement.
  if (url.protocol !== "https:" || !["drive.google.com", "docs.google.com"].includes(url.hostname)) {
    redirect("/hq/partners/gwangyang?evidence=invalid");
  }

  if (productType) {
    const validSku = await db().execute(sql`
      SELECT 1 FROM public.garak_partner_products
      WHERE sku = ${sku} AND merchant_slug = 'gwangyang-fisheries'
      LIMIT 1
    `);
    if (validSku.rows.length !== 1) redirect("/hq/partners/gwangyang?evidence=invalid");
  }

  await db().execute(sql`
    INSERT INTO public.garak_partner_evidence
      (merchant_slug, sku, evidence_type, evidence_url, details, submitted_by)
    VALUES ('gwangyang-fisheries', ${productType ? sku : null},
            ${type}, ${url.toString()}, ${details}, ${email})
  `);
  // New evidence is always 'submitted'. A separate independent reviewer is
  // required by the database constraint before it can become verified.
  revalidatePath("/hq/partners/gwangyang");
  redirect("/hq/partners/gwangyang?evidence=submitted");
}

/**
 * Independent manual review. The submitter cannot verify their own evidence.
 * Approval is a claim made by another authenticated admin after document
 * inspection, NOT an automatic conversion from submitted to verified.
 */
export async function reviewGwangyangEvidence(form: FormData): Promise<void> {
  const session = await requireVerifiedNeonAdmin();
  const email = session?.user?.email?.trim();
  if (!email || !hasDb()) redirect("/auth/sign-in?next=/hq/partners/gwangyang");
  const id = Number(form.get("evidenceId"));
  const decision = String(form.get("decision") ?? "");
  const reviewNote = String(form.get("reviewNote") ?? "").trim();
  const acknowledged = String(form.get("acknowledged") ?? "") === "yes";
  if (!Number.isSafeInteger(id) || id <= 0 || !["verified", "rejected"].includes(decision) ||
      reviewNote.length < 10 || reviewNote.length > 600 || !acknowledged) {
    redirect("/hq/partners/gwangyang?review=invalid");
  }

  const result = await db().execute(sql`
    UPDATE public.garak_partner_evidence
      SET status = ${decision}, reviewed_by = ${email},
          reviewed_at = NOW(), review_note = ${reviewNote}
    WHERE id = ${id}
      AND merchant_slug = 'gwangyang-fisheries'
      AND status = 'submitted'
      AND lower(submitted_by) <> lower(${email})
    RETURNING id
  `);
  if (result.rows.length !== 1) redirect("/hq/partners/gwangyang?review=blocked");
  revalidatePath("/hq/partners/gwangyang");
  redirect("/hq/partners/gwangyang?review=recorded");
}
