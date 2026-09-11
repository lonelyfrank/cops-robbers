# Revisione tecnica — 10 settembre 2026

La revisione prepara il redesign della UI mantenendo probabilità, moltiplicatori e contabilità. La scena conserva aspetto e comportamento approvati, con la correzione del vicolo finale.

## Correzioni

| Area               | Risultato                                                                                                                                                                                                                                |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vicolo finale      | Pavimentazione su entrambe le coordinate `ALLEY_LOCAL_X`. I test confrontano la fermata con le istanze geometriche reali per tutti i dodici incroci.                                                                                     |
| Controlli mobile   | Due colonne solo quando Incassa è abilitato; Avvia occupa l’intera riga nelle altre fasi.                                                                                                                                                |
| UI e rimontaggio   | Listener annullabili, percorso ricreato senza duplicati, storico inizializzato con sentinella `null`, un solo render per puntata valida.                                                                                                 |
| Risultati          | Nessun importo incassabile dopo una perdita; nessun prossimo incrocio evidenziato dopo la chiusura della partita.                                                                                                                        |
| Ciclo WebGL        | Dispose idempotente delle risorse possedute. Texture halo per stream. Pool voxel condiviso con conteggio dei proprietari: rilascio e ricreazione delle cache alla chiusura dell’ultima scena. Gli errori di runtime rilasciano la scena. |
| Animazioni         | Pose di arresto da riferimenti fissi, mani alzate dopo la decelerazione. Unico orologio passato a personaggi, luci e overlay, senza azzerarlo alla cattura.                                                                              |
| Incasso automatico | Ramo finale esplicito: una sola liquidazione e notifica, senza passaggio pubblico per READY.                                                                                                                                             |
| Movimento ridotto  | Un’unica media query condivisa; cambi di preferenza recepiti durante la sessione.                                                                                                                                                        |
| Rendering tile     | Proprietà costanti impostate alla creazione; aggiornamenti solo quando variano i relativi ingressi. `alphaHash` limitato alla dissolvenza della base.                                                                                    |

## Organizzazione

- CSS raccolto in un blocco per breakpoint, rimossi selettori del vecchio marchio e introdotte variabili tipografiche.
- Formatter numerici in `format.js`; coordinate importate solo da `mapLayout.js`.
- Costruzione del quartiere in `districtGeometry.js`; materiali e ciclo di vita in `cityTile.js`.
- UI suddivisa per responsabilità, con lookup DOM memorizzati.
- Parametri principali di illuminazione e camera raccolti in `TUNING`.
- Rimossi `CROSSING_SPACING`, `tile.progress` e `lampPositions`; i piccoli hook diagnostici di CityStream sono documentati.
- Prettier e EditorConfig, con commit di formattazione separato. Dalla revisione architetturale `npm run lint` è ESLint e `npm run format:check` copre lo stile.
- Workflow GitHub Actions per formattazione, test, build e coerenza dell’HTML autonomo.

## Precisazioni rispetto alla segnalazione

La vecchia interpolazione delle braccia non accumulava semplicemente il valore del frame precedente: `poseRun()` lo sovrascriveva nello stesso aggiornamento. Non è quindi corretto attribuirle automaticamente una divergenza fra frame rate. La nuova sequenza rende comunque espliciti i riferimenti e separa la corsa dalla resa; la verifica confronta le pose a tempi identici a 30, 60 e 120 Hz.

In Three.js `dispose()` rilascia le risorse GPU senza cancellare necessariamente i dati CPU della geometria, che possono essere caricati nuovamente. Il problema da risolvere era la proprietà e la pulizia delle cache, non una geometria irrimediabilmente “morta”. La soluzione rilascia anche i listener GPU legati alle risorse condivise quando termina l’ultimo proprietario e ricrea le cache per il montaggio successivo.

La guardia `crossing >= MAX_CROSSINGS` in `advance()` è mantenuta come difesa esplicita. Il normale flusso non la raggiunge, ma rimuoverla non rende più sicura la transizione finale.

I valori RTP arrotondati della segnalazione sono minimi sulle combinazioni difficoltà/incrocio, non valori uniformi per ogni strategia. Regole e README ora lo specificano. Il pavimento della probabilità è descritto come difensivo, dato che non interviene nel percorso attuale.

## Verifica e limiti

- 57 test Node, incluse regressioni su geometria finale, pose, notifiche, proprietà delle risorse e materiali stabili.
- 200.000 percorsi con generatore deterministico e verifica separata di saldo, payout, storico e limiti.
- Chromium: tre rimontaggi con moduli condivisi, un handler e un render per input; percorso di dodici tappe; cambio live di movimento ridotto; UI di vittoria e perdita; incasso automatico; layout desktop/mobile.
- Build di produzione e HTML autonomo aggiornati; memoria locale ignorata da Git ed esclusa dagli artefatti.

Il browser automatico usa ANGLE/SwiftShader. Questo verifica il rendering WebGL e le transizioni, ma non misura il guadagno sulla UHD Graphics fisica. La profilazione dei frame e della compilazione shader sul dispositivo reale resta nella roadmap. La workflow CI è configurata; l’esecuzione su GitHub avverrà al prossimo push.
