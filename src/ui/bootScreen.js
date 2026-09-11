/** A short presentation bar; 100% is reached only after the scene has rendered. */
/** @param {{ motion: import('../core/types.js').MotionPreference }} options */
export function createBootScreen({ motion }) {
  const screen = document.getElementById('boot-screen'),
    app = document.getElementById('app');
  const progress = document.getElementById('boot-progress'),
    value = document.getElementById('boot-value');
  const label = document.getElementById('boot-label');
  let prepared = false,
    disposed = false,
    amount = 0,
    leaving = false,
    resolveReady;
  /** @type {ReturnType<typeof setInterval> | 0} */
  let interval = 0;
  /** @type {ReturnType<typeof setTimeout> | 0} */
  let exitTimer = 0;
  const started = performance.now();
  const completed = document.documentElement.dataset.bootComplete === 'true';
  const finished = new Promise((resolve) => {
    resolveReady = resolve;
  });
  /** @param {boolean} success */
  function hide(success) {
    clearInterval(interval);
    clearTimeout(exitTimer);
    screen.hidden = true;
    app.inert = false;
    if (success) document.documentElement.dataset.bootComplete = 'true';
    resolveReady(success);
  }
  if (completed) {
    hide(true);
    return { finish: () => finished, dispose: () => {} };
  }
  screen.hidden = false;
  screen.classList.remove('is-leaving');
  app.inert = true;
  progress.setAttribute('aria-valuenow', '0');
  value.textContent = '0%';
  screen.style.setProperty('--boot-progress', '0%');
  label.textContent = 'Preparazione della città';
  function tick() {
    if (disposed || leaving) return;
    const duration = motion.reduced ? 250 : 1500;
    amount = Math.max(
      amount,
      Math.min(prepared ? 100 : 88, Math.floor(((performance.now() - started) / duration) * 100)),
    );
    progress.setAttribute('aria-valuenow', String(amount));
    value.textContent = `${amount}%`;
    screen.style.setProperty('--boot-progress', `${amount}%`);
    if (amount === 100) {
      leaving = true;
      label.textContent = 'Pronto alla fuga';
      screen.classList.add('is-leaving');
      exitTimer = setTimeout(() => hide(true), motion.reduced ? 0 : 180);
    }
  }
  interval = setInterval(tick, 40);
  tick();
  return {
    async finish() {
      const logo = screen.querySelector('img');
      try {
        await logo.decode();
      } catch {
        /* The accessible logo text remains if the image cannot decode. */
      }
      if (disposed) return false;
      prepared = true;
      tick();
      return finished;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      hide(false);
    },
  };
}
