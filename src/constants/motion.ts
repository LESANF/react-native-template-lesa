import { cubicBezier, Easing } from 'react-native-reanimated';

// 시간·곡선·스프링을 한 곳에. css.create 는 cssEasing, withTiming 은 workletEasing.
const CURVE = {
  out: [0.23, 1, 0.32, 1],
  inOut: [0.77, 0, 0.175, 1],
  sheet: [0.32, 0.72, 0, 1],
} as const;

export const duration = {
  press: 120,
  toggle: 200,
  exit: 150,
} as const;

export const cssEasing = {
  out: cubicBezier(...CURVE.out),
  inOut: cubicBezier(...CURVE.inOut),
  sheet: cubicBezier(...CURVE.sheet),
} as const;

export const workletEasing = {
  out: Easing.bezier(...CURVE.out),
  inOut: Easing.bezier(...CURVE.inOut),
  sheet: Easing.bezier(...CURVE.sheet),
} as const;

export const spring = {
  settle: { duration: 400, dampingRatio: 1 },
  snap: { duration: 400, dampingRatio: 0.8 },
  sheet: { duration: 300, dampingRatio: 0.8 },
} as const;
