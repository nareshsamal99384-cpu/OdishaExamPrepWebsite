const isBrowser = typeof window !== 'undefined';

/** Premium eased window scroll to a target Y position.
 *  Uses easeInOutCubic curve so the animation decelerates naturally.
 *  Duration scales with distance: short hops feel snappy, long jumps feel cinematic. */
function smoothScrollWindow(targetY: number, duration = 1200): Promise<void> {
  return new Promise((resolve) => {
    const startY = window.scrollY;
    const distance = targetY - startY;
    if (Math.abs(distance) < 2) { resolve(); return; }

    // Temporarily disable pointer events on root element to prevent hover recalculations during programmatic scrolling
    if (document.documentElement) {
      document.documentElement.style.pointerEvents = 'none';
    }

    // Set global programmatic scroll flag to bypass scrollspy layout updates
    if (typeof window !== 'undefined') {
      (window as any).isProgrammaticScrolling = true;
    }

    // Scale duration to a slow, majestic, cinematic smooth range: 1100ms to 1600ms
    const scaledDuration = Math.min(Math.max(1000 + Math.abs(distance) * 0.25, 1100), 1600);

    const t0 = performance.now();

    // Elegant easeInOutQuart curve for a slow, luxurious deceleration feel
    const easeInOutQuart = (t: number) =>
      t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;

    const tick = (now: number) => {
      const elapsed = now - t0;
      const progress = Math.min(elapsed / scaledDuration, 1);
      const eased = easeInOutQuart(progress);
      
      // Round scroll position to integer pixel to prevent browser layout subpixel jitter
      window.scrollTo(0, Math.round(startY + distance * eased));
      
      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        // Ensure we land exactly on targetY
        window.scrollTo(0, targetY);

        if (document.documentElement) {
          document.documentElement.style.pointerEvents = '';
        }
        if (typeof window !== 'undefined') {
          (window as any).isProgrammaticScrolling = false;
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
  const { block = 'start', behavior = 'smooth', delay = 0 } = options || {};

  return new Promise((resolve) => {
    let attempts = 0;
    const maxAttempts = 40; // up to 2 seconds (40 * 50ms)

    const tryScroll = () => {
      const el = typeof idOrEl === 'string' ? document.getElementById(idOrEl) : idOrEl;
      if (!el) {
        if (attempts < maxAttempts) {
          attempts++;
          setTimeout(tryScroll, 50);
        } else {
          console.warn(`[ScrollManager] Element not found after ${maxAttempts} attempts:`, idOrEl);
          resolve();
        }
        return;
      }

      const NAVBAR_OFFSET = 96; // matches scroll-mt-24 on sections
      
      const getTargetY = () => {
        const rect = el.getBoundingClientRect();
        let targetY: number;

        if (block === 'start') {
          targetY = window.scrollY + rect.top - NAVBAR_OFFSET;
        } else if (block === 'center') {
          targetY = window.scrollY + rect.top - window.innerHeight / 2 + rect.height / 2;
        } else {
          targetY = window.scrollY + rect.top - NAVBAR_OFFSET;
        }

        return Math.max(0, Math.min(targetY, document.documentElement.scrollHeight - window.innerHeight));
      };

      // Perform initial scroll
      let lastTargetY = getTargetY();
      if (behavior === 'instant' || behavior === 'auto') {
        if (typeof window !== 'undefined') {
          window.scrollTo(0, lastTargetY);
          document.documentElement.scrollTop = lastTargetY;
          document.body.scrollTop = lastTargetY;
        }
        resolve();
        return;
      }

      smoothScrollWindow(lastTargetY);

      // Continuously adjust scroll for layout shifts / animations for 1.2s
      const startTime = performance.now();
      const trackShifts = () => {
        const currentTargetY = getTargetY();
        if (Math.abs(currentTargetY - lastTargetY) > 4) {
          lastTargetY = currentTargetY;
          if (behavior === 'instant' || behavior === 'auto') {
            if (typeof window !== 'undefined') {
              window.scrollTo(0, currentTargetY);
              document.documentElement.scrollTop = currentTargetY;
              document.body.scrollTop = currentTargetY;
            }
          } else {
            smoothScrollWindow(currentTargetY);
          }
        }

        if (performance.now() - startTime < 1200) {
          requestAnimationFrame(trackShifts);
        } else {
          resolve();
        }
      };

      requestAnimationFrame(trackShifts);
    };

    if (delay > 0) {
      setTimeout(tryScroll, delay);
    } else {
      tryScroll();
    }
  });
}

export function scrollToTop(options?: { behavior?: ScrollBehavior; delay?: number }): Promise<void> {
  const { behavior = 'smooth', delay = 0 } = options || {};

  return new Promise((resolve) => {
    const doScroll = () => {
      if (behavior === 'instant' || behavior === 'auto') {
        if (typeof window !== 'undefined') {
          window.scrollTo(0, 0);
          document.documentElement.scrollTop = 0;
          document.body.scrollTop = 0;
        }
        resolve();
      } else {
        smoothScrollWindow(0).then(resolve);
      }
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
