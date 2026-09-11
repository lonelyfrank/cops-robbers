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

## Spostamento nei domini

Passaggio meccanico, senza modifiche di comportamento, per far atterrare le fasi
successive nella cartella giusta: `core/` (gameMath, gameState, format), `world/`
(mapLayout, cityEffects, cityThemes, CityTile, CityStream, TrafficController,
`geometry/`), `rendering/` (voxelModels con i sistemi di rendering), `actors/`
(CharacterController). `main.js` e `motionPreference.js` restano alla radice di `src/`:
l'entry point e l'unico servizio trasversale del browser.

Gli specificatori di import sono stati riscritti risolvendo ciascuno rispetto alla
posizione vecchia e ricalcolandolo dalla nuova; una scansione finale conferma che non
resta alcun riferimento irrisolto.

---

## Fase 11 — Animazioni del personaggio in dispatch

**Motivazione.** `CharacterController.update()` conteneva una catena
`if (a.kind === 'run') … else if ('caught') … else if ('alley')` destinata a crescere a
ogni nuova animazione, e il blocco di completamento aveva un ramo specifico per la corsa.

**Modifiche.**

- `src/actors/animations/` con un gestore per animazione: `run.js`, `caught.js`,
  `alley.js`. Ognuno espone `create` (costruisce il proprio stato), `update` (applica la
  posa) e facoltativamente `settle` (valori finali esatti).
- `index.js` espone la tabella `ANIMATIONS` e il tipo `AnimationHandler`.
- `easing.js` raccoglie `clamp`, `smooth`, `lerp` e `poseRun`, prima metodi o funzioni
  private del controller.
- Il controller conserva modelli, orologio condiviso, sacca, sirene e stato di arresto, e
  possiede **solo** clock e callback: `#play(kind, options, onComplete)` crea, `update`
  smista. Aggiungere un'animazione non tocca più `update`.

**Vincolo rispettato.** Nessuna skeletal animation, nessun glTF, nessun `AnimationMixer`:
il personaggio resta voxel con pose procedurali.

**Comportamento preservato.** I test esistenti su pose di arresto a 30/60/120 Hz,
accerchiamento da quattro direzioni, attesa della pattuglia, vicolo a tutti i dodici
incroci e callback non sovrascritte passano invariati. Un nuovo test verifica che ogni
`AnimationKind` risolva a un gestore.

---

## Fase 12 — Geometria dei quartieri divisa

**Motivazione.** `districtGeometry.js` era il file destinato a crescere di più: 501 righe
con fondazioni, strade, segnaletica, tre tipi di edificio, arredo urbano, alberi,
lampioni, semafori e composizione.

**Modifiche.**

| File                           | Contenuto                                                                       |
| ------------------------------ | ------------------------------------------------------------------------------- |
| `geometry/streets.js`          | Fondazione a strati, pavimentazione, carreggiate, cordoli, strisce, vicoli.     |
| `geometry/buildings.js`        | Edifici in mattoni e scelta dell'architettura del tema.                         |
| `geometry/urbanProps.js`       | Pensilina/metro/edicola, alberi, aiuole, muretti, panchine, lampioni con alone. |
| `geometry/trafficLights.js`    | `SIGNAL_COLORS` e la testa del semaforo con le tre lampade individuali.         |
| `geometry/districtVariants.js` | `randomFor()` e `getDistrictStyle()`: le variazioni deterministiche.            |
| `geometry/createDistrict.js`   | Composizione: fondazione, edifici, livello strada, traffico.                    |
| `geometry/neonDistrict.js`     | Invariato.                                                                      |
| `geometry/index.js`            | **Facade**: `buildDistrictGeometry`, `getDistrictStyle`, `SIGNAL_COLORS`.       |

Il resto del codice continua a usare solo la facade e non conosce l'implementazione.

