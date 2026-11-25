import "server-only";

/* Transactional email through Brevo (https://developers.brevo.com/reference/sendtransacemail).
   Nothing is sent until BOTH of these server env vars are set (never prefix them with NEXT_PUBLIC_):
     BREVO_API_KEY        the Brevo API key
     BREVO_SENDER_EMAIL   a sender address verified in Brevo
     BREVO_SENDER_NAME    optional display name (default "VCG Intranet")
   Without them sendEmail() resolves { sent:false, reason } and never throws, so a missing key can't break a save. */

export interface EmailMessage {
  to: string;
  toName?: string;
  subject: string;
  html: string;
  text?: string;
}
export interface EmailResult {
  sent: boolean;
  reason?: string;
}

export const emailConfigured = () => !!(process.env.BREVO_API_KEY && process.env.BREVO_SENDER_EMAIL);

export async function sendEmail(m: EmailMessage): Promise<EmailResult> {
  const key = process.env.BREVO_API_KEY;
  const from = process.env.BREVO_SENDER_EMAIL;
  if (!key || !from) return { sent: false, reason: "Email isn't connected yet (Brevo key / sender not set)" };
  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": key, "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        sender: { email: from, name: process.env.BREVO_SENDER_NAME || "VCG Intranet" },
        to: [{ email: m.to, ...(m.toName ? { name: m.toName } : {}) }],
        subject: m.subject,
        htmlContent: m.html,
        ...(m.text ? { textContent: m.text } : {}),
      }),
      cache: "no-store",
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("[email] Brevo", res.status, body.slice(0, 300));
      return { sent: false, reason: `Brevo refused the email (${res.status})` };
    }
    return { sent: true };
  } catch (e) {
    console.error("[email]", e);
    return { sent: false, reason: "Could not reach Brevo" };
  }
}

export const escHtml = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
