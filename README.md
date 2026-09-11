# Cops&Robbers

Prototipo giocabile in browser, completamente client-side, con Vite, JavaScript e Three.js. Città voxel notturna, tre difficoltà, 12 incroci, animazioni di corsa/arresto/fuga e crediti esclusivamente virtuali. Versione 1.1: mappa modulare e inseguimento luminoso, ispirati alla [reference fornita](docs/reference.png).

## Temi e avvio del gioco

La città originale si chiama **Distretto 87**. Il nuovo tema **Neon Tokyo** propone facciate scure in vetro, finestre ambrate, profili ciano, insegne magenta integrate negli edifici, negozi di ramen, distributori e giardini sui tetti. Finestre suddivise da montanti, schermature in legno, tende noren e lanterne di carta danno profondità alle facciate. I neon rimangono sulle insegne e sui profili, con luce diffusa e asfalto opaco per evitare macchie ciano/magenta artificiali.

I temi si alternano a ogni nuova corsa accettata: l’anteprima iniziale mostra Distretto 87, la prima corsa parte a Neon Tokyo, la seconda a Distretto 87 e così via. Il tema resta fisso per tutti i dodici incroci, l’incasso e la cattura. Al cambio vengono eliminate tutte le tile precedenti, incluse quelle in uscita: nessuna partita contiene quartieri di temi diversi. Il ripristino della demo non avanza la rotazione. La scelta è puramente scenografica, senza campionare il generatore degli esiti.

Il logo locale `cops&robbers-logo.png` sostituisce il titolo testuale. All’apertura della pagina una breve schermata con logo e barra presenta la preparazione del gioco: il progresso è scenografico e raggiunge il 100% solo dopo il primo rendering della città. Durante la preparazione i controlli sono bloccati. Non viene ripetuta tra le corse; il movimento ridotto abbrevia la presentazione. L’HTML autonomo incorpora anche il logo e funziona senza connessione.

La dicitura **PUNTATA: x CR** è in basso al centro della scena. Il riepilogo in alto mostra l’incasso quando disponibile; la vecchia didascalia del tratto è rimossa.

## Plancia di sorveglianza

La UI riprende una console CCTV: cornice metallica con viti e feritoie, indicatore REC, numero della telecamera, distretto corrente e orologio locale. Un reticolo discreto e leggere scanline sono sovrapposti al canvas; geometrie, camera isometrica, illuminazione e animazioni della città rimangono quelle del gioco.

La barra superiore presenta il logo e il saldo in CR. La **sequenza telecamere** collega CAM 01–12 con una strada tratteggiata e distingue il percorso superato, il prossimo varco e l’arresto. Il pannello inferiore contiene la puntata con decimali italiani e tasti ½ / 2× / MAX, il selettore **Livello allerta** a semaforo e la probabilità del prossimo verde su una barra segmentata. Il pulsante **Corri!** avvia una corsa oppure prosegue al prossimo incrocio; **Incassa** mostra l’importo disponibile. Nel risultato la barra presenta il primo varco della nuova corsa, senza riutilizzare la probabilità della precedente.

Su tablet e telefono i pannelli si dispongono su più righe e la sequenza CAM scorre orizzontalmente. Stato dei pulsanti, focus da tastiera, validazione della puntata, testo degli esiti e preferenza di movimento ridotto restano supportati. L’orologio viene rilasciato insieme alla UI durante il rimontaggio.

## Città modulare

Ogni modulo è un diorama quadrato di 26 × 26 unità con un solo incrocio, tre edifici in mattoni, negozi con tende, finestre calde, tetti piatti, alberi, aiuole, marciapiedi e una base a strati voxel. Le strade principali di due moduli consecutivi combaciano senza interruzioni.

| Modulo     | Illuminazione e comportamento                                                                                       |
| ---------- | ------------------------------------------------------------------------------------------------------------------- |
| Precedente | Luce tenue e finestre accese; la pattuglia aspetta al rosso prima delle strisce, bloccata dal traffico trasversale. |
| Attuale    | Luce calda più intensa, moltiplicatore sull’asfalto e ladro in attesa al rosso prima della scelta.                  |
| Prossimo   | Luce tenue, edifici leggibili, lampioni e finestre debolmente accesi; traffico e semafori già presenti.             |

