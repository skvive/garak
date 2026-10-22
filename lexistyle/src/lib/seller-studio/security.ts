import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from "node:crypto";
import { StudioError } from "./domain";
import { shopeeHost, shopeePartnerId } from "../channels/shopee/constants";

function encryptionKey() {
  const raw = process.env.SELLER_STUDIO_ENCRYPTION_KEY || "";
  if (!/^[a-f0-9]{64}$/i.test(raw)) throw new StudioError("SELLER_STUDIO_ENCRYPTION_KEY에 32바이트 hex 키를 설정하세요.", 503);
  return Buffer.from(raw, "hex");
}
export function sealTokens(tokens: { accessToken: string; refreshToken: string }, owner: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  cipher.setAAD(Buffer.from(owner));
  const data = Buffer.concat([cipher.update(JSON.stringify(tokens)), cipher.final()]);
  return [iv, cipher.getAuthTag(), data].map(b => b.toString("base64url")).join(".");
}
export function openTokens(sealed: string, owner: string): { accessToken: string; refreshToken: string } {
  const parts = sealed.split(".").map(p => Buffer.from(p, "base64url"));
  if (parts.length !== 3) throw new StudioError("상점 인증 정보를 다시 연결하세요.", 409);
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), parts[0]);
  decipher.setAAD(Buffer.from(owner));
  decipher.setAuthTag(parts[1]);
  return JSON.parse(Buffer.concat([decipher.update(parts[2]), decipher.final()]).toString("utf8"));
}
export function appConfig() {
  const partnerId = shopeePartnerId();
  const partnerKey = process.env.SHOPEE_PARTNER_KEY?.trim();
  if (!partnerId || !partnerKey) throw new StudioError("Shopee 개발자 승인 후 Partner ID와 Partner Key를 설정하세요.", 503);
  encryptionKey();
  return { partnerId, partnerKey, host: shopeeHost() };
}
export function appReady() { try { appConfig(); return true; } catch { return false; } }
export function signedPartnerUrl(path: string) {
  const config = appConfig();
  const timestamp = String(Math.floor(Date.now() / 1000));
  const sign = createHmac("sha256", config.partnerKey).update(config.partnerId + path + timestamp).digest("hex");
  return new URL(`${config.host}${path}?${new URLSearchParams({ partner_id: config.partnerId, timestamp, sign })}`);
}
export function nonceHash(value: string) { return createHash("sha256").update(value).digest("hex"); }
export function consumeOauth(w: { oauth?: { hash: string; expires: number } }, nonce: string) {
  if (!nonce || !w.oauth || w.oauth.expires < Date.now() || w.oauth.hash !== nonceHash(nonce)) throw new StudioError("상점 연결 요청이 만료되었거나 일치하지 않습니다. 연결을 다시 시작하세요.", 403);
  delete w.oauth;
}
export function checkMutationOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin || origin !== new URL(req.url).origin || req.headers.get("sec-fetch-site") === "cross-site") throw new StudioError("동일한 사이트에서만 변경할 수 있습니다.", 403);
}
