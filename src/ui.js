import {
  DIFFICULTIES,
  MAX_CROSSINGS,
  RTP_TARGET,
  getGreenProbability,
  getMultiplier,
  calculatePayout,
  buildRiskTable,
} from './gameMath.js';
import { PHASES, MIN_BET, MAX_BET } from './gameState.js';

import { formatMoney, formatMultiplier, formatPercent } from './format.js';

export function parseBet(text) {
  const normalized = String(text).trim().replace(',', '.');
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;
  const minor = Math.round(Number(normalized) * 100);
  return Number.isSafeInteger(minor) ? minor : null;
}

export function createUI(game, actions, { motion = { value: false } } = {}) {
  const dom = Object.freeze(
    Object.fromEntries(
      [
        'action-caption',
        'balance',
        'bet-error',
        'bet-fieldset',
        'bet-input',
        'cashout-amount',
        'cashout-button',
        'close-rules',
        'crossing-count',
        'difficulty-fieldset',
        'difficulty-hint',
        'game-controls',
        'help-button',
        'history',
        'main-button',
        'main-button-label',
        'multiplier',
        'next-label',
        'next-multiplier',
        'next-probability',
        'phase-label',
        'potential',
        'potential-label',
        'reload-button',
        'reset-button',
        'result-banner',
        'result-description',
        'result-eyebrow',
        'result-title',
        'risk-caption',
        'risk-table-body',
        'route',
        'rtp-label',
        'rules-button',
        'rules-dialog',
        'scene-loader',
        'status-text',
        'webgl-error',
        'webgl-error-text',
      ].map((id) => [id, document.getElementById(id)]),
    ),
  );
  const nextSignal = document.querySelector('.next-signal');
  const betButtons = [...document.querySelectorAll('[data-bet]')];
  const difficultyButtons = [...document.querySelectorAll('[data-difficulty]')];
  const events = new AbortController();
  const on = (target, type, handler) =>
    target.addEventListener(type, handler, { signal: events.signal });
  let ready = false,
    previousPhase = '',
    previousRound = -1,
    previousCrossing = -1,
    historyKey = null,
    routeKey = '',
    lastStatus = '';
  const input = dom['bet-input'],
    mainButton = dom['main-button'],
    cashoutButton = dom['cashout-button'];
  const ruleDialog = dom['rules-dialog'];
  dom['route'].replaceChildren();
  const routeItems = Array.from({ length: MAX_CROSSINGS }, (_, i) => {
    const item = document.createElement('li');
    item.className = 'route-step';
    const number = document.createElement('span');
    number.className = 'step-n';
    number.textContent = String(i + 1).padStart(2, '0');
    const multi = document.createElement('span');
    multi.className = 'step-multi';
    item.append(number, multi);
    dom['route'].appendChild(item);
    return { item, number, multi };
  });
  function validateBet(showError = false) {
    const s = game.snapshot,
      value = parseBet(input.value);
    let error = '';
    if (value === null) error = 'Inserisci una puntata con al massimo 2 decimali.';
    else if (value < MIN_BET) error = 'Puntata minima: 1,00 CR.';
    else if (value > s.balance)
      error = 'Crediti insufficienti. Riduci la puntata o ripristina la demo.';
    else if (value > MAX_BET) error = 'Puntata massima: 1.000.000,00 CR.';
    if (showError) {
      dom['bet-error'].textContent = error;
      input.setAttribute('aria-invalid', String(Boolean(error)));
    }
    return error ? null : value;
  }
  function openRules() {
    const s = game.snapshot;
    dom['risk-caption'].textContent = `Probabilità · ${DIFFICULTIES[s.difficulty].label}`;
    dom['risk-table-body'].replaceChildren(
      ...buildRiskTable(s.difficulty).map((row) => {
        const tr = document.createElement('tr');
        const values = [
          String(row.n).padStart(2, '0'),
          `${formatPercent(row.greenProbability)}%`,
          `${(row.cumulativeProbability * 100).toLocaleString('it-IT', { maximumFractionDigits: 3 })}%`,
          `${row.totalMultiplier.toLocaleString('it-IT', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}×`,
        ];
        for (const value of values) {
          const td = document.createElement('td');
          td.textContent = value;
          tr.appendChild(td);
        }
        return tr;
      }),
    );
    ruleDialog.showModal();
  }
  on(dom['help-button'], 'click', openRules);
  on(dom['rules-button'], 'click', openRules);
  on(dom['close-rules'], 'click', () => ruleDialog.close());
  on(ruleDialog, 'click', (event) => {
    if (event.target === ruleDialog) {
      const bounds = ruleDialog.getBoundingClientRect();
      if (
        event.clientX < bounds.left ||
        event.clientX > bounds.right ||
        event.clientY < bounds.top ||
        event.clientY > bounds.bottom
      )
        ruleDialog.close();
    }
  });
  on(dom['reload-button'], 'click', () => location.reload());
  on(input, 'input', () => {
    const amount = validateBet(true);
    if (amount === null || !game.setBet(amount)) render(game.snapshot);
  });
  on(input, 'blur', () => {
    const amount = validateBet(true);
    if (amount !== null) input.value = (amount / 100).toFixed(2);
  });
  for (const button of betButtons)
    on(button, 'click', () => {
      const s = game.snapshot;
      if (!game.canConfigure) return;
      const current = parseBet(input.value) ?? s.bet;
      const requested =
        button.dataset.bet === 'half'
          ? Math.floor(current / 2)
          : button.dataset.bet === 'double'
            ? current * 2
            : s.balance;
      const amount = Math.min(Math.max(MIN_BET, requested), s.balance, MAX_BET);
      input.value = (amount / 100).toFixed(2);
      validateBet(true);
      if (!game.setBet(amount)) render(game.snapshot);
    });
  for (const button of difficultyButtons)
    on(button, 'click', () => game.setDifficulty(button.dataset.difficulty));
  on(dom['game-controls'], 'submit', (event) => {
    event.preventDefault();
    if (!ready) return;
    const s = game.snapshot;
    if (s.phase === PHASES.READY) {
      actions.advance();
      return;
    }
    if (game.canConfigure) {
      const amount = validateBet(true);
      if (amount === null) {
        input.focus();
        return;
      }
      actions.start(amount);
    }
  });
  on(cashoutButton, 'click', () => {
    if (ready) actions.cashout();
  });
  on(dom['reset-button'], 'click', () => {
    if (!game.canConfigure) return;
    input.value = '25.00';
    dom['bet-error'].textContent = '';
    input.setAttribute('aria-invalid', 'false');
    actions.reset();
  });

  function getView(s) {
    const configure = [PHASES.IDLE, PHASES.RESULT].includes(s.phase);
    const decision = s.phase === PHASES.READY;
    const active = !configure;
    const changedPhase =
      s.phase !== previousPhase || s.round !== previousRound || s.crossing !== previousCrossing;
    const pendingCrossing = Math.min(s.crossing + 1, MAX_CROSSINGS);
    const potential =
      s.crossing > 0
        ? calculatePayout(s.stake, s.crossing, s.difficulty)
        : active
          ? s.stake
          : s.bet;
    const probability = getGreenProbability(pendingCrossing, s.difficulty);
    return { configure, decision, active, changedPhase, pendingCrossing, potential, probability };
  }
  function renderHUD(s, { decision, pendingCrossing, potential, probability }) {
    dom['balance'].textContent = formatMoney(s.balance);
    const shownMultiplier = s.phase === PHASES.IDLE ? 1 : s.multiplier;
    dom['multiplier'].innerHTML = `${formatMultiplier(shownMultiplier)}<span>×</span>`;
    dom['multiplier'].style.fontSize = shownMultiplier >= 100 ? 'clamp(40px, 5.4vw, 70px)' : '';
    dom['potential-label'].textContent =
      s.phase === PHASES.RESULT
        ? s.payout > 0
          ? 'Incasso accreditato'
          : 'Puntata persa'
        : decision
          ? 'Puoi incassare'
          : s.phase === PHASES.ESCAPING
            ? 'Incasso accreditato'
            : 'Puntata in gioco';
    if (s.phase === PHASES.IDLE) dom['potential-label'].textContent = 'Puntata pronta';
    dom['potential'].textContent = formatMoney(
      s.phase === PHASES.RESULT ? s.payout || s.stake : potential,
    );
    dom['crossing-count'].textContent = `${String(s.crossing).padStart(2, '0')} / ${MAX_CROSSINGS}`;
    dom['next-probability'].innerHTML = `${formatPercent(probability)}<span>%</span>`;
    dom['next-label'].textContent =
      s.crossing === MAX_CROSSINGS
        ? 'PERCORSO COMPLETATO'
        : `INCROCIO ${String(pendingCrossing).padStart(2, '0')}`;
    dom['next-multiplier'].textContent =
      `${formatMultiplier(getMultiplier(pendingCrossing, s.difficulty))}×`;
    nextSignal.hidden = s.crossing === MAX_CROSSINGS;
  }

  function renderControls(s, { configure, decision, active, potential }) {
    dom['bet-fieldset'].disabled = active || !ready;
    dom['difficulty-fieldset'].disabled = active || !ready;
    dom['reset-button'].disabled = active || !ready;
    for (const button of difficultyButtons)
      button.setAttribute('aria-pressed', String(button.dataset.difficulty === s.difficulty));
    dom['difficulty-hint'].textContent = DIFFICULTIES[s.difficulty].description;
    dom['rtp-label'].textContent = `${Math.round(RTP_TARGET * 100)}%`;
    cashoutButton.disabled = !decision || !ready;
    dom['cashout-amount'].textContent = decision ? `${formatMoney(potential)} CR` : '—';
    mainButton.disabled =
      !ready || !(configure || decision) || (configure && validateBet() === null);
    const labels = {
      idle: ['PRONTO A PARTIRE', 'Avvia la fuga', 'Rosso al ladro, verde al traffico.'],
      running: ['VIA LIBERA', 'Attraversamento…', 'Il prossimo incrocio ti aspetta.'],
      ready: [
        'SEI ANCORA IN GIOCO',
        'Prossimo incrocio',
        'Traffico in transito. Prosegui o incassa.',
      ],
      caught: ['FINE DELLA CORSA', 'Ti hanno beccato', 'Puntata persa. Tra poco puoi ripartire.'],
      escaping: ['FUGA RIUSCITA', 'Fuga in corso…', 'Il vicolo è la tua via d’uscita.'],
      result: [
        s.payout > 0 ? 'AL SICURO' : 'BECCATO',
        'Avvia una nuova fuga',
        'Imposta la puntata per una nuova partita.',
      ],
    };
    const [phase, action, caption] = labels[s.phase];
    dom['phase-label'].textContent = phase;
    dom['main-button-label'].textContent = action;
    dom['action-caption'].textContent = caption;
  }

  function renderResult(s) {
    const showResult = s.phase === PHASES.RESULT;
    dom['result-banner'].hidden = !showResult;
    if (showResult) {
      dom['result-banner'].classList.toggle('lost', s.payout === 0);
      dom['result-eyebrow'].textContent =
        s.payout > 0 ? 'TRACCE PERSE' : `CIRCONDATO ALL’INCROCIO ${s.crossing + 1}`;
      dom['result-title'].textContent = s.payout > 0 ? `+${formatMoney(s.payout)} CR` : 'BECCATO!';
      dom['result-description'].textContent =
        s.payout > 0
          ? `${s.crossing} ${s.crossing === 1 ? 'incrocio superato' : 'incroci superati'} · ${formatMultiplier(s.multiplier)}× · Utile ${formatMoney(s.payout - s.stake)} CR`
          : `Hai perso ${formatMoney(s.stake)} CR. La città ti aspetta per la prossima fuga.`;
    }
  }

  function renderRoute(s, { changedPhase, pendingCrossing }) {
    const newRouteKey = `${s.difficulty}:${s.crossing}:${s.phase}`;
    if (newRouteKey !== routeKey) {
      routeKey = newRouteKey;
      for (let i = 0; i < routeItems.length; i++) {
        const n = i + 1,
          r = routeItems[i];
        r.multi.textContent = `${formatMultiplier(getMultiplier(n, s.difficulty))}×`;
        r.item.className = 'route-step';
        r.item.classList.toggle('is-current', n === s.crossing);
        r.item.classList.toggle('is-passed', n < s.crossing);
        r.item.classList.toggle(
          'is-next',
          n === pendingCrossing && [PHASES.IDLE, PHASES.READY, PHASES.RUNNING].includes(s.phase),
        );
        r.item.classList.toggle(
          'is-caught',
          n === pendingCrossing &&
            (s.phase === PHASES.CAUGHT || (s.phase === PHASES.RESULT && s.payout === 0)),
        );
        r.item.setAttribute(
          'aria-label',
          `Incrocio ${n}, moltiplicatore ${formatMultiplier(getMultiplier(n, s.difficulty))}${n <= s.crossing ? ', superato' : ''}`,
        );
      }
      if (changedPhase && s.crossing > 0) {
        const route = dom['route'],
          target = routeItems[Math.min(s.crossing, MAX_CROSSINGS - 1)].item;
        route.scrollTo({
          left:
            target.offsetLeft - route.offsetLeft - route.clientWidth / 2 + target.clientWidth / 2,
          behavior: motion.value ? 'instant' : 'smooth',
        });
      } else if (s.crossing === 0) dom['route'].scrollLeft = 0;
    }
  }

  function renderStatus(s, { decision, pendingCrossing, potential, probability }) {
    let status = '';
    if (s.phase === PHASES.IDLE)
      status = 'Il ladro aspetta al rosso. Imposta la puntata e avvia la fuga quando vuoi.';
    else if (s.phase === PHASES.RUNNING)
      status = `Verde! Stai attraversando l’incrocio ${pendingCrossing}.`;
    else if (decision)
      status = `Incrocio ${s.crossing} superato. Incassa ${formatMoney(potential)} CR oppure continua: il prossimo verde ha probabilità ${formatPercent(probability)}%.`;
    else if (s.phase === PHASES.CAUGHT)
      status = `Rosso all’incrocio ${pendingCrossing}. La polizia ha fermato la fuga.`;
    else if (s.phase === PHASES.ESCAPING)
      status = `${formatMoney(s.payout)} CR accreditati. Il ladro svolta nel vicolo.`;
    else
      status = s.payout
        ? `Fuga riuscita: incassati ${formatMoney(s.payout)} CR. Puoi iniziare una nuova partita.`
        : `Puntata persa. ${s.balance < MIN_BET ? 'Ripristina 1.000 CR per continuare la demo.' : 'Puoi iniziare una nuova partita.'}`;
    if (status !== lastStatus) {
      lastStatus = status;
      dom['status-text'].textContent = status;
    }
  }

  function renderHistory(s) {
    const newHistoryKey = s.history.map((r) => `${r.id}:${r.outcome}`).join(',');
    if (newHistoryKey !== historyKey) {
      historyKey = newHistoryKey;
      if (!s.history.length)
        dom['history'].innerHTML =
          '<li class="history-empty">Le tue fughe iniziano qui.<span>Attraversa il primo incrocio per metterti alla prova.</span></li>';
      else
        dom['history'].replaceChildren(
          ...s.history.map((round) => {
            const item = document.createElement('li');
            item.className = `history-card ${round.outcome}`;
            const isWon = round.outcome === 'won';
            const outcome = document.createElement('span');
            outcome.className = 'history-outcome';
            outcome.textContent = isWon ? 'Al sicuro' : 'Beccato';
            const multi = document.createElement('strong');
            multi.className = 'history-multi';
            multi.textContent = `${formatMultiplier(round.multiplier)}×`;
            const detail = document.createElement('span');
            detail.className = 'history-detail';
            detail.textContent = `${DIFFICULTIES[round.difficulty].label} · ${round.crossing} superati`;
            const amount = document.createElement('span');
            amount.className = 'history-amount';
            amount.textContent = `${isWon ? '+' : '−'}${formatMoney(isWon ? round.payout : round.stake)} CR`;
            item.title = isWon
              ? `Puntata ${formatMoney(round.stake)} CR; incasso ${formatMoney(round.payout)} CR; utile ${formatMoney(round.payout - round.stake)} CR.`
              : `Puntata ${formatMoney(round.stake)} CR persa all’incrocio ${round.attemptedCrossing}. Moltiplicatore raggiunto: ${formatMultiplier(round.multiplier)}×.`;
            item.append(outcome, multi, detail, amount);
            return item;
          }),
        );
    }
  }

  function render(s) {
    const view = getView(s);
    renderHUD(s, view);
    renderControls(s, view);
    renderResult(s, view);
    renderRoute(s, view);
    renderStatus(s, view);
    renderHistory(s, view);
    previousPhase = s.phase;
    previousRound = s.round;
    previousCrossing = s.crossing;
  }
  const unsubscribe = game.subscribe(render);
  return {
    setReady(value) {
      ready = value;
      render(game.snapshot);
      dom['scene-loader'].hidden = value;
    },
    showError(message) {
      ready = false;
      render(game.snapshot);
      dom['scene-loader'].hidden = true;
      dom['webgl-error-text'].textContent = message;
      dom['webgl-error'].hidden = false;
    },
    dispose() {
      events.abort();
      unsubscribe();
      ruleDialog.close();
    },
  };
}
