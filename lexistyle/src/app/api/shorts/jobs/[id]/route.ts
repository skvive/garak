import { getJob } from "@/lib/shorts/service";
import { fail, json, sessionEmail } from "@/lib/shorts/http";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const email = await sessionEmail();
  if (!email) return json({ error: "로그인이 필요합니다." }, 401);
  try {
    const { id } = await params;
    const job = await getJob(Number(id));
    if (!job || job.ownerEmail !== email) return json({ error: "영상을 찾을 수 없습니다." }, 404);
    return json({ job });
  } catch (e) {
    return fail(e);
  }
}
