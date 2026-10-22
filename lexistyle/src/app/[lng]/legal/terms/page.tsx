import Link from "next/link";
import { BusinessInfoList } from "@/components/legal/business-info-list";

export const metadata = {
  title: "이용약관",
  description: "LEXI(렉시스타일) 이용약관 — 회원, 주문·결제, 해외 직배송·통관, 청약철회·반품·환불 안내.",
};

/**
 * 이용약관 — /legal/terms
 * 공정거래위원회 전자상거래(인터넷사이버몰) 표준약관 구조를 따르고, 해외 직배송 상품 특성을 반영했다.
 * 사업자 정보는 src/lib/legal/business-info.ts 단일 정본에서 읽는다.
 */

const UPDATED = "2026-10-13";

const Article = ({ n, title, children }: { n: number; title: string; children: React.ReactNode }) => (
  <section className="mt-8">
    <h2 className="text-[16px] font-bold text-ink">
      제{n}조 ({title})
    </h2>
    <div className="mt-2 space-y-2 text-[13px] leading-relaxed text-dim">{children}</div>
  </section>
);

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="font-display text-[30px] font-semibold">이용약관</h1>
      <p className="mt-1 text-[12px] text-dim">시행일 · 최종 개정일: {UPDATED}</p>

      <Article n={1} title="목적">
        <p>
          이 약관은 LEXI(이하 &ldquo;회사&rdquo;)가 운영하는 온라인 쇼핑몰(이하 &ldquo;몰&rdquo;)에서 제공하는 전자상거래 관련
          서비스를 이용할 때 회사와 이용자의 권리·의무 및 책임사항을 정하는 것을 목적으로 합니다.
        </p>
      </Article>

      <Article n={2} title="정의">
        <ul className="ml-4 list-disc space-y-1">
          <li>&ldquo;이용자&rdquo;란 몰에 접속하여 이 약관에 따라 서비스를 이용하는 회원 및 비회원을 말합니다.</li>
          <li>&ldquo;회원&rdquo;이란 몰에 개인정보를 제공하여 회원 등록을 한 자를 말합니다.</li>
          <li>
            &ldquo;해외 직배송 상품&rdquo;이란 해외 공급처에서 이용자에게 직접 국제 배송되는 상품으로, 몰에서 판매되는
            상품은 원칙적으로 해외 직배송 상품입니다.
          </li>
        </ul>
      </Article>

      <Article n={3} title="약관의 명시와 개정">
        <p>회사는 이 약관의 내용과 사업자 정보를 이용자가 쉽게 알 수 있도록 몰 화면에 게시합니다.</p>
        <p>
          회사는 관련 법령을 위배하지 않는 범위에서 약관을 개정할 수 있으며, 개정 시 적용일자와 개정 사유를 명시하여 적용일
          7일 전(이용자에게 불리한 변경은 30일 전)부터 공지합니다.
        </p>
      </Article>

      <Article n={4} title="회원가입 및 탈퇴">
        <p>이용자는 회사가 정한 절차에 따라 회원정보를 기입하고 이 약관에 동의하여 회원가입을 신청합니다.</p>
        <p>회원은 언제든지 탈퇴를 요청할 수 있으며 회사는 즉시 처리합니다.</p>
      </Article>

      <Article n={5} title="구매신청 및 계약의 성립">
        <p>
          이용자는 상품 선택, 옵션(색상·사이즈 등) 선택, 배송지·연락처 입력, 결제수단 선택의 절차로 구매를 신청합니다. 한국으로
          배송받는 경우 통관을 위해 수취인 실명과 개인통관고유부호를 입력해야 합니다.
        </p>
        <p>
          회사의 주문 확인 통지가 이용자에게 도달한 시점에 계약이 성립합니다. 해외 공급처의 재고 소진 등으로 상품을 공급할 수 없는
          경우 회사는 지체 없이 알리고, 결제 대금은 3영업일 이내에 환급하거나 환급에 필요한 조치를 합니다.
        </p>
      </Article>

      <Article n={6} title="가격 및 결제">
        <p>
          몰에 표시된 가격은 상품 대금을 기준으로 하며, 국가별 관부가세 및 국제 배송비는 상품 상세의 계산기와 주문 단계에서
          안내합니다. 결제 전 최종 결제 금액을 확인할 수 있습니다.
        </p>
      </Article>

      <Article n={7} title="배송">
        <p>
          해외 직배송 상품은 주문 확인 후 해외 현지에서 발송되며 통상 7~14일이 소요됩니다. 현지 출고 사정, 항공편, 통관 지연 등에
          따라 배송이 늦어질 수 있으며 회사는 지연 사실과 사유를 이용자에게 알립니다.
        </p>
      </Article>

      <Article n={8} title="청약철회 등">
        <p>
          이용자는 상품을 받은 날부터 7일 이내에 청약철회(반품)를 할 수 있습니다. 다만 다음의 경우에는 청약철회가 제한될 수
          있습니다.
        </p>
        <ul className="ml-4 list-disc space-y-1">
          <li>이용자의 책임 있는 사유로 상품이 멸실되거나 훼손된 경우(내용 확인을 위한 포장 훼손은 제외)</li>
          <li>이용자의 사용 또는 일부 소비로 상품의 가치가 현저히 감소한 경우</li>
          <li>시간 경과로 재판매가 곤란할 정도로 상품의 가치가 현저히 감소한 경우</li>
        </ul>
        <p>
          상품의 내용이 표시·광고와 다르거나 계약 내용과 다르게 이행된 경우에는 상품을 받은 날부터 3개월 이내, 그 사실을 안 날
          또는 알 수 있었던 날부터 30일 이내에 청약철회를 할 수 있으며, 이때 반품 비용은 회사가 부담합니다.
        </p>
      </Article>

      <Article n={9} title="반품 비용 및 환급">
        <p>
          단순 변심에 의한 반품의 경우 반품에 필요한 비용(국제 반송비 등)은 이용자가 부담하며, 반품 접수 전 예상 비용을
          안내합니다. 회사는 반품 상품을 돌려받은 날부터 3영업일 이내에 결제 대금을 환급합니다.
        </p>
      </Article>

      <Article n={10} title="개인정보 보호">
        <p>
          회사는 이용자의 개인정보를 관련 법령과 <Link href="/legal/privacy" className="underline">개인정보처리방침</Link>에
          따라 보호합니다.
        </p>
      </Article>

      <Article n={11} title="분쟁 해결">
        <p>
          회사는 이용자의 불만과 피해 구제 요청을 우선적으로 처리하며, 분쟁이 해결되지 않는 경우 이용자는 한국소비자원 또는
          전자거래분쟁조정위원회에 조정을 신청할 수 있습니다. 회사와 이용자 간 소송은 민사소송법상 관할 법원에 제기합니다.
        </p>
      </Article>

      <section className="mt-10 border-t border-line pt-6">
        <h2 className="text-[15px] font-bold text-ink">사업자 정보</h2>
        <div className="mt-2 text-[13px] leading-relaxed text-dim">
          <BusinessInfoList />
        </div>
      </section>

      <p className="mt-10 text-[12px] text-dim">
        관련 문서: <Link href="/legal/privacy" className="underline">개인정보처리방침</Link> ·{" "}
        <Link href="/support" className="underline">고객센터</Link>
      </p>
    </div>
  );
}
