# Community Discovery

La discovery individua community e canali Meshtastic/MeshCore tramite fonti pubbliche, senza autenticazione.

## Configurazione

Modificare `data/discovery-config.json`:

- `keywords`: query e priorità dei collegamenti.
- `maxDepth`: profondità massima.
- `maxPages`: budget complessivo.
- `maxLinksPerPage`: collegamenti per pagina.
- `minimumIndependentSources`, `agreementRatio`: quorum per canali esterni.

## Esplorazione adattiva

La ricerca parte da keyword e fonti referenziate, segue collegamenti e sottolivelli pertinenti e riconosce componenti HTML con riferimenti a canali. Le directory territoriali possono richiedere verifiche limitate dei sottopercorsi non esposti come link. Ogni candidato deve superare la decodifica e le regole di approvazione; la sola presenza di un componente HTML o di una pagina raggiungibile non basta.

## Verifica

I canali validi pubblicati sul dominio ufficiale di una community referenziata vengono approvati in assenza di chiavi discordanti. I canali esterni richiedono un'identità di community attestata e il quorum previsto. Un risultato di ricerca non costituisce attestazione.

Una PSK esistente viene aggiornata solo quando la nuova chiave è approvata, presenta una data verificabile più recente oppure viene osservata in almeno due scansioni successive alla chiave precedente già osservata dalla stessa fonte autorevole e non esistono conflitti. Ogni sostituzione conserva la chiave precedente in `keyHistory`. I canali senza cronologia verificabile mantengono la chiave corrente.

I profili LoRa presenti nei link validi vengono estratti separatamente; quelli completi (regione e preset) sono registrati come non verificati, senza sovrascrivere configurazioni radio esistenti. I profili discordanti non vengono importati.

Solo i canali approvati sono importati in `data/catalog.json`; le community prive di canali non compaiono nei selettori.

## Esecuzione

```sh
node --test scripts/discovery/*.test.js
node scripts/discovery/nightly.js
```

La scansione genera `data/discovery-report.json` e aggiorna il catalogo. Il workflow `Community discovery nightly` viene eseguito alle 03:00 Europe/Rome sul branch predefinito. Il workflow `Community discovery tests` allega il report `community-discovery-audit`.
