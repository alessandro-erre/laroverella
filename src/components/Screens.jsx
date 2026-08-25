import { useState, useEffect } from 'react'
import { supabase, AVATARS, timeAgo, deleteMedia } from '../lib/supabase'
import { Ic, ICONS } from './icons'
import { SourcePick, Cropper, RATIOS } from './MediaPicker'
import { uploadMedia } from '../lib/supabase'
import { pushSupported, pushBlockedReason, isPushEnabled, enablePush, disablePush } from '../lib/push'

// ---------- Notifiche ----------
export function Notifs({ user, onBack }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)
  useEffect(() => {
    let alive = true
    supabase.from('notifications').select('*').eq('user_id', user.id)
      .order('created_at', { ascending: false }).limit(40)
      .then(({ data, error }) => {
        if (!alive) return
        if (error) { console.error('notifiche:', error.message); setErr(error.message) }
        setItems(data || [])
        setLoading(false)
        if (data?.some(n => !n.read)) {
          supabase.from('notifications').update({ read: true })
            .eq('user_id', user.id).eq('read', false)
            .then(({ error: e }) => e && console.error('notifiche read:', e.message))
        }
      })
    return () => { alive = false }
  }, [user.id])

  const label = (n) => {
    const p = n.payload || {}
    if (n.type === 'new_post') return `Nuovo post dal Casale: “${p.preview || ''}…”`
    if (n.type === 'new_comment') return `${p.who || 'Un membro'} ha commentato: “${p.preview || ''}…”`
    if (n.type === 'new_reaction') return `${p.who || 'Un membro'} ha reagito ${p.emoji || '🌿'} al tuo post`
    if (n.type === 'new_article') return `Nuovo racconto: “${p.title || ''}”`
    if (n.type === 'comment_reply') return 'Nuova risposta a un tuo commento'
    return 'Novità dalla community'
  }
  const emoji = (n) => n.type === 'new_comment' || n.type === 'comment_reply' ? '💬'
    : n.type === 'new_reaction' ? '🌿' : n.type === 'new_article' ? '📖' : '🌳'

  return (
    <div className="scr">
      <div className="tb">
        <button className="tb-ic" onClick={onBack}><Ic d={ICONS.back} size={18} /></button>
        <span className="t" style={{ fontSize: 20 }}>Notifiche</span>
        <span style={{ width: 40 }}></span>
      </div>
      {loading && <div style={{ padding: 30, textAlign: 'center' }}><span className="spinner"></span></div>}
      {err && <div className="empty"><div className="e">⚠️</div>Non riesco a leggere le notifiche.<br /><span style={{ fontSize: 12 }}>{err}</span></div>}
      {!loading && !err && items.length === 0 && (
        <div className="empty"><div className="e">🔔</div>Nessuna notifica per ora.<br />
          <span style={{ fontSize: 12.5 }}>Arrivano quando qualcuno pubblica, commenta o reagisce.</span>
        </div>
      )}
      {items.map(n => (
        <div key={n.id} className={'notif' + (!n.read ? ' unread' : '')}>
          <span className="ava" style={{ width: 34, height: 34, fontSize: 16 }}>{emoji(n)}</span>
          <div className="tx">{label(n)}<div className="tm">{timeAgo(n.created_at)}</div></div>
        </div>
      ))}
    </div>
  )
}

// ---------- Blog ----------
const CATS = ['Tutti', 'Storia', 'Il Casale', 'Natura', 'Ritiri']

