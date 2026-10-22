import { getAccount, PLANS } from "@/lib/shorts/service";
import { fail, json, sessionEmail } from "@/lib/shorts/http";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const email = await sessionEmail();
    if (!email) return json({ signedIn: false, plans: PLANS });
    const account = await getAccount(email);
    return json({ signedIn: true, ...account, plans: PLANS });
  } catch (e) {
    return fail(e);
  }
}
