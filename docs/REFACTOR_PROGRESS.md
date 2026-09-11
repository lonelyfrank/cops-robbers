# Refactor architetturale — avanzamento

Branch: `refactor/architecture-v2`. Ogni fase mantiene invariati gameplay, probabilità,
RTP, payout, grafica, animazioni, comportamento mobile e movimento ridotto.

Cancello di validazione eseguito dopo ogni fase:

```
npm run format:check && npm run lint && npm run typecheck && npm test
npm run build && npm run build:standalone
```

Stato iniziale misurato prima di qualunque modifica: 64 test verdi, Prettier pulito,
build di produzione e HTML autonomo rigenerati senza differenze.

---

## Fase 1 — Tooling: ESLint reale separato da Prettier

**Motivazione.** `npm run lint` eseguiva solo `prettier --check`: nessuna analisi statica.

**Modifiche.**

- Nuovo `eslint.config.js` (flat config, ESLint 10) con tre livelli: regole comuni,
  globali browser per `src/**`, globali Node per `tests/**`, `scripts/**` e i file di
  configurazione. `eslint-config-prettier` chiude la lista, così nessuna regola
  cosmetica duplica il formatter.
- Regole scelte per trovare difetti reali (`no-constant-binary-expression`,
  `require-atomic-updates`, `no-promise-executor-return`, `no-unmodified-loop-condition`,
  `prefer-const`, `eqeqeq`…), non per generare rumore: l'intero repository produceva
  **3 errori**, tutti corretti.
- Script separati: `lint`, `format`, `format:check`, `typecheck`, `test`, `build`,
  `build:standalone`.

**Errori reali corretti.**

| File                | Problema                                                                                         |
| ------------------- | ------------------------------------------------------------------------------------------------ |
| `src/bootScreen.js` | gli handle dei timer sono ora inizializzati: `hide()` è chiamabile prima che l'intervallo parta. |
| `src/main.js`       | l'executor della promise restituiva l'id di `setTimeout`.                                        |
| `src/ui.js`         | inizializzatore morto su `status` in `renderStatus`.                                             |

---

## Fase 2 — Type safety graduale con JSDoc e `checkJs`

**Motivazione.** Nessun controllo dei tipi; nessun vocabolario condiviso per i concetti
di dominio.

**Modifiche.**

- `jsconfig.json` con `checkJs`, `allowJs`, `noEmit`, `maxNodeModuleJsDepth: 0` e
  `types: ["node", "vite/client"]`. `strict` resta **disattivato**: è la scelta graduale
  chiesta dalla specifica, non un compromesso permanente (vedi debito residuo).
- `@types/three` fissato a `0.180.0`, la stessa versione della dipendenza: Three.js non
  pubblica tipi propri e senza di essi il compilatore analizzava il bundle JS della
  libreria (5.700 errori di rumore).
- Nuovo `src/core/types.js`: solo `@typedef`, nessun codice a runtime. Definisce
  `GamePhase`, `DifficultyId`, `CityThemeId`, `TileRole`, `TrafficSignalState`,
  `AnimationKind`, `RoundOutcome`, `GameHistoryEntry`, `GameSnapshot`,
  `MotionPreference`, `RenderingQuality` e `CaptureState`.
- Moduli annotati con priorità: `gameMath`, `gameState`, `mapLayout`, `cityThemes`,
  `motionPreference`, poi `voxelModels`, `cityTile`, `trafficController`,
  `districtGeometry`, `neonDistrict`, `multiplierReel`, `bootScreen`.
- 84 errori di tipo reali risolti; `npm run typecheck` è verde.

**Decisioni architetturali.**

- `DIFFICULTY_IDS` e `CITY_THEME_IDS`: `Object.keys()` allarga le chiavi a `string`,
  quindi i due elenchi tipizzati sostituiscono le iterazioni nei test senza cast sparsi.
- `isInstancedMesh(node)` in `voxelModels.js`: Three.js espone il flag sull'istanza e non
  su `Object3D`. Un unico type guard sostituisce quattro controlli non tipizzati in
  `cityTile`, `trafficController` e nei test.
- `GameState.canConfigure` usa due confronti invece di `Array.includes`, che restringeva
  `phase` al solo letterale iniziale. Comportamento identico.
- `scripts/buildStandalone.mjs` verifica esplicitamente che `index.html` sia un asset
  Rollup prima di leggerne il sorgente.
