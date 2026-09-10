# Cops&Robbers

Prototipo giocabile in browser, completamente client-side, con Vite, JavaScript e Three.js. Città voxel notturna, tre difficoltà, 12 incroci, animazioni di corsa/arresto/estrazione e crediti esclusivamente virtuali. Versione 1.1: mappa modulare e inseguimento luminoso, ispirati alla [reference fornita](docs/reference.png).

## Città modulare

Ogni modulo è un diorama quadrato di 26 × 26 unità con un solo incrocio, tre edifici in mattoni, negozi con tende, finestre calde, tetti piatti, alberi, aiuole, marciapiedi e una base a strati voxel. Le strade principali di due moduli consecutivi combaciano senza interruzioni.

| Modulo | Illuminazione e comportamento |
| --- | --- |
| Precedente | Lampioni e finestre spenti; un'auto della polizia lo illumina con sirene blu e rosse. |
| Attuale | Luce calda, lampioni e finestre accesi, semaforo di gioco attivo. |
| Prossimo | Già caricato ma buio: rimane visibile una sagoma blu, senza finestre, lampioni o semafori accesi. |

Il cambio di ruolo dipende dalla **posizione reale del ladro**, non dal numero visualizzato nel percorso. Dopo un verde, il ladro attraversa l'incrocio e raggiunge la fermata prima di quello successivo. Quando oltrepassa il confine del modulo, la nuova zona si illumina gradualmente, quella lasciata alle spalle passa alle sirene, e viene preparato il prossimo modulo buio.

Il nuovo modulo compare con risalita e dissolvenza a dithering (`alphaHash`); quello ormai fuori dalla finestra scende e scompare. A regime sono presenti **tre moduli**; durante la dissolvenza ne può esistere temporaneamente **un quarto**, poi materiali e buffer delle istanze obsolete vengono liberati. Le geometrie condivise rimangono disponibili per i moduli ancora visibili.

Anche all'inizio e alla fine rimangono tre moduli: un quartiere di avvicinamento prima del primo incrocio e un quartiere di uscita buio dopo l'ultimo. Questi due moduli scenografici non aggiungono puntate o incroci al percorso di gioco.

Quando il semaforo è rosso, i lampioni del modulo attuale si spengono, arriva l'auto con **due lampeggianti blu** e un riflesso blu pulsa ai bordi della scena. L'effetto continua nel risultato di arresto e si azzera alla nuova partita o al ripristino. La preferenza di movimento ridotto rende le luci stabili ed elimina risalite e dissolvenze.

Dimensione dei moduli, strada, fermate e frequenza delle sirene sono definiti in `src/mapLayout.js`. Geometria e palette sono in `src/cityTile.js`; la finestra di caricamento e la rimozione delle risorse sono in `src/cityStream.js`.

## Avvio

Requisiti: Node.js 20.19+ nella serie 20, oppure 22.12+; npm; un browser con WebGL 2. Le versioni esatte di Three.js e Vite sono fissate nel manifest e nel lockfile.

```bash
npm install
npm run dev
```

Apri l'indirizzo stampato da Vite, normalmente `http://localhost:5173`. Il comando abilita anche l'accesso dalla rete locale: per giocare dallo smartphone sulla stessa Wi-Fi, apri l'indirizzo **Network** stampato da Vite. Il firewall del computer deve consentire quella connessione.

Per provare il gioco senza installazione, apri **cops-and-robbers.html** in un browser: contiene JavaScript, CSS e Three.js. Non richiede download di asset o un server. Se il visualizzatore di file del telefono non esegue JavaScript, usa un browser completo oppure l'indirizzo Network di Vite.

## Comandi disponibili

| Comando | Risultato |
| --- | --- |
| `npm run dev` | Server di sviluppo Vite con accesso dalla LAN. |
| `npm test` | Test deterministici della matematica, dello stato e delle animazioni. |
| `npm run build` | Build statica di produzione nella cartella `dist/`. |
| `npm run preview` | Serve la build di produzione, normalmente sulla porta 4173. |
| `npm run build:standalone` | Rigenera il singolo file `cops-and-robbers.html`. |

La normale build `dist/` va servita via HTTP. Per l'apertura diretta da disco, usa l'HTML autonomo. Dopo modifiche ai sorgenti, rigenera entrambe le build se vuoi distribuirle aggiornate.

## Come si gioca

