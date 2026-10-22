import { DataModeSwitch } from "@/components/data-mode-switch";
import { hasDb, isLocalDb } from "@/db";

export const dynamic = "force-dynamic";
export const metadata = { title: "HQ · 시스템" };

export default function HqSystemPage() {
  const dbLabel = !hasDb() ? "local-file (~/.lexi-local)" : isLocalDb() ? "local-postgres" : "neon";
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-[24px] font-semibold">시스템</h1>
        <p className="mt-1 text-[13px] text-dim">Data Mode · 환경 · 워커</p>
      </div>
      <div className="rounded-2xl border border-line bg-paper p-4">
        <p className="text-[12px] font-bold text-dim">DB</p>
        <p className="mt-1 text-[15px] font-semibold">{dbLabel}</p>
        <ul className="mt-3 space-y-1 text-[12px] text-dim">
          <li>CJ_API_KEY: {process.env.CJ_API_KEY ? "설정" : "없음(fixture)"}</li>
          <li>GEMINI_API_KEY: {process.env.GEMINI_API_KEY ? "설정" : "없음(템플릿)"}</li>
          <li>BLOB: {process.env.BLOB_READ_WRITE_TOKEN ? "설정" : "로컬 미디어"}</li>
          <li>CRON_SECRET: {process.env.CRON_SECRET ? "설정" : "없음"}</li>
          <li>HQ_ALLOW_ANON: {process.env.HQ_ALLOW_ANON === "1" ? "1" : "off"}</li>
        </ul>
      </div>
      <div className="rounded-2xl border border-line bg-paper p-4">
        <p className="mb-3 text-[12px] font-bold text-dim">Dummy / Real</p>
        <DataModeSwitch />
      </div>
      <p className="text-[12px] text-dim">
        Cron: <code>/api/cron/catalog-crawl</code>, <code>/api/cron/publish-worker</code> · 문서{" "}
        <code>docs/lexi-hq-dashboard.md</code>
      </p>
    </div>
  );
}