- Le annotazioni sui test riguardano solo input ostili deliberati (puntate non valide,
  difficoltà inesistenti, tentativi di mutare lo snapshot congelato): sono marcati `any`,
  non rimossi.

**Verifica.** `format:check`, `lint`, `typecheck`, 64 test, build e HTML autonomo: verdi.
L'HTML autonomo è stato rigenerato e committato.

---

## Fase 3 — Utilità pure fuori dalla UI

**Motivazione.** `parseBet()` viveva in `src/ui.js`: per provare una funzione pura i test
Node dovevano importare il modulo dell'interfaccia.

**Modifiche.**

- Nuovo `src/core/money.js`, puro: `parseBet`, `formatBetInput`, `clampBet`,
  `getBetError`, più `MIN_BET` e `MAX_BET`, spostati da `gameState.js` perché sono regole
  sul denaro e non sulla macchina a stati. Nessun re-export di compatibilità: gli
  importatori sono aggiornati.
- `ui.js` conserva solo i testi. `getBetError()` restituisce un codice
  (`invalid`, `below-minimum`, `insufficient`, `above-maximum`) e la mappa `BET_ERRORS`
  nella UI lo traduce. La classificazione diventa provabile senza DOM.
- `formatBetInput()` sostituisce le tre ripetizioni di
  `(amount / 100).toFixed(2).replace('.', ',')` e `clampBet()` la formula di limite dei
  tasti ½ / 2× / MAX.

**Comportamento preservato.** Il parsing italiano è identico, carattere per carattere:
`25`, `1,25`, `1.000,00`, `1.234,50`, `1.000.000,00` e tutti i casi invalidi già coperti.
Il campo puntata continua a non usare il separatore delle migliaia.

**Test.** Il test del parsing si sposta da `tests/gameState.test.js` a
`tests/money.test.js`, dove si aggiungono round-trip del formatter, limiti del clamp e
classificazione degli errori. 67 test verdi.

---

## Fase 4 — Identità del progetto

**Motivazione.** Il titolo pubblico è **Cops&Robbers**, ma il nome npm e l'artefatto
distribuito conservavano ancora il nome storico.

**Modifiche.**

- `package.json`: `cops-and-robbers` → `cops-and-robbers`, descrizione allineata.
  Lockfile rigenerato.
- `cops-and-robbers.html` → `cops-and-robbers.html`, con `git mv`. Aggiornati lo script
  di build, il controllo CI `git diff --exit-code`, `.prettierignore` e il README.
- Messaggio di console: `Cops&Robbers:` → `Cops&Robbers:`.
- Il `<title>` della pagina era già corretto.

**Decisione architetturale.** Nessun alias legacy sul disco. Mantenere una copia del
vecchio nome duplicherebbe un artefatto generato da 770 KiB nel repository; la cronologia
Git conserva comunque il percorso precedente. Il README segnala il rinomino a chi avesse
salvato il vecchio collegamento.

**Breaking change.** Chi distribuiva il link diretto a `cops-and-robbers.html` deve
aggiornarlo.

---

## Fase 5 — Configurazione centralizzata per dominio

**Motivazione.** I numeri regolabili erano sparsi fra le formule (`gameMath`), la macchina
a stati (`gameState`), il blocco `TUNING` di `sceneManager` e costanti inline nelle
animazioni.

**Modifiche.** Tre file, uno per dominio — non un unico config gigante.

| File                      | Contenuto                                                                                                             |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `src/config/gameplay.js`  | RTP target, probabilità iniziale, pavimento, decadimenti, incroci massimi, saldo iniziale, puntata default e limiti.  |
| `src/config/rendering.js` | `RENDERER`, `CAMERA`, `LIGHTING`, `CAPTURE`: blocchi separati per i sistemi che la Fase 9 estrarrà da `sceneManager`. |
| `src/config/animation.js` | `CHARACTER` (durate di corsa, arresto, vicolo) e `CITY` (velocità di comparsa e risposte della luce).                 |

- `gameMath.js` resta formule pure e importa i suoi parametri; conserva `DIFFICULTIES`
  perché etichette e descrizioni appartengono alla curva di rischio.
- `core/money.js` importa `MIN_BET` / `MAX_BET` dal config: il modulo resta comportamento,
  la configurazione resta numeri.
- Nessun re-export di comodo salvo `INITIAL_BALANCE` da `gameState.js`, che resta parte
  della sua API pubblica storica.
