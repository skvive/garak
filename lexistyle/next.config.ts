import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "cf.cjdropshipping.com" },
      { protocol: "https", hostname: "oss-cf.cjdropshipping.com" },
      { protocol: "https", hostname: "**.cjdropshipping.com" },
    ],
  },
  // 어드민·스튜디오 클라이언트는 locale 없이 /api/hq/** 를 호출하지만 라우트는 [lng]/api/** 아래에 있다.
  // (src/app/api 에 실제 파일이 있는 amba·studio assets/generate 는 제외)
  async rewrites() {
    return {
      beforeFiles: [
        { source: "/api/hq/:path((?!amba/).*)", destination: "/ko/api/hq/:path" },
        { source: "/api/admin/:path*", destination: "/ko/api/admin/:path*" },
        { source: "/api/studio/:path((?!assets|generate).*)", destination: "/ko/api/studio/:path" },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
  async redirects() {
    return [
      {
        source: "/comfy-pdp-demo",
        destination: "/comfy-pdp-demo/index.html",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
