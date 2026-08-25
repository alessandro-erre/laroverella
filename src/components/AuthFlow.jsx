import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Logo } from './icons'

// steps: login | register | check-email | forgot | reset-sent
export default function AuthFlow() {
  const [step, setStep] = useState('login')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [pw, setPw] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const fail = (m) => { setErr(m); setBusy(false) }

  const doLogin = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password: pw })
    if (error) {
      if (error.message.includes('Email not confirmed')) return fail('Email non ancora verificata: controlla la tua casella.')
      return fail('Credenziali non valide.')
    }
    // onAuthStateChange in App.jsx gestisce il resto
  }

  const doRegister = async (e) => {
    e.preventDefault(); setErr('')
    if (name.trim().length < 2) return setErr('Come ti chiami?')
    if (pw.length < 6) return setErr('La password deve avere almeno 6 caratteri.')
    setBusy(true)
    const { error } = await supabase.auth.signUp({
      email, password: pw,
      options: { data: { name: name.trim() }, emailRedirectTo: window.location.origin },
    })
    if (error) return fail(error.message.includes('already registered') ? 'Email già registrata: prova ad accedere.' : 'Errore: ' + error.message)
    setBusy(false); setStep('check-email')
  }

  const doForgot = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/#reset' })
    if (error) return fail('Errore: ' + error.message)
    setBusy(false); setStep('reset-sent')
  }

  if (step === 'check-email') return (
    <div className="auth">
      <Logo />
      <div className="a-ok" style={{ textAlign: 'center', padding: 18 }}>
        <div style={{ fontSize: 34, marginBottom: 8 }}>📬</div>
        Ti abbiamo inviato un link di conferma a <b>{email}</b>.<br />Aprilo per attivare l'account, poi torna qui e accedi.
      </div>
      <button className="a-btn ghost" onClick={() => setStep('login')}>Torna al login</button>
    </div>
  )

  if (step === 'reset-sent') return (
    <div className="auth">
      <Logo />
      <div className="a-ok" style={{ textAlign: 'center', padding: 18 }}>
        <div style={{ fontSize: 34, marginBottom: 8 }}>🍃</div>
        Link di recupero inviato a <b>{email}</b>. Controlla anche lo spam.
      </div>
      <button className="a-btn ghost" onClick={() => setStep('login')}>Torna al login</button>
    </div>
  )

  if (step === 'forgot') return (
    <div className="auth">
      <Logo />
      <h2 style={{ fontSize: 19, textAlign: 'center' }}>Recupera la password</h2>
      <form onSubmit={doForgot} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="a-field"><label>Email</label><input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@esempio.it" /></div>
        {err && <div className="a-err">{err}</div>}
        <button className="a-btn" type="submit" disabled={busy}>{busy ? <span className="spinner" style={{ borderTopColor: '#fff' }}></span> : 'Invia link di recupero'}</button>
      </form>
      <button className="a-link" onClick={() => setStep('login')}>← Torna al login</button>
    </div>
  )

  if (step === 'register') return (
    <div className="auth">
      <Logo />
      <form onSubmit={doRegister} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="a-field"><label>Nome</label><input required value={name} onChange={e => setName(e.target.value)} placeholder="Il tuo nome" /></div>
        <div className="a-field"><label>Email</label><input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@esempio.it" /></div>
        <div className="a-field"><label>Password</label><input type="password" required value={pw} onChange={e => setPw(e.target.value)} placeholder="Minimo 6 caratteri" /></div>
        {err && <div className="a-err">{err}</div>}
        <button className="a-btn terra" type="submit" disabled={busy}>{busy ? <span className="spinner" style={{ borderTopColor: '#fff' }}></span> : 'Crea account 🌱'}</button>
      </form>
      <button className="a-link" onClick={() => { setErr(''); setStep('login') }}>Hai già un account? Accedi</button>
    </div>
  )

  return (
    <div className="auth">
      <Logo />
      <form onSubmit={doLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="a-field"><label>Email</label><input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@esempio.it" /></div>
        <div className="a-field"><label>Password</label><input type="password" required value={pw} onChange={e => setPw(e.target.value)} placeholder="••••••••" /></div>
        {err && <div className="a-err">{err}</div>}
        <button className="a-btn" type="submit" disabled={busy}>{busy ? <span className="spinner" style={{ borderTopColor: '#fff' }}></span> : 'Accedi'}</button>
      </form>
      <button className="a-link" onClick={() => { setErr(''); setStep('forgot') }}>Password dimenticata?</button>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--a-muted)', fontSize: 12 }}>
        <span style={{ flex: 1, height: 1, background: 'var(--a-line)' }}></span>oppure<span style={{ flex: 1, height: 1, background: 'var(--a-line)' }}></span>
      </div>
      <button className="a-btn ghost" onClick={() => { setErr(''); setStep('register') }}>Registrati 🌱</button>
    </div>
  )
}
