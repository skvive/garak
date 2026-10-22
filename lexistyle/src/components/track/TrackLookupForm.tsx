"use client";

import Link from "next/link";
import { useActionState } from "react";
import { lookupTrackAction, type LookupState } from "@/app/[lng]/track/actions";

const field = "mt-1 w-full rounded-2xl border border-line bg-paper px-4 py-3 text-[14px] text-ink outline-none focus:border-ink";

export function TrackLookupForm() {
  const [state, action, pending] = useActionState<LookupState, FormData>(lookupTrackAction, null);
  return (
    <form action={action} className="mt-6 space-y-4 rounded-3xl border border-line bg-paper p-5 sm:p-6">
      <label className="block text-[13px] font-semibold text-ink">
        주문번호
        <input name="orderNo" required maxLength={40} autoComplete="off" placeholder="쿠팡 주문번호 등" className={field} />
      </label>
      <label className="block text-[13px] font-semibold text-ink">
        받는 분 성함
        <input name="name" required maxLength={40} autoComplete="off" className={field} />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-ink px-5 py-3 text-[14px] font-bold text-white disabled:opacity-60"
      >
        {pending ? "조회 중" : "배송 조회"}
      </button>
      {state?.error && <p role="alert" className="rounded-2xl bg-fog p-4 text-[13px] leading-6 text-ink">{state.error}</p>}
      {state?.matches && (
        <ul className="space-y-2">
          {state.matches.map((m) => (
            <li key={m.href}>
              <Link href={m.href} className="block rounded-2xl bg-fog p-4 text-[14px] font-semibold leading-6 text-ink hover:underline">
                {m.title}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}
