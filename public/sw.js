/* Service worker — riceve le notifiche push anche ad app chiusa */
self.addEventListener('install', e => self.skipWaiting())
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()))

self.addEventListener('push', event => {
  let d = {}
  try { d = event.data ? event.data.json() : {} } catch (e) { d = { body: event.data && event.data.text() } }
  const title = d.title || 'La roverella di Patrica'
  const options = {
    body: d.body || 'Novità dalla community',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: d.tag || 'roverella',
    data: { url: d.url || '/' },
    vibrate: [80, 40, 80],
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/'
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    for (const c of all) {
      if ('focus' in c) { await c.focus(); if ('navigate' in c) await c.navigate(url); return }
    }
    await self.clients.openWindow(url)
  })())
})
