import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !key) {
  console.error('Mancano VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY (file .env o env Netlify)')
}

export const supabase = createClient(url, key)

export const EMOJIS = ['🌳', '😍', '🙏', '🤩', '👏', '🔥']
export const AVATARS = ['🌳', '🦊', '🦉', '🐝', '🐿️', '🦔', '🐻', '🍄', '🌿', '🦋']

export function timeAgo(iso) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'adesso'
  if (s < 3600) return `${Math.floor(s / 60)} min fa`
  if (s < 86400) return `${Math.floor(s / 3600)} ore fa`
  if (s < 604800) return `${Math.floor(s / 86400)} giorni fa`
  return new Date(iso).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })
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