Il cambio di ruolo dipende dalla **posizione reale del ladro**, non dal numero visualizzato nel percorso. Dopo un verde, il ladro attraversa l'incrocio e raggiunge la fermata prima di quello successivo. Quando oltrepassa il confine del modulo, la nuova zona riceve la luce principale, quella lasciata alle spalle torna alla luce tenue e viene preparato il prossimo modulo.

La luce segue il ladro con una sfumatura continua nello spazio, anche sui bordi condivisi: il centro resta in evidenza e la luminosità diminuisce gradualmente verso i quartieri adiacenti. Il nuovo modulo risale prima come base piatta, poi edifici e arredo crescono dal terreno con un leggero ritardo fra i gruppi. In uscita la sequenza si inverte: gli oggetti rientrano nella base, che solo dopo scende e scompare. A regime sono presenti **tre moduli**; durante la dissolvenza ne può esistere temporaneamente **un quarto**, poi materiali e buffer delle istanze obsolete vengono liberati. Le geometrie condivise rimangono disponibili per i moduli ancora visibili. La texture degli aloni appartiene allo stream. Le cache voxel sono rilasciate alla chiusura dell’ultima scena e ricreate per il montaggio successivo, evitando risorse GPU e listener residui durante HMR.

Anche all'inizio e alla fine rimangono tre moduli: un quartiere di avvicinamento prima del primo incrocio e un quartiere di uscita lievemente illuminato dopo l'ultimo. Questi due moduli scenografici non aggiungono puntate o incroci al percorso di gioco.

Il moltiplicatore rimane dipinto fra le strisce pedonali, con la scritta allineata orizzontalmente alla visuale del giocatore. Le auto perpendicolari compaiono e scompaiono in dissolvenza, incluse le ombre, prima che il paraurti raggiunga la fine della strada; le auto in attesa al rosso restano pienamente visibili.

Il rosso di attesa lascia passare le auto in perpendicolare. Al clic con esito verde si aprono insieme l’incrocio del ladro e quello della pattuglia precedente: entrambi avanzano con la stessa progressione e si fermano di nuovo al rosso. Le auto già impegnate liberano l’incrocio, le altre si fermano prima delle strisce. In caso di perdita il traffico civile libera gli accessi, la luce calda si attenua e **quattro pattuglie circondano il ladro**: quella alle spalle si avvicina, una entra dal fondo della strada di fronte e altre due arrivano dai lati dell’incrocio. La camera stringe leggermente sul ladro e il riepilogo compare in basso per lasciare visibile l’accerchiamento. Un riflesso blu pulsa ai bordi della scena. L'effetto continua nel risultato di arresto e si azzera alla nuova partita o al ripristino. La preferenza di movimento ridotto rende le luci stabili ed elimina risalite e dissolvenze; i cambiamenti di preferenza vengono recepiti anche durante la sessione.

Ogni modulo varia in modo deterministico colori, larghezze e piani degli edifici, tende dei negozi, scale antincendio, serbatoi sui tetti e arredo urbano (pensilina, ingresso metro o edicola). Le strade mantengono raccordi identici. Il traffico e le decorazioni non influenzano le probabilità di gioco.

La sacca è ancorata alla schiena e cresce gradualmente con incroci e moltiplicatore raggiunti; la crescita rimane contenuta e si azzera alla nuova partita.

Dimensione dei moduli, strada, fermate e frequenza delle sirene sono definiti in `src/mapLayout.js`. Geometria e palette sono in `src/districtGeometry.js`; la finestra di caricamento e la rimozione delle risorse sono in `src/cityStream.js`.

## Prossimi sviluppi

La prima plancia CCTV è implementata; i prossimi ritocchi riguardano leggibilità, proporzioni e uso su dispositivi mobili. La scena del minigioco resta la base approvata. L’elicottero è rimosso dall’implementazione attiva e resta una funzione da revisionare nella [roadmap](docs/ROADMAP.md), con criteri espliciti prima della reintroduzione.

## Avvio

Requisiti: Node.js 20.19+ nella serie 20, oppure 22.12+; npm; un browser con WebGL 2. Le versioni esatte di Three.js e Vite sono fissate nel manifest e nel lockfile.

```bash
npm install
npm run dev
```

