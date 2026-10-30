# Community Discovery

La discovery individua community e canali Meshtastic/MeshCore tramite fonti pubbliche, senza autenticazione.

## Configurazione

Modificare `data/discovery-config.json`:

- `keywords`: query e priorità dei collegamenti.
- `maxDepth`: profondità massima.
- `maxPages`: budget complessivo.
- `maxLinksPerPage`: collegamenti per pagina.
- `minimumIndependentSources`, `agreementRatio`: quorum per canali esterni.

## Verifica

I canali validi pubblicati sul dominio ufficiale di una community referenziata vengono approvati in assenza di chiavi discordanti. I canali esterni richiedono un'identità di community attestata e il quorum previsto. Un risultato di ricerca non costituisce attestazione.

Una PSK esistente viene aggiornata solo quando la nuova chiave è approvata, ha una data di pubblicazione verificabile successiva alla data registrata per la chiave corrente e non esistono conflitti. Ogni sostituzione conserva la chiave precedente in `keyHistory`. I canali senza cronologia verificabile mantengono la chiave corrente.

Solo i canali approvati sono importati in `data/catalog.json`; le community prive di canali non compaiono nei selettori.

## Esecuzione

```sh
node --test scripts/discovery/*.test.js
node scripts/discovery/nightly.js
```

La scansione genera `data/discovery-report.json` e aggiorna il catalogo. Il workflow `Community discovery nightly` viene eseguito alle 03:00 Europe/Rome sul branch predefinito. Il workflow `Community discovery tests` allega il report `community-discovery-audit`.