1. Il saldo iniziale è di **1.000 CR**. Scegli difficoltà e puntata, poi premi **Avvia la fuga**.
2. La puntata viene scalata una sola volta. Dopo un countdown di **1,5 secondi**, il semaforo restituisce verde oppure rosso.
3. Con il verde, il ladro corre oltre l'incrocio. A corsa conclusa puoi scegliere **Prossimo incrocio** o **Incassa**. Non c'è un timer sulla decisione.
4. Con il rosso, arriva la polizia e il ladro alza le mani. La puntata è persa. A fine animazione puoi avviare un'altra partita.
5. Incassando dopo 1–4 incroci, il ladro svolta nel vicolo. Da **5 incroci** arriva l'elicottero del complice, con bonus dell'**8%** sul moltiplicatore base, già compreso nell'importo mostrato.
6. Al **12° incrocio**, l'incasso e l'estrazione sono automatici. Il limite evita percorsi indefiniti e valori fuori scala nel prototipo.

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

| Parametro | Valore iniziale | Posizione |
| --- | --- | --- |
| RTP target | `0.96` | `RTP_TARGET`, `gameMath.js` |
| Probabilità del primo verde | `0.95` | `INITIAL_GREEN_PROBABILITY`, `gameMath.js` |
| Decadimento facile / medio / difficile | `0.035 / 0.065 / 0.10` | `DIFFICULTIES`, `gameMath.js` |
| Probabilità minima | `0.12` | `MIN_GREEN_PROBABILITY`, `gameMath.js` |
| Soglia / bonus elicottero | `5 / 0.08` | `HELICOPTER_THRESHOLD` / `HELICOPTER_BONUS`, `gameMath.js` |
| Incroci massimi | `12` | `MAX_CROSSINGS`, `gameMath.js` |
| Countdown | `1500 ms` | `COUNTDOWN_MS`, `gameState.js` |
| Saldo iniziale | `100000` centesimi di CR | `INITIAL_BALANCE`, `gameState.js` |
| Puntata minima / massima | `1 / 1000000 CR` | `MIN_BET` / `MAX_BET`, `gameState.js` |

`RTP_TARGET` cambia il livello dei moltiplicatori; i `decay` cambiano la velocità di crescita del rischio. Sono volutamente parametri separati. Se abbassi il target sotto la probabilità iniziale, il primo moltiplicatore può scendere sotto 1: per mantenere il primo passaggio in utile, calibra anche la probabilità iniziale.

### Il bonus non deve alterare il target

Aggiungere un ulteriore 8% a `0.96 / P(n)` porterebbe l'RTP degli incassi in elicottero al **103,68%**, incompatibile con il 96% richiesto. Il prototipo riserva quindi il bonus all'interno del payout totale:

```text
prima del 5° incrocio:  M_base = M_totale, bonus = 0
dal 5° incrocio:        M_base = M_totale / 1.08
                       bonus = M_base × 0.08
                       incasso = puntata × (M_base + bonus)
```

`getPayoutBreakdown()` restituisce base, bonus e totale. Il grande moltiplicatore a video è **sempre il totale effettivamente pagabile**. Non viene aggiunto un bonus nascosto al momento dell'accredito.

Il saldo è un intero in centesimi di CR. `calculatePayout()` arrotonda per difetto solo all'incasso, con scarto inferiore a 0,01 CR. Il 96% è il target teorico prima di questa quantizzazione; il ritorno effettivo arrotondato è leggermente inferiore. I moltiplicatori in interfaccia hanno due decimali per leggibilità, ma il calcolo usa il valore completo.

La formula vale per una strategia di incasso a ciascun traguardo consentito. Non garantisce un risultato su una singola partita o una breve sessione. Non è permesso incassare prima del primo verde o durante una risoluzione.

Gli esiti usano `crypto.getRandomValues()` e un solo campione uniforme a countdown completato. Non ci sono risultati predefiniti né correzioni basate sul saldo o sulle sconfitte precedenti. La decorazione della città usa un generatore separato con seme fisso: non influenza i semafori. Nei test il generatore viene iniettato nel costruttore di `GameState`.

## Moduli

