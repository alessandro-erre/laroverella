import { useState } from 'react'
import { supabase, uploadMedia } from '../lib/supabase'
import { Ic, ICONS } from './icons'
import ImageCropper from './ImageCropper'
import PhotoPicker from './PhotoPicker'

export const ART_CATS = ['Storia', 'Il Casale', 'Natura', 'Ritiri']

export default function ArticleEditor({ art, onClose, onSaved, notify }) {
  const [cat, setCat] = useState(art?.category || ART_CATS[0])
  const [title, setTitle] = useState(art?.title || '')
  const [excerpt, setExcerpt] = useState(art?.excerpt || '')
  const [body, setBody] = useState(art?.body || '')
  const [published, setPublished] = useState(art?.published ?? true)
  const [cover, setCover] = useState(null)          // File ritagliato
  const [coverPrev, setCoverPrev] = useState(art?.cover_url || null)
  const [raw, setRaw] = useState(null)              // file in attesa di ritaglio
  const [busy, setBusy] = useState(false)

  const minutes = Math.max(1, Math.round(body.trim().split(/\s+/).filter(Boolean).length / 180))

  const save = async () => {
    setBusy(true)
    try {
      let cover_url = art?.cover_url || null
      if (cover) cover_url = await uploadMedia(cover)
      const row = { category: cat, title: title.trim(), excerpt: excerpt.trim(), body: body.trim(), cover_url, reading_minutes: minutes, published }
      const q = art ? supabase.from('articles').update(row).eq('id', art.id) : supabase.from('articles').insert(row)
      const { error } = await q
      if (error) throw error
      notify(art ? 'Racconto aggiornato ✓' : published ? 'Racconto pubblicato ✓' : 'Bozza salvata ✓')
      onSaved()
    } catch (e) {
      notify('Errore nel salvataggio: ' + e.message)
    }
    setBusy(false)
  }

  return (
    <>
      <div className="sheet-bk" onClick={onClose}></div>
      <div className="sheet" style={{ maxHeight: '92%', overflowY: 'auto' }}>
        <div className="grab"></div>
        <div className="crop-head">
          <h3 style={{ fontSize: 17 }}>{art ? 'Modifica racconto' : 'Nuovo racconto'}</h3>
          <button className="tb-ic" onClick={onClose} style={{ width: 34, height: 34 }}><Ic d={ICONS.x} size={16} /></button>
        </div>

        <div className="ed-lbl">Categoria</div>
        <div className="cat-row" style={{ padding: '0 0 4px' }}>
          {ART_CATS.map(c => <button key={c} className={'cat' + (cat === c ? ' on' : '')} onClick={() => setCat(c)}>{c}</button>)}
        </div>

        <div className="ed-lbl">Titolo</div>
        <input className="ed-in" value={title} onChange={e => setTitle(e.target.value)} placeholder="La quercia che guarda la valle" />

        <div className="ed-lbl">Anteprima <span>una o due righe che invogliano a leggere</span></div>
        <textarea className="ed-in" style={{ minHeight: 62 }} value={excerpt} onChange={e => setExcerpt(e.target.value)} placeholder="Da quasi tre secoli veglia sul casale…" />

        <div className="ed-lbl">Racconto <span>riga vuota = nuovo paragrafo · “## ” = sottotitolo</span></div>
        <textarea className="ed-in" style={{ minHeight: 190 }} value={body} onChange={e => setBody(e.target.value)} placeholder={'C\'è un momento, al tramonto…\n\n## Le radici\nQuando il nonno piantò…'} />
        <div className="crop-hint" style={{ textAlign: 'left', paddingTop: 0 }}>📖 {minutes} min di lettura</div>

        <div className="ed-lbl">Copertina</div>
        {coverPrev && <div className="ed-cover"><img src={coverPrev} alt="" /></div>}
        <PhotoPicker onPick={f => setRaw(f)} compact />

        <button className="p-row ed-pub" onClick={() => setPublished(!published)}>
          <span className="ic">{published ? '🌿' : '📝'}</span>
          <span className="tx">{published ? 'Pubblicato' : 'Bozza'}<span className="s">{published ? 'Visibile a tutta la community' : 'Visibile solo a te'}</span></span>
          <span className={'sw' + (published ? ' on' : '')}></span>
        </button>

        <button className="a-btn" disabled={!title.trim() || !body.trim() || busy} onClick={save}>
          {busy ? <span className="spinner" style={{ borderTopColor: '#fff' }}></span> : art ? 'Salva modifiche' : published ? 'Pubblica racconto 🌿' : 'Salva bozza'}
        </button>
      </div>
      {raw && <ImageCropper file={raw} aspect={16 / 9} title="Inquadra la copertina" onCancel={() => setRaw(null)}
        onDone={f => { setCover(f); setCoverPrev(URL.createObjectURL(f)); setRaw(null) }} />}
    </>
  )
}
