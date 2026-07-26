import { randomUUID } from "node:crypto";
import { createSupabaseService } from "@/lib/supabase-service";
import { escapeHtml } from "@/lib/html-escape";
import { guardRecipients } from "@/lib/email/recipient-guard";
import { complianceFooterHtml } from "@/lib/email/compliance";
import { buildStatusAckUrl } from "@/lib/estates/status-ack";
import {
  collectEstateStakeholders,
  type EstateAgentStakeholder,
  type EstateClient,
  type EstateStakeholders,
} from "@/lib/estates/stakeholders";

/**
 * Stakeholder announcement for an estate activate/deactivate (the 0072 toggle).
 *
 * The rule this implements: when a development goes off-market, the people working it are told by
 * the system and the system's own communications stop; the BUYERS are told by their agent, not by
 * us. Every design decision below follows from that split —
 *
 *   - agents get their OWN registrant list inline, because the action we're asking of them
 *     ("tell these people") is impossible without it, and making them log in to find it is how a
 *     request quietly goes unactioned;
 *   - the email states plainly that nobody has contacted their buyers, because an agent who assumes
 *     the system already sent something will say nothing;
 *   - it states that nothing is deleted and the estate can be reactivated, because whether to keep
 *     a buyer on the list against a possible revival is exactly the judgement we're handing them;
 *   - admins get the unassigned pool, because registrants with no introducing agent have nobody
 *     else to own them;
 *   - a one-click confirm makes the off-system step reportable (see status-ack.ts).
 *
 * These are transactional messages to contracted parties about their own access, not commercial
 * marketing — they carry the Spam Act identification footer and no unsubscribe (PRODUCT_STANDARDS
 * §9). Sending is best-effort per recipient: one failed address never aborts the rest, and the
 * per-recipient outcome is recorded in estate_status_notifications either way.
 */

export interface NotifyResult {
  attempted: number;
  sent: number;
  failed: number;
  agentsNotified: number;
  adminsNotified: number;
  clientsCovered: number;
  unassignedClients: number;
  errors: string[];
}

interface NotifyArgs {
  slug: string;
  estateName: string;
  estateHref: string;
  archived: boolean;
  reason: string | null;
  actorEmail: string;
}

/** One row queued for insert into estate_status_notifications. */
interface Receipt {
  id: string;
  slug: string;
  archived: boolean;
  reason: string | null;
  recipient_email: string;
  recipient_kind: "agent" | "admin" | "notify_recipient";
  recipient_agent_id: string | null;
  client_count: number;
  status: "sent" | "failed";
  error: string | null;
  resend_message_id: string | null;
  triggered_by: string;
}

const BRAND = "#1B4332";

/**
 * Resend caps at 10 requests/second and this loop sends serially with no network wait between
 * calls, so a mid-sized estate blows straight through it — the first live run announced Branscombe
 * to 11 recipients and lost one to "Too many requests". A dropped announcement is exactly the
 * failure this feature exists to prevent, so the loop is paced under the cap. 150ms (≈6.7/sec)
 * leaves headroom for anything else the deploy is sending at the same moment; even 60 recipients
 * still finishes inside the route's 60s budget.
 */
const SEND_INTERVAL_MS = 150;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function shell(title: string, inner: string, footer: string): string {
  return `<div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;color:#1f2937;line-height:1.55;">
  <h1 style="font-size:22px;line-height:1.3;color:#0f172a;margin:0 0 16px;">${escapeHtml(title)}</h1>
  ${inner}
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:28px 0 14px;" />
  <div style="font-size:12px;color:#6b7280;">${footer}</div>
</div>`;
}

/** The status block every recipient sees — what changed, why, and by whom. */
function statusBlock(args: NotifyArgs): string {
  const verb = args.archived ? "deactivated (taken off market)" : "reactivated (live again)";
  const reasonLine =
    args.archived && args.reason
      ? `<p style="margin:0 0 8px;"><strong>Reason given:</strong> ${escapeHtml(args.reason)}</p>`
      : "";
  return `<div style="border-left:4px solid ${BRAND};background:#f8fafc;padding:14px 16px;margin:0 0 20px;">
    <p style="margin:0 0 8px;"><strong>${escapeHtml(args.estateName)}</strong> has been ${verb}.</p>
    ${reasonLine}
    <p style="margin:0;font-size:13px;color:#475569;">Changed by ${escapeHtml(args.actorEmail)} on ${new Date().toLocaleDateString(
      "en-AU",
      { day: "numeric", month: "long", year: "numeric", timeZone: "Australia/Sydney" },
    )}.</p>
  </div>`;
}

