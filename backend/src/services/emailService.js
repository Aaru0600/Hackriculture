import nodemailer from 'nodemailer'
import { env } from '../config/env.js'

let transporter = null
function getTransporter() {
  if (transporter) return transporter
  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
  })
  return transporter
}

/**
 * Sends the "verify your email" link. When SMTP isn't configured (dev/demo),
 * nothing is emailed - the link is logged and handed back as `devLink` so the
 * flow is still testable end-to-end without a mail account. Never throws:
 * a delivery failure must not block registration.
 */
export async function sendVerificationEmail({ to, name, link }) {
  if (!env.SMTP_HOST) {
    console.log(`[email:dev] verification link for ${to}: ${link}`)
    return { sent: false, devLink: link }
  }

  try {
    await getTransporter().sendMail({
      from: env.EMAIL_FROM,
      to,
      subject: 'Verify your HACKRICULTURE email',
      text: `Hi ${name || 'there'},\n\nConfirm this is your email address:\n${link}\n\nThis link expires in ${env.EMAIL_VERIFICATION_EXPIRES_MIN / 60} hours. If you didn't create this account, ignore this email.`,
      html: `<p>Hi ${name || 'there'},</p><p>Confirm this is your email address:</p><p><a href="${link}">${link}</a></p><p>This link expires in ${env.EMAIL_VERIFICATION_EXPIRES_MIN / 60} hours. If you didn't create this account, ignore this email.</p>`,
    })
    return { sent: true }
  } catch (err) {
    console.error('[email] verification send failed:', err.message)
    return { sent: false, error: err.message }
  }
}