Apri l'indirizzo stampato da Vite, normalmente `http://localhost:5173`. Il comando abilita anche l'accesso dalla rete locale: per giocare dallo smartphone sulla stessa Wi-Fi, apri l'indirizzo **Network** stampato da Vite. Il firewall del computer deve consentire quella connessione.

Per provare il gioco senza installazione, apri **cops-and-robbers.html** in un browser: contiene JavaScript, CSS e Three.js. Non richiede download di asset o un server. Se il visualizzatore di file del telefono non esegue JavaScript, usa un browser completo oppure l'indirizzo Network di Vite.

## Comandi disponibili

| Comando                    | Risultato                                                               |
| -------------------------- | ----------------------------------------------------------------------- |
| `npm run dev`              | Server di sviluppo Vite con accesso dalla LAN.                          |
| `npm run lint`             | Analisi statica ESLint (flat config) su sorgenti, test e script.        |
| `npm run typecheck`        | Controlla i tipi dei file `.js` con JSDoc e `checkJs`.                  |
| `npm run format`           | Applica lo stile condiviso ai sorgenti; esclude build e memoria locale. |
| `npm run format:check`     | Verifica la formattazione con Prettier senza modificare i file.         |
| `npm test`                 | Test deterministici di matematica, stato, animazioni e interfaccia.     |
| `npm run build`            | Build statica di produzione nella cartella `dist/`.                     |
| `npm run preview`          | Serve la build di produzione, normalmente sulla porta 4173.             |
| `npm run build:standalone` | Rigenera il singolo file `cops-and-robbers.html`.                       |

Fino alla versione 1.1 l'HTML autonomo si chiamava `cops-and-robbers.html`. Il file è stato rinominato per allinearlo al nome del progetto: i collegamenti al vecchio percorso vanno aggiornati.

La normale build `dist/` va servita via HTTP. Per l'apertura diretta da disco, usa l'HTML autonomo. Dopo modifiche ai sorgenti, rigenera entrambe le build se vuoi distribuirle aggiornate.

## Come si gioca

1. Il saldo iniziale è di **1.000 CR**. Scegli difficoltà e puntata, poi premi **Corri!**.
2. La puntata viene scalata una sola volta. Il semaforo restituisce subito verde oppure rosso al clic su **Corri!**.
3. Con il verde, il ladro corre oltre l'incrocio. A corsa conclusa puoi scegliere **Corri!** o **Incassa**. Non c'è un timer sulla decisione.
4. Con un esito rosso, quattro pattuglie circondano il ladro da dietro, davanti e dai due lati. Il ladro si ferma e alza le mani. La puntata è persa. A fine animazione puoi avviare un'altra partita.
5. Incassando dopo qualsiasi incrocio superato, il ladro svolta nel vicolo. Viene accreditato il totale mostrato, senza bonus separati.
6. Al **12° incrocio**, l'incasso e la fuga nel vicolo sono automatici. Il limite evita percorsi indefiniti e valori fuori scala nel prototipo.

Tutti i comandi funzionano con touch, mouse e tastiera tramite i normali pulsanti HTML. L'interfaccia si adatta a desktop e smartphone, anche in landscape. Il link **Probabilità e regole** mostra l'intera curva per la difficoltà selezionata.

Lo storico mostra le ultime 8 partite. Per le vittorie, l'importo positivo è l'**incasso lordo**, comprensivo della puntata; l'utile netto appare nel riepilogo di fine partita. Per le sconfitte è mostrata la puntata persa e il moltiplicatore raggiunto prima del rosso.

Saldo e storico sono in memoria: ricaricare la pagina azzera la sessione e ripristina 1.000 CR. **Ripristina 1.000 CR** è disponibile tra le partite. Non sono presenti pagamenti, account, backend, telemetria, font remoti o asset scaricati a runtime.

## Matematica e RTP

Il modulo `src/gameMath.js` non dipende dal DOM, da Three.js o dalla sorgente di casualità.

Per l'incrocio `n` (numerazione da 1), nella difficoltà `d`:

```text
p(n, d) = max(MIN_GREEN_PROBABILITY, 0.95 × exp(-decay[d] × (n - 1)))
P(n, d) = p(1, d) × p(2, d) × … × p(n, d)
M_totale(n, d) = RTP_TARGET / P(n, d)
P(n, d) × M_totale(n, d) = 0.96
```