**Verifica specifica.** L'ordine delle chiamate `batch.add` e il consumo del generatore
deterministico fanno parte del risultato. Oltre ai test, la geometria è stata confrontata
con il codice pre-refactor istanziando **28 quartieri** (2 temi × 14 indici) in entrambi
gli alberi e comparando matrici delle istanze, colori, conteggi, trasformazioni globali,
posizioni degli aloni e descrittori dei semafori: **32.656 istanze identiche al bit**.

87 test verdi.

---

## Fase 19 — Patch agli shader Three.js con guardia

**Motivazione.** Due effetti modificano gli shader di Three.js tramite `onBeforeCompile`
e sostituzione di stringhe: il gradiente luminoso della città in `cityEffects.js` e la
dissolvenza delle ombre del traffico in `TrafficController.js`. Se un aggiornamento di
Three.js rinomina o riordina un chunk, la `String.replace` **non fallisce**: restituisce
lo shader invariato e l'effetto smette di funzionare in silenzio.

**Modifiche.**

- `src/rendering/shaderPatch.js`: `replaceShaderChunk()` e `applyShaderPatches()`
  verificano che il marcatore esista. In sviluppo (`import.meta.env.DEV`) lanciano;
  altrove riportano su `console.error` e restituiscono il sorgente intatto, così una
  versione incompatibile degrada invece di lasciare la pagina bianca.
- `SHADER_MARKERS` elenca i marcatori usati dal progetto, raggruppati per shader.
- Entrambi i moduli sono documentati come **upgrade-sensitive** nel codice.
- Il pinning di Three.js a `0.180.0` resta invariato, come richiesto.

**Test.** Nuovo `tests/shaderPatch.test.js`:

1. ogni marcatore in `SHADER_MARKERS` esiste ancora in `THREE.ShaderLib` della versione
   installata — un aggiornamento di Three.js fallisce in CI, non a schermo;
2. un chunk mancante viene riportato e mai applicato in silenzio, e in modalità stretta
   lancia;
3. le patch arrivano davvero allo shader compilato, con le uniform collegate agli oggetti
   vivi (il fuoco della luce e l'opacità dell'auto), non a copie.

90 test verdi.

---

## Fase 20 — Temi in moduli separati

**Motivazione.** I due temi vivevano in un solo file insieme al registro e alla rotazione:
aggiungerne un terzo avrebbe fatto crescere lo stesso modulo.

**Modifiche.**

```
src/world/themes/
  shared.js      freezeTheme() e i materiali caldi comuni
  district87.js  il tema originale
  neonTokyo.js   facciate in vetro, neon, ramen, giardini sui tetti
  index.js       registro, elenco tipizzato, tema di default, rotazione per corsa
```

Aggiungere un tema significa aggiungere un modulo ed elencarlo in `index.js`.

**Preservato.** Rotazione puramente cosmetica, nessun consumo del generatore degli esiti,
tema fisso per tutta la corsa, materiali e colori configurabili, congelamento profondo
delle palette. La geometria generata è stata di nuovo confrontata con l'albero
precedente: **32.656 istanze identiche al bit** su 28 quartieri.

90 test verdi.

---

## Fase 21 — Generazione deterministica formalizzata

**Motivazione.** Il generatore della città era una funzione privata di
`districtGeometry.js` con due semi calcolati a mano (`index` e `index + 503`): un
meccanismo importante nascosto in un dettaglio di implementazione.

**Modifiche.**

- `src/world/seededRandom.js`: `createSeededRandom(seed)` — LCG a 32 bit, senza
  allocazioni, stesso flusso su ogni piattaforma — e `createDistrictRandom(index, offset)`
  che applica base e passo dei semi dei quartieri.
- `DISTRICT_SEED_BASE` è esplicito; lo stream separato dell'architettura è documentato
  come tale invece di essere un `+ 503` inline.

**Confine fra i generatori.** Il modulo dichiara in testa che questo è **solo** RNG
cosmetico: gli esiti restano su `crypto.getRandomValues()` dentro `GameState` e i due non
si incontrano mai. È la condizione che rende possibili, in futuro, seme della corsa,
replay, screenshot di regressione e riproduzione dei bug senza toccare le probabilità.

