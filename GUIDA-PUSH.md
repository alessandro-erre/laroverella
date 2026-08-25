# Notifiche sul telefono — guida passo a passo

Da fare una volta sola. Servono circa 20 minuti. Segui l'ordine.

Legenda: **Terminale** = la finestra nera dove hai scritto `npm install`.

---

## Passo 1 — Crea la tabella dei dispositivi

1. Vai su supabase.com → il tuo progetto → **SQL Editor** → **New query**
2. Apri il file `05-push.sql`, copia tutto, incolla, premi **Run**
3. Deve comparire "Success"

---

## Passo 2 — Genera le due chiavi

Apri il file **`Genera chiavi notifiche.html`** (doppio clic: si apre nel browser) e premi **Genera le chiavi**.

Ottieni due chiavi con un pulsante "Copia" ciascuna:
- **chiave pubblica** → serve nei passi 4 e 5
- **chiave privata** → serve solo nel passo 4, non va condivisa

**Incollale in un file di testo e salvalo**: se ricarichi la pagina vengono generate chiavi nuove e diverse.

*(Alternativa da Terminale, se preferisci: `npx web-push generate-vapid-keys`. Se risponde "command not found: npx", significa che Node non è installato in quel terminale — usa la pagina qui sopra.)*

---

## Passo 3 — Pubblica la funzione di invio

La funzione è il pezzo che spedisce le notifiche. Nel Terminale:

```
npm install -g supabase
supabase login
```

Si apre il browser: autorizza. Poi:

```
supabase link --project-ref XXXXXX
supabase functions deploy send-push
```

Al posto di `XXXXXX` metti l'identificativo del progetto: lo trovi nell'URL di Supabase
(`https://supabase.com/dashboard/project/`**XXXXXX**) oppure in Settings → General → Reference ID.

Se chiede la password del database, la trovi in Settings → Database.

---

## Passo 4 — Dai le chiavi alla funzione

1. Supabase → **Edge Functions** (menu a sinistra) → scheda **Secrets**
   (in alcune versioni: Settings → Edge Functions → Secrets)
2. Aggiungi tre voci, una alla volta:

| Nome | Valore |
|---|---|
| `VAPID_PUBLIC_KEY` | la chiave **pubblica** del passo 2 |
| `VAPID_PRIVATE_KEY` | la chiave **privata** del passo 2 |
| `VAPID_SUBJECT` | `mailto:tua@email.it` (la tua email) |

---

## Passo 5 — Dai la chiave pubblica all'app

1. Su **Netlify** → il tuo sito → **Site configuration → Environment variables**
2. Aggiungi: nome `VITE_VAPID_PUBLIC_KEY`, valore = la chiave **pubblica** (solo quella)
3. **Deploys → Trigger deploy → Clear cache and deploy site**

Se lavori anche in locale, aggiungi la stessa riga nel file `.env`:

```
VITE_VAPID_PUBLIC_KEY=BNx...
```

---

## Passo 6 — Collega il database alla funzione

Questo è l'interruttore che fa partire l'invio a ogni nuova notifica.

1. Supabase → **Database → Webhooks** → **Create a new hook**
2. Compila così:
   - **Name**: `send-push`
   - **Table**: `notifications` (schema `public`)
   - **Events**: spunta solo **Insert**
   - **Type of webhook**: **Supabase Edge Functions**
   - **Edge Function**: `send-push`
   - **Method**: POST
3. Salva con **Create webhook**

---

## Passo 7 — Attiva le notifiche sul telefono

**Su Android**: apri l'app, vai in **Profilo → Notifiche push → attiva l'interruttore**, accetta il popup.

**Su iPhone** (obbligatorio, altrimenti non funziona):
1. Apri il sito in **Safari**
2. Tocca il pulsante **Condividi** (quadrato con freccia in su)
3. **Aggiungi alla schermata Home**
4. Apri l'app **dall'icona** sulla Home, non da Safari
5. **Profilo → Notifiche push** → attiva → accetta il popup

Serve iPhone con iOS 16.4 o successivo.

---

## Passo 8 — Prova

1. Attiva le notifiche su un secondo telefono/account
2. Chiudi l'app su quel telefono
3. Dal tuo account admin pubblica un post
4. Sull'altro telefono deve comparire l'avviso

---

## Se non arriva niente

- **Profilo → Notifiche push**: l'interruttore è verde?
- Supabase → **Edge Functions → send-push → Logs**: c'è una chiamata? Se dice `no subscriptions`, l'interruttore non è stato attivato su quel dispositivo. Se dice un errore con `401` o `403`, le chiavi del passo 4 non corrispondono a quella del passo 5.
- Supabase → **Database → Webhooks**: il hook `send-push` è attivo?
- **iPhone**: hai aperto l'app dall'icona sulla Home e non da Safari?
- Impostazioni del telefono → notifiche: l'app non è silenziata?
