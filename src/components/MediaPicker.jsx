import { useState, useRef, useEffect, useCallback } from 'react'
import { Ic, ICONS } from './icons'

export const RATIOS = [
  { k: '4:5', l: 'Verticale', v: 4 / 5 },
  { k: '1:1', l: 'Quadrato', v: 1 },
  { k: '4:3', l: 'Orizzontale', v: 4 / 3 },
]

// Scelta sorgente: fotocamera o galleria del telefono
export function SourcePick({ onFile, video = true }) {
  return (
    <div style={{ display: 'flex', gap: 10 }}>
      <PickBtn label="Scatta foto" icon={ICONS.cam} accept="image/*" capture="environment" onFile={onFile} />
      <PickBtn label={video ? 'Foto o video' : 'Dalla galleria'} icon={ICONS.leaf} accept={video ? 'image/*,video/*' : 'image/*'} onFile={onFile} />
    </div>
  )
}

function PickBtn({ label, icon, accept, capture, onFile }) {
  return (
    <label className="pick-btn">
      <Ic d={icon} size={20} />
      {label}
      <input type="file" accept={accept} capture={capture} hidden onChange={e => { const f = e.target.files[0]; e.target.value = ''; if (f) onFile(f) }} />
    </label>
  )
}

// Ritaglio: trascina per spostare, pizzica o usa lo slider per lo zoom
export function Cropper({ file, ratio: initRatio = 4 / 5, ratios = RATIOS, onCancel, onDone }) {
  const [src, setSrc] = useState(null)
  const [nat, setNat] = useState(null)
  const [ratio, setRatio] = useState(initRatio)
  const [zoom, setZoom] = useState(1)
  const [off, setOff] = useState({ x: 0, y: 0 })
  const [frame, setFrame] = useState({ w: 300, h: 375 })
  const [busy, setBusy] = useState(false)
  const box = useRef(null)
  const drag = useRef(null)

  useEffect(() => {
    const u = URL.createObjectURL(file)
    setSrc(u)
    const im = new Image()
    im.onload = () => setNat({ w: im.naturalWidth, h: im.naturalHeight })
    im.src = u
    return () => URL.revokeObjectURL(u)
  }, [file])

  // dimensioni del riquadro di ritaglio
  useEffect(() => {
    const fit = () => {
      const avail = box.current?.clientWidth || 300
      const maxH = Math.min(window.innerHeight * 0.46, 460)
      let w = avail, h = w / ratio
      if (h > maxH) { h = maxH; w = h * ratio }
      setFrame({ w, h })
    }
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [ratio])

  const base = nat ? Math.max(frame.w / nat.w, frame.h / nat.h) : 1
  const total = base * zoom
  const dispW = nat ? nat.w * total : 0
  const dispH = nat ? nat.h * total : 0

  const clamp = useCallback((o, dW = dispW, dH = dispH) => ({
    x: Math.max(-(dW - frame.w) / 2, Math.min((dW - frame.w) / 2, o.x)),
    y: Math.max(-(dH - frame.h) / 2, Math.min((dH - frame.h) / 2, o.y)),
  }), [dispW, dispH, frame.w, frame.h])

  useEffect(() => { setOff(o => clamp(o)) }, [clamp])
  useEffect(() => { setZoom(1); setOff({ x: 0, y: 0 }) }, [ratio])

  const start = (e) => {
    const t = e.touches ? e.touches[0] : e
    if (e.touches && e.touches.length === 2) {
      const [a, b] = e.touches
      drag.current = { pinch: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY), z0: zoom }
      return
    }
    drag.current = { x: t.clientX, y: t.clientY, o: off }
  }
  const move = (e) => {
    const d = drag.current
    if (!d) return
    if (d.pinch && e.touches?.length === 2) {
      const [a, b] = e.touches
      const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)
      setZoom(Math.max(1, Math.min(4, d.z0 * (dist / d.pinch))))
      return
    }
    if (d.o) {
      const t = e.touches ? e.touches[0] : e
      setOff(clamp({ x: d.o.x + (t.clientX - d.x), y: d.o.y + (t.clientY - d.y) }))
    }
  }
  const end = () => { drag.current = null }

  const confirm = async () => {
    setBusy(true)
    try {
      const im = new Image()
      im.src = src
      await im.decode()
      const OUT = 1280
      const cw = OUT, ch = Math.round(OUT / ratio)
      const c = document.createElement('canvas')
      c.width = cw; c.height = ch
      const ctx = c.getContext('2d')
      const sx = (dispW / 2 - off.x - frame.w / 2) / total
      const sy = (dispH / 2 - off.y - frame.h / 2) / total
      const sw = frame.w / total, sh = frame.h / total
      ctx.drawImage(im, sx, sy, sw, sh, 0, 0, cw, ch)
      const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.88))
      const out = new File([blob], (file.name || 'foto').replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' })
      onDone(out)
    } catch (err) {
      console.error(err)
      onDone(file)
    }
    setBusy(false)
  }

  return (
    <div className="crop-ov">
      <div className="crop-top">
        <button className="a-link" onClick={onCancel}>Annulla</button>
        <span style={{ fontSize: 13, fontWeight: 700 }}>Scegli l'inquadratura</span>
        <button className="a-link" onClick={confirm} disabled={busy || !nat}>{busy ? '…' : 'Applica'}</button>
      </div>
      <div className="crop-stage" ref={box}>
        <div className="crop-frame" style={{ width: frame.w, height: frame.h }}
          onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
          onTouchStart={start} onTouchMove={move} onTouchEnd={end}>
          {src && nat && (
            <img src={src} alt="" draggable="false" style={{
              position: 'absolute', width: dispW, height: dispH,
              left: frame.w / 2 + off.x - dispW / 2, top: frame.h / 2 + off.y - dispH / 2,
            }} />
          )}
          <div className="crop-grid"></div>
        </div>
      </div>
      <div className="crop-ctrl">
        <div className="cat-row" style={{ padding: '0 0 4px' }}>
          {ratios.map(r => <button key={r.k} className={'cat' + (ratio === r.v ? ' on' : '')} onClick={() => setRatio(r.v)}>{r.l}</button>)}
        </div>
        <div className="crop-zoom">
          <Ic d={ICONS.leaf} size={15} />
          <input type="range" min="1" max="4" step="0.01" value={zoom} onChange={e => setZoom(+e.target.value)} />
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--a-muted)', textAlign: 'center' }}>Trascina la foto per spostarla, pizzica o usa lo slider per lo zoom.</div>
      </div>
    </div>
  )
}