**Test.** `tests/seededRandom.test.js`: stesso seme → stesso flusso, semi diversi →
flussi diversi, un stream distinto per quartiere, stream dell'architettura indipendente
da quello della fondazione, stile riproducibile per indice e — la verifica che conta —
costruire l'intera città non consuma **nessun** campione del generatore di gioco.

La geometria è stata riconfrontata con l'albero precedente: **32.656 istanze identiche al
bit**. 93 test verdi.

---

## Fasi 16, 17 e 18 — Qualità, diagnostica e predisposizione adattiva

**Fase 16 — preset di qualità.** `QUALITY_PRESETS` in `config/rendering.js` definisce
`low`, `medium` e `high`, con pixel ratio, antialiasing, ombre, dimensione della shadow
map, intensità degli aloni e luci decorative. **`high` è esattamente la resa approvata**,
quindi il comportamento predefinito non cambia; un test lo verifica esplicitamente.

La selezione è **esplicita** (`?quality=low`), mai dedotta dallo user agent. Il parsing
vive in `core/runtimeOptions.js`, puro e testato, e ignora valori sconosciuti.

`scene.setQuality(id)` applica a caldo tutto ciò che non richiede un nuovo contesto:
pixel ratio, ombre, dimensione della mappa, luci di riempimento, aloni. L'antialiasing
resta fissato alla creazione del contesto, ed è documentato come tale. Il semaforo non
viene mai spento: è informazione di gioco.

**Fase 17 — pannello prestazioni.** `?debug=1`.

- `rendering/PerformanceMonitor.js`: sola misura, nessun DOM. Media su trenta frame e
  pubblica FPS, tempo di frame, frame peggiore, draw call, triangoli, geometrie, texture,
  programmi compilati, tile vive e numero di `InstancedMesh`.
- `ui/components/debugPanel.js`: costruisce il proprio elemento e porta i propri stili
  inline, così né il markup di produzione né i due fogli di stile condivisi lo conoscono.
  Scrive testo solo quando arriva una nuova lettura.
- Disattivato per impostazione predefinita; la diagnostica non è mai nel percorso di
  render quando è spenta. Costo sull'HTML autonomo: circa 4 KiB su 778 KiB.

**Fase 18 — predisposizione adattiva.** Nessuna logica aggressiva, come richiesto. Sono
in posizione i due ganci che servono: una misura reale del tempo di frame
(`PerformanceMonitor`) e un interruttore a caldo (`scene.setQuality`). Un controller
adattivo futuro legge la prima e chiama il secondo, senza toccare i sistemi di rendering
né lo user agent.

**Test.** `tests/quality.test.js`: il preset predefinito coincide con la resa approvata,
i preset degradano in modo monotono, la qualità è richiesta e mai indovinata, un preset
basso spegne ombre e luci decorative e attenua gli aloni lasciando acceso il semaforo, il
monitor pubblica una lettura per finestra e riporta il frame peggiore anche senza elenco
dei programmi. 97 test verdi.

---

## Fasi 13 e 14 — CityTile e CityStream: cosa **non** è stato diviso

**CityTile (fase 13).** Valutata e lasciata come aggregate. Il file è di 190 righe e ha
una sola responsabilità coerente: possedere materiali, buffer e ciclo di vita di un
diorama. Le due estrazioni suggerite dalla specifica — `SignalSystem` e
`RevealController` — sarebbero oggi rispettivamente ~20 e ~15 righe fortemente accoppiate
al dirty tracking dei materiali: dividerle produrrebbe tre file che si scambiano lo stesso
stato, non tre responsabilità. La specifica dice di separare «solo se la complessità
attuale lo giustifica»: non lo giustifica. Aggiunti i tipi.

**CityStream (fase 14).** Non riscritto, come richiesto. Preservati finestra di tre
distretti, al massimo un distretto in uscita, pulizia immediata delle tile extra,
sincronizzazione sulla posizione reale del ladro, movimento ridotto e ciclo di vita.
Aggiunti tipi (`TileEntry`, mappe tipizzate, firme dei metodi) e il moltiplicatore degli
aloni per i preset di qualità.