| Parametro                              | Valore iniziale          | Posizione                                  |
| -------------------------------------- | ------------------------ | ------------------------------------------ |
| RTP target                             | `0.96`                   | `RTP_TARGET`, `gameMath.js`                |
| Probabilità del primo verde            | `0.95`                   | `INITIAL_GREEN_PROBABILITY`, `gameMath.js` |
| Decadimento facile / medio / difficile | `0.035 / 0.065 / 0.10`   | `DIFFICULTIES`, `gameMath.js`              |
| Pavimento difensivo della probabilità  | `0.12`                   | `MIN_GREEN_PROBABILITY`, `gameMath.js`     |
| Incroci massimi                        | `12`                     | `MAX_CROSSINGS`, `gameMath.js`             |
| Saldo iniziale                         | `100000` centesimi di CR | `INITIAL_BALANCE`, `gameState.js`          |
| Puntata minima / massima               | `1 / 1000000 CR`         | `MIN_BET` / `MAX_BET`, `core/money.js`     |

Il pavimento `MIN_GREEN_PROBABILITY = 0.12` è una guardia difensiva per future curve: nel percorso attuale non interviene; la probabilità più bassa è circa 0,316 (difficile, dodicesimo incrocio).

`RTP_TARGET` cambia il livello dei moltiplicatori; i `decay` cambiano la velocità di crescita del rischio. Sono volutamente parametri separati. Se abbassi il target sotto la probabilità iniziale, il primo moltiplicatore può scendere sotto 1: per mantenere il primo passaggio in utile, calibra anche la probabilità iniziale.

Il grande moltiplicatore a video è **sempre il totale effettivamente pagabile**: `getMultiplier()` restituisce `RTP_TARGET / P(n)` e `calculatePayout()` applica questo valore alla puntata. Non sono previsti bonus separati. La rimozione dell’elicottero non modifica probabilità o importi degli incassi.

Il saldo è un intero in centesimi di CR. `calculatePayout()` arrotonda per difetto solo all'incasso, con scarto inferiore a 0,01 CR. Il 96% è il target teorico prima di questa quantizzazione. Il minimo RTP effettivo fra le 36 strategie di incasso è circa 95,54% con puntata da 1 CR (difficile, incasso al secondo incrocio), 95,97% con 25 CR e 96,00% arrotondato con 1.000 CR. Non è un unico RTP arrotondato per tutte le strategie. I moltiplicatori in interfaccia hanno due decimali per leggibilità, ma il calcolo usa il valore completo.

La formula vale per una strategia di incasso a ciascun traguardo consentito. Non garantisce un risultato su una singola partita o una breve sessione. Non è permesso incassare prima del primo verde o durante una risoluzione.

Gli esiti usano `crypto.getRandomValues()` e un solo campione uniforme per ogni clic valido di partenza o avanzamento. Non ci sono risultati predefiniti né correzioni basate sul saldo o sulle sconfitte precedenti. La decorazione della città usa un generatore separato con seme fisso: non influenza i semafori. Nei test il generatore viene iniettato nel costruttore di `GameState`.

## Moduli

