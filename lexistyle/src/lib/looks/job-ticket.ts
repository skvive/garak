import { createHmac, timingSafeEqual } from "node:crypto";
import { wanApiKey } from "@/lib/wan/config";

type Ticket = { id: string; owner: string; exp: number };
const secret = () => {
  const value = process.env.LOOKS_SIGNING_SECRET || wanApiKey();
  if (!value) throw new Error("피팅 서비스 연결이 필요합니다.");
  return value;
};
export function signJob(ticket: Ticket) {
  const payload = Buffer.from(JSON.stringify(ticket)).toString("base64url");
  return `${payload}.${createHmac("sha256", secret()).update(`looks-v1:${payload}`).digest("base64url")}`;
}
export function verifyJob(token: string, owner: string): Ticket {
  if (token.length > 2048) throw new Error("작업 인증이 만료되었습니다.");
  const [payload, signature] = token.split(".");
  const expected = createHmac("sha256", secret()).update(`looks-v1:${payload}`).digest();
  const supplied = Buffer.from(signature || "", "base64url");
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) throw new Error("작업 인증이 만료되었습니다.");
  const ticket = JSON.parse(Buffer.from(payload, "base64url").toString()) as Ticket;
  if (ticket.owner !== owner || ticket.exp < Date.now() || !/^[a-zA-Z0-9-]+$/.test(ticket.id)) throw new Error("작업 인증이 만료되었습니다.");
  return ticket;
}