**Fase 15 — asset pool.** Non modificato, come indicato dalla specifica per questa fase.
Lo stato di modulo in `rendering/voxelModels.js` funziona, ha il conteggio dei proprietari
e rilascia correttamente. Resta come debito aperto documentato in fondo.

---

## Fasi 28 e 29 — Documentazione dell'architettura

Nuovo `docs/ARCHITECTURE.md`: panoramica, diagramma del flusso, regole di dipendenza,
GameState, runtime, actors, world, rendering, confini dei generatori casuali, proprietà
delle risorse, interfaccia, qualità, patch agli shader, build, strategia di test e modello
di sicurezza.

**Le regole di dipendenza non sono solo scritte.** `tests/architecture.test.js` le
verifica: `core/` resta puro, solo `ui/` e `main.js` cercano elementi nella pagina, world
e actors non toccano il documento, `rendering/` usa il documento solo per
`createElement('canvas')`, `config/` non dipende dal comportamento e nessun modulo è
irraggiungibile da `main.js` (il codice morto fallisce il test).

**Modello di sicurezza (fase 28).** Documentato che il gioco è client-side con crediti
virtuali e che _questo_ è ciò che lo rende accettabile. Elencati esplicitamente gli
eventi che lo invaliderebbero — account, classifiche competitive, premi, valuta reale,
progressione online — e la conseguenza: RNG, payout, saldo e stato economico dovrebbero
diventare server-authoritative. Nessun backend introdotto ora.

103 test verdi.

---

## Fase 25 — Playwright

**Fatto.** `npm run test:e2e`, 12 controlli in `tests/e2e/`, verdi:

- avvio su WebGL reale, canvas dimensionato, nessun errore di console, nessun messaggio di
  fallback;
- corsa verde che avanza il percorso e abilita l'incasso;
- incasso con accredito unico e una sola voce nello storico;
- rosso con arresto, saldo ridotto della sola puntata e tappa segnata;
- nuova partita dopo il risultato e ripristino della demo;
- dialogo delle regole con la curva completa;
- validazione della puntata che blocca la corsa;
- movimento ridotto che completa comunque una partita intera;
- rotazione dei temi a ogni corsa accettata;
- preset di qualità e pannello di diagnostica entrambi opzionali;
- assenza di overflow orizzontale e controlli dentro il viewport, su desktop **e** su
  mobile landscape.

**Determinismo senza ganci in produzione.** Gli esiti vengono fissati sostituendo
`crypto.getRandomValues` con `addInitScript`, prima che qualunque script del gioco parta.
Il codice distribuito non contiene alcun gancio di test.

**Il costo, misurato.** Senza GPU Chromium rasterizza via software: il pannello di
diagnostica riporta **2 FPS**, con tempo di frame di circa 500 ms e picchi oltre 1,2 s,
sostanzialmente indipendenti da viewport e preset. Poiché il ciclo clampa un frame a
0,05 s, il tempo reale avanza circa **dieci volte** più in fretta dell'animazione: un
arresto da 2,2 s richiede oltre venti secondi di orologio. I timeout sono dimensionati su
questo (45 s per asserzione) e la suite dura circa **6 minuti**. Gira con **un solo
worker**: più contesti WebGL software in parallelo fanno cadere la sessione del browser.

Per questo è un comando e un **job CI separato**: i controlli veloci (`format:check`,
`lint`, `typecheck`, `test`, build) restano in pochi secondi.

**Difetto reale trovato da questa fase.** Il `PerformanceMonitor` della fase 17 misurava
il delta **già clampato** e riportava 21 FPS su una macchina che ne faceva 2: esattamente
il caso che il pannello esiste per rivelare. Ora tiene un proprio orologio e misura tempo
reale; il test è stato riscritto attorno a questo, con un'attesa di 400 ms che deve essere
riportata intera e non troncata a 50 ms.

---

## Fase 26 — Regressione visiva: **non fatta**, e perché