| File                                | Responsabilità                                                                                                                       |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `src/core/money.js`                 | Parsing dei crediti all'italiana, limiti della puntata, clamp e classificazione degli errori. Modulo puro.                           |
| `src/core/types.js`                 | Vocabolario di dominio in JSDoc per il controllo dei tipi; nessun codice a runtime.                                                  |
| `src/gameMath.js`                   | Probabilità, sopravvivenza cumulata, moltiplicatori, arrotondamento e tabella del rischio.                                           |
| `src/gameState.js`                  | Macchina a stati, validazione puntate, saldo, risoluzione immediata e storico.                                                       |
| `src/rendering/createScene.js`      | Composizione del livello di rendering: ordina i sistemi per frame e non produce DOM.                                                 |
| `src/rendering/SceneRenderer.js`    | Contesto WebGL, scena, nebbia e dimensione del canvas.                                                                               |
| `src/rendering/CameraController.js` | Camera ortografica isometrica, inseguimento morbido, zoom della cattura.                                                             |
| `src/rendering/LightingSystem.js`   | Luci del modulo occupato, in numero fisso; palette per tema.                                                                         |
| `src/rendering/WorldIndicators.js`  | Indicatore del ladro e moltiplicatore dipinto sull'asfalto.                                                                          |
| `src/rendering/CaptureEffects.js`   | Luci blu dell'arresto e stato dell'overlay come numeri, senza toccare il documento.                                                  |
| `src/mapLayout.js`                  | Dimensioni dei moduli, raccordi stradali, fermate, modulo occupato e pulsazione delle sirene.                                        |
| `src/cityEffects.js`                | Gradiente luminoso condiviso nello spazio e sequenza base/oggetti per comparsa e scomparsa.                                          |
| `src/cityThemes.js`                 | Palette e identità dei temi, rotazione per corsa indipendente dagli esiti.                                                           |
| `src/neonDistrict.js`               | Architettura, insegne e arredo di Neon Tokyo.                                                                                        |
| `src/districtGeometry.js`           | Geometria dei quartieri, fondazioni, architettura, arredo e vicoli sui due lati della fermata.                                       |
| `src/format.js`                     | Formatter numerici condivisi, indipendenti dal DOM.                                                                                  |
| `src/motionPreference.js`           | Unica preferenza di movimento ridotto, aggiornata anche a runtime.                                                                   |
| `src/cityTile.js`                   | Costruzione del diorama quadrato, edifici, vegetazione, lampioni, semafori e materiali indipendenti per modulo.                      |
| `src/trafficController.js`          | Auto perpendicolari, precedenze, sgombero dell’incrocio e arresto prima delle strisce.                                               |
| `src/cityStream.js`                 | Caricamento di precedente/attuale/prossimo, comparsa, scomparsa e rilascio delle risorse obsolete.                                   |
| `src/voxelModels.js`                | Geometrie condivise, modelli di ladro/auto e batch di istanze statiche.                                                              |
| `src/characterController.js`        | Corsa simultanea di ladro e pattuglia, crescita della sacca, accerchiamento da quattro direzioni, fuga nel vicolo.                   |
| `src/ui/createUI.js`                | Composition root della console: collega azioni, deriva la vista e distribuisce lo snapshot ai componenti.                            |
| `src/ui/dom.js`                     | Lookup tipizzati degli elementi e un unico ambito di listener annullabile.                                                           |
| `src/ui/view.js`                    | Derivazione pura della vista e stato della plancia; nessun DOM.                                                                      |
| `src/ui/labels.js`                  | Testi italiani e regole pure che scelgono messaggio di stato ed etichette di fase.                                                   |
| `src/ui/components/`                | Un componente per responsabilità: HUD, puntata, allerta, varco, azioni, percorso, risultato, stato, storico, regole ed errore WebGL. |
| `src/ui/bootScreen.js`              | Presentazione iniziale con barra, blocco dei controlli e pulizia dei timer.                                                          |
| `src/runtime/GameRuntime.js`        | Orchestrazione fra macchina a stati, attori e scena; dipendenze dichiarate strutturalmente.                                          |
| `src/runtime/GameLoop.js`           | `requestAnimationFrame`, delta time con clamp, visibilità della scheda, start/stop/dispose.                                          |
| `src/main.js`                       | Composition root: crea le dipendenze, avvia il runtime e rilascia tutto su errore fatale o HMR.                                      |
| `src/style.css`                     | Layout, palette, responsività, dialogo e preferenza di movimento ridotto.                                                            |
| `scripts/buildStandalone.mjs`       | Esportazione della build in un singolo HTML senza richieste esterne.                                                                 |
| `tests/`                            | Test con il runner nativo di Node.js; nessun framework di test aggiuntivo.                                                           |

Gli stati sono `idle → running → ready`, con ritorno immediato a `running` al clic per proseguire se il semaforo è verde. Il rosso porta a `caught → result`; l'incasso porta a `escaping → result`. Puntata e difficoltà sono bloccate durante una partita. Le guardie impediscono doppi accrediti, doppie partenze e incassi durante un attraversamento o un arresto.

## Rendering e comportamento

