const isBrowser = typeof window !== 'undefined';

export function scrollToElement(
  idOrEl: string | HTMLElement | null,
  options?: {
    block?: ScrollLogicalPosition;
    behavior?: ScrollBehavior;
    delay?: number;
  }
): Promise<void> {
  const { block = 'start', behavior = 'smooth', delay = 0 } = options || {};

  const el = typeof idOrEl === 'string' ? document.getElementById(idOrEl) : idOrEl;
  if (!el) return Promise.resolve();

  return new Promise((resolve) => {
    const doScroll = () => {
      el.scrollIntoView({ behavior, block });
      if (behavior === 'smooth') {
        let finished = false;
        const check = () => {
          const pos = el.getBoundingClientRect();
          if (Math.abs(pos.top - (block === 'start' ? 0 : pos.height)) < 2) {
            finished = true;
            resolve();
          } else if (!finished) {
            requestAnimationFrame(check);
          }
        };
        requestAnimationFrame(check);
      } else {
        resolve();
      }
    };

    if (delay > 0) {
      setTimeout(doScroll, delay);
    } else {
      doScroll();
    }
  });
}

export function scrollToTop(options?: { behavior?: ScrollBehavior; delay?: number }): Promise<void> {
  const { behavior = 'smooth', delay = 0 } = options || {};

  return new Promise((resolve) => {
    const doScroll = () => {
      window.scrollTo({ top: 0, behavior });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      resolve();
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
