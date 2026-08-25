// Edge Function: invia la notifica push ai dispositivi dell'utente.
// Attivata dal Database Webhook su INSERT in public.notifications.
import webpush from 'npm:web-push@3.6.7'
import { createClient } from 'npm:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const VAPID_PUBLIC = Deno.env.get('VAPID_PUBLIC_KEY')!
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY')!
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:info@casalelequerce.it'

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE)
const admin = createClient(SUPABASE_URL, SERVICE_KEY)

function textOf(n: any) {
  const p = n.payload || {}
  switch (n.type) {
    case 'new_post': return { title: 'Nuovo post dal Casale', body: p.preview ? `${p.preview}…` : 'Guarda cosa succede oggi', url: '/' }
    case 'new_comment': return { title: `${p.who || 'Un membro'} ha commentato`, body: p.preview ? `${p.preview}…` : '', url: '/' }
    case 'new_reaction': return { title: `${p.who || 'Un membro'} ha reagito ${p.emoji || '🌿'}`, body: 'al tuo post', url: '/' }
    case 'new_article': return { title: 'Nuovo racconto', body: p.title || '', url: '/' }
    default: return { title: 'La roverella di Patrica', body: 'Novità dalla community', url: '/' }
  }
}

Deno.serve(async (req) => {
  try {
    const body = await req.json()
    const rec = body.record || body
    if (!rec?.user_id) return new Response('no user_id', { status: 200 })

    const { data: subs } = await admin.from('push_subscriptions').select('*').eq('user_id', rec.user_id)
    if (!subs?.length) return new Response('no subscriptions', { status: 200 })

    const msg = JSON.stringify({ ...textOf(rec), tag: rec.type })
    let sent = 0
    const dead: string[] = []

    await Promise.all(subs.map(async (s: any) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          msg, { TTL: 3600 },
        )
        sent++
      } catch (e: any) {
        const code = e?.statusCode
        if (code === 404 || code === 410) dead.push(s.endpoint)
        else console.error('push error', code, e?.body || e?.message)
      }
    }))

    if (dead.length) await admin.from('push_subscriptions').delete().in('endpoint', dead)
    return new Response(JSON.stringify({ sent, removed: dead.length }), { headers: { 'Content-Type': 'application/json' } })
  } catch (e) {
    console.error(e)
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 })
  }
})