| File | Responsabilità |
| --- | --- |
| `src/gameMath.js` | Probabilità, sopravvivenza cumulata, moltiplicatori, bonus, arrotondamento e tabella del rischio. |
| `src/gameState.js` | Macchina a stati, validazione puntate, saldo, countdown e storico. |
| `src/sceneManager.js` | Renderer WebGL, camera isometrica, illuminazione del modulo occupato, auto in inseguimento, riflesso blu e moltiplicatore sull'asfalto tra le strisce pedonali. |
| `src/mapLayout.js` | Dimensioni dei moduli, raccordi stradali, fermate, modulo occupato e pulsazione delle sirene. |
| `src/cityTile.js` | Costruzione del diorama quadrato, edifici, vegetazione, lampioni, semafori e materiali indipendenti per modulo. |
| `src/cityStream.js` | Caricamento di precedente/attuale/prossimo, comparsa, scomparsa e rilascio delle risorse obsolete. |
| `src/voxelModels.js` | Geometrie condivise, modelli di ladro/auto/elicottero e batch di istanze statiche. |
| `src/characterController.js` | Animazioni delle gambe e delle braccia, arresto, vicolo, elicottero e completamento delle transizioni. |
| `src/ui.js` | Overlay, input, validazione, pulsanti, storico, countdown e regole. |
| `src/main.js` | Collegamento tra stato e scena e ciclo `requestAnimationFrame`. |
| `src/style.css` | Layout, palette, responsività, dialogo e preferenza di movimento ridotto. |
| `scripts/buildStandalone.mjs` | Esportazione della build in un singolo HTML senza richieste esterne. |
| `tests/` | Test con il runner nativo di Node.js; nessun framework di test aggiuntivo. |

Gli stati sono `idle → countdown → running → ready`, con ritorno a `countdown` per proseguire. Il rosso porta a `caught → result`; l'incasso porta a `escaping → result`. Puntata e difficoltà sono bloccate durante una partita. Le guardie impediscono doppi accrediti, doppie partenze e incassi dopo l'inizio di un nuovo countdown.

## Rendering e comportamento

- Tutti gli oggetti sono geometrie voxel generate dal codice. Una piccola texture procedurale condivisa crea gli aloni dei lampioni; nessun asset o servizio remoto.
- Gli edifici e la decorazione sono raggruppati in `InstancedMesh`; geometrie e materiali dei personaggi sono condivisi.
- Pixel ratio limitato a 1,6 e shadow map da 1024 px. Una sola luce principale calda segue il modulo occupato. Il numero di luci resta costante mentre la città avanza.
- I semafori, le finestre e i lampioni usano `MeshStandardMaterial` con emissività controllata per modulo. Il modulo futuro non emette luce.
- Le sirene sono sincronizzate su una pulsazione morbida di 1,7 Hz; la cattura usa il blu sia sull'auto sia sulla città e sul bordo della scena.
- La camera segue lentamente il ladro. I semafori mostrano colore e gli esiti sono ripetuti nel testo, senza affidarsi al solo colore.
- Se la scheda è nascosta, countdown e animazioni si fermano. Al ritorno riprendono dallo stesso punto.
- `prefers-reduced-motion` riduce movimento e durata delle animazioni e rende le luci della polizia stabili.
- In caso di WebGL non disponibile o contesto perso, i comandi vengono disabilitati e compare un messaggio con ricarica.

## Verifica

**35 test automatici superati**, oltre alla build di produzione e all'esportazione HTML. Copertura: tutte le 36 combinazioni difficoltà/incrocio per l'RTP; bonus alla soglia; arrotondamenti; limiti; confini della probabilità; singolo campionamento; perdita e incasso; doppi clic; puntata massima e saldo zero; reset; ultimo incrocio; callback e posizioni finali delle animazioni. I nuovi controlli verificano raccordi fra i moduli, ingresso fisico prima dell'accensione, oscurità del modulo futuro, spegnimento di quello precedente, comparsa e scomparsa, numero massimo di moduli, rilascio delle risorse, lampeggi blu persistenti, reset e movimento ridotto.

I test delle animazioni operano sulle geometrie e trasformazioni Three.js in Node, senza renderer WebGL. Questa consegna non include un collaudo visuale in browser o su dispositivi fisici.

Documentazione delle dipendenze: [Vite](https://vite.dev/guide/), [build Vite](https://vite.dev/guide/build), [Three.js WebGLRenderer](https://threejs.org/docs/pages/WebGLRenderer.html). Vedi `THIRD_PARTY_NOTICES.md` per le licenze incluse.
