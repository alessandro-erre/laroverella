import { useState, useEffect, useCallback } from 'react'
import { supabase, EMOJIS, timeAgo, meseLabel, uploadMedia, deleteMedia } from '../lib/supabase'
import { Ic, ICONS, LeafIcon, LogoMark, APP_NAME, APP_CLAIM } from './icons'
import { SourcePick, Cropper } from './MediaPicker'

const PAGE = 5

export default function Feed({ user, profile, notify, unread, onOpenNotifs }) {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [end, setEnd] = useState(false)
  const [composer, setComposer] = useState(false)

  const load = useCallback(async (from = 0) => {
    setLoading(true)
    let { data, error } = await supabase
      .from('posts')
      .select('*, profiles(name, avatar), comments(id, text, created_at, profiles(name, avatar)), reactions(emoji, user_id)')
      .order('created_at', { ascending: false })
      .range(from, from + PAGE - 1)
    if (error) {
      console.error('Feed:', error.message)
      // fallback: carica post, profili, commenti e reazioni con query separate
      const r = await supabase.from('posts').select('*')
        .order('created_at', { ascending: false }).range(from, from + PAGE - 1)
      if (r.error) { notify('Errore nel caricamento del feed: ' + r.error.message) }
      const rows = r.data || []
      const postIds = rows.map(p => p.id)
      const [cm, rx] = await Promise.all([
        supabase.from('comments').select('id, post_id, user_id, text, created_at').in('post_id', postIds),
        supabase.from('reactions').select('post_id, emoji, user_id').in('post_id', postIds),
      ])
      const uids = [...new Set([...rows.map(p => p.author_id), ...(cm.data || []).map(c => c.user_id)])]
      const pr = await supabase.from('profiles').select('id, name, avatar').in('id', uids)
      const pmap = Object.fromEntries((pr.data || []).map(x => [x.id, x]))
      data = rows.map(p => ({
        ...p,
        profiles: pmap[p.author_id] || null,
        comments: (cm.data || []).filter(c => c.post_id === p.id).map(c => ({ ...c, profiles: pmap[c.user_id] || null })),
        reactions: (rx.data || []).filter(x => x.post_id === p.id),
      }))
    }
    if (data) {
      if (data.length < PAGE) setEnd(true)
      setPosts(p => from === 0 ? data : [...p, ...data])
    }
    setLoading(false)
  }, [notify])

  useEffect(() => { load(0) }, [load])

  // realtime: nuovo post → ricarica la testa del feed
  useEffect(() => {
    const ch = supabase.channel('feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, () => {
        notify('Nuovo post dal Casale 🌳'); load(0)
      })
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [load, notify])

  const toggleReaction = async (post, emoji) => {
    const mine = post.reactions.some(r => r.emoji === emoji && r.user_id === user.id)
    // aggiornamento ottimistico
    setPosts(ps => ps.map(p => p.id !== post.id ? p : {
      ...p,
      reactions: mine ? p.reactions.filter(r => !(r.emoji === emoji && r.user_id === user.id)) : [...p.reactions, { emoji, user_id: user.id }],
    }))
    if (mine) await supabase.from('reactions').delete().match({ post_id: post.id, user_id: user.id, emoji })
    else await supabase.from('reactions').insert({ post_id: post.id, user_id: user.id, emoji })
  }

  const addComment = async (post, txt) => {
    const { data, error } = await supabase.from('comments')
      .insert({ post_id: post.id, user_id: user.id, text: txt })
      .select('id, text, created_at').single()
    if (error) return notify('Errore nel commento, riprova')
    setPosts(ps => ps.map(p => p.id !== post.id ? p : {
      ...p, comments: [...p.comments, { ...data, profiles: { name: profile.name, avatar: profile.avatar } }],
    }))
    notify('Commento pubblicato ✓')
  }

  const removePost = async (post) => {
    if (!window.confirm('Eliminare questo post? Sparirà anche dalla galleria.')) return
    const { error } = await supabase.from('posts').delete().eq('id', post.id)
    if (error) return notify('Errore: ' + error.message)
    if (post.media_url) await deleteMedia(post.media_url)
    setPosts(ps => ps.filter(p => p.id !== post.id))
    notify('Post eliminato ✓')
  }

  const publish = async (txt, file) => {
    try {
      let media_url = null, media_type = null
      if (file) {
        media_url = await uploadMedia(file)
        media_type = file.type.startsWith('video') ? 'video' : 'image'
      }
      const { error } = await supabase.from('posts').insert({ author_id: user.id, text: txt, media_url, media_type })
      if (error) throw error
      setComposer(false)
      load(0)
    } catch (e) {
      notify('Errore nella pubblicazione: ' + e.message)
    }
  }

  return (
    <div className="scr">
      <div className="tb">
        <div className="tb-brand">
          <LogoMark size={34} />
          <div className="tb-brand-txt">
            <span className="t">{APP_NAME}</span>
            <span className="s">{APP_CLAIM}</span>
          </div>
        </div>
        <button className="tb-ic" onClick={onOpenNotifs}>
          <Ic d={ICONS.bell} size={19} />
          {unread > 0 && <span className="tb-badge">{unread}</span>}
        </button>
      </div>
      {profile.is_admin && (
        <button className="composer" onClick={() => setComposer(true)}>
          <span className="ava">{profile.avatar}</span>
          Racconta qualcosa…
          <span style={{ marginLeft: 'auto', color: 'var(--a-green)' }}><Ic d={ICONS.cam} size={20} /></span>
        </button>
      )}
      {posts.map((p, i) => {
        const mese = meseLabel(p.created_at)
        const nuovoMese = i === 0 || mese !== meseLabel(posts[i - 1].created_at)
        return (
          <div key={p.id}>
            {nuovoMese && <div className="mese-sep"><span>{mese}</span></div>}
            <Post p={p} user={user} profile={profile} onReact={e => toggleReaction(p, e)} onComment={txt => addComment(p, txt)} onDelete={() => removePost(p)} />
          </div>
        )
      })}
      {loading && <div style={{ padding: 30 }}><span className="spinner"></span></div>}
      {!loading && posts.length === 0 && <div className="empty"><div className="e">🌱</div>Ancora nessun post.<br />{profile.is_admin ? 'Pubblica il primo!' : 'Torna presto a trovarci.'}</div>}
      {!loading && !end && posts.length > 0 && <button className="load-more" onClick={() => load(posts.length)}>Carica altri post</button>}
      {end && posts.length > 0 && <div className="empty" style={{ paddingTop: 10 }}><div className="e">🌰</div>Sei arrivato all'inizio della storia.</div>}
      {composer && <Composer onClose={() => setComposer(false)} onPublish={publish} />}
    </div>
  )
}

function Post({ p, user, profile, onReact, onComment, onDelete }) {
  const [cmt, setCmt] = useState('')
  const [pop, setPop] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const liked = p.reactions.some(r => r.user_id === user.id)
  const totReactions = p.reactions.length
  const like = () => { setPop(true); setTimeout(() => setPop(false), 500); onReact('❤️') }
  const comments = showAll ? p.comments : p.comments.slice(0, 2)
  const emojiCount = (e) => p.reactions.filter(r => r.emoji === e).length
  const mine = (e) => p.reactions.some(r => r.emoji === e && r.user_id === user.id)
  return (
    <div className="post">
      <div className="post-h">
        <span className="ava">{p.profiles?.avatar || '🌳'}</span>
        <div>
          <div className="n">{p.profiles?.name || 'Admin'} <span className="chip-admin">Admin</span></div>
          <div className="d">{timeAgo(p.created_at)}</div>
        </div>
        {profile.is_admin && (
          <button className="tb-ic" style={{ marginLeft: 'auto', width: 32, height: 32, color: 'var(--a-terra)' }} onClick={onDelete} title="Elimina post">
            <Ic d={ICONS.trash} size={15} />
          </button>
        )}
      </div>
      <p className="post-txt">{p.text}</p>
      {p.media_url && (
        <div className="post-media">
          {p.media_type === 'video'
            ? <video src={p.media_url} controls playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <img src={p.media_url} alt="" loading="lazy" />}
        </div>
      )}
      <div className="post-acts">
        <button className={'react' + (liked ? ' on' : '') + (pop ? ' pop' : '')} onClick={like}>
          <span className="h"><LeafIcon size={19} filled={liked} /></span>
          {totReactions || ''}
        </button>
        <button className="react" onClick={() => document.getElementById(`cmt-${p.id}`)?.focus()}>
          <Ic d={ICONS.chat} size={19} />
          {p.comments.length || ''}
        </button>
      </div>
      <div className="cmt-strip">
        {comments.map(c => (
          <div key={c.id} className="cmt">
            <span className="ava" style={{ width: 30, height: 30, fontSize: 15 }}>{c.profiles?.avatar || '🦊'}</span>
            <div className="b"><div className="n">{c.profiles?.name || 'Utente'}</div>{c.text}</div>
          </div>
        ))}
        {p.comments.length > 2 && !showAll && (
          <button className="a-link" style={{ padding: '0 0 10px', display: 'block' }} onClick={() => setShowAll(true)}>Vedi tutti i {p.comments.length} commenti</button>
        )}
        <div className="cmt-in">
          <span className="ava" style={{ width: 30, height: 30, fontSize: 15 }}>{profile.avatar}</span>
          <input id={`cmt-${p.id}`} value={cmt} onChange={e => setCmt(e.target.value)} placeholder="Scrivi un commento…"
            onKeyDown={e => { if (e.key === 'Enter' && cmt.trim()) { onComment(cmt.trim()); setCmt('') } }} />
          <button className="cmt-send" disabled={!cmt.trim()} onClick={() => { onComment(cmt.trim()); setCmt('') }}><Ic d={ICONS.send} size={15} /></button>
        </div>
      </div>
    </div>
  )
}

function Composer({ onClose, onPublish }) {
  const [txt, setTxt] = useState('')
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [toCrop, setToCrop] = useState(null)
  const [busy, setBusy] = useState(false)

  const pick = (f) => {
    if (f.type.startsWith('video')) { setFile(f); setPreview(null); return }
    setToCrop(f)
  }
  const cropped = (f) => {
    setToCrop(null); setFile(f)
    setPreview(URL.createObjectURL(f))
  }
  const clear = () => { setFile(null); setPreview(null) }

  return (
    <>
      <div className="sheet-bk" onClick={onClose}></div>
      <div className="sheet">
        <div className="grab"></div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h3 style={{ fontSize: 17 }}>Nuovo post</h3>
          <button className="tb-ic" onClick={onClose} style={{ width: 34, height: 34 }}><Ic d={ICONS.x} size={16} /></button>
        </div>
        <textarea value={txt} onChange={e => setTxt(e.target.value)} placeholder="Cosa succede al casale oggi?" autoFocus />
        {!file && <SourcePick onFile={pick} />}
        {file && (
          <div className="media-prev">
            {preview
              ? <img src={preview} alt="" />
              : <div className="vid-note"><Ic d={ICONS.cam} size={18} /> {file.name.slice(0, 28)}</div>}
            <div className="media-prev-acts">
              {preview && <button className="chip-act" onClick={() => setToCrop(file)}><Ic d={ICONS.pencil} size={14} /> Ritaglia</button>}
              <button className="chip-act" onClick={clear}><Ic d={ICONS.x} size={14} /> Rimuovi</button>
            </div>
          </div>
        )}
        <button className="a-btn" disabled={!txt.trim() || busy} onClick={async () => { setBusy(true); await onPublish(txt.trim(), file); setBusy(false) }}>
          {busy ? <span className="spinner" style={{ borderTopColor: '#fff' }}></span> : 'Pubblica 🌿'}
        </button>
      </div>
      {toCrop && <Cropper file={toCrop} onCancel={() => setToCrop(null)} onDone={cropped} />}
    </>
  )
}
