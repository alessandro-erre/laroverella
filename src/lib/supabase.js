import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !key) {
  console.error('Mancano VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY (file .env o env Netlify)')
}

export const supabase = createClient(url, key)

// Foglie invece del numero, fino a cinque
export function foglie(n) {
  if (!n) return ''
  return n <= 5 ? '\u{1F343}'.repeat(n) : n
}

export const EMOJIS = ['🌳', '😍', '🙏', '🤩', '👏', '🔥']
export const AVATARS = ['🌳', '🦊', '🦉', '🐝', '🐿️', '🦔', '🐻', '🍄', '🌿', '🦋']

// Momento della giornata, come lo direbbe chi vive al casale
function momento(h) {
  if (h < 5) return 'nella notte'
  if (h < 8) return 'all\u2019alba'
  if (h < 12) return 'in mattinata'
  if (h < 15) return 'nel pomeriggio'
  if (h < 19) return 'nel tardo pomeriggio'
  if (h < 22) return 'al tramonto'
  return 'in serata'
}

export function timeAgo(iso) {
  const d = new Date(iso)
  const s = Math.floor((Date.now() - d.getTime()) / 1000)
  if (s < 120) return 'proprio ora'
  if (s < 3600) return `${Math.floor(s / 60)} minuti fa`

  const oggi = new Date(); oggi.setHours(0, 0, 0, 0)
  const giorno = new Date(d); giorno.setHours(0, 0, 0, 0)
  const gg = Math.round((oggi - giorno) / 86400000)
  const m = momento(d.getHours())

  if (gg === 0) return m === 'in mattinata' ? 'stamattina' : `oggi ${m}`
  if (gg === 1) return `ieri ${m}`
  if (gg < 7) return `${d.toLocaleDateString('it-IT', { weekday: 'long' })} ${m}`
  if (gg < 14) return 'la settimana scorsa'
  if (gg < 31) return `${Math.floor(gg / 7)} settimane fa`
  return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })
}

// Etichetta del separatore mensile
export function meseLabel(iso) {
  const d = new Date(iso)
  const ora = new Date()
  const nome = d.toLocaleDateString('it-IT', { month: 'long' })
  return d.getFullYear() === ora.getFullYear() ? nome : `${nome} ${d.getFullYear()}`
}

export async function uploadMedia(file) {
  const ext = file.name.split('.').pop()
  const path = `${Date.now()}.${ext}`
  const { error } = await supabase.storage.from('media').upload(path, file)
  if (error) throw error
  return supabase.storage.from('media').getPublicUrl(path).data.publicUrl
}

export async function deleteMedia(url) {
  try {
    const path = decodeURIComponent(url.split('/media/').pop().split('?')[0])
    if (path) await supabase.storage.from('media').remove([path])
  } catch (e) { console.error('deleteMedia:', e) }
}
