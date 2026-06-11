import "server-only";

import nodemailer from "nodemailer";

/**
 * Provider-agnostic email sender. Two transports, picked by env:
 *
 *  1. Resend HTTP API — set RESEND_API_KEY (+ EMAIL_FROM). Free tier:
 *     3k emails/month; no SMTP ports involved, works well on serverless.
 *  2. SMTP via nodemailer — set SMTP_HOST/SMTP_USER/SMTP_PASS/EMAIL_FROM.
 *     Works with any provider (Gmail app password, Brevo, self-hosted Postfix,
 *     Mailpit in dev).
 *
 * Until one of them is configured, sends are skipped gracefully — drafts stay
 * in the outbox so nothing is lost.
 *
 * Env: RESEND_API_KEY | SMTP_HOST, SMTP_PORT (default 587), SMTP_USER,
 *      SMTP_PASS, SMTP_SECURE ("true" for port 465); always EMAIL_FROM.
 */
export function emailConfigured(): boolean {
  return Boolean(
    process.env.EMAIL_FROM && (process.env.RESEND_API_KEY || process.env.SMTP_HOST)
  );
}

export type SendResult = { sent: boolean; messageId?: string; error?: string };

export async function sendEmail(msg: {
  to: string;
  subject: string;
  html?: string;
  text?: string;
}): Promise<SendResult> {
  if (!emailConfigured()) {
    return { sent: false, error: "Email not configured (set RESEND_API_KEY or SMTP_HOST, plus EMAIL_FROM)" };
  }
  if (process.env.RESEND_API_KEY) return sendViaResend(msg);
  return sendViaSmtp(msg);
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
