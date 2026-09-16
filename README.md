# Cops&Robbers

Prototipo giocabile in browser, completamente client-side (Vite + JavaScript + Three.js). Città voxel notturna in stile CCTV, tre difficoltà, 12 incroci, crediti esclusivamente virtuali.

![Schermata di Cops&Robbers: console CCTV, città voxel e comandi di gioco](cops-%26-robbers-screen.png)

## Cos'è

Un ladro attraversa una città voxel incrocio dopo incrocio: ad ogni semaforo verde il moltiplicatore sale, al rosso arriva la polizia. La città è generata a moduli (quartiere precedente, attuale, prossimo) con due temi che si alternano ad ogni corsa: **Distretto 87** e **Neon Tokyo**.

## Interfaccia

La UI è una plancia di sorveglianza CCTV: monitor Three.js a sinistra, comandi a destra, sequenza delle dodici telecamere lungo il bordo inferiore. La barra superiore mostra logo, il rullo con i moltiplicatori precedente/attuale/successivo e il saldo. Il pannello comandi ha puntata (con tasti −/+, ½/2×/MAX), tre livelli di allerta e la barra del prossimo varco (verde da 75%, ambra da 50%, rosso sotto 50%). **Corri!** avvia o prosegue la corsa; **Incassa** si abilita dopo un varco superato. Il **Registro delle fughe**, espandibile, contiene storico partite e ripristino crediti.

Sotto i 900px la stessa UI diventa una console verticale: menu, logo e saldo in alto, poi rullo, monitor, puntata, allerta/vincita affiancate e i due pulsanti principali a piena larghezza. Il layout è verificato su risoluzioni desktop comuni (1920×1080 – 1366×768) e su viewport mobile da 320px a 430px, con target touch di almeno 44px (76/66px per Corri!/Incassa). Restano supportati focus da tastiera, stati disabilitati, annunci degli esiti e movimento ridotto.

## Come si gioca

1. Saldo iniziale: **1.000 CR**. Scegli difficoltà e puntata, poi premi **Corri!**.
2. Verde → il ladro supera l'incrocio, puoi scegliere di proseguire o **Incassare**. Rosso → la puntata è persa e quattro pattuglie circondano il ladro.
3. Al **12° incrocio** l'incasso è automatico, per evitare percorsi indefiniti.
4. Lo storico mostra le ultime 8 partite. **Ripristina 1.000 CR** è disponibile tra le partite; saldo e storico vivono solo in memoria (si azzerano al reload).

Tutto è client-side: nessun account, backend, pagamento o telemetria. Il link **Probabilità e regole** in-app mostra la curva completa per la difficoltà scelta.

## Avvio

Requisiti: Node.js 20.19+ (serie 20) o 22.12+, npm, browser con WebGL 2.

```bash
npm install
npm run dev
```

Apri l'indirizzo stampato da Vite (di norma `http://localhost:5173`); è raggiungibile anche da smartphone sulla stessa Wi-Fi tramite l'indirizzo **Network** stampato dal comando.

In alternativa, apri **cops-and-robbers.html** direttamente nel browser: è una build autonoma con JS, CSS e Three.js incorporati, senza installazione né connessione.

## Comandi disponibili

| Comando                    | Risultato                                                                |
| -------------------------- | ------------------------------------------------------------------------ |
| `npm run dev`              | Server di sviluppo Vite con accesso dalla LAN.                           |
| `npm run lint`             | Analisi statica ESLint (flat config) su sorgenti, test e script.         |
| `npm run typecheck`        | Controlla i tipi dei file `.js` con JSDoc e `checkJs`.                   |
| `npm run format`           | Applica lo stile condiviso ai sorgenti; esclude build e memoria locale.  |
| `npm run format:check`     | Verifica la formattazione con Prettier senza modificare i file.          |
| `npm test`                 | Test deterministici di matematica, stato, animazioni e interfaccia.      |
| `npm run test:e2e`         | Controlli nel browser con Playwright su Chromium (richiede il download). |
| `npm run build`            | Build statica di produzione nella cartella `dist/`.                      |
| `npm run preview`          | Serve la build di produzione, normalmente sulla porta 4173.              |
| `npm run build:standalone` | Rigenera il singolo file `cops-and-robbers.html`.                        |

La build `dist/` va servita via HTTP; per l'apertura diretta da disco usa l'HTML autonomo. Dopo modifiche ai sorgenti, rigenera entrambe le build se vuoi distribuirle aggiornate.

## Dettagli tecnici

**Qualità grafica** — preset regolabile via URL: `?quality=high` (predefinito: pixel ratio 1,6, ombre 1024px), `?quality=medium` (1,3, ombre 768px), `?quality=low` (pixel ratio 1, senza ombre né luci decorative). `?debug=1` mostra un pannello con FPS, draw call e altre metriche.

**Città modulare** — ogni modulo è un diorama di 26×26 unità con un incrocio, edifici, negozi e arredo urbano generati in modo deterministico. A regime sono attivi tre moduli (precedente/attuale/prossimo), con dissolvenza in ingresso/uscita e rilascio delle risorse GPU obsolete. La luce segue il ladro con una sfumatura continua tra i moduli. `prefers-reduced-motion` è supportato e disattiva risalite/dissolvenze.

**Matematica e RTP** — modulo puro in `src/core/gameMath.js`, indipendente da DOM e Three.js:

```text
p(n, d) = max(MIN_GREEN_PROBABILITY, 0.95 × exp(-decay[d] × (n - 1)))
P(n, d) = p(1, d) × p(2, d) × … × p(n, d)
M_totale(n, d) = RTP_TARGET / P(n, d)
```

RTP target 96%, decadimento facile/medio/difficile: 0,035 / 0,065 / 0,10. Il saldo è un intero in centesimi di CR; l'RTP effettivo varia leggermente per l'arrotondamento (~95,5%–96% a seconda di puntata e strategia). Gli esiti usano `crypto.getRandomValues()`, un solo campione per clic, senza risultati predefiniti o correzioni sul saldo.

**Struttura del codice** — principali cartelle:

| Percorso         | Responsabilità                                                         |
| ---------------- | ---------------------------------------------------------------------- |
| `src/core/`      | Logica di dominio pura: soldi, tipi, matematica RTP, macchina a stati. |
| `src/rendering/` | Scena Three.js, camera, luci, indicatori ed effetti di cattura.        |
| `src/world/`     | Layout città, moduli, temi, traffico e streaming dei moduli.           |
| `src/actors/`    | Movimento di ladro e pattuglia, accerchiamento, fuga.                  |
| `src/ui/`        | Composition root della console, componenti, viste e testi.             |
| `src/runtime/`   | Orchestrazione fra stato, attori e scena; game loop.                   |
| `src/main.js`    | Composition root dell'app.                                             |

Dettagli su architettura, modello di sicurezza e roadmap: [architettura](docs/ARCHITECTURE.md), [revisione tecnica](docs/TECHNICAL_REVIEW.md), [progresso refactor](docs/REFACTOR_PROGRESS.md), [roadmap](docs/ROADMAP.md).

Documentazione delle dipendenze: [Vite](https://vite.dev/guide/), [build Vite](https://vite.dev/guide/build), [Three.js WebGLRenderer](https://threejs.org/docs/pages/WebGLRenderer.html). Licenze incluse in `THIRD_PARTY_NOTICES.md`.
