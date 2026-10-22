import type { Metadata, Viewport } from "next";
import "../globals.css";
import { SiteHeader } from "@/components/site-header";
import { ChromeGate } from "@/components/chrome-gate";
import { BottomTabBar } from "@/components/bottom-tab-bar";
import { SiteFooter } from "@/components/site-footer";
import { AuthProvider } from "@/components/auth-provider";
import { defaultSiteOgImage } from "@/lib/seo/og";
import { siteUrl } from "@/lib/site-url";
import { I18nProvider } from "../i18n-provider"; // Import the new provider

const OG = defaultSiteOgImage();

export const metadata: Metadata = {
  title: { default: "가락한상 — 가락시장의 신선함을 집 앞까지", template: "%s | 가락한상" },
  description:
    "가락시장 수산·축산·청과를 한 상에 담아 반경 10km 당일 배송. 당일 경매 시세와 살수율 등급을 투명하게 공개합니다.",
  metadataBase: new URL(siteUrl()),
  openGraph: {
    siteName: "가락한상",
    type: "website",
    title: "가락한상 — 가락시장의 신선함을 집 앞까지",
    description: "식탁 위 완벽한 수산 한 상 · 가락한상",
    url: siteUrl(),
    images: [{ url: OG, width: 1200, height: 630, alt: "가락한상" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "가락한상 — 가락시장의 신선함을 집 앞까지",
    description: "식탁 위 완벽한 수산 한 상 · 가락한상",
    images: [OG],
  },
};

export const viewport: Viewport = {
  themeColor: "#0e5c8c",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
  params,
}: { children: React.ReactNode; params: Promise<{ lng: string }> }) {
  const { lng } = await params;
  return (
    <html lang={lng} suppressHydrationWarning>
      <head>
        <meta name="naver-site-verification" content="c597983cd76eac883d1a652104eef17bccf19c9b" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body className="min-h-dvh pb-16 md:pb-0">
        <I18nProvider lng={lng}>
          <AuthProvider>
            <ChromeGate><SiteHeader /></ChromeGate>
            <main>{children}</main>
            <ChromeGate>
              <SiteFooter />
              <BottomTabBar />
            </ChromeGate>
          </AuthProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