export function Blog({ onOpen, profile, notify }) {
  const [cat, setCat] = useState('Tutti')
  const [arts, setArts] = useState([])
  const [loading, setLoading] = useState(true)
  const [editor, setEditor] = useState(false)
  const admin = !!profile?.is_admin
  const load = () => {
    let q = supabase.from('articles').select('*')
    if (!admin) q = q.eq('published', true)
    return q.order('created_at', { ascending: false })
      .then(({ data }) => { setArts(data || []); setLoading(false) })
  }
  useEffect(() => { load() }, [admin])
  const removeArt = async (a) => {
    if (!window.confirm('Eliminare il racconto “' + a.title + '”?')) return
    const { error } = await supabase.from('articles').delete().eq('id', a.id)
    if (error) return window.alert('Errore: ' + error.message)
    if (a.cover_url) await deleteMedia(a.cover_url)
    setArts(x => x.filter(y => y.id !== a.id))
  }
  const shown = arts.filter(a => cat === 'Tutti' || a.category === cat)
  return (
    <div className="scr">
      <div className="tb"><span className="t">Racconti</span></div>
      <div className="cat-row">
        {CATS.map(c => <button key={c} className={'cat' + (cat === c ? ' on' : '')} onClick={() => setCat(c)}>{c}</button>)}
      </div>
      {admin && (
        <button className="cta-new" onClick={() => setEditor(true)}>
          <span className="ic"><Ic d={ICONS.plus} size={17} /></span>
          <span className="tx">Scrivi un racconto<span className="s">Scegli la categoria e pubblica</span></span>
        </button>
      )}
      {loading && <div style={{ padding: 30 }}><span className="spinner"></span></div>}
      {!loading && shown.length === 0 && <div className="empty"><div className="e">📖</div>Nessun racconto in questa categoria.</div>}
      {shown.map(a => (
        <div key={a.id} className="art" onClick={() => onOpen(a)} role="button" tabIndex={0} style={{ textAlign: 'left', cursor: 'pointer' }}>
          {a.cover_url && <div className="im"><img src={a.cover_url} alt="" loading="lazy" /><span className="cat-tag">{a.category}</span></div>}
          <div className="bd">
            <h3>{a.title}</h3>
            <p>{a.excerpt}</p>
            <div className="meta">
              <span>📖 {a.reading_minutes} min di lettura</span>
              <span>{new Date(a.created_at).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
            </div>
            {admin && (
              <div className="art-admin">
                {!a.published && <span className="chip-draft">Bozza</span>}
                <button className="chip-act" onClick={e => { e.stopPropagation(); removeArt(a) }}><Ic d={ICONS.trash} size={13} /> Elimina</button>
              </div>
            )}
          </div>
        </div>
      ))}
      {editor && <ArticleEditor onClose={() => setEditor(false)} notify={notify} onSaved={() => { setEditor(false); setLoading(true); load() }} />}
    </div>
  )
}

// ---------- Editor racconti (solo admin) ----------
function ArticleEditor({ onClose, onSaved, notify }) {
  const cats = CATS.filter(c => c !== 'Tutti')
  const [cat, setCat] = useState(cats[0])
  const [title, setTitle] = useState('')
  const [excerpt, setExcerpt] = useState('')
  const [body, setBody] = useState('')
  const [cover, setCover] = useState(null)
  const [preview, setPreview] = useState(null)
  const [toCrop, setToCrop] = useState(null)
  const [published, setPublished] = useState(true)
  const [busy, setBusy] = useState(false)
  const minutes = Math.max(1, Math.round(body.trim().split(/\s+/).filter(Boolean).length / 180))
  const say = notify || window.alert

  const save = async () => {
    setBusy(true)
    try {
      let cover_url = null
      if (cover) cover_url = await uploadMedia(cover)
      const { error } = await supabase.from('articles').insert({
        category: cat, title: title.trim(),
        excerpt: excerpt.trim() || body.trim().slice(0, 140),
        body: body.trim(), cover_url, reading_minutes: minutes, published,
      })
      if (error) throw error
      say(published ? 'Racconto pubblicato ✓' : 'Bozza salvata ✓')
      onSaved()
    } catch (e) {
      say('Errore: ' + e.message)
    }
    setBusy(false)
  }

  return (
    <>
      <div className="sheet-bk" onClick={onClose} style={{ zIndex: 60 }}></div>
      <div className="sheet tall" style={{ zIndex: 61 }}>
        <div className="grab"></div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h3 style={{ fontSize: 17 }}>Nuovo racconto</h3>
          <button className="tb-ic" onClick={onClose} style={{ width: 34, height: 34 }}><Ic d={ICONS.x} size={16} /></button>
        </div>
        <div className="ed-lab">Categoria</div>
        <div className="cat-row" style={{ padding: '0 0 6px' }}>
          {cats.map(c => <button key={c} className={'cat' + (cat === c ? ' on' : '')} onClick={() => setCat(c)}>{c}</button>)}
        </div>
        <div className="ed-lab">Titolo</div>
        <input className="ed-in" value={title} onChange={e => setTitle(e.target.value)} placeholder="Es. La roverella che guarda la valle" />
        <div className="ed-lab">Sommario</div>
        <input className="ed-in" value={excerpt} onChange={e => setExcerpt(e.target.value)} placeholder="Una frase che invita a leggere" />
        <div className="ed-lab">Testo</div>
        <textarea value={body} onChange={e => setBody(e.target.value)} placeholder={'Scrivi il racconto…\n\nRiga vuota = nuovo paragrafo. Usa ## per un sottotitolo.'} style={{ minHeight: 150 }} />
        <div className="ed-lab">Foto di copertina</div>
        {!cover && <SourcePick onFile={f => setToCrop(f)} video={false} />}
        {cover && (
          <div className="media-prev">
            <img src={preview} alt="" />
            <div className="media-prev-acts">
              <button className="chip-act" onClick={() => setToCrop(cover)}><Ic d={ICONS.pencil} size={14} /> Ritaglia</button>
              <button className="chip-act" onClick={() => { setCover(null); setPreview(null) }}><Ic d={ICONS.x} size={14} /> Rimuovi</button>
            </div>
          </div>
        )}
        <div className="p-row" style={{ padding: '14px 0 4px' }}>
          <span className="tx">Pubblica subito<span className="s">{published ? 'Visibile a tutta la community' : 'Resta salvato come bozza'}</span></span>
          <button className={'sw' + (published ? ' on' : '')} onClick={() => setPublished(!published)}></button>
        </div>
        <div style={{ fontSize: 12, color: 'var(--a-muted)', marginBottom: 10 }}>📖 {minutes} min di lettura</div>
        <button className="a-btn" disabled={!title.trim() || !body.trim() || busy} onClick={save}>
          {busy ? <span className="spinner" style={{ borderTopColor: '#fff' }}></span> : published ? 'Pubblica racconto 🌿' : 'Salva bozza'}
        </button>
      </div>
      {toCrop && <Cropper file={toCrop} ratio={4 / 3} ratios={RATIOS} onCancel={() => setToCrop(null)}
        onDone={f => { setToCrop(null); setCover(f); setPreview(URL.createObjectURL(f)) }} />}
    </>
  )
}

export function Article({ art, onBack }) {
  // body: paragrafi separati da riga vuota; "## " per i titoli
  const blocks = art.body.split(/\n\n+/)
  return (
    <div className="scr" style={{ position: 'relative' }}>
      <button className="back-fab" onClick={onBack} style={{ color: 'var(--a-ink)' }}><Ic d={ICONS.back} size={18} /></button>
      <div className="art-full">
        {art.cover_url && <div className="hero-im"><img src={art.cover_url} alt="" /></div>}
        <div className="body">
          <span className="cat-tag" style={{ position: 'static', background: 'var(--a-green-soft)', display: 'inline-block', marginBottom: 10 }}>{art.category}</span>
          <h1 style={{ fontFamily: 'var(--a-display)', fontSize: 28, lineHeight: 1.1, marginBottom: 6 }}>{art.title}</h1>
          <div style={{ fontSize: 12.5, color: 'var(--a-muted)', marginBottom: 16 }}>📖 {art.reading_minutes} min di lettura</div>
          {blocks.map((b, i) => b.startsWith('## ') ? <h2 key={i}>{b.slice(3)}</h2> : <p key={i}>{b}</p>)}
        </div>
      </div>
    </div>
  )
}

// ---------- Galleria (media dei post admin) ----------
export function Gallery({ profile }) {
  const [items, setItems] = useState([])
  const [open, setOpen] = useState(null)
  const remove = async (g) => {
    if (!window.confirm('Eliminare questa foto? Verrà rimosso anche il post.')) return
    const { error } = await supabase.from('posts').delete().eq('id', g.id)
    if (error) return window.alert('Errore: ' + error.message)
    await deleteMedia(g.media_url)
    setItems(it => it.filter(x => x.id !== g.id))
    setOpen(null)
  }
  useEffect(() => {
    supabase.from('posts').select('id, text, media_url, media_type').not('media_url', 'is', null)
      .eq('media_type', 'image').order('created_at', { ascending: false }).limit(60)
      .then(({ data }) => setItems(data || []))
  }, [])
  return (
    <div className="scr">
      <div className="tb"><span className="t">Galleria</span></div>
      {items.length === 0 && <div className="empty"><div className="e">🌿</div>La galleria si popola con le foto dei post.</div>}
      <div className="gal-grid">
        {items.map(g => (
          <button key={g.id} className="gal-it" onClick={() => setOpen(g)}>
            <img src={g.media_url} alt="" loading="lazy" />
          </button>
        ))}
      </div>
      {open && (
        <>
          <div className="sheet-bk" onClick={() => setOpen(null)} style={{ zIndex: 50 }}></div>
          <div className="sheet" style={{ zIndex: 51, padding: 0, overflow: 'hidden', maxHeight: '76%' }}>
            <img src={open.media_url} alt="" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }} />
            <div style={{ padding: '14px 20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <div style={{ fontSize: 13.5 }}>{open.text.slice(0, 90)}</div>
              {profile?.is_admin && <button className="tb-ic" onClick={() => remove(open)} style={{ width: 36, height: 36, flexShrink: 0, color: 'var(--a-terra)' }} title="Elimina foto"><Ic d={ICONS.trash} size={16} /></button>}
              <button className="tb-ic" onClick={() => setOpen(null)} style={{ width: 36, height: 36, flexShrink: 0 }}><Ic d={ICONS.x} size={16} /></button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ---------- Profilo ----------
export function Profile({ user, profile, setProfile, onLogout, notify }) {
  const save = async (patch) => {
    setProfile({ ...profile, ...patch })
    await supabase.from('profiles').update(patch).eq('id', user.id)
  }
  const [activity, setActivity] = useState([])
  useEffect(() => {
    supabase.from('comments').select('text, created_at, posts(text)').eq('user_id', user.id)
      .order('created_at', { ascending: false }).limit(6)
      .then(({ data }) => setActivity(data || []))
  }, [user.id])
  return (
    <div className="scr">
      <div className="tb"><span className="t">Profilo</span></div>
      <div className="prof-head">
        <span className="ava lg">{profile.avatar}</span>
        <div style={{ textAlign: 'center' }}>
          <div className="nm">{profile.name} {profile.is_admin && <span className="chip-admin" style={{ verticalAlign: 'middle' }}>Admin</span>}</div>
          <div className="em">{user.email}</div>
        </div>
      </div>
      <div className="p-sec"><div className="h">Il tuo avatar</div></div>
      <div className="ava-pick">
        {AVATARS.map(a => (
          <button key={a} className={'ava-opt' + (profile.avatar === a ? ' on' : '')} onClick={() => save({ avatar: a })}>{a}</button>
        ))}
      </div>
      <div className="p-sec">
        <div className="h">Attività recente</div>
        <div className="p-card">
          {activity.length === 0 && <div className="empty" style={{ padding: 24 }}><div className="e">🍃</div>Ancora nessuna attività.</div>}
          {activity.map((a, i) => (
            <div key={i} className="act-it"><span>💬</span>“{a.text.slice(0, 40)}”<span className="tm">{timeAgo(a.created_at)}</span></div>
          ))}
        </div>
      </div>
      <div className="p-sec">
        <div className="h">Privacy</div>
        <div className="p-card">
          <div className="p-row">
            <span className="ic">👁️</span>
            <span className="tx">Profilo visibile<span className="s">Gli altri membri vedono nome e avatar</span></span>
            <button className={'sw' + (profile.show_profile ? ' on' : '')} onClick={() => save({ show_profile: !profile.show_profile })}></button>
          </div>
          <div className="p-row">
            <span className="ic">✉️</span>
            <span className="tx">Email visibile<span className="s">Mostra la tua email nel profilo pubblico</span></span>
            <button className={'sw' + (profile.show_email ? ' on' : '')} onClick={() => save({ show_email: !profile.show_email })}></button>
          </div>
          <div className="p-row">
            <span className="ic">🔔</span>
            <span className="tx">Notifiche nell'app<span className="s">Nuovi post, commenti e reazioni</span></span>
            <button className={'sw' + (profile.push_notifications ? ' on' : '')} onClick={() => save({ push_notifications: !profile.push_notifications })}></button>
          </div>
          <PushRow user={user} notify={notify} />
        </div>
      </div>
      <div className="p-sec" style={{ marginBottom: 24 }}>
        <div className="p-card">
          <button className="p-row" style={{ width: '100%', color: 'var(--a-terra)' }} onClick={onLogout}>
            <span className="ic" style={{ background: 'var(--a-terra-soft)' }}><Ic d={ICONS.out} size={16} /></span>
            <span className="tx" style={{ textAlign: 'left', fontWeight: 700 }}>Esci dall'account</span>
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------- Interruttore notifiche push ----------
function PushRow({ user, notify }) {
  const [on, setOn] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)
  const say = notify || window.alert

  useEffect(() => {
    if (!pushSupported()) { setMsg('Non disponibile su questo browser.'); return }
    isPushEnabled().then(setOn)
    setMsg(pushBlockedReason())
  }, [])

  const toggle = async () => {
    setBusy(true)
    try {
      if (on) { await disablePush(); setOn(false); say('Notifiche sul telefono disattivate') }
      else { await enablePush(user.id); setOn(true); setMsg(null); say('Notifiche sul telefono attive ✓') }
    } catch (e) {
      setMsg(e.message)
      say(e.message)
    }
    setBusy(false)
  }

  return (
    <div className="p-row">
      <span className="ic">📱</span>
      <span className="tx">Notifiche sul telefono
        <span className="s">{msg || (on ? 'Attive su questo dispositivo' : 'Ricevi gli avvisi anche ad app chiusa')}</span>
      </span>
      <button className={'sw' + (on ? ' on' : '')} disabled={busy} onClick={toggle}></button>
    </div>
  )
}
