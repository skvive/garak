/** Reusable CommerceShorts input preflight. No fetching or posting. */
import { isIP } from 'node:net';
const INTERNAL_HOST = /(^localhost$|\.localhost$|\.local$|\.internal$)/i;
function publicHttpsUrl(value) {
  try {
    const u = new URL(value);
    const host = u.hostname.replace(/^\[|\]$/g, '');
    return u.protocol === 'https:' && !u.username && !u.password && !isIP(host) && !INTERNAL_HOST.test(host); 
  } catch { return false; }
}
export function inspectShortsJob(job, { strictRights = false } = {}) {
  const issues = [];
  if (!job || typeof job !== 'object') return { ok: false, issues: ['missing job'] };
  if (typeof job.id !== 'string' && typeof job.id !== 'number') issues.push('job id required');
  if (!Array.isArray(job.script?.scenes) || job.script.scenes.length === 0) issues.push('scenes required');
  if (typeof job.script?.hookText !== 'string' || !job.script.hookText.trim()) issues.push('hook required');
  if (typeof job.script?.cta !== 'string' || !job.script.cta.trim()) issues.push('CTA required');
  if (!Array.isArray(job.product?.imageUrls) || !job.product.imageUrls.length) issues.push('images required');
  else {
    for (const [i, url] of job.product.imageUrls.entries()) if (!publicHttpsUrl(url)) issues.push(`invalid public HTTPS image ${i}`);
  }
  if (Array.isArray(job.script?.scenes)) {
    for (const [i, s] of job.script.scenes.entries()) {
      if (!s || typeof s !== 'object' || typeof s.overlayText !== 'string' || !s.overlayText.trim() || !Number.isInteger(s.duration) || s.duration < 1 || !Number.isInteger(s.imageIndex) || s.imageIndex < 0 || s.imageIndex >= (job.product?.imageUrls?.length ?? 0)) issues.push(`invalid scene ${i}`);
    }
  }
  if (strictRights && job.mediaRightsApproved !== true) issues.push('media rights approval required');
  if (job.mediaRightsApproved === false) issues.push('media rights explicitly denied');
  if (job.strategy === 'wan_i2v' && job.wanVideoUrl && !publicHttpsUrl(job.wanVideoUrl)) issues.push('invalid video URL');
  return { ok: issues.length === 0, issues };
}
export function assertShortsJob(job, options) {
  const result = inspectShortsJob(job, options);
  if (!result.ok) throw new Error(`Shorts preflight blocked: ${result.issues.join('; ')}`);
  return job;
}