/** What the system itself has stopped or resumed — so nobody assumes the other half was handled. */
function systemActionsBlock(archived: boolean, estateName: string): string {
  const items = archived
    ? [
        `The ${escapeHtml(estateName)} pages are hidden from the website (anyone with the direct link sees an "archived" notice).`,
        "All automated emails to registered buyers have stopped — including the 48-hour follow-up and any estate updates.",
        "New registrations are closed.",
        "Nothing has been deleted. Every registration, allocation and record is intact and comes straight back if the estate is reactivated.",
      ]
    : [
        `The ${escapeHtml(estateName)} pages are back on the website.`,
        "Automated follow-up emails to registered buyers have resumed.",
        "New registrations are open again.",
      ];
  return `<p style="margin:0 0 8px;font-weight:600;color:#0f172a;">What has happened automatically</p>
  <ul style="margin:0 0 20px;padding-left:20px;font-size:15px;">${items
    .map((i) => `<li style="margin:4px 0;">${i}</li>`)
    .join("")}</ul>`;
}

function clientTable(clients: EstateClient[]): string {
  const rows = clients
    .map(
      (c) =>
        `<tr><td style="padding:6px 14px 6px 0;border-bottom:1px solid #f1f5f9;font-size:14px;">${escapeHtml(
          c.name,
        )}</td><td style="padding:6px 0;border-bottom:1px solid #f1f5f9;font-size:14px;color:#475569;">${escapeHtml(
          c.email,
        )}</td></tr>`,
    )
    .join("");
  return `<table style="border-collapse:collapse;width:100%;margin:0 0 20px;">${rows}</table>`;
}

function ackButton(url: string | null, label: string): string {
  if (!url) return "";
  return `<p style="margin:0 0 20px;"><a href="${url}" style="display:inline-block;background:${BRAND};color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 20px;border-radius:8px;">${escapeHtml(
    label,
  )}</a></p>`;
}

function footerHtml(): string {
  // Transactional (recipient-initiated business correspondence about their own access): the Spam
  // Act identification is required, an unsubscribe is not — an agent cannot opt out of being told
  // an estate they sell has been withdrawn.
  return complianceFooterHtml({
    reason:
      "You are receiving this because you are listed as a stakeholder on this Factory2Key development.",
  });
}

/** The email an AGENT receives — the one that carries an off-system action. */
function agentEmail(
  args: NotifyArgs,
  agent: EstateAgentStakeholder,
  ackUrl: string | null,
): { subject: string; html: string } {
  const count = agent.clients.length;

  if (!args.archived) {
    const inner = `<p style="margin:0 0 16px;font-size:15px;">Hi ${escapeHtml(agent.name)},</p>
      ${statusBlock(args)}
      ${systemActionsBlock(false, args.estateName)}
      ${
        count > 0
          ? `<p style="margin:0 0 8px;font-size:15px;">You have <strong>${count}</strong> registered ${
              count === 1 ? "buyer" : "buyers"
            } on this estate. If you told them it was on hold, they are worth a call — the estate is open again.</p>
             ${clientTable(agent.clients)}`
          : `<p style="margin:0 0 20px;font-size:15px;">You have no registered buyers on this estate yet.</p>`
      }
      <p style="margin:0 0 20px;font-size:15px;"><a href="${escapeHtml(
        args.estateHref,
      )}" style="color:${BRAND};font-weight:600;">View the estate page →</a></p>`;
    return {
      subject: `${args.estateName} is live again`,
      html: shell(`${args.estateName} is back on the market`, inner, footerHtml()),
    };
  }

  const clientSection =
    count > 0
      ? `<p style="margin:0 0 8px;font-weight:600;color:#0f172a;">Your registered buyers on this estate (${count})</p>
         <p style="margin:0 0 12px;font-size:15px;">We have <strong>not</strong> contacted any of them about this. Telling them is your call, and so is how you word it — you know the relationship. They stay on the list unless you ask us to remove them, so if the development resumes they can be picked straight back up.</p>
         ${clientTable(agent.clients)}
         ${ackButton(ackUrl, "I've told my clients")}
         <p style="margin:0 0 20px;font-size:13px;color:#6b7280;">The button just lets us see whose buyers have been informed, so nobody gets chased twice — or missed.</p>`
      : `<p style="margin:0 0 20px;font-size:15px;">You have no registered buyers on this estate, so there is nobody for you to contact.</p>
         ${ackButton(ackUrl, "Noted")}`;

  const inner = `<p style="margin:0 0 16px;font-size:15px;">Hi ${escapeHtml(agent.name)},</p>
    ${statusBlock(args)}
    ${systemActionsBlock(true, args.estateName)}
    ${clientSection}`;

  return {
    subject:
      count > 0
        ? `${args.estateName} is off market — please contact your ${count} registered ${
            count === 1 ? "buyer" : "buyers"
          }`
        : `${args.estateName} is off market`,
    html: shell(`${args.estateName} has been taken off market`, inner, footerHtml()),
  };
}