- Tutti gli oggetti sono geometrie voxel generate dal codice. Una piccola texture procedurale condivisa crea gli aloni dei lampioni; nessun asset o servizio remoto.
- Gli edifici e la decorazione sono raggruppati in `InstancedMesh`; geometrie e materiali dei personaggi sono condivisi.
- Pixel ratio limitato a 1,6 e shadow map da 1024 px. Una sola luce principale calda segue il modulo occupato. Il numero di luci resta costante mentre la città avanza.
- Finestre e materiali urbani condividono un gradiente di luce calcolato sulla posizione nel mondo; semafori e aloni seguono la stessa curva. I moduli adiacenti mantengono una luce soffusa senza salti ai confini.
- Le sirene sono sincronizzate su una pulsazione morbida di 1,7 Hz; la cattura usa il blu sia sull'auto sia sulla città e sul bordo della scena.
- La camera segue il ladro con una risposta morbida e rapida. Le corse rallentano vicino alla fermata e le animazioni di arresto e incasso sono brevi. Il pulsante Incassa resta visibile, disabilitato quando non disponibile, per mantenere stabili i comandi. L’angolo in primo piano resta libero da pali che coprirebbero il moltiplicatore. I semafori mostrano colore e gli esiti sono ripetuti nel testo, senza affidarsi al solo colore.
- Se la scheda è nascosta, le animazioni si fermano. Al ritorno riprendono dallo stesso punto.
- `prefers-reduced-motion` riduce movimento e durata delle animazioni e rende le luci della polizia stabili; le auto decorative restano ferme fuori dall’incrocio.
- In caso di WebGL non disponibile o contesto perso, i comandi vengono disabilitati e compare un messaggio con ricarica.

## Verifica

**86 test automatici superati**, oltre alla build di produzione e all'esportazione HTML. I test dell'interfaccia montano il vero `index.html` in jsdom e verificano puntata, difficoltà, Corri!, Incassa, risultato, percorso, dialogo delle regole, stati disabilitati e rilascio dei listener. Copertura: tutte le 36 combinazioni difficoltà/incrocio per l'RTP; incasso uniforme lungo il percorso; arrotondamenti; limiti; confini della probabilità; singolo campionamento al clic; risposta immediata su verde e rosso; perdita e incasso; doppi clic; puntata massima e saldo zero; reset; ultimo incrocio; callback e posizioni finali delle animazioni. I nuovi controlli verificano raccordi fra i moduli, illuminazione tenue dei moduli adiacenti, evidenza del modulo occupato, variazioni deterministiche degli edifici, comparsa e scomparsa, numero massimo di moduli, rilascio delle risorse, lampeggi blu persistenti, reset e movimento ridotto. Includono anche crescita progressiva della sacca, movimento simultaneo della pattuglia, accerchiamento da quattro direzioni, sgombero del traffico durante la cattura e precedenze senza sovrapposizioni al primo e all’ultimo incrocio. Verificano inoltre la continuità della luce, la crescita degli edifici ancorata al terreno, la pavimentazione reale dei vicoli a tutti gli incroci, le pose di arresto a 30/60/120 Hz, l’orologio continuo delle sirene, la notifica finale atomica, il rilascio delle cache condivise e l’assenza di aggiornamenti inutili dei materiali stabili.

I test delle animazioni operano sulle geometrie e trasformazioni Three.js in Node, senza renderer WebGL. Verificati anche in Chromium l’HTML autonomo, la risposta immediata ai clic, incasso, arresto, nuova partita, reset e layout desktop/mobile. Il controllo mobile usa un viewport simulato, non un dispositivo fisico. Verificati anche la rotazione dei temi, dodici incroci senza mescolanza di tile, il logo nel browser e nell’HTML autonomo offline, la barra iniziale e la puntata centrata.

La workflow `.github/workflows/checks.yml` esegue formattazione, analisi statica, controllo dei tipi, test, build e verifica che l’HTML autonomo committato sia aggiornato. L’esecuzione remota partirà al prossimo push. Dettagli della revisione e limiti delle misure: [revisione tecnica](docs/TECHNICAL_REVIEW.md).

Documentazione delle dipendenze: [Vite](https://vite.dev/guide/), [build Vite](https://vite.dev/guide/build), [Three.js WebGLRenderer](https://threejs.org/docs/pages/WebGLRenderer.html). Vedi `THIRD_PARTY_NOTICES.md` per le licenze incluse.
