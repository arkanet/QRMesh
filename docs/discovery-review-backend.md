# QRMesh Discovery: stati, consenso multicanale e revisione
## Stati
- `DISCOVERED`: canale rilevato, nessuna prova sufficiente per pubblicarlo
- `REVIEWED`: tecnica valida e fonte identificata, ma quorum insufficiente o necessità di approvazione
- `APPROVED`: verifica positiva del quorum di fonti indipendenti, con assenza di conflitti

`APPROVED` è una decisione interna, non un permesso di pubblicazione: l'aggiornamento del catalogo resta separato. Il file `data/discovery-feeds.json` nasce senza feed verificati. Nessun profilo social viene considerato ufficiale per semplice somiglianza di nome.

## Regola 75% (minimo 3 fonti)
La soglia è `max(3,ceil(0.75 * n))` su `n` feed ufficiali, abilitati, con titolarità attestata e operatori indipendenti. Stesso canale, stesso nome e stessa impronta PSK devono apparire in almeno questa quota. Feed copiati/controllati dal medesimo operatore contano una volta. Le fonti non accessibili non vengono interpretate come conferma. Un conflitto PSK impedisce l'auto-approvazione. Se n è minore di 3, serve revisione umana.

La scansione pubblica odierna non verifica titolarità social né interroga API private; quindi il quorum non scatta da sole pagine indicizzate. La configurazione del feed deve contenere `id`, `community`, `platform`, `operatorId`, `ownershipVerified: true` e prova verificabile della titolarità (da implementare nel registro protetto).

## Report backend e flusso operativo
Nell'attuale fase di sviluppo GitHub Actions salva `community-discovery-audit/report.json`, che contiene `sourceReview`, candidati, profili, errori, verifiche di integrità e `verification` (stato, quorum, feed che concordano, anomalie). Il report non espone PSK in chiaro.

Per **consultare**: GitHub → Actions → Community discovery tests → ultima run → Artifacts → `community-discovery-audit`. Per **correggere o approvare** in questa fase: aprire una pull request che modifichi separatamente i dati del catalogo e la relativa evidenza, e farla revisionare prima del merge. Non esiste ancora un backend amministrativo autenticato, né un endpoint API che scriva in produzione.

## Backend amministrativo proposto (fase successiva)
Dashboard privata su Vercel con login e RBAC; endpoint server-side per listare candidati e evidenze, annotare correzioni, approvare/rifiutare/riaprire, e visualizzare eventi immutabili con `actor`, `timestamp`, `before/after`, motivazione. Database per snapshot, osservazioni social e versioni chiave, audit trail append-only; segreti solo lato server. Pubblicazione con PR e controlli CI, mai scrittura diretta a `main`. Prima serve scegliere autenticazione e storage, e definire come attestare la titolarità dei feed.

## Controlli ancora necessari
- Attestazione reale della proprietà dei feed social e connettori API autorizzati
- Test contro ristampe/copie, feed scaduti, PSK ruotate, conflitti tra post storici e attuali
- Distinzione tra approvazione canale e approvazione parametri radio
- Gate UI: community senza canali APPROVED non devono figurare nel menu pubblico
