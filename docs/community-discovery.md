# Community Discovery — stato sperimentale

## Sicurezza
Il workflow non pubblica modifiche automaticamente, salvo impostare esplicitamente la variabile di repository `COMMUNITY_DISCOVERY_AUTOPUBLISH=true`. **Non abilitarla** finché autenticità e test non siano completi.

Lo scanner visita solo pagine HTTPS già elencate nel catalogo; non scopre nuove community, non ricerca social e non legge QR contenuti soltanto in immagini. I link import Meshtastic presenti nelle pagine vengono decodificati, ma una fonte registrata non è automaticamente una fonte autenticata. I profili LoRa riportano solo campi presenti nel payload.

## Test
- `node --test scripts/discovery/*.test.js`
- `node --check scripts/discovery/nightly.js`
- `node scripts/discovery/nightly.js` (accesso rete richiesto; modifica la copia locale di catalogo e report)
- CI: `.github/workflows/community-discovery-tests.yml`

La schedulazione usa due cron UTC con filtro `TZ=Europe/Rome` per mirare alle 03:00 locali, compreso il cambio ora. GitHub Actions può ritardare le esecuzioni. **I workflow schedule girano solo sul branch predefinito**, quindi sul branch sperimentale serve avvio manuale o esecuzione locale.

## Gate prima di integrare
1. Verifica titolarità delle fonti e prova di provenienza delle chiavi.
2. Test decoder con payload reali, QR immagine e casi limite.
3. Gestione duplicati, rotazioni PSK, conflitti LoRa e audit.
4. Discovery di community nuove tramite fonti/API pubbliche autorizzate.
5. Test end-to-end del MULTI e primo import in ambiente di prova.