Le fondamenta ci sono: seme deterministico della città (fase 21), viewport fisse nella
configurazione Playwright, esiti riproducibili e preset di qualità espliciti. Manca
volutamente il confronto pixel.

Motivo: le baseline sarebbero legate all'ambiente. In CI e su questa macchina Chromium
rasterizza con SwiftShader; su una GPU reale lo stesso frame differisce per
antialiasing, filtraggio e precisione dei float. Baseline generate in software
fallirebbero su hardware vero e viceversa, e la specifica chiede esplicitamente di
«evitare snapshot grafici instabili».

Se verrà ripresa, la strada praticabile è: baseline generate **solo** in CI con
SwiftShader, soglia di differenza esplicita, preset `low` e movimento ridotto per
eliminare le animazioni, e stati catturati dopo un numero fisso di frame simulati anziché
dopo un'attesa a tempo.

---

## Riepilogo finale

### Architettura precedente

`src/` piatta, 20 file. Quattro moduli concentravano quasi tutto: `ui.js` (479 righe:
DOM, orologio, percorso, validazione, sei render, dialogo, errore), `sceneManager.js`
(314: renderer, camera, resize, luci, indicatori, effetti, dispose, lettura diretta di un
elemento della pagina), `districtGeometry.js` (425: fondazioni, strade, tre tipi di
edificio, arredo, lampioni, semafori, composizione) e `main.js` (150: entry point,
coordinatore, ciclo di animazione, clamp, visibilità, HMR). I numeri regolabili erano
sparsi fra formule, stato e un blocco `TUNING`. `npm run lint` eseguiva solo Prettier.
Nessun controllo dei tipi. Nessun test dell'interfaccia né del browser.

### Architettura nuova

65 file, 5.265 righe, per livelli con confini verificati dai test:

| Livello      | File | Righe | Responsabilità                                              |
| ------------ | ---: | ----: | ----------------------------------------------------------- |
| `core/`      |    6 |   535 | Matematica, stato, denaro, formattazione, tipi. Puro.       |
| `config/`    |    3 |   195 | Gameplay, rendering, animazione. Solo valori.               |
| `runtime/`   |    2 |   177 | Orchestrazione e ciclo dei frame.                           |
| `actors/`    |    6 |   344 | Controller e gestori delle animazioni.                      |
| `world/`     |   18 | 1.643 | Streaming, tile, traffico, geometria, temi, seme.           |
| `rendering/` |    9 |   963 | Renderer, camera, luci, indicatori, effetti, asset, shader. |
| `ui/`        |   19 | 1.226 | Composition root, vista pura, testi, componenti.            |
| radice       |    2 |   182 | `main.js` e la preferenza di movimento.                     |

Il file più grande è `rendering/voxelModels.js` con 227 righe.

### Miglioramenti principali

1. ESLint reale separato da Prettier, con regole scelte per trovare difetti: tre errori
   veri corretti al primo passaggio.
2. Controllo dei tipi su file `.js` con JSDoc e `@types/three`: 84 errori reali risolti,
   vocabolario di dominio condiviso in `core/types.js`.
3. `main.js` è solo composition root; l'orchestrazione è esplicita e provabile senza WebGL.
4. UI e scena non sono più monoliti; il rendering non conosce più il documento.
5. Le patch agli shader di Three.js non possono più fallire in silenzio.
6. Preset di qualità e diagnostica misurata, senza sniffing dello user agent.
7. I confini architetturali sono verificati dai test, non solo documentati.

### File creati

52 moduli nuovi, fra cui `core/{money,types,format,runtimeOptions}.js`,
`config/{gameplay,rendering,animation}.js`, `runtime/{GameRuntime,GameLoop}.js`,
`actors/animations/*`, `world/geometry/*`, `world/themes/*`, `world/seededRandom.js`,
`rendering/{SceneRenderer,CameraController,LightingSystem,WorldIndicators,CaptureEffects,createScene,shaderPatch,PerformanceMonitor}.js`,
`ui/{createUI,dom,view,labels}.js` e dodici componenti. Più `eslint.config.js`,
`jsconfig.json`, `playwright.config.js`, `docs/ARCHITECTURE.md` e questo documento.

