import { DIFFICULTIES, MAX_CROSSINGS, HELICOPTER_THRESHOLD, HELICOPTER_BONUS, RTP_TARGET, getGreenProbability, getMultiplier, calculatePayout, buildRiskTable } from './gameMath.js';
import { PHASES, MIN_BET, MAX_BET, COUNTDOWN_MS } from './gameState.js';

const moneyFormatter = new Intl.NumberFormat('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const numberFormatter = new Intl.NumberFormat('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const percentFormatter = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 1 });
export const formatMoney = minor => moneyFormatter.format(minor / 100);
export const formatMultiplier = value => numberFormatter.format(value);
const $ = id => document.getElementById(id);

export function parseBet(text) {
  const normalized = String(text).trim().replace(',', '.');
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;
  const minor = Math.round(Number(normalized) * 100);
  return Number.isSafeInteger(minor) ? minor : null;
}

export function createUI(game, actions) {
  let ready = false, previousPhase = '', previousRound = -1, previousCrossing = -1, historyKey = '', routeKey = '', lastStatus = '';
  const input = $('bet-input'), mainButton = $('main-button'), cashoutButton = $('cashout-button');
  const ruleDialog = $('rules-dialog');
  const routeItems = Array.from({ length: MAX_CROSSINGS }, (_, i) => {
    const item = document.createElement('li'); item.className = 'route-step';
    const number = document.createElement('span'); number.className = 'step-n'; number.textContent = String(i + 1).padStart(2, '0');
    const multi = document.createElement('span'); multi.className = 'step-multi';
    item.append(number, multi); $('route').appendChild(item);
    return { item, number, multi };
  });
  function validateBet(showError = false) {
    const s = game.snapshot, value = parseBet(input.value);
    let error = '';
    if (value === null) error = 'Inserisci una puntata con al massimo 2 decimali.';
    else if (value < MIN_BET) error = 'Puntata minima: 1,00 CR.';
    else if (value > s.balance) error = 'Crediti insufficienti. Riduci la puntata o ripristina la demo.';
    else if (value > MAX_BET) error = 'Puntata massima: 1.000.000,00 CR.';
    if (showError) { $('bet-error').textContent = error; input.setAttribute('aria-invalid', String(Boolean(error))); }
    return error ? null : value;
  }
  function openRules() {
    const s = game.snapshot;
    $('risk-caption').textContent = `Probabilità · ${DIFFICULTIES[s.difficulty].label}`;
    $('risk-table-body').replaceChildren(...buildRiskTable(s.difficulty).map(row => {
      const tr = document.createElement('tr');
      const values = [String(row.n).padStart(2, '0') + (row.n >= HELICOPTER_THRESHOLD ? ' · elicottero' : ''), `${percentFormatter.format(row.greenProbability * 100)}%`, `${(row.cumulativeProbability * 100).toLocaleString('it-IT', { maximumFractionDigits: 3 })}%`, `${row.totalMultiplier.toLocaleString('it-IT', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}×`];
      for (const value of values) { const td = document.createElement('td'); td.textContent = value; tr.appendChild(td); }
      return tr;
    }));
    ruleDialog.showModal();
  }
  $('help-button').addEventListener('click', openRules); $('rules-button').addEventListener('click', openRules);
  $('close-rules').addEventListener('click', () => ruleDialog.close());
  ruleDialog.addEventListener('click', event => { if (event.target === ruleDialog) { const bounds = ruleDialog.getBoundingClientRect(); if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) ruleDialog.close(); } });
  $('reload-button').addEventListener('click', () => location.reload());
  input.addEventListener('input', () => {
    const amount = validateBet(true);
    if (amount !== null) game.setBet(amount);
    render(game.snapshot);
  });
  input.addEventListener('blur', () => { const amount = validateBet(true); if (amount !== null) input.value = (amount / 100).toFixed(2); });
  for (const button of document.querySelectorAll('[data-bet]')) button.addEventListener('click', () => {
    const s = game.snapshot;
    if (!game.canConfigure) return;
    const current = parseBet(input.value) ?? s.bet;
    const requested = button.dataset.bet === 'half' ? Math.floor(current / 2) : button.dataset.bet === 'double' ? current * 2 : s.balance;
    const amount = Math.min(Math.max(MIN_BET, requested), s.balance, MAX_BET);
    input.value = (amount / 100).toFixed(2); game.setBet(amount); validateBet(true); render(game.snapshot);
  });
  for (const button of document.querySelectorAll('[data-difficulty]')) button.addEventListener('click', () => game.setDifficulty(button.dataset.difficulty));
  $('game-controls').addEventListener('submit', event => {
    event.preventDefault(); if (!ready) return;
    const s = game.snapshot;
    if (s.phase === PHASES.READY) { actions.advance(); return; }
    if (game.canConfigure) {
      const amount = validateBet(true);
      if (amount === null) { input.focus(); return; }
      actions.start(amount);
    }
  });
  cashoutButton.addEventListener('click', () => { if (ready) actions.cashout(); });
  $('reset-button').addEventListener('click', () => {
    if (!game.canConfigure) return;
    input.value = '25.00'; $('bet-error').textContent = ''; input.setAttribute('aria-invalid', 'false'); actions.reset();
  });

  function render(s) {
    const configure = [PHASES.IDLE, PHASES.RESULT].includes(s.phase);
    const decision = s.phase === PHASES.READY;
    const active = !configure;
    const changedPhase = s.phase !== previousPhase || s.round !== previousRound || s.crossing !== previousCrossing;
    const pendingCrossing = Math.min(s.crossing + 1, MAX_CROSSINGS);
    const potential = s.crossing > 0 ? calculatePayout(s.stake, s.crossing, s.difficulty) : (active ? s.stake : s.bet);
    $('balance').textContent = formatMoney(s.balance);
    const shownMultiplier = s.phase === PHASES.IDLE ? 1 : s.multiplier;
    $('multiplier').innerHTML = `${formatMultiplier(shownMultiplier)}<span>×</span>`;
    $('multiplier').style.fontSize = shownMultiplier >= 100 ? 'clamp(40px, 5.4vw, 70px)' : '';
    $('potential-label').textContent = s.phase === PHASES.RESULT ? (s.payout > 0 ? 'Incasso accreditato' : 'Puntata persa') : decision ? 'Puoi incassare' : s.phase === PHASES.ESCAPING ? 'Incasso accreditato' : 'Puntata in gioco';
    if (s.phase === PHASES.IDLE) $('potential-label').textContent = 'Puntata pronta';
    $('potential').textContent = formatMoney(s.phase === PHASES.RESULT ? (s.payout || s.stake) : potential);
    $('helicopter-active').hidden = s.crossing < HELICOPTER_THRESHOLD;
    $('helicopter-active').textContent = `ESTRAZIONE +${Math.round(HELICOPTER_BONUS * 100)}% INCLUSO`;
    $('crossing-count').textContent = `${String(s.crossing).padStart(2, '0')} / ${MAX_CROSSINGS}`;
    const probability = getGreenProbability(pendingCrossing, s.difficulty);
    $('next-probability').innerHTML = `${percentFormatter.format(probability * 100)}<span>%</span>`;
    $('next-label').textContent = s.crossing === MAX_CROSSINGS ? 'PERCORSO COMPLETATO' : `INCROCIO ${String(pendingCrossing).padStart(2, '0')}`;
    $('next-multiplier').textContent = `${formatMultiplier(getMultiplier(pendingCrossing, s.difficulty))}×`;
    document.querySelector('.next-signal').hidden = s.crossing === MAX_CROSSINGS;
    $('bet-fieldset').disabled = active || !ready; $('difficulty-fieldset').disabled = active || !ready;
    $('reset-button').disabled = active || !ready;
    for (const button of document.querySelectorAll('[data-difficulty]')) button.setAttribute('aria-pressed', String(button.dataset.difficulty === s.difficulty));
    $('difficulty-hint').textContent = DIFFICULTIES[s.difficulty].description;
    $('rtp-label').textContent = `${Math.round(RTP_TARGET * 100)}%`;
    cashoutButton.hidden = !decision;
    cashoutButton.disabled = !decision || !ready;
    $('cashout-amount').textContent = `${formatMoney(potential)} CR`;
    mainButton.disabled = !ready || !(configure || decision) || (configure && validateBet() === null);
    const labels = {
      idle: ['PRONTO A PARTIRE', 'Avvia la fuga', 'Il primo semaforo si accende dopo 1,5 s.'],
      countdown: ['OCCHI SUL SEMAFORO', 'Semaforo in arrivo…', 'Attendi l’esito prima di scegliere.'],
      running: ['VIA LIBERA', 'Attraversamento…', 'Il prossimo incrocio ti aspetta.'],
      ready: [s.crossing >= HELICOPTER_THRESHOLD ? 'ELICOTTERO DISPONIBILE' : 'SEI ANCORA IN GIOCO', 'Prossimo incrocio', 'Prosegui o incassa. Decidi con calma.'],
      caught: ['FINE DELLA CORSA', 'Ti hanno beccato', 'Puntata persa. Tra poco puoi ripartire.'],
      escaping: ['FUGA RIUSCITA', 'Fuga in corso…', s.crossing >= HELICOPTER_THRESHOLD ? 'Il complice ti porta al sicuro.' : 'Il vicolo è la tua via d’uscita.'],
      result: [s.payout > 0 ? 'AL SICURO' : 'BECCATO', 'Avvia una nuova fuga', 'Imposta la puntata per una nuova partita.'],
    };
    const [phase, action, caption] = labels[s.phase];
    $('phase-label').textContent = phase; $('main-button-label').textContent = action; $('action-caption').textContent = caption;
    $('countdown').hidden = s.phase !== PHASES.COUNTDOWN;
    if (s.phase === PHASES.COUNTDOWN) {
      $('countdown-number').textContent = (Math.ceil(s.countdown / 100) / 10).toFixed(1).replace('.', ',');
      $('countdown-progress').style.transform = `scaleX(${s.countdown / COUNTDOWN_MS})`;
    }
    const showResult = s.phase === PHASES.RESULT;
    $('result-banner').hidden = !showResult;
    if (showResult) {
      $('result-banner').classList.toggle('lost', s.payout === 0);
      $('result-eyebrow').textContent = s.payout > 0 ? (s.crossing >= HELICOPTER_THRESHOLD ? 'ESTRAZIONE COMPLETATA' : 'TRACCE PERSE') : `ARRESTATO ALL’INCROCIO ${s.crossing + 1}`;
      $('result-title').textContent = s.payout > 0 ? `+${formatMoney(s.payout)} CR` : 'BECCATO!';
      $('result-description').textContent = s.payout > 0 ? `${s.crossing} ${s.crossing === 1 ? 'incrocio superato' : 'incroci superati'} · ${formatMultiplier(s.multiplier)}× · Utile ${formatMoney(s.payout - s.stake)} CR` : `Hai perso ${formatMoney(s.stake)} CR. La città ti aspetta per la prossima fuga.`;
    }
    const newRouteKey = `${s.difficulty}:${s.crossing}:${s.phase}`;
    if (newRouteKey !== routeKey) {
      routeKey = newRouteKey;
      for (let i = 0; i < routeItems.length; i++) {
        const n = i + 1, r = routeItems[i];
        r.multi.textContent = `${formatMultiplier(getMultiplier(n, s.difficulty))}×`;
        r.item.className = 'route-step';
        r.item.classList.toggle('is-current', n === s.crossing);
        r.item.classList.toggle('is-passed', n < s.crossing);
        r.item.classList.toggle('is-next', n === pendingCrossing && s.phase !== PHASES.CAUGHT && !(s.phase === PHASES.RESULT && !s.payout));
        r.item.classList.toggle('is-caught', n === pendingCrossing && (s.phase === PHASES.CAUGHT || (s.phase === PHASES.RESULT && s.payout === 0)));
        r.item.classList.toggle('is-heli', n >= HELICOPTER_THRESHOLD);
        r.item.setAttribute('aria-label', `Incrocio ${n}, moltiplicatore ${formatMultiplier(getMultiplier(n, s.difficulty))}${n <= s.crossing ? ', superato' : ''}${n >= HELICOPTER_THRESHOLD ? ', elicottero disponibile' : ''}`);
      }
      if (changedPhase && s.crossing > 0) {
        const route = $('route'), target = routeItems[Math.min(s.crossing, MAX_CROSSINGS - 1)].item;
        route.scrollTo({ left: target.offsetLeft - route.offsetLeft - route.clientWidth / 2 + target.clientWidth / 2, behavior: 'instant' });
      } else if (s.crossing === 0) $('route').scrollLeft = 0;
    }
    let status = '';
    if (s.phase === PHASES.IDLE) status = 'Imposta la puntata. La fuga comincia al primo incrocio.';
    else if (s.phase === PHASES.COUNTDOWN) status = `Incrocio ${pendingCrossing}: semaforo in arrivo. ${percentFormatter.format(probability * 100)}% di probabilità di verde.`;
    else if (s.phase === PHASES.RUNNING) status = `Verde! Stai attraversando l’incrocio ${pendingCrossing}.`;
    else if (decision) status = `Incrocio ${s.crossing} superato. Incassa ${formatMoney(potential)} CR oppure continua: il prossimo verde ha probabilità ${percentFormatter.format(probability * 100)}%.`;
    else if (s.phase === PHASES.CAUGHT) status = `Rosso all’incrocio ${pendingCrossing}. La polizia ha fermato la fuga.`;
    else if (s.phase === PHASES.ESCAPING) status = `${formatMoney(s.payout)} CR accreditati. ${s.crossing >= HELICOPTER_THRESHOLD ? 'Arriva l’elicottero.' : 'Il ladro svolta nel vicolo.'}`;
    else status = s.payout ? `Fuga riuscita: incassati ${formatMoney(s.payout)} CR. Puoi iniziare una nuova partita.` : `Puntata persa. ${s.balance < MIN_BET ? 'Ripristina 1.000 CR per continuare la demo.' : 'Puoi iniziare una nuova partita.'}`;
    if (status !== lastStatus) { lastStatus = status; $('status-text').textContent = status; }
    const newHistoryKey = s.history.map(r => `${r.id}:${r.outcome}`).join(',');
    if (newHistoryKey !== historyKey) {
      historyKey = newHistoryKey;
      if (!s.history.length) $('history').innerHTML = '<li class="history-empty">Le tue fughe iniziano qui.<span>Attraversa il primo incrocio per metterti alla prova.</span></li>';
      else $('history').replaceChildren(...s.history.map(round => {
        const item = document.createElement('li'); item.className = `history-card ${round.outcome}`;
        const isWon = round.outcome === 'won';
        const outcome = document.createElement('span'); outcome.className = 'history-outcome'; outcome.textContent = isWon ? 'Al sicuro' : 'Beccato';
        const multi = document.createElement('strong'); multi.className = 'history-multi'; multi.textContent = `${formatMultiplier(round.multiplier)}×`;
        const detail = document.createElement('span'); detail.className = 'history-detail'; detail.textContent = `${DIFFICULTIES[round.difficulty].label} · ${round.crossing} superati`;
        const amount = document.createElement('span'); amount.className = 'history-amount'; amount.textContent = `${isWon ? '+' : '−'}${formatMoney(isWon ? round.payout : round.stake)} CR`;
        item.title = isWon ? `Puntata ${formatMoney(round.stake)} CR; incasso ${formatMoney(round.payout)} CR; utile ${formatMoney(round.payout - round.stake)} CR.` : `Puntata ${formatMoney(round.stake)} CR persa all’incrocio ${round.attemptedCrossing}. Moltiplicatore raggiunto: ${formatMultiplier(round.multiplier)}×.`;
        item.append(outcome, multi, detail, amount); return item;
      }));
    }
    previousPhase = s.phase; previousRound = s.round; previousCrossing = s.crossing;
  }
  const unsubscribe = game.subscribe(render);
  return {
    setReady(value) { ready = value; render(game.snapshot); $('scene-loader').hidden = value; },
    showError(message) { ready = false; render(game.snapshot); $('scene-loader').hidden = true; $('webgl-error-text').textContent = message; $('webgl-error').hidden = false; },
    dispose() { unsubscribe(); },
  };
}