/** The email an ADMIN / ops recipient receives — the whole picture, including who owns what. */
function adminEmail(
  args: NotifyArgs,
  stakeholders: EstateStakeholders,
): { subject: string; html: string } {
  const agentRows = stakeholders.agents
    .map(
      (a) =>
        `<tr><td style="padding:6px 14px 6px 0;border-bottom:1px solid #f1f5f9;font-size:14px;">${escapeHtml(
          a.name,
        )}${a.agency ? ` <span style="color:#94a3b8;">(${escapeHtml(a.agency)})</span>` : ""}</td>` +
        `<td style="padding:6px 0;border-bottom:1px solid #f1f5f9;font-size:14px;color:#475569;">${
          a.clients.length
        } registered ${a.clients.length === 1 ? "buyer" : "buyers"}</td></tr>`,
    )
    .join("");

  const agentSection = stakeholders.agents.length
    ? `<p style="margin:0 0 8px;font-weight:600;color:#0f172a;">Agents notified (${stakeholders.agents.length})</p>
       <table style="border-collapse:collapse;width:100%;margin:0 0 20px;">${agentRows}</table>`
    : `<p style="margin:0 0 20px;font-size:15px;">No active agents have access to this estate, so no agent was notified.</p>`;

  const unassigned = stakeholders.unassignedClients;
  const unassignedSection =
    args.archived && unassigned.length
      ? `<div style="border-left:4px solid #d97706;background:#fffbeb;padding:14px 16px;margin:0 0 20px;">
           <p style="margin:0 0 8px;font-weight:600;color:#92400e;">${unassigned.length} registered ${
             unassigned.length === 1 ? "buyer has" : "buyers have"
           } no introducing agent</p>
           <p style="margin:0 0 12px;font-size:14px;color:#78350f;">Nobody has been asked to contact them, because no agent owns them. If they should be told, that falls to F2K.</p>
           ${clientTable(unassigned.slice(0, 50))}
           ${
             unassigned.length > 50
               ? `<p style="margin:0;font-size:13px;color:#78350f;">…and ${unassigned.length - 50} more. Full list in the admin pipeline.</p>`
               : ""
           }
         </div>`
      : "";

  const errorSection = stakeholders.sourceErrors.length
    ? `<div style="border-left:4px solid #dc2626;background:#fef2f2;padding:12px 16px;margin:0 0 20px;">
         <p style="margin:0 0 6px;font-weight:600;color:#991b1b;">This list may be incomplete</p>
         <p style="margin:0;font-size:13px;color:#7f1d1d;">Some registrant sources could not be read: ${escapeHtml(
           stakeholders.sourceErrors.join("; "),
         )}. Check the admin pipeline before assuming everyone has been covered.</p>
       </div>`
    : "";

  const inner = `${statusBlock(args)}
    ${systemActionsBlock(args.archived, args.estateName)}
    ${
      args.archived
        ? `<p style="margin:0 0 20px;font-size:15px;"><strong>No registered buyer has been emailed by the system.</strong> Each agent below has been sent their own client list and asked to contact those people directly.</p>`
        : ""
    }
    ${errorSection}
    ${agentSection}
    ${unassignedSection}
    <p style="margin:0 0 4px;font-size:15px;">Total registrations on this estate: <strong>${stakeholders.totalClients}</strong></p>`;

  return {
    subject: args.archived
      ? `${args.estateName} deactivated — ${stakeholders.agents.length} agents notified, ${unassigned.length} unassigned buyers`
      : `${args.estateName} reactivated — ${stakeholders.agents.length} agents notified`,
    html: shell(
      args.archived
        ? `${args.estateName} has been taken off market`
        : `${args.estateName} is back on the market`,
      inner,
      footerHtml(),
    ),
  };
}

/**
 * Announce a status change to every stakeholder and record who was told.
 *
 * Never throws — the estate status has already been written by the time this runs, and a mail
 * failure must not make the caller look like the toggle failed. Everything that went wrong comes
 * back in `errors` for the operator to see.
 */
