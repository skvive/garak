// filepath: src/components/admin/shopify-panel.tsx
"use client";

import { useEffect, useState } from "react";

type Status = {
  configured: boolean;
  storeDomain: string | null;
  authMode: "legacy_token" | "client_credentials" | "none";
  apiVersion: string;
  currency: string;
};

export function ShopifyPanel() {
  const [status, setStatus] = useState<Status | null>(null);

  async function load() {
    const res = await fetch("/api/shopify/status");
    setStatus(await res.json());
  }

  useEffect(() => {
    void load();
  }, []);

  if (!status) return <p className="text-[13px] text-dim">Shopify 상태 확인 중…</p>;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-line p-4 text-[13px]">
        <p className="font-bold">Shopify</p>
        <ul className="mt-2 space-y-1 text-dim">
          <li>
            status:{" "}
            <span className={status.configured ? "font-bold text-sage" : "text-coral"}>
              {status.configured ? "✓ 연결됨" : "미연결"}
            </span>
          </li>
          <li>store: {status.storeDomain || "—"}</li>
          <li>auth: {status.authMode}</li>
          <li>api: {status.apiVersion}</li>
          <li>currency: {status.currency}</li>
        </ul>
        {!status.configured && (
          <p className="mt-2 text-[12px] text-coral">
            SHOPIFY_STORE_DOMAIN + (SHOPIFY_ACCESS_TOKEN 또는 SHOPIFY_CLIENT_ID·SECRET) 설정 필요
          </p>
        )}
      </div>

      <div className="rounded-2xl border border-line p-4">
        <p className="text-[13px] font-bold">Shopify 스토어 연동</p>
        <p className="mt-1 text-[12px] text-dim">
          {status.configured
            ? "연결됨 — Admin API로 상품이 자동 송출됩니다."
            : "Shopify Admin에서 앱을 생성하고 API 자격증명을 환경변수에 설정하세요."}
        </p>
        <a
          href="https://shopify.dev/docs/apps/build/authentication-selling-apps"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-block rounded-xl bg-ink px-4 py-3 text-[13px] font-bold text-white"
        >
          Shopify 앱 생성 가이드 →
        </a>
      </div>
    </div>
  );
}
