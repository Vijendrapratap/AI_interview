import "server-only";

import nodemailer from "nodemailer";

/**
 * Provider-agnostic email sender. Transports are picked by env, in priority
 * order — the HTTP APIs come first because they work cleanly on serverless
 * (no SMTP ports, pooling, or IP-allowlist friction):
 *
 *  1. Brevo HTTP API — set BREVO_API_KEY (+ EMAIL_FROM). Free tier 300/day.
 *  2. Resend HTTP API — set RESEND_API_KEY (+ EMAIL_FROM). Free tier 3k/month.
 *  3. SMTP via nodemailer — set SMTP_HOST/SMTP_USER/SMTP_PASS/EMAIL_FROM.
 *     Works with any provider (Brevo SMTP relay, Gmail app password, Postfix,
 *     Mailpit in dev).
 *
 * Until one is configured, sends are skipped gracefully — drafts stay in the
 * outbox so nothing is lost.
 *
 * EMAIL_FROM accepts either "Name <addr@x.com>" or a bare "addr@x.com".
 */
export function emailConfigured(): boolean {
  return Boolean(
    process.env.EMAIL_FROM &&
      (process.env.BREVO_API_KEY || process.env.RESEND_API_KEY || process.env.SMTP_HOST)
  );
}

export type SendResult = { sent: boolean; messageId?: string; error?: string };

/** Splits "Name <addr@x.com>" (or a bare address) into its parts. */
function parseFrom(from: string): { name?: string; email: string } {
  const m = from.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  if (m) return { name: m[1] || undefined, email: m[2].trim() };
  return { email: from.trim() };
}

export async function sendEmail(msg: {
  to: string;
  subject: string;
  html?: string;
  text?: string;
}): Promise<SendResult> {
  if (!emailConfigured()) {
    return { sent: false, error: "Email not configured (set BREVO_API_KEY, RESEND_API_KEY, or SMTP_HOST, plus EMAIL_FROM)" };
  }
  if (process.env.BREVO_API_KEY) return sendViaBrevo(msg);
  if (process.env.RESEND_API_KEY) return sendViaResend(msg);
  return sendViaSmtp(msg);
}

async function sendViaBrevo(msg: {
  to: string;
  subject: string;
  html?: string;
  text?: string;
}): Promise<SendResult> {
  try {
    const sender = parseFrom(process.env.EMAIL_FROM ?? "");
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": process.env.BREVO_API_KEY as string,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        sender,
        to: [{ email: msg.to }],
        subject: msg.subject,
        htmlContent: msg.html || msg.text || " ",
        ...(msg.text ? { textContent: msg.text } : {}),
      }),
    });
    const data = (await res.json().catch(() => ({}))) as { messageId?: string; message?: string };
    if (!res.ok) {
      return { sent: false, error: `Brevo ${res.status}: ${data.message ?? "send failed"}`.slice(0, 300) };
    }
    return { sent: true, messageId: data.messageId };
  } catch (e) {
    return { sent: false, error: e instanceof Error ? e.message : "send failed" };
  }
}

async function sendViaResend(msg: {
  to: string;
  subject: string;
  html?: string;
  text?: string;
}): Promise<SendResult> {
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM,
        to: [msg.to],
        subject: msg.subject,
        ...(msg.html ? { html: msg.html } : {}),
        text: msg.text ?? "",
      }),
    });
    const data = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
    if (!res.ok) {
      return { sent: false, error: `Resend ${res.status}: ${data.message ?? "send failed"}`.slice(0, 300) };
    }
    return { sent: true, messageId: data.id };
  } catch (e) {
    return { sent: false, error: e instanceof Error ? e.message : "send failed" };
  }
}

async function sendViaSmtp(msg: {
  to: string;
  subject: string;
  html?: string;
  text?: string;
}): Promise<SendResult> {
  try {
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === "true",
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    });
    const info = await transport.sendMail({
      from: process.env.EMAIL_FROM,
      to: msg.to,
      subject: msg.subject,
      text: msg.text,
      html: msg.html || msg.text,
    });
    return { sent: true, messageId: info.messageId };
  } catch (e) {
    return { sent: false, error: e instanceof Error ? e.message : "send failed" };
  }
}
