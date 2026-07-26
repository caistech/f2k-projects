import { createSupabaseService } from "@/lib/supabase-service";
import { escapeHtml } from "@/lib/html-escape";
import { verifyStatusAckToken } from "@/lib/estates/status-ack";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * The agent's "I've told my clients" confirmation, linked from an estate status-change email.
 *
 * Two steps on purpose. Mail clients, link scanners and security gateways pre-fetch every URL in an
 * email, so a bare GET that wrote the acknowledgement would stamp "this agent has informed their
 * buyers" purely because Outlook checked the link — recording, as fact, the one thing nobody can
 * verify from inside this system. So GET only renders a confirm page, and the POST behind its
 * button does the write (the same reasoning as RFC 8058 one-click unsubscribe, applied to a claim
 * that matters more).
 *
 * No login: the signed token is the authorisation, and the only thing it can do is mark one
 * notification acknowledged.
 */

function page(title: string, body: string, action?: { token: string; label: string }): Response {
  const form = action
    ? `<form method="post" action="/api/estates/status-ack">
         <input type="hidden" name="t" value="${escapeHtml(action.token)}" />
         <button type="submit" style="display:inline-block;min-height:44px;background:#1B4332;color:#fff;border:0;border-radius:8px;font-size:16px;font-weight:600;padding:12px 22px;cursor:pointer;">${escapeHtml(
           action.label,
         )}</button>
       </form>`
    : "";
  return new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(title)}</title></head>
<body style="margin:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1f2937;">
  <main style="max-width:560px;margin:0 auto;padding:40px 20px;">
    <div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:24px;">
      <h1 style="font-size:20px;line-height:1.3;color:#0f172a;margin:0 0 12px;">${escapeHtml(title)}</h1>
      <div style="font-size:16px;line-height:1.6;">${body}</div>
      ${form}
    </div>
  </main>
</body></html>`,
    { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("t") ?? "";
  const id = verifyStatusAckToken(token);
  if (!id) {
    return page(
      "This link isn't valid",
      "<p>This confirmation link is invalid or has been superseded. If you still need to confirm, reply to the notification email and we'll record it.</p>",
    );
  }

  const supabase = createSupabaseService();
  const { data } = await (supabase.from("estate_status_notifications") as any)
    .select("id, slug, client_count, acknowledged_at")
    .eq("id", id)
    .maybeSingle();

  if (!data) {
    return page(
      "This link isn't valid",
      "<p>We couldn't find the notification this link belongs to. Reply to the email and we'll record your confirmation by hand.</p>",
    );
  }
  if (data.acknowledged_at) {
    return page(
      "Already confirmed",
      "<p>Thanks — this was already recorded. There's nothing more to do.</p>",
    );
  }

  const count = Number(data.client_count) || 0;
  return page(
    "Confirm you've told your clients",
    count > 0
      ? `<p>Confirming records that you've passed the status change on to your <strong>${count}</strong> registered ${
          count === 1 ? "buyer" : "buyers"
        }, so nobody chases you about it — and so any buyers who <em>haven't</em> been told can be picked up.</p>
         <p>It doesn't send anything to them. Please only confirm once you've actually contacted them.</p>`
      : "<p>Confirming records that you've seen the change. You have no registered buyers on this estate, so there's nobody for you to contact.</p>",
    { token, label: count > 0 ? "Yes, I've told my clients" : "Noted" },
  );
}

export async function POST(req: Request) {
  // Accepts the form post from the page above (and an RFC-8058-style one-click POST).
  let token = new URL(req.url).searchParams.get("t") ?? "";
  if (!token) {
    try {
      const form = await req.formData();
      token = String(form.get("t") ?? "");
    } catch {
      token = "";
    }
  }

  const id = verifyStatusAckToken(token);
  if (!id) {
    return page(
      "This link isn't valid",
      "<p>This confirmation link is invalid or has been superseded.</p>",
    );
  }

  const supabase = createSupabaseService();
  // Only stamp the first confirmation — a second click must not overwrite when it actually happened.
  const { error } = await (supabase.from("estate_status_notifications") as any)
    .update({ acknowledged_at: new Date().toISOString() })
    .eq("id", id)
    .is("acknowledged_at", null);

  if (error) {
    return page(
      "We couldn't record that",
      `<p>Something went wrong saving your confirmation. Please reply to the notification email and we'll record it by hand.</p>`,
    );
  }

  return page(
    "Thanks — recorded",
    "<p>We've noted that your registered buyers have been informed. Nothing was sent to them from our side.</p>",
  );
}
