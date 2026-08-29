import { gfetch } from './google'

const BASE = 'https://gmail.googleapis.com/gmail/v1/users/me'

export interface MailSummary {
  id: string
  threadId: string
  subject: string
  from: string
  fromName: string
  date: string
  snippet: string
  url: string
}

function header(headers: { name: string; value: string }[], name: string) {
  return headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? ''
}

function parseFrom(raw: string): { name: string; email: string } {
  const m = raw.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/)
  if (m) return { name: m[1].trim() || m[2], email: m[2] }
  return { name: raw.trim(), email: raw.trim() }
}

export async function listMail(query: string, max = 25): Promise<MailSummary[]> {
  const listRes = await gfetch(
    `${BASE}/messages?q=${encodeURIComponent(query)}&maxResults=${max}`,
  )
  const list = (await listRes.json()) as { messages?: { id: string; threadId: string }[] }
  if (!list.messages?.length) return []

  const details = await Promise.all(
    list.messages.map(async ({ id }) => {
      const res = await gfetch(
        `${BASE}/messages/${id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
      )
      return res.json() as Promise<{
        id: string
        threadId: string
        snippet: string
        internalDate: string
        payload: { headers: { name: string; value: string }[] }
      }>
    }),
  )

  return details.map((d) => {
    const from = parseFrom(header(d.payload.headers, 'From'))
    return {
      id: d.id,
      threadId: d.threadId,
      subject: header(d.payload.headers, 'Subject') || '(no subject)',
      from: from.email,
      fromName: from.name,
      date: d.internalDate
        ? new Date(Number(d.internalDate)).toISOString()
        : header(d.payload.headers, 'Date'),
      snippet: (d.snippet ?? '').replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/&quot;/g, '"'),
      url: `https://mail.google.com/mail/u/0/#all/${d.threadId}`,
    }
  })
}
