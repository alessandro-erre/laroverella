# La roverella di Patrica — Web App di produzione

React + Vite + Supabase. Feed social (post solo admin, reazioni e commenti per tutti), racconti/blog, galleria, profili con privacy, notifiche realtime.

## Setup locale

```bash
npm install
cp .env.example .env    # inserisci URL e anon key dal pannello Supabase
npm run dev             # http://localhost:5173
```

Le chiavi sono in Supabase → **Project Settings → API** (URL e `anon public`).

## Deploy su Netlify

1. Push di questa cartella su un repo GitHub
2. Netlify → **Add new site → Import an existing project** → scegli il repo
3. Build command e publish dir sono già in `netlify.toml` (rileva tutto da solo)
4. **Site configuration → Environment variables**: aggiungi
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Deploy

## Dopo il deploy (importante)

In Supabase → **Authentication → URL Configuration**:
- **Site URL**: `https://tuo-sito.netlify.app` (o il dominio custom)
- **Redirect URLs**: aggiungi lo stesso dominio

Senza questo, i link email di verifica/recupero puntano a localhost.

## Contenuti

- **Post**: si pubblicano dall'app con l'account admin (`is_admin = true` in `profiles`)
- **Galleria**: si popola automaticamente con le foto dei post
- **Racconti**: inserisci righe nella tabella `articles` (Table Editor). `body`: paragrafi separati da riga vuota, `## Titolo` per i sottotitoli. Metti `published = true` per pubblicare.

## Struttura

```
src/
├── main.jsx              entry
├── App.jsx               sessione, routing tab, notifiche realtime
├── app.css               design system
├── lib/supabase.js       client + helper
└── components/
    ├── AuthFlow.jsx      login / registrazione / verifica / recupero
    ├── Feed.jsx          feed, post, reazioni, commenti, composer admin
    ├── Screens.jsx       notifiche, blog, galleria, profilo
    └── icons.jsx         icone line-art
```
