import { supabase } from './supabase'

const VAPID = import.meta.env.VITE_VAPID_PUBLIC_KEY

export const pushSupported = () =>
  typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window

// iOS: le push funzionano solo se l'app è stata aggiunta alla schermata Home
export const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
export const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true

export function pushBlockedReason() {
  if (!pushSupported()) return 'Questo browser non supporta le notifiche push.'
  if (!VAPID) return 'Configurazione incompleta: manca la chiave VAPID.'
  if (isIOS() && !isStandalone()) return 'Su iPhone aggiungi prima l\u2019app alla schermata Home: tocca Condividi \u2192 "Aggiungi a Home".'
  if (Notification.permission === 'denied') return 'Le notifiche sono bloccate nelle impostazioni del browser per questo sito.'
  return null
}

function urlB64ToUint8(base64) {
  const pad = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + pad).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64)
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)))
}

async function getRegistration() {
  const reg = await navigator.serviceWorker.register('/sw.js')
  await navigator.serviceWorker.ready
  return reg
}

export async function isPushEnabled() {
  if (!pushSupported()) return false
  try {
    const reg = await navigator.serviceWorker.getRegistration('/sw.js')
    const sub = reg && (await reg.pushManager.getSubscription())
    return !!sub && Notification.permission === 'granted'
  } catch { return false }
}

export async function enablePush(userId) {
  const reason = pushBlockedReason()
  if (reason) throw new Error(reason)
  const perm = await Notification.requestPermission()
  if (perm !== 'granted') throw new Error('Permesso non concesso.')
  const reg = await getRegistration()
  let sub = await reg.pushManager.getSubscription()
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64ToUint8(VAPID) })
  const j = sub.toJSON()
  const { error } = await supabase.from('push_subscriptions').upsert({
    user_id: userId, endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth,
    user_agent: navigator.userAgent.slice(0, 200),
  }, { onConflict: 'endpoint' })
  if (error) throw new Error(error.message)
  return true
}

export async function disablePush() {
  const reg = await navigator.serviceWorker.getRegistration('/sw.js')
  const sub = reg && (await reg.pushManager.getSubscription())
  if (sub) {
    await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
    await sub.unsubscribe()
  }
  return false
}
