import Link from "next/link";
import { BusinessInfoList } from "@/components/legal/business-info-list";

export const metadata = {
  title: "개인정보처리방침",
  description: "LEXI(렉시스타일) 개인정보처리방침 — 수집 항목, 이용 목적, 보관·파기, 제3자 제공, 이용자 권리 안내.",
};

/**
 * 개인정보처리방침 — /legal/privacy
 * 사업자 정보는 src/lib/legal/business-info.ts (NEXT_PUBLIC_BIZ_* 환경변수) 단일 정본에서 읽는다.
 */

const UPDATED = "2026-07-22";

const Section = ({ n, title, children }: { n: string; title: string; children: React.ReactNode }) => (
  <section className="mt-8">
    <h2 className="text-[16px] font-bold text-ink">
      {n}. {title}
    </h2>
    <div className="mt-2 space-y-2 text-[13px] leading-relaxed text-dim">{children}</div>
  </section>
);

export default function PrivacyPolicyPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="font-display text-[30px] font-semibold">개인정보처리방침</h1>
      <p className="mt-2 text-[13px] text-dim">
        LEXI(이하 &ldquo;회사&rdquo;)는 「개인정보 보호법」 등 관련 법령을 준수하며, 이용자의 개인정보를 소중히
        보호합니다. 본 방침은 회사가 운영하는 LEXI 서비스(웹/앱)에 적용됩니다.
      </p>
      <p className="mt-1 text-[12px] text-dim">시행일 · 최종 개정일: {UPDATED}</p>

      <Section n="1" title="수집하는 개인정보 항목">
        <p>회사는 회원가입, 주문·결제, 고객문의, 서비스 이용 과정에서 아래 정보를 수집합니다.</p>
        <ul className="ml-4 list-disc space-y-1">
          <li>회원가입·인증: 이메일, 이름, 비밀번호(또는 소셜 로그인 식별자), 휴대전화번호</li>
          <li>주문·배송: 받는 사람 이름·연락처·주소, 이메일, 개인통관고유부호(한국 배송 시)</li>
          <li>결제: 결제수단 정보, 결제 승인 내역(카드사·PG사를 통해 처리, 회사는 카드번호를 저장하지 않음)</li>
          <li>자동 수집: 접속 IP, 쿠키, 기기·브라우저 정보, 서비스 이용 기록</li>
        </ul>
      </Section>

      <Section n="2" title="개인정보의 수집 및 이용 목적">
        <ul className="ml-4 list-disc space-y-1">
          <li>회원 식별·인증 및 회원제 서비스 제공</li>
          <li>상품 주문·결제·배송 및 통관(해외 배송 포함) 처리</li>
          <li>고객 문의 응대, 분쟁 처리, 공지사항 전달</li>
          <li>부정 이용 방지, 서비스 개선 및 통계 분석</li>
          <li>(동의 시) 이벤트·혜택 등 마케팅 정보 제공</li>
        </ul>
      </Section>

      <Section n="3" title="개인정보의 보유 및 이용 기간">
        <p>원칙적으로 수집·이용 목적이 달성되면 지체 없이 파기합니다. 단, 관계 법령에 따라 아래 기간 동안 보관합니다.</p>
        <ul className="ml-4 list-disc space-y-1">
          <li>계약·청약철회 등에 관한 기록: 5년 (전자상거래법)</li>
          <li>대금 결제·재화 공급에 관한 기록: 5년 (전자상거래법)</li>
          <li>소비자 불만·분쟁 처리 기록: 3년 (전자상거래법)</li>
          <li>표시·광고에 관한 기록: 6개월 (전자상거래법)</li>
          <li>접속 로그·접속지 추적 기록: 3개월 (통신비밀보호법)</li>
        </ul>
      </Section>

      <Section n="4" title="개인정보의 제3자 제공">
        <p>
          회사는 이용자의 개인정보를 원칙적으로 외부에 제공하지 않습니다. 다만 주문 이행을 위해 아래와 같이 필요한
          범위 내에서 제공하며, 법령에 근거가 있거나 수사기관의 적법한 요청이 있는 경우 예외로 합니다.
        </p>
        <ul className="ml-4 list-disc space-y-1">
          <li>배송사·통관 대행사: 배송·통관에 필요한 수취인 정보(이름·연락처·주소·개인통관고유부호)</li>
          <li>제휴 판매 채널(예: Linkr 등)로부터 유입된 주문의 경우, 주문 이행에 필요한 최소 정보 연동</li>
        </ul>
      </Section>

      <Section n="5" title="개인정보 처리의 위탁">
        <p>회사는 원활한 서비스 제공을 위해 아래 업무를 외부에 위탁할 수 있으며, 위탁 시 관련 법령에 따라 안전하게 관리합니다.</p>
        <ul className="ml-4 list-disc space-y-1">
          <li>결제 처리: 결제대행(PG)사</li>
          <li>배송·물류: 국내외 배송 및 통관 대행사</li>
          <li>클라우드 인프라·문자/이메일 발송 등 IT 운영 수탁사</li>
        </ul>
      </Section>

      <Section n="6" title="이용자 및 법정대리인의 권리와 행사 방법">
        <p>
          이용자는 언제든지 자신의 개인정보에 대한 열람·정정·삭제·처리정지 및 동의 철회를 요청할 수 있습니다. 마이페이지
          또는 개인정보 보호책임자에게 연락하시면 지체 없이 조치합니다. 만 14세 미만 아동의 개인정보는 법정대리인의
          동의를 받아 처리합니다.
        </p>
      </Section>

      <Section n="7" title="개인정보의 파기 절차 및 방법">
        <p>
          보유 기간이 경과하거나 처리 목적이 달성된 개인정보는 지체 없이 파기합니다. 전자적 파일은 복구 불가능한 방법으로
          영구 삭제하고, 출력물은 분쇄 또는 소각합니다.
        </p>
      </Section>

      <Section n="8" title="쿠키의 운영">
        <p>
          회사는 맞춤형 서비스 제공을 위해 쿠키를 사용합니다. 이용자는 브라우저 설정에서 쿠키 저장을 거부할 수 있으나,
          이 경우 로그인 등 일부 서비스 이용이 제한될 수 있습니다.
        </p>
      </Section>

      <Section n="9" title="개인정보의 안전성 확보 조치">
        <ul className="ml-4 list-disc space-y-1">
          <li>비밀번호 등 중요 정보의 암호화 저장 및 전송 구간 암호화(HTTPS)</li>
          <li>접근 권한 관리 및 접근 통제, 접속 기록 보관</li>
          <li>내부 관리계획 수립 및 정기 점검</li>
        </ul>
      </Section>

      <Section n="10" title="개인정보 보호책임자">
        <p>개인정보 처리에 관한 문의·불만·피해 구제는 아래로 연락해 주시면 신속히 답변드립니다.</p>
        <BusinessInfoList extra={[["개인정보 보호책임자", "privacyOfficer"]]} />
        <p className="mt-2">
          기타 개인정보 침해 신고·상담은 개인정보분쟁조정위원회(1833-6972), 개인정보침해신고센터(118),
          대검찰청 사이버수사과(1301), 경찰청 사이버수사국(182)으로 문의하실 수 있습니다.
        </p>
      </Section>

      <Section n="11" title="고지의 의무">
        <p>
          본 방침은 시행일로부터 적용되며, 법령·정책 변경에 따라 개정될 경우 시행 최소 7일 전 서비스 공지사항을 통해
          고지합니다.
        </p>
      </Section>

      <p className="mt-10 text-[12px] text-dim">
        관련 문서: <Link href="/legal/terms" className="underline">이용약관</Link> ·{" "}
        <Link href="/support" className="underline">고객센터</Link>
      </p>
    </div>
  );
}