- Le durate delle animazioni sono spostate; la _forma_ di una singola coreografia (quando
  si alzano le mani dentro l'arresto) resta accanto all'animazione, dove si legge come
  sequenza unica.

**Comportamento preservato.** Tutti i valori sono identici. I 36 casi RTP difficoltà ×
incrocio continuano a dare `P × M = 0,96`.

---

## Fase 6 — La UI non è più un monolite

**Motivazione.** `src/ui.js` contava 479 righe e teneva insieme lookup del DOM, orologio,
percorso, validazione della puntata, difficoltà, azioni, sei funzioni di render, dialogo
delle regole e messaggio di errore.

**Struttura.** Nessun framework, nessun virtual DOM: componenti come funzioni che
possiedono i propri elementi, i propri listener e la propria memoizzazione.

```
src/ui/
  createUI.js      composition root: azioni, vista, distribuzione dello snapshot
  dom.js           lookup tipizzati e un solo ambito di listener annullabile
  view.js          derivazione pura della vista (nessun DOM)
  labels.js        testi italiani e regole pure di messaggio
  bootScreen.js    (spostato da src/)
  components/      surveillanceHud, betControls, difficultySelector, gateMeter,
                   actionBar, routeDisplay, resultBanner, statusLine, historyList,
                   rulesDialog, errorOverlay, multiplierReel (spostato da src/)
```

Il file più grande è ora `createUI.js` con 113 righe; la mediana dei componenti è 56.

**Vincoli rispettati.** DOM vanilla, `AbortController` per tutti i listener, stato dei
pulsanti, `aria-pressed`, `aria-invalid`, regione live dello stato, `role="meter"` del
varco, navigazione da tastiera, touch, movimento ridotto (scorrimento della striscia CAM
e rullo), layout desktop e mobile, CCTV, rullo del moltiplicatore, storico, dialogo delle
regole e validazione della puntata.

**Decisioni architetturali.**

- `deriveView()` è puro e riceve i marker del render precedente, invece di leggere
  variabili condivise: le regole di presentazione diventano provabili.
- Il testo vive in `labels.js`; `getStatusMessage()` e `getActionLabels()` sono funzioni
  pure. I componenti si occupano di layout e stato.
- La composition root possiede solo le azioni di gioco (invio del form, incasso,
  ripristino). I widget locali restano nei loro componenti.
- `dispose()` resta idempotente: il rimontaggio HMR non duplica listener né timer.

**Test.** Nuovo `tests/ui.test.js` con `tests/helpers/domHarness.js`: monta il **vero**
`index.html` in jsdom e verifica stato iniziale, blocco fino a scena pronta, validazione
della puntata con i quattro messaggi, scorciatoie ½ / 2× / MAX, selezione della
difficoltà, corsa verde, incasso, arresto, dialogo delle regole, ripristino, errore WebGL
fatale e rilascio dei listener dopo `dispose()`.

Scelta del runner: **jsdom sul runner nativo di Node**, non Vitest. Il progetto ha già un
runner e aggiungerne un secondo avrebbe introdotto una seconda configurazione senza
vantaggi. jsdom 30 non implementa `Element.animate`, `Element.scrollTo`, `dialog.showModal`
né `matchMedia`: l'harness li sostituisce con i minimi stub documentati.

76 test verdi.

---

## Fasi 7 e 8 — Runtime esplicito e game loop separato

**Motivazione.** `main.js` conteneva `synchronizeScene()`, il ciclo
`requestAnimationFrame`, il clamp del delta, la gestione della visibilità della scheda,
la cattura degli errori di frame e il ciclo di vita HMR: 150 righe che erano insieme
entry point e coordinatore.

**Modifiche.**

- `src/runtime/GameLoop.js` (74 righe): frame, delta time con clamp, scheda nascosta,
  `start`, `stop`, `dispose`. Non conosce né gioco né UI: chiama solo
  `update(dt, elapsed)`. Un errore nell'update ferma il ciclo e viene riportato **una
  sola volta** tramite `onError`.
- `src/runtime/GameRuntime.js` (93 righe): reagisce agli snapshot e guida attori, città e
  renderer. Nessuna regola di gioco, nessun rendering proprio.
- `src/main.js` (116 righe) resta solo composition root: crea le dipendenze, avvia il
  runtime, rilascia tutto su errore fatale o rimontaggio HMR.

**Decisione architetturale.** `GameRuntime` dichiara le sue dipendenze **strutturalmente**
(`ActorSystem`, `SceneSystem`), non sulle classi concrete. Il contratto diventa esplicito
e il runtime è pilotabile in test senza una scena Three.js — che è esattamente ciò che i
nuovi test fanno. Nessun "God Coordinator": il runtime ha un solo ingresso (`sync`) e un
solo passo (`update`).

**Comportamento preservato.** Stessi sentinelle (`previousPhase = ''`,
`previousRound = -1`), stesso ordine reset attori → reset città → animazione, stesso
clamp a 0,05 s, stessa pausa a scheda nascosta senza recupero del tempo trascorso, stesso
`AbortController` per i listener di `main.js`, stesso render singolo prima di abilitare la
puntata.

**Test.** Nuovo `tests/runtime.test.js` (9 test): clamp del frame lungo, scheda nascosta e
rientro senza salto, `stop()` che annulla il frame in coda, errore riportato una sola
volta, e i flussi richiesti — verde → corsa → `finishCrossing` → READY; rosso → cattura →
`finishCaught` → RESULT; incasso → fuga → RESULT; dodicesimo incrocio con incasso
automatico senza READY pubblico. Ogni flusso verifica **una sola** animazione e **una
sola** transazione economica. 85 test verdi.

---

## Fasi 9 e 10 — Scena divisa e rendering senza DOM

**Motivazione.** `sceneManager.js` teneva insieme renderer, camera, resize, nebbia,
illuminazione, CityStream, indicatori, decal del moltiplicatore, sirene, effetti di
cattura, lampeggio della polizia e dispose. Inoltre leggeva direttamente
`document.getElementById('police-flash')`.

**Modifiche.**

| File                                | Responsabilità                                                                   |
| ----------------------------------- | -------------------------------------------------------------------------------- |
| `src/rendering/SceneRenderer.js`    | Contesto WebGL, scena, nebbia, `ResizeObserver` e dimensione del canvas.         |
| `src/rendering/CameraController.js` | Camera ortografica, proiezione al resize, inseguimento morbido, zoom di cattura. |
| `src/rendering/LightingSystem.js`   | Luci in numero fisso del modulo occupato e palette per tema.                     |
| `src/rendering/WorldIndicators.js`  | Indicatore del ladro e decal del moltiplicatore sull'asfalto.                    |
| `src/rendering/CaptureEffects.js`   | Luci blu dell'arresto e **stato** dell'overlay.                                  |
| `src/rendering/createScene.js`      | Composizione: ordina i sistemi per frame. Nessun wrapper vuoto.                  |

`CityStream` resta nel dominio world, come richiesto.

**Disaccoppiamento DOM / Three.js.** `CaptureEffects` produce
`{ caught, sirenIntensity, captureIntensity }` e non tocca il documento. Il nuovo
componente `ui/components/captureOverlay.js` applica l'intensità all'elemento della
pagina; `GameRuntime` inoltra lo stato dopo ogni frame e azzera l'overlay quando la città
viene ricostruita, così il lampeggio non sopravvive a una nuova corsa. Nel livello di
rendering non resta alcun `getElementById`: l'unica chiamata al documento è
`document.createElement('canvas')` per la texture del decal, cioè una superficie di
disegno fuori schermo, non un elemento della pagina.

**Attenzione al ciclo di vita.** Nell'ordine di `dispose()` il pool voxel condiviso viene
rilasciato **prima** di `renderer.dispose()`: invertire i due passaggi lascerebbe i buffer
GPU senza il listener del renderer che li libera.

**Test.** `tests/runtime.test.js` guadagna un test dedicato: l'overlay riceve l'intensità
prodotta dal renderer e viene azzerato una volta per ogni ricostruzione della città. 86
test verdi.

---

## Debito tecnico noto

- `strict: false` nel type checker. L'attivazione di `strictNullChecks` richiede una
  passata dedicata sui moduli di rendering; va fatta dopo la suddivisione di `ui.js` e
  `sceneManager.js`, non prima.
- `src/style.css` (1801 righe) e `src/consoleShell.css` (1205 righe) sono importati
  insieme e si sovrappongono: 64 selettori duplicati e 7 token ridefiniti. È un refactor
  visivo che richiede verifica a schermo ed è fuori dal perimetro di questo intervento.
- `vite@7.1.5` è fissato e `npm audit` segnala vulnerabilità del solo dev server. Il
  pinning è una scelta del progetto: l'aggiornamento va valutato a parte.
