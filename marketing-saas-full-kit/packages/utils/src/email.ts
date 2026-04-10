import { Resend } from 'resend'

import logger from './logger.js'

export interface SendEmailInput {
  to: string | string[]
  subject: string
  html: string
  text: string
}

export async function sendEmail({ to, subject, html, text }: SendEmailInput): Promise<void> {
  if (process.env.NODE_ENV !== 'production') {
    logger.info('Email send stubbed in non-production environment', {
      to,
      subject,
    })
    return
  }

  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.EMAIL_FROM

  if (!apiKey || !from) {
    throw new Error('RESEND_API_KEY and EMAIL_FROM are required in production')
  }

  const resend = new Resend(apiKey)

  await resend.emails.send({
    from,
    to,
    subject,
    html,
    text,
  })
}
