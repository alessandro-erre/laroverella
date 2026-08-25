import { useState, useEffect, useCallback } from 'react'
import { supabase } from './lib/supabase'
import AuthFlow from './components/AuthFlow'
import Feed from './components/Feed'
import { Notifs, Blog, Article, Gallery, Profile } from './components/Screens'
import { Ic, ICONS } from './components/icons'
import './app.css'

export default function App() {
  const [session, setSession] = useState(undefined) // undefined = loading
  const [profile, setProfile] = useState(null)
  const [tab, setTab] = useState('feed')
  const [view, setView] = useState('main')
  const [article, setArticle] = useState(null)
  const [toast, setToast] = useState(null)
  const [unread, setUnread] = useState(0)

  // sessione
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  const user = session?.user

  // profilo
  useEffect(() => {
    if (!user) { setProfile(null); return }
    supabase.from('profiles').select('*').eq('id', user.id).single()
      .then(({ data }) => setProfile(data))
  }, [user?.id])

  // notifiche non lette + realtime
  useEffect(() => {
    if (!user) return
    const count = () => supabase.from('notifications').select('id', { count: 'exact', head: true })
      .eq('user_id', user.id).eq('read', false)
      .then(({ count: c }) => setUnread(c || 0))
    count()
    const onFocus = () => count()
    window.addEventListener('focus', onFocus)
    const ch = supabase.channel('notifs')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, () => count())
      .subscribe()
    return () => { window.removeEventListener('focus', onFocus); supabase.removeChannel(ch) }
  }, [user?.id])

  const notify = useCallback((txt) => {
    setToast(txt)
    setTimeout(() => setToast(null), 2600)
  }, [])

  const logout = async () => {
    await supabase.auth.signOut()
    setTab('feed'); setView('main')
  }

  if (session === undefined) return <div className="app" style={{ alignItems: 'center', justifyContent: 'center' }}><span className="spinner"></span></div>

  let screen
  if (!user) {
    screen = <AuthFlow />
  } else if (!profile) {
    screen = <div className="scr" style={{ alignItems: 'center', justifyContent: 'center' }}><span className="spinner"></span></div>
  } else if (view === 'notifs') {
    screen = <Notifs user={user} onBack={() => { setView('main'); setUnread(0) }} />
  } else if (view === 'article' && article) {
    screen = <Article art={article} onBack={() => setView('main')} />
  } else {
    const inner =
      tab === 'feed' ? <Feed user={user} profile={profile} notify={notify} unread={unread} onOpenNotifs={() => setView('notifs')} /> :
      tab === 'blog' ? <Blog profile={profile} notify={notify} onOpen={a => { setArticle(a); setView('article') }} /> :
      tab === 'gallery' ? <Gallery profile={profile} /> :
      <Profile user={user} profile={profile} setProfile={setProfile} onLogout={logout} notify={notify} />
    screen = <>{inner}<TabBar tab={tab} setTab={setTab} /></>
  }

  return (
    <div className="app" style={{ position: 'relative' }}>
      {toast && <div className="toast">🔔 {toast}</div>}
      {screen}
    </div>
  )
}

function TabBar({ tab, setTab }) {
  const tabs = [
    { k: 'feed', l: 'Feed', ic: ICONS.home },
    { k: 'blog', l: 'Racconti', ic: ICONS.book },
    { k: 'gallery', l: 'Galleria', ic: ICONS.leaf },
    { k: 'profile', l: 'Profilo', ic: ICONS.user },
  ]
  return (
    <div className="tabbar">
      {tabs.map(t => (
        <button key={t.k} className={'tab' + (tab === t.k ? ' on' : '')} onClick={() => setTab(t.k)}>
          <Ic d={t.ic} size={23} sw={tab === t.k ? 2.3 : 1.8} />
          {t.l}
        </button>
      ))}
    </div>
  )
}
