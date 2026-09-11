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

| File                | Problema                                                                                        |
| ------------------- | ----------------------------------------------------------------------------------------------- |
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

## Debito tecnico noto

- `strict: false` nel type checker. L'attivazione di `strictNullChecks` richiede una
  passata dedicata sui moduli di rendering; va fatta dopo la suddivisione di `ui.js` e
  `sceneManager.js`, non prima.
- `src/style.css` (1801 righe) e `src/consoleShell.css` (1205 righe) sono importati
  insieme e si sovrappongono: 64 selettori duplicati e 7 token ridefiniti. È un refactor
  visivo che richiede verifica a schermo ed è fuori dal perimetro di questo intervento.
- `vite@7.1.5` è fissato e `npm audit` segnala vulnerabilità del solo dev server. Il
  pinning è una scelta del progetto: l'aggiornamento va valutato a parte.