export async function notifyEstateStatusChange(args: NotifyArgs): Promise<NotifyResult> {
  const result: NotifyResult = {
    attempted: 0,
    sent: 0,
    failed: 0,
    agentsNotified: 0,
    adminsNotified: 0,
    clientsCovered: 0,
    unassignedClients: 0,
    errors: [],
  };

  let stakeholders: EstateStakeholders;
  try {
    stakeholders = await collectEstateStakeholders(args.slug);
  } catch (e) {
    result.errors.push(
      `Could not resolve stakeholders: ${e instanceof Error ? e.message : "lookup threw"}`,
    );
    return result;
  }
  result.errors.push(...stakeholders.sourceErrors);
  result.unassignedClients = stakeholders.unassignedClients.length;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    result.errors.push("RESEND_API_KEY is not configured — nobody was notified.");
    return result;
  }

  const { Resend } = await import("resend");
  const resend = new Resend(apiKey);
  const from =
    process.env.RESEND_FROM_EMAIL ||
    "Factory2Key <noreply@updates.corporateaisolutions.com>";

  const receipts: Receipt[] = [];

  const deliver = async (
    to: string,
    kind: Receipt["recipient_kind"],
    agentId: string | null,
    clientCount: number,
    subject: string,
    html: string,
    receiptId: string,
  ) => {
    // Pace under the provider's rate limit (see SEND_INTERVAL_MS). Applied before every send after
    // the first, so a single-recipient announcement is not slowed for nothing.
    if (result.attempted > 0) await delay(SEND_INTERVAL_MS);

    result.attempted++;
    const guard = guardRecipients(to);
    let error: string | null = null;
    let messageId: string | null = null;
    try {
      const res = await resend.emails.send({ from, to: guard.to, subject, html });
      if (res.error) error = res.error.message ?? String(res.error);
      else messageId = res.data?.id ?? null;
    } catch (e) {
      error = e instanceof Error ? e.message : "Resend send threw";
    }

    if (error) {
      result.failed++;
      result.errors.push(`${to}: ${error}`);
    } else {
      result.sent++;
      if (kind === "agent") {
        result.agentsNotified++;
        result.clientsCovered += clientCount;
      } else {
        result.adminsNotified++;
      }
    }

    receipts.push({
      id: receiptId,
      slug: args.slug,
      archived: args.archived,
      reason: args.reason,
      recipient_email: to,
      recipient_kind: kind,
      recipient_agent_id: agentId,
      client_count: clientCount,
      status: error ? "failed" : "sent",
      error,
      resend_message_id: messageId,
      triggered_by: args.actorEmail,
    });
  };

  // --- Agents (each with their own client list + confirm link) ------------------------------
  for (const agent of stakeholders.agents) {
    // The receipt id is generated up front because the confirm link has to point at the row this
    // send will create — the token is scoped to exactly this notification.
    const receiptId = randomUUID();
    const { subject, html } = agentEmail(args, agent, buildStatusAckUrl(receiptId));
    await deliver(
      agent.email,
      "agent",
      agent.id,
      agent.clients.length,
      subject,
      html,
      receiptId,
    );
  }

  // --- Admins + ops recipients --------------------------------------------------------------
  const { subject: adminSubject, html: adminHtml } = adminEmail(args, stakeholders);
  for (const admin of stakeholders.admins) {
    await deliver(admin.email, admin.kind, null, 0, adminSubject, adminHtml, randomUUID());
  }

  // --- Record the receipts ------------------------------------------------------------------
  if (receipts.length) {
    try {
      const supabase = createSupabaseService();
      const { error } = await (supabase.from("estate_status_notifications") as any).insert(
        receipts,
      );
      if (error) result.errors.push(`Receipt log failed: ${error.message}`);

      await (supabase.from("estate_status") as any)
        .update({
          status_notified_at: new Date().toISOString(),
          status_notified_count: result.sent,
        })
        .eq("slug", args.slug);
    } catch (e) {
      result.errors.push(
        `Receipt log threw: ${e instanceof Error ? e.message : "unknown error"}`,
      );
    }
  }

  return result;
}

/** Read-only impact preview for the confirm dialog — what a toggle would do, before it is done. */
export async function previewEstateStatusImpact(slug: string) {
  const stakeholders = await collectEstateStakeholders(slug);
  return {
    agents: stakeholders.agents.map((a) => ({
      name: a.name,
      email: a.email,
      agency: a.agency,
      clientCount: a.clients.length,
    })),
    adminCount: stakeholders.admins.length,
    unassignedClientCount: stakeholders.unassignedClients.length,
    totalClients: stakeholders.totalClients,
    sourceErrors: stakeholders.sourceErrors,
  };
}
