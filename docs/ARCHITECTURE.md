# Architettura — Cops&Robbers

Prototipo browser completamente client-side: Vite, JavaScript ES Modules, Three.js.
Nessun backend, nessun account, nessuna telemetria, nessun asset remoto a runtime.

Questo documento descrive com'è organizzato il codice e, soprattutto, **quali confini
non vanno attraversati**.

## 1. Panoramica

```
UI  ──azioni──▶  GameState  ──snapshot──▶  UI
                     │
                     ▼
               GameRuntime
                     ├─ Actors     (ladro, pattuglie, animazioni)
                     ├─ World      (streaming della città, traffico, semafori)
                     ├─ Rendering  (renderer, camera, luci, indicatori)
                     └─ Effects    (stato della cattura → overlay della pagina)

GameLoop ──update(dt, elapsed)──▶ GameRuntime

GameMath resta indipendente: nessuno lo chiama per muovere qualcosa,
tutti lo chiamano per sapere quanto vale qualcosa.
```

Il flusso è a senso unico. La UI non parla con la scena e la scena non parla con la UI:
entrambe conoscono solo `GameState`, e il runtime sta in mezzo.

## 2. Flusso delle dipendenze

```
config/   ◀── tutti          solo world/mapLayout e i tipi JSDoc (senza codice)
core/     ◀── tutti          puro: nessun DOM, nessun Three.js
world/    ◀── rendering, runtime
actors/   ◀── runtime        usa rendering/voxelModels e world/mapLayout
rendering/◀── runtime
ui/       ◀── main           unico livello che tocca il documento
runtime/  ◀── main
main.js                      composition root
```

Queste regole non sono solo scritte: `tests/architecture.test.js` le verifica a ogni
esecuzione dei test.

- `core/` non importa nulla da `ui/`, `world/`, `rendering/`, `runtime/` o `actors/`.
- `rendering/` non chiama `getElementById`: l'unica chiamata al documento è
  `createElement('canvas')` per una superficie di disegno fuori schermo.
- `world/` e `actors/` non toccano il documento affatto.
- Solo `ui/` e `main.js` conoscono la pagina.
- Nessun modulo è irraggiungibile da `main.js`: il codice morto fallisce il test.

## 3. GameState

Macchina a stati e unico posto dove si muove il denaro.

```
idle ──start()──▶ running ──finishCrossing()──▶ ready ──advance()──▶ running
                     │                             │
                     │                             └──cashout()──▶ escaping ──▶ result
                     └──(rosso)──▶ caught ──finishCaught()──▶ result
```

- Il saldo è un intero in **centesimi di credito**; si arrotonda solo all'incasso.
- Ogni clic valido consuma **un solo** campione casuale.
- Le guardie impediscono doppi accrediti, doppie partenze e incassi durante un'animazione.
- Lo snapshot è congelato: i sottoscrittori non possono modificare lo stato interno.
- Al dodicesimo incrocio la liquidazione è privata: `READY` non viene mai esposto.

## 4. Runtime

`runtime/GameRuntime.js` riceve gli snapshot e decide cosa deve fare il mondo. Dichiara
le sue dipendenze **strutturalmente** (`ActorSystem`, `SceneSystem`, `EffectOverlay`), non
sulle classi concrete: il contratto è esplicito ed è pilotabile in test senza WebGL.

`runtime/GameLoop.js` conosce solo i frame: `requestAnimationFrame`, delta time con clamp
a 0,05 s, scheda nascosta che non avanza né accumula, `start`/`stop`/`dispose`. Un errore
nell'update ferma il ciclo e viene riportato una sola volta.

`main.js` è solo composition root: costruisce, avvia, rilascia.

## 5. Actors

`actors/CharacterController.js` possiede i modelli, l'orologio condiviso delle sirene, la
sacca e lo stato di arresto. Le coreografie stanno in `actors/animations/`, una per file,
raggiunte da una tabella di dispatch: aggiungere un'animazione non tocca `update()`.

