export const easings = {
  easeOut: [0.23, 1, 0.32, 1] as [number, number, number, number],
  easeInOut: [0.4, 0, 0.2, 1] as [number, number, number, number],
  spring: { type: 'spring' as const, stiffness: 300, damping: 25 },
  springGentle: { type: 'spring' as const, stiffness: 200, damping: 25 },
  springSnappy: { type: 'spring' as const, stiffness: 400, damping: 20 },
};

export const durations = {
  fast: 0.15,
  normal: 0.25,
  medium: 0.35,
  slow: 0.5,
  reveal: 0.6,
};

export const fadeSlideUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { duration: durations.normal, ease: 'easeInOut' },
};

export const fadeSlideDown = {
  initial: { opacity: 0, y: -20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 20 },
  transition: { duration: durations.normal, ease: 'easeInOut' },
};

export const fadeSlideLeft = {
  initial: { opacity: 0, x: -40 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 40 },
  transition: { duration: durations.slow, ease: 'easeOut' },
};

export const fadeSlideRight = {
  initial: { opacity: 0, x: 40 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -40 },
  transition: { duration: durations.slow, ease: 'easeOut' },
};

export const scaleIn = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
  transition: { duration: durations.normal, ease: 'easeInOut' },
};

export const scaleInBounce = {
  initial: { opacity: 0, scale: 0.9, y: 20 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.95, y: 10 },
  transition: easings.springGentle,
};

export const dropdown = {
  initial: { opacity: 0, y: -5, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -5, scale: 0.98 },
  transition: { duration: durations.fast, ease: 'easeOut' },
};

export const slideUpPanel = {
  initial: { y: '100%', opacity: 0 },
  animate: { y: 0, opacity: 1 },
  exit: { y: '100%', opacity: 0 },
  transition: easings.springGentle,
};

export const modalBackdrop = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: durations.fast },
};

export const whileHover = {
  lift: { y: -6, scale: 1.02, transition: { duration: 0.35, ease: easings.easeOut } },
  liftTap: { y: -6, scale: 1.02, transition: { duration: 0.35, ease: easings.easeOut } },
  subtle: { y: -5, transition: { duration: 0.3, ease: easings.easeOut } },
};

export const whileTap = {
  press: { scale: 0.98 },
  pressMedium: { scale: 0.96 },
};

export const stagger = {
  container: (delayAmount = 0.08) => ({
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: delayAmount },
    },
  }),
  containerDelay: (delayAmount = 0.08, delayChildren = 0.1) => ({
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: delayAmount, delayChildren },
    },
  }),
  itemFadeUp: {
    hidden: { opacity: 0, y: 20 },
    show: {
      opacity: 1,
      y: 0,
      transition: easings.springGentle,
    },
  },
  itemFadeLeft: {
    hidden: { opacity: 0, x: -10 },
    show: { opacity: 1, x: 0 },
  },
};

export const sectionReveal = {
  initial: { opacity: 0, y: 30, scale: 0.9 },
  whileInView: { opacity: 1, y: 0, scale: 1 },
  viewport: { once: true, margin: '-50px' },
  transition: { duration: durations.reveal, ease: 'easeOut' },
};

export const sectionRevealSimple = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-50px' },
  transition: { duration: durations.reveal, ease: 'easeOut' },
};

export const sectionRevealScale = {
  initial: { opacity: 0, scale: 0.95 },
  whileInView: { opacity: 1, scale: 1 },
  viewport: { once: true, margin: '-50px' },
  transition: { duration: durations.slow, ease: 'easeOut' },
};

export const barGrow = (height: string) => ({
  initial: { height: 0 },
  whileInView: { height },
  viewport: { once: true },
  transition: { duration: durations.reveal, ease: 'easeOut' },
});

export const pageTransition = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { duration: 0.25, ease: 'easeInOut' },
};

export const modalContent = {
  initial: { opacity: 0, scale: 0.95, y: 20 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.95, y: 20 },
  transition: easings.springGentle,
};

export const fadeSlideUpSm = {
  initial: { opacity: 0, y: 5 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -5 },
  transition: { duration: durations.fast, ease: 'easeInOut' },
};

export const spin = {
  animate: { rotate: 360 },
  transition: { duration: 1, repeat: Infinity, ease: 'linear' },
};
