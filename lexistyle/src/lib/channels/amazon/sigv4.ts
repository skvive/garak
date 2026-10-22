import { createHash, createHmac } from "crypto";
import { AMAZON_AU_SIGV4_REGION, AMAZON_AU_SP_API_HOST } from "./constants";

function hmac(key: string | Buffer, data: string): Buffer {
  return createHmac("sha256", key).update(data, "utf8").digest();
}

function sha256Hex(data: string): string {
  return createHash("sha256").update(data, "utf8").digest("hex");
}

function rfc3986(s: string): string {
  return encodeURIComponent(s).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

/** AWS SigV4 for SP-API execute-api */
export function signSpApiHeaders(opts: {
  method: string;
  path: string;
  query: string;
  body: string;
  accessToken: string;
  accessKey: string;
  secretKey: string;
  region?: string;
}): Record<string, string> {
  const region = opts.region ?? AMAZON_AU_SIGV4_REGION;
  const service = "execute-api";
  const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = sha256Hex(opts.body);
  const headers: Record<string, string> = {
    host: AMAZON_AU_SP_API_HOST,
    "x-amz-date": amzDate,
    "x-amz-access-token": opts.accessToken,
    "content-type": "application/json",
    "user-agent": "LEXI-HQ/amazon-au",
  };
  const signedNames = Object.keys(headers)
    .map((k) => k.toLowerCase())
    .sort();
  const canonicalHeaders = signedNames.map((n) => `${n}:${headers[n]!.trim()}\n`).join("");
  const signedHeaders = signedNames.join(";");
  const canonicalQuery = opts.query
    ? [...new URLSearchParams(opts.query).entries()]
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([k, v]) => `${rfc3986(k)}=${rfc3986(v)}`)
        .join("&")
    : "";
  const canonicalRequest = [
    opts.method.toUpperCase(),
    opts.path.startsWith("/") ? opts.path : `/${opts.path}`,
    canonicalQuery,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");
  const scope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, scope, sha256Hex(canonicalRequest)].join("\n");
  const kDate = hmac(`AWS4${opts.secretKey}`, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  const kSigning = hmac(kService, "aws4_request");
  const signature = hmac(kSigning, stringToSign).toString("hex");
  return {
    ...headers,
    Authorization: `AWS4-HMAC-SHA256 Credential=${opts.accessKey}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
  };
}
