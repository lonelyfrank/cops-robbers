/** One live media-query subscription shared by UI and scene for this application mount. */
export function createMotionPreference() {
  const query = window.matchMedia('(prefers-reduced-motion: reduce)');
  const events = new AbortController(),
    listeners = new Set();
  query.addEventListener(
    'change',
    () => {
      for (const listener of listeners) listener(query.matches);
    },
    { signal: events.signal },
  );
  return {
    get value() {
      return query.matches;
    },
    subscribe(listener) {
      listeners.add(listener);
      listener(query.matches);
      return () => listeners.delete(listener);
    },
    dispose() {
      events.abort();
      listeners.clear();
    },
  };
}