### File rimossi

`src/ui.js`, `src/sceneManager.js`, `src/districtGeometry.js`, `src/cityThemes.js`
(sostituiti dalle rispettive suddivisioni).

### File spostati

`gameMath`, `gameState`, `format` → `core/`; `mapLayout`, `cityEffects`, `CityTile`,
`CityStream`, `TrafficController`, `neonDistrict` → `world/`; `voxelModels` →
`rendering/`; `characterController` → `actors/`; `multiplierReel`, `bootScreen` → `ui/`.
`cops-and-robbers.html` → `cops-and-robbers.html`.

### Test aggiunti

Da 64 a **103** test Node, più **12** controlli nel browser.

Nuovi file: `money`, `runtime`, `ui` (jsdom sul vero `index.html`), `shaderPatch`,
`quality`, `seededRandom`, `architecture`, e le tre suite Playwright.

### Breaking change

- `cops-and-robbers.html` si chiama ora `cops-and-robbers.html`: i collegamenti diretti al
  vecchio nome vanno aggiornati.
- Nome npm `cops-and-robbers` → `cops-and-robbers` (pacchetto privato).
- `MIN_BET` / `MAX_BET` non sono più esportati da `gameState.js`, `MAX_CROSSINGS` e
  `RTP_TARGET` non più da `gameMath.js`: vivono in `config/gameplay.js`.

Gameplay, probabilità, RTP, payout, animazioni, temi, comportamento mobile e movimento
ridotto sono invariati.

### Considerazioni sulle prestazioni

- Bundle di produzione: 59,5 kB → 67,4 kB (22,99 → 26,02 kB gzip); HTML autonomo
  770 → 778 KiB. La crescita è dovuta a diagnostica, preset di qualità e guardie degli
  shader, non alla suddivisione in moduli.
- Le ottimizzazioni esistenti sono intatte: pixel ratio limitato, `InstancedMesh`,
  geometria unitaria condivisa, cache dei materiali, tre tile, dispose GPU, animazioni
  ferme a scheda nascosta.
- La geometria generata è stata confrontata con l'albero pre-refactor dopo ogni fase che
  la toccava: **32.656 istanze identiche al bit** su 28 quartieri.
- Il preset `low` è disponibile per hardware modesto; la profilazione sulla UHD Graphics
  fisica resta da fare, come già nella roadmap.

### Problemi rimasti

Vedi «Debito tecnico noto» qui sotto: `strict` del type checker ancora disattivato, i due
fogli di stile sovrapposti, il pool di asset con stato di modulo, la regressione visiva
non implementata e `vite` fissato con avvisi di `npm audit` sul solo dev server.

### Prossimi sviluppi consigliati

1. **Unificare i due CSS.** È il debito più grande rimasto e l'unico che tocca ciò che si
   vede: un solo blocco `:root`, una sola scala di breakpoint, cancellazione di ciò che è
   già ombreggiato. Richiede verifica a schermo.
2. **Attivare `strictNullChecks`** modulo per modulo, partendo da `core/` e `runtime/`.
3. **`createVoxelAssetPool()`** con dependency injection, per rendere possibili due scene
   indipendenti.
4. **Profilare sulla GPU reale** e, con quei dati, decidere se una qualità adattiva sia
   utile: i due ganci sono già in posizione.
5. **Revisione dell'elicottero**, che resta sospesa nella roadmap.

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
- Regressione visiva non implementata: vedi la fase 26 per il motivo e per la strada
  praticabile.
- `rendering/voxelModels.js` usa ancora stato di modulo con conteggio dei proprietari.
  Funziona e rilascia correttamente, ma impedisce due scene indipendenti nello stesso
  documento. Un `createVoxelAssetPool()` con dependency injection è il passo successivo,
  fuori dal perimetro di questo intervento (fase 15 della specifica).
