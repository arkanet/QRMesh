# QRMesh

Generatore open source di **QR e link di importazione per canali Meshtastic e MeshCore**, con una sezione dedicata alle risorse pubbliche delle community: siti, pagine informative e Telegram quando disponibili.

**Applicazione ufficiale:** https://allqrmesh.vercel.app/  

## Anteprime dell'interfaccia

Anteprime grafiche aggiornate dell'interfaccia (illustrazioni, non screenshot del browser): card con contenuti centrati e pulsante **Apri Link ↗**; layout desktop e smartphone a colonna singola.

<img src="docs/desktop.svg" alt="Interfaccia desktop QRMesh con schede delle community" width="520"> <img src="docs/mobile.svg" alt="Interfaccia smartphone QRMesh con schede in colonna singola" width="170">

## Funzionalità

- Selezione protocollo, community e canale pubblico, con modifica manuale di nome e PSK/secret.
- Generazione nel browser di link e QR di importazione; copia link, salvataggio PNG e stampa.
- Risorse della community selezionata con QR indipendenti per sito, documentazione e social.
- Layout desktop a griglia e **smartphone a colonna singola**, senza schede affiancate.
- Nessun account o invio delle chiavi a un server applicativo; la libreria QR viene caricata da CDN.

## Note

Le chiavi dei canali pubblici non garantiscono riservatezza. Verificare sempre canali, PSK, frequenza e regione radio con le fonti delle community. QRMesh è indipendente e non affiliato alle community citate. I link esterni possono cambiare.

## Sviluppo

Il progetto è una pagina statica: aprire `index.html` in un browser oppure pubblicarlo su un host statico. La generazione dei QR richiede il caricamento della libreria esterna QRCode.js.

Licenza: nessuna licenza esplicita è stata ancora dichiarata nel repository; aggiungerne una per definire formalmente i permessi open source.

## Bot Telegram (backend)

L'endpoint serverless è `https://allqrmesh.vercel.app/api/telegram`. Il bot è **inattivo finché non viene configurato** e non richiede privilegi di amministratore nei gruppi.

1. Crea il bot con [@BotFather](https://t.me/BotFather) (`/newbot`) e conserva il token **privatamente**. Non pubblicarlo in GitHub o in chat.
2. In **Vercel → QRMesh → Settings → Environment Variables**, imposta `TELEGRAM_BOT_TOKEN` e `TELEGRAM_WEBHOOK_SECRET` (una stringa casuale composta da lettere, cifre, `_` o `-`, lunga 16–256 caratteri). Seleziona Production e ridistribuisci.
3. Registra il webhook da un terminale locale con il token nell'ambiente (non incollarlo nel comando salvato in cronologia):

```sh
read -rs TELEGRAM_BOT_TOKEN; echo
read -rs TELEGRAM_WEBHOOK_SECRET; echo
curl --fail-with-body -sS -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
  --data-urlencode "url=https://allqrmesh.vercel.app/api/telegram" \
  --data-urlencode "secret_token=${TELEGRAM_WEBHOOK_SECRET}" \
  --data-urlencode 'allowed_updates=["message","callback_query"]'
unset TELEGRAM_BOT_TOKEN TELEGRAM_WEBHOOK_SECRET
```

4. Aggiungi il bot al gruppo, lascia attiva la Privacy Mode e usa `/start`, `/community`, `/channels`, `/qr`, `/link`, `/social`, `/help`. Il bot risponde ai comandi e ai pulsanti, non legge la conversazione generale.

Il catalogo backend è in `data/catalog.json`; la pagina web utilizza ancora il catalogo inline di `index.html`: **gli aggiornamenti ai canali vanno sincronizzati in entrambi** finché non verrà completata la migrazione a una sorgente unica. Il backend genera i QR in memoria tramite `qrcode` e non archivia utenti o messaggi.

**Nota:** il webhook non è registrato automaticamente dal deployment. Per verificare la configurazione senza esporre credenziali, apri `/api/telegram` (GET).
