// filepath: src/lib/auth/server.ts
import { createNeonAuth } from "@neondatabase/auth/next/server";

/**
 * Neon Auth 미설정 환경(로컬/데모 빌드)에서도 빌드·기동이 가능하도록
 * 폴백 시크릿을 사용한다. 실서비스에서는 반드시 env를 설정할 것.
 */
export const authConfigured = Boolean(
  process.env.NEON_AUTH_BASE_URL && process.env.NEON_AUTH_COOKIE_SECRET,
);

export const auth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL || "https://auth.placeholder.invalid",
  cookies: {
    secret: process.env.NEON_AUTH_COOKIE_SECRET || "dev-insecure-secret-do-not-use-in-prod",
  },
});
