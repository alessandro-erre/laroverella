import { LEAF_OFF, LEAF_OFF_VB, LEAF_ON_OUTLINE, LEAF_ON_FILL, LEAF_ON_VB } from './leafPath'

export function Ic({ d, size = 22, sw = 1.9, fill = 'none' }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
}

export const ICONS = {
  home: 'M4 11 L12 4 L20 11 M6 9.5 V19 a1 1 0 0 0 1 1 H17 a1 1 0 0 0 1-1 V9.5 M10 20 v-5 a1 1 0 0 1 1-1 h2 a1 1 0 0 1 1 1 v5',
  book: 'M4 5 a2 2 0 0 1 2-2 h13 v16 H6 a2 2 0 0 0-2 2 V5 Z M4 19 a2 2 0 0 1 2-2 h13 M8 7 h7 M8 10.5 h5',
  leaf: 'M12 20.5 C 14 19.4 15.2 18.4 15 17.2 C 17.5 17.6 18.7 16.1 17.9 14.5 C 19.7 14.1 20.1 12.4 18.7 11.2 C 20.1 10 19.7 8 17.9 7.6 C 18.1 6 16.7 4.8 14.9 5.2 C 14.7 3.6 13.3 3 12 3.5 C 10.7 3 9.3 3.6 9.1 5.2 C 7.3 4.8 5.9 6 6.1 7.6 C 4.3 8 3.9 10 5.3 11.2 C 3.9 12.4 4.3 14.1 6.1 14.5 C 5.3 16.1 6.5 17.6 9 17.2 C 8.8 18.4 10 19.4 12 20.5 Z M11.6 19.6 C 9.2 21.2 6.6 22 4 22.2',
  user: 'M12 12 a4 4 0 1 0 0-8 a4 4 0 0 0 0 8 Z M4 20 c 1.5-3.5 4.5-5 8-5 s 6.5 1.5 8 5',
  bell: 'M6 9 a6 6 0 0 1 12 0 c 0 5 2 6 2 6 H4 s 2-1 2-6 M10 19 a2 2 0 0 0 4 0',
  chat: 'M4 5 a1 1 0 0 1 1-1 h14 a1 1 0 0 1 1 1 v9 a1 1 0 0 1-1 1 H9 l-4 4 v-4 H5 a1 1 0 0 1-1-1 Z',
  heart: 'M12 20 C 5 15 3 10 5.5 7 C 7.5 4.8 11 5.2 12 8 C 13 5.2 16.5 4.8 18.5 7 C 21 10 19 15 12 20 Z',
  send: 'M21 3 L10 14 M21 3 L14 21 L10 14 L3 10 Z',
  cam: 'M4 8 h3 l2-2.5 h6 L17 8 h3 a1 1 0 0 1 1 1 v9 a1 1 0 0 1-1 1 H4 a1 1 0 0 1-1-1 V9 a1 1 0 0 1 1-1 Z M12 16 a3.2 3.2 0 1 0 0-6.4 a3.2 3.2 0 0 0 0 6.4 Z',
  play: 'M8 5.5 v13 L19 12 Z',
  back: 'M15 5 L8 12 L15 19',
  x: 'M6 6 L18 18 M18 6 L6 18',
  plus: 'M12 5 v14 M5 12 h14',
  pencil: 'M4 20 h4 L19 9 a2 2 0 0 0 0-3 l-1-1 a2 2 0 0 0-3 0 L4 16 z',
  trash: 'M4 7 h16 M9 7 V5 a1 1 0 0 1 1-1 h4 a1 1 0 0 1 1 1 v2 M6 7 l1 13 a1 1 0 0 0 1 1 h8 a1 1 0 0 0 1-1 l1-13 M10 11 v6 M14 11 v6',
  out: 'M9 4 H5 a1 1 0 0 0-1 1 v14 a1 1 0 0 0 1 1 h4 M15 8 l4 4 -4 4 M19 12 H9',
}

export const APP_NAME = 'La roverella di Patrica'
export const APP_CLAIM = 'La community'

export function LogoMark({ size = 54 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ color: 'var(--a-green)', flexShrink: 0 }}>
      <path d="M 12 22 L 12 14" stroke="currentColor" strokeWidth="1.4" />
      <ellipse cx="12" cy="9" rx="8" ry="7" fill="currentColor" opacity="0.9" />
      <ellipse cx="7" cy="11" rx="4" ry="4" fill="currentColor" opacity="0.65" />
      <ellipse cx="17" cy="11" rx="4" ry="4" fill="currentColor" opacity="0.65" />
    </svg>
  )
}

export function Logo() {
  return (
    <div className="auth-logo">
      <LogoMark size={54} />
      <div className="t">{APP_NAME}</div>
      <div className="s">{APP_CLAIM}</div>
    </div>
  )
}

export function LeafIcon({ size = 19, filled = false }) {
  const vb = filled ? LEAF_ON_VB : LEAF_OFF_VB
  return (
    <svg width={size} height={size * 1.1} viewBox={vb} fill="currentColor" stroke="#0F0C08" strokeWidth="0.6">
      <path d={filled ? LEAF_ON_OUTLINE : LEAF_OFF} />
      {filled && <path d={LEAF_ON_FILL} />}
    </svg>
  )
}