Le pose sono **procedurali su voxel**: niente skeleton, niente glTF, niente
`AnimationMixer`. Una posa dipende dal tempo trascorso dell'animazione, non dal frame
precedente: a 30, 60 e 120 Hz la posa allo stesso istante è identica.

## 6. World

`world/CityStream.js` tiene vive esattamente tre tile, più al massimo una in dissolvenza.
La finestra segue la **posizione reale del ladro**, non il numero mostrato nel percorso.
`world/CityTile.js` costruisce il diorama, possiede i propri materiali e buffer e li
rilascia quando la tile esce.

`world/geometry/` costruisce il quartiere, diviso per dominio dietro la facade
`buildDistrictGeometry()`. `world/themes/` contiene i temi, uno per modulo.

## 7. Rendering

Un sistema per responsabilità: `SceneRenderer` (contesto, scena, resize),
`CameraController`, `LightingSystem`, `WorldIndicators`, `CaptureEffects`.
`createScene.js` li ordina per frame.

`CaptureEffects` **descrive** il lampeggio blu come `{ caught, sirenIntensity,
captureIntensity }` e non tocca il documento: l'overlay della pagina è aggiornato da
`ui/components/captureOverlay.js` tramite il runtime. Questo è ciò che permette in futuro
un canvas autonomo, un renderer di replay o un editor.

## 8. Confini dei generatori casuali

Due generatori, separati per costruzione:

| Generatore    | Sorgente                      | Usato per                                     |
| ------------- | ----------------------------- | --------------------------------------------- |
| **Gameplay**  | `crypto.getRandomValues()`    | Esito di ogni incrocio. Iniettabile nei test. |
| **Cosmetico** | `world/seededRandom.js` (LCG) | Architettura, colori, arredo dei quartieri.   |

Non si incontrano mai. Un test verifica che costruire l'intera città non consumi alcun
campione di gioco. È questa separazione a rendere possibili, in futuro, seme della corsa,
replay e screenshot di regressione senza toccare le probabilità.

## 9. Proprietà delle risorse

- **Condivise per processo**: geometria unitaria e cache dei materiali in
  `rendering/voxelModels.js`, con conteggio dei proprietari. Rilasciate alla chiusura
  dell'ultima scena e ricreate per il montaggio successivo.
- **Per stream**: la texture degli aloni.
- **Per tile**: materiali, buffer delle istanze, materiali del traffico.
- **Per scena**: indicatore, decal del moltiplicatore, shadow map.

Nel `dispose()` della scena il pool condiviso viene rilasciato **prima** di
`renderer.dispose()`: invertire i due passaggi lascerebbe i buffer GPU senza il listener
che li libera.

`dispose()` è idempotente ovunque; il rimontaggio HMR non duplica listener né timer.

## 10. Interfaccia

DOM vanilla, nessun framework. `ui/createUI.js` è la composition root: collega le azioni,
deriva la vista una volta per aggiornamento e passa lo stesso snapshot a ogni componente.
Ogni componente possiede i propri elementi, i propri listener e la propria memoizzazione.

- `ui/view.js` deriva la vista in modo **puro**: nessun DOM, quindi le regole di
  presentazione sono provabili.
- `ui/labels.js` raccoglie i testi italiani e le funzioni pure che scelgono un messaggio.
- `ui/dom.js` fornisce lookup tipizzati e un solo ambito di listener annullabile.

Accessibilità mantenuta: stati dei pulsanti, `aria-pressed`, `aria-invalid`, regione live
dello stato, `role="meter"`, navigazione da tastiera, touch, movimento ridotto, esiti
sempre scritti a parole e non affidati al solo colore.

## 11. Qualità di rendering

`config/rendering.js` definisce `low`, `medium`, `high`. `high` è la resa approvata ed è
il predefinito. La scelta è **esplicita** (`?quality=`), mai dedotta dallo user agent.
`scene.setQuality()` applica a caldo tutto ciò che non richiede un nuovo contesto;
l'antialiasing è l'unica eccezione.

