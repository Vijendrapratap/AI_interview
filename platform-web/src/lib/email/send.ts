import "server-only";

import nodemailer from "nodemailer";

/**
 * Open-source SMTP email sender (nodemailer). Configurable via env so it works
 * with any provider (self-hosted Postfix, Gmail app password, Mailpit in dev,
 * or a transactional provider later). Until SMTP_* is set, sends are skipped
 * gracefully — drafts stay in the outbox so nothing is lost.
 *
 * Env: SMTP_HOST, SMTP_PORT (default 587), SMTP_USER, SMTP_PASS,
 *      SMTP_SECURE ("true" for port 465), EMAIL_FROM.
 */
export function emailConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.EMAIL_FROM);
}

export type SendResult = { sent: boolean; messageId?: string; error?: string };

export async function sendEmail(msg: {
  to: string;
  subject: string;
  html?: string;
  text?: string;
}): Promise<SendResult> {
  if (!emailConfigured()) {
    return { sent: false, error: "SMTP not configured (set SMTP_HOST + EMAIL_FROM)" };
  }
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
