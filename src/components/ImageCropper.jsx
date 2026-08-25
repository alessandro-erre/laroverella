import { useState, useRef, useEffect, useCallback } from 'react'
import { Ic, ICONS } from './icons'

// Ritaglio: l'utente sposta e ingrandisce la foto dentro la cornice.
// Restituisce un File jpeg già ritagliato nel formato richiesto.
export default function ImageCropper({ file, aspect = 4 / 3, title = 'Inquadra la foto', onCancel, onDone }) {
  const [src, setSrc] = useState(null)
  const [nat, setNat] = useState(null)         // { w, h }
  const [box, setBox] = useState({ w: 0, h: 0 })
  const [z, setZ] = useState(1)
  const [off, setOff] = useState({ x: 0, y: 0 })
  const [busy, setBusy] = useState(false)
  const frame = useRef(null)
  const ptrs = useRef(new Map())
  const start = useRef(null)

  useEffect(() => {
    const u = URL.createObjectURL(file)
    setSrc(u)
    return () => URL.revokeObjectURL(u)
  }, [file])

  useEffect(() => {
    const measure = () => {
      const el = frame.current
      if (el) setBox({ w: el.clientWidth, h: el.clientWidth / aspect })
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [aspect, src])

  const base = nat && box.w ? Math.max(box.w / nat.w, box.h / nat.h) : 1
  const scale = base * z
  const dw = nat ? nat.w * scale : 0
  const dh = nat ? nat.h * scale : 0

  const clamp = useCallback((o) => ({
    x: Math.min(0, Math.max(box.w - dw, o.x)),
    y: Math.min(0, Math.max(box.h - dh, o.y)),
  }), [box.w, box.h, dw, dh])

  // centra quando cambiano immagine o zoom
  useEffect(() => {
    if (!nat || !box.w) return
    setOff(o => clamp({ x: o.x || (box.w - dw) / 2, y: o.y || (box.h - dh) / 2 }))
  }, [nat, box.w, box.h, dw, dh, clamp])

  const dist = () => {
    const [a, b] = [...ptrs.current.values()]
    return Math.hypot(a.x - b.x, a.y - b.y)
  }

  const down = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    start.current = { off, z, d: ptrs.current.size === 2 ? dist() : 0, x: e.clientX, y: e.clientY }
  }
  const move = (e) => {
    if (!ptrs.current.has(e.pointerId) || !start.current) return
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (ptrs.current.size === 2 && start.current.d) {
      const k = dist() / start.current.d
      setZ(Math.min(4, Math.max(1, start.current.z * k)))
    } else {
      setOff(clamp({ x: start.current.off.x + (e.clientX - start.current.x), y: start.current.off.y + (e.clientY - start.current.y) }))
    }
  }
  const up = (e) => {
    ptrs.current.delete(e.pointerId)
    start.current = ptrs.current.size ? { off, z, d: 0, x: e.clientX, y: e.clientY } : null
  }

  const confirm = async () => {
    setBusy(true)
    const img = new Image()
    img.src = src
    await img.decode().catch(() => {})
    const outW = 1400
    const outH = Math.round(outW / aspect)
    const c = document.createElement('canvas')
    c.width = outW; c.height = outH
    const ctx = c.getContext('2d')
    ctx.imageSmoothingQuality = 'high'
    const sx = -off.x / scale, sy = -off.y / scale
    const sw = box.w / scale, sh = box.h / scale
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outW, outH)
    const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.88))
    setBusy(false)
    onDone(new File([blob], 'foto.jpg', { type: 'image/jpeg' }))
  }

  return (
    <>
      <div className="sheet-bk" style={{ zIndex: 60 }} onClick={onCancel}></div>
      <div className="sheet crop-sheet" style={{ zIndex: 61 }}>
        <div className="grab"></div>
        <div className="crop-head">
          <h3 style={{ fontSize: 17 }}>{title}</h3>
          <button className="tb-ic" onClick={onCancel} style={{ width: 34, height: 34 }}><Ic d={ICONS.x} size={16} /></button>
        </div>
        <div className="crop-frame" ref={frame} style={{ height: box.h || undefined, aspectRatio: box.h ? undefined : String(aspect) }}
          onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
          {src && (
            <img src={src} alt="" draggable="false" onLoad={e => setNat({ w: e.target.naturalWidth, h: e.target.naturalHeight })}
              style={{ position: 'absolute', left: off.x, top: off.y, width: dw || 'auto', height: dh || 'auto', userSelect: 'none', touchAction: 'none' }} />
          )}
          <div className="crop-grid"></div>
        </div>
        <div className="crop-zoom">
          <Ic d={ICONS.leaf} size={15} />
          <input type="range" min="1" max="4" step="0.01" value={z} onChange={e => setZ(parseFloat(e.target.value))} />
          <span>{Math.round(z * 100)}%</span>
        </div>
        <div className="crop-hint">Trascina per spostare · pizzica o usa il cursore per ingrandire</div>
        <button className="a-btn" disabled={!nat || busy} onClick={confirm}>
          {busy ? <span className="spinner" style={{ borderTopColor: '#fff' }}></span> : 'Usa questa inquadratura'}
        </button>
      </div>
    </>
  )
}