`?debug=1` mostra il pannello di diagnostica. `rendering/PerformanceMonitor.js` misura e
basta; `ui/components/debugPanel.js` disegna. Sono i due ganci su cui una futura qualità
adattiva si appoggerebbe: misura reale del tempo di frame e interruttore a caldo.

## 12. Patch agli shader — codice sensibile agli aggiornamenti

Due effetti modificano gli shader di Three.js per sostituzione di stringhe: il gradiente
luminoso della città e la dissolvenza delle ombre del traffico. Se un aggiornamento di
Three.js rinomina un chunk, `String.replace` **non fallisce**: restituisce lo shader
invariato.

`rendering/shaderPatch.js` verifica che il marcatore esista, lancia in sviluppo e riporta
altrove. `SHADER_MARKERS` elenca i marcatori usati e un test li confronta con
`THREE.ShaderLib` della versione installata: aggiornare Three.js fallisce in CI, non a
schermo. Three.js resta fissato a `0.180.0`.

## 13. Build

| Comando                    | Risultato                                                 |
| -------------------------- | --------------------------------------------------------- |
| `npm run build`            | `dist/`, da servire via HTTP.                             |
| `npm run build:standalone` | `cops-and-robbers.html`, un solo file, funziona da disco. |

La **source of truth è `src/`**. L'HTML autonomo è un artefatto generato: incorpora JS,
CSS, font e logo in base64, non lascia dipendenze esterne e non va mai modificato a mano.
La CI lo rigenera e verifica con `git diff --exit-code` che il file committato sia
aggiornato.

## 14. Strategia di test

Runner nativo di Node, nessun framework aggiuntivo.

| Area                       | File                                                   |
| -------------------------- | ------------------------------------------------------ |
| Matematica e RTP           | `tests/gameMath.test.js`                               |
| Stato, saldo, storico      | `tests/gameState.test.js`                              |
| Crediti e puntata          | `tests/money.test.js`                                  |
| Runtime e game loop        | `tests/runtime.test.js`                                |
| Interfaccia (jsdom)        | `tests/ui.test.js`, `tests/helpers/domHarness.js`      |
| Animazioni                 | `tests/characterController.test.js`                    |
| Città e risorse            | `tests/cityStream.test.js`, `tests/cityThemes.test.js` |
| Traffico                   | `tests/trafficController.test.js`                      |
| Patch agli shader          | `tests/shaderPatch.test.js`                            |
| Qualità e diagnostica      | `tests/quality.test.js`                                |
| Generazione deterministica | `tests/seededRandom.test.js`                           |

I test dell'interfaccia montano il **vero** `index.html` in jsdom. I test di animazione e
città operano su geometrie e trasformazioni Three.js in Node, senza renderer WebGL.

Si testa il **comportamento**, non l'implementazione interna.

## 15. Modello di sicurezza

Il gioco è **interamente client-side** e usa **crediti virtuali**. Saldo e storico vivono
solo nella pagina aperta: ricaricare azzera la sessione. Non esistono pagamenti, account,
backend, telemetria o premi. In questo modello il client può essere manomesso e non
succede nulla di rilevante: non c'è niente da vincere.

**Questo smette di essere vero** se in futuro vengono introdotti:

- account o profili persistenti;
- classifiche competitive;
- premi, valuta reale o acquisti;
- progressione online o ricompense che durano oltre la sessione.

In quel caso **RNG, payout, saldo e stato economico devono diventare
server-authoritative**: il client propone, il server decide e registra. Il generatore
degli esiti, il calcolo dell'incasso e il libro mastro non possono restare nel browser,
perché sarebbero modificabili da chiunque apra gli strumenti di sviluppo.

Nessun backend viene introdotto ora: la separazione attuale — `core/gameMath.js` puro e
`core/gameState.js` come unico luogo dove si muove il denaro — è però già la forma che
renderebbe quel passaggio circoscritto.
