import nodemailer from 'nodemailer'
import { formatDayLong, formatEuro, formatTime, type BookingDto } from '@tressia/shared'
import { env } from '../env.ts'

export interface Mail { to: string; subject: string; text: string; html: string }

/** En test, les e-mails sont stockes ici au lieu d'etre envoyes. */
export const sentMails: Mail[] = []

const transport = nodemailer.createTransport({ host: env.smtpHost, port: env.smtpPort, secure: false, ignoreTLS: true })

export async function sendMail(mail: Mail): Promise<void> {
  if (env.isTest) {
    sentMails.push(mail)
    return
  }
  if (!env.mailEnabled) {
    console.log(`[mailer] (SMTP non configure) ${mail.to} : ${mail.subject}`)
    return
  }
  await transport.sendMail({ from: env.mailFrom, ...mail })
}

/** Envoi sans bloquer ni faire echouer l'appelant. */
export function sendMailSafe(mail: Mail | null) {
  if (!mail) return
  sendMail(mail).catch((err) => console.error('[mailer] envoi impossible :', err?.message ?? err))
}

const esc = (s: string) => s.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!)

function layout(title: string, paragraphs: string[], details: [string, string][]): string {
  const rows = details
    .map(([k, v]) => `<tr><td style="padding:6px 0;color:#7a6a5c;width:130px;vertical-align:top">${esc(k)}</td><td style="padding:6px 0;color:#2b211b">${esc(v)}</td></tr>`)
    .join('')
  return `<!doctype html><html lang="fr"><body style="margin:0;padding:0;background:#F3ECE3">
<div style="max-width:560px;margin:0 auto;padding:32px 24px;font-family:Helvetica,Arial,sans-serif;color:#2b211b">
<p style="margin:0 0 24px;font-family:Georgia,'Times New Roman',serif;font-size:22px;color:#9C3F2A;letter-spacing:.5px">Tressia</p>
<div style="background:#fffaf4;border-radius:12px;padding:28px 24px;border:1px solid #e6dacb">
<h1 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-weight:normal;font-size:24px;color:#2b211b">${esc(title)}</h1>
${paragraphs.map((p) => `<p style="margin:0 0 14px;line-height:1.55">${esc(p)}</p>`).join('')}
${rows ? `<table style="width:100%;border-collapse:collapse;margin-top:8px;border-top:2px solid #9C3F2A;font-size:14px">${rows}</table>` : ''}
</div>
<p style="margin:24px 0 0;font-size:12px;color:#7a6a5c">Tressia, les tresseuses d'Alsace, chez elles ou à domicile. Contact : 06 79 07 04 87.</p>
</div></body></html>`
}

function text(title: string, paragraphs: string[], details: [string, string][]): string {
  return [title, '', ...paragraphs, '', ...details.map(([k, v]) => `${k} : ${v}`), '', 'Tressia'].join('\n')
}

function build(to: string, subject: string, title: string, paragraphs: string[], details: [string, string][]): Mail {
  return { to, subject, text: text(title, paragraphs, details), html: layout(title, paragraphs, details) }
}

function bookingDetails(b: BookingDto, withClient: boolean): [string, string][] {
  const atHome = b.location === 'domicile'
  const d: [string, string][] = [
    ['Date', formatDayLong(b.startsAt)],
    ['Heure', `${formatTime(b.startsAt)} à ${formatTime(b.endsAt)}`],
    ['Coiffures', b.items.map((i) => i.name).join(', ')],
    ['Tresseuse', b.staff.name],
    ['Lieu', atHome ? 'À domicile' : 'Chez la tresseuse'],
  ]
  if (atHome) d.push(['Adresse du rendez-vous', `${b.clientAddress}, ${b.clientCity}`])
  if (b.travelFeeEur) d.push(['Frais de déplacement', formatEuro(b.travelFeeEur)])
  d.push(['Total', formatEuro(b.totalPriceEur)])
  if (withClient) {
    d.push(['Cliente', b.client.fullName])
    if (b.client.phone) d.push(['Téléphone', b.client.phone])
    if (b.clientNote) d.push(['Note', b.clientNote])
  } else {
    d.push(['Chez', b.salon.name])
    // L'adresse exacte de la tresseuse n'est communiquee qu'a la cliente, apres reservation
    if (!atHome) d.push(['Adresse', `${b.salon.address}, ${b.salon.neighborhood}, ${b.salon.city}`])
  }
  return d
}

/** Confirmation au client. */
export function bookingConfirmedMail(b: BookingDto): Mail {
  return build(
    b.client.email,
    `Votre rendez-vous chez ${b.salon.name} est confirmé`,
    'Votre rendez-vous est confirmé',
    [`Bonjour ${b.client.fullName},`, `C'est noté : ${b.salon.name} vous attend ${formatDayLong(b.startsAt)} à ${formatTime(b.startsAt)}.`, "En cas d'empêchement, vous pouvez annuler depuis « Mes rendez-vous » jusqu'à 2 heures avant."],
    bookingDetails(b, false),
  )
}

/** Nouvelle reservation, a la tresseuse. */
export function newBookingMail(b: BookingDto, ownerEmail: string): Mail {
  return build(
    ownerEmail,
    `Nouvelle réservation : ${formatDayLong(b.startsAt)} à ${formatTime(b.startsAt)}`,
    'Nouvelle réservation',
    [`${b.client.fullName} vient de réserver chez ${b.salon.name}.`],
    bookingDetails(b, true),
  )
}

/** Annulation par la cliente, a la tresseuse. */
export function cancelledByClientMail(b: BookingDto, ownerEmail: string): Mail {
  return build(
    ownerEmail,
    `Rendez-vous annulé : ${formatDayLong(b.startsAt)} à ${formatTime(b.startsAt)}`,
    'Une cliente a annulé son rendez-vous',
    [`${b.client.fullName} a annulé son rendez-vous. Le créneau est de nouveau libre.`],
    bookingDetails(b, true),
  )
}

/** Annulation par la tresseuse, a la cliente, avec motif. */
export function cancelledBySalonMail(b: BookingDto): Mail {
  return build(
    b.client.email,
    `Votre rendez-vous chez ${b.salon.name} est annulé`,
    'Votre rendez-vous est annulé',
    [`Bonjour ${b.client.fullName},`, `Nous sommes désolés : ${b.salon.name} a dû annuler votre rendez-vous.`, `Motif : ${b.cancelReason ?? 'non précisé'}`, "N'hésitez pas à réserver un autre créneau sur Tressia."],
    bookingDetails(b, false),
  )
}
