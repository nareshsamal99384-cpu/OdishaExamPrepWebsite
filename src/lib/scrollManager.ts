const isBrowser = typeof window !== 'undefined';

/** Premium eased window scroll to a target Y position.
 *  Uses easeInOutCubic curve so the animation decelerates naturally.
 *  Duration scales with distance: short hops feel snappy, long jumps feel cinematic. */
function smoothScrollWindow(targetY: number, duration = 400): Promise<void> {
  return new Promise((resolve) => {
    const startY = window.scrollY;
    const distance = targetY - startY;
    if (Math.abs(distance) < 2) { resolve(); return; }

    // Temporarily disable pointer events to prevent hover recalculations during programmatic scrolling
    if (document.body) {
      document.body.style.pointerEvents = 'none';
    }

    // Scale duration: snappy 300ms (short hops) to 450ms (long jumps)
    const scaledDuration = Math.min(Math.max(Math.abs(distance) * 0.15, 300), 450);

    const t0 = performance.now();

    // Snappier ease-out curve for section jumps
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

    const tick = (now: number) => {
      const elapsed = now - t0;
      const progress = Math.min(elapsed / scaledDuration, 1);
      const eased = easeOutCubic(progress);
      window.scrollTo(0, startY + distance * eased);
      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        if (document.body) {
          document.body.style.pointerEvents = '';
        }
        resolve();
      }
    };

    requestAnimationFrame(tick);
  });
}

export function scrollToElement(
  idOrEl: string | HTMLElement | null,
  options?: {
    block?: ScrollLogicalPosition;
    behavior?: ScrollBehavior;
    delay?: number;
  }
): Promise<void> {
  const { block = 'start', delay = 0 } = options || {};

  const el = typeof idOrEl === 'string' ? document.getElementById(idOrEl) : idOrEl;
  if (!el) return Promise.resolve();

  return new Promise((resolve) => {
    const doScroll = () => {
      const rect = el.getBoundingClientRect();
      const NAVBAR_OFFSET = 96; // matches scroll-mt-24 on sections
      let targetY: number;

      if (block === 'start') {
        targetY = window.scrollY + rect.top - NAVBAR_OFFSET;
      } else if (block === 'center') {
        targetY = window.scrollY + rect.top - window.innerHeight / 2 + rect.height / 2;
      } else {
        targetY = window.scrollY + rect.top - NAVBAR_OFFSET;
      }

      targetY = Math.max(0, Math.min(targetY, document.documentElement.scrollHeight - window.innerHeight));
      smoothScrollWindow(targetY).then(resolve);
    };

    if (delay > 0) {
      setTimeout(doScroll, delay);
    } else {
      doScroll();
    }
  });
}

export function scrollToTop(options?: { behavior?: ScrollBehavior; delay?: number }): Promise<void> {
  const { delay = 0 } = options || {};

  return new Promise((resolve) => {
    const doScroll = () => {
      smoothScrollWindow(0).then(resolve);
    };

    if (delay > 0) {
      setTimeout(doScroll, delay);
    } else {
      doScroll();
    }
  });
}

const scrollRafControllers = new Map<string, number>();

export function smoothScrollTo(
  element: HTMLElement,
  targetY: number,
  duration = 200
): Promise<void> {
  return new Promise((resolve) => {
    const key = `${element.tagName}-${element.id || Math.random()}`;
    if (scrollRafControllers.has(key)) {
      cancelAnimationFrame(scrollRafControllers.get(key)!);
    }

    const start = element.scrollTop;
    if (Math.abs(start - targetY) < 2) {
      resolve();
      return;
    }

    const t0 = performance.now();
    function tick(now: number) {
      const p = Math.min((now - t0) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      element.scrollTop = start + (targetY - start) * eased;
      if (p < 1) {
        scrollRafControllers.set(key, requestAnimationFrame(tick));
      } else {
        scrollRafControllers.delete(key);
        resolve();
      }
    }
    scrollRafControllers.set(key, requestAnimationFrame(tick));
  });
}
