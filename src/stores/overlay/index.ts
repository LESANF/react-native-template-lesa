import type { ReactNode } from 'react';
import { useSyncExternalStore } from 'react';

export type ToastType = 'default' | 'warning' | 'error' | 'success';

export type ToastShowParams = {
  readonly type?: ToastType;
  readonly text1: ReactNode;
  readonly duration?: number;
  readonly hideClose?: boolean;
};

type ToastState = {
  readonly id: number;
  readonly type: ToastType;
  readonly text1: ReactNode;
  readonly duration: number;
  readonly hideClose: boolean;
} | null;

type OverlayState = {
  readonly toast: ToastState;
};

type Listener = () => void;

const DEFAULT_TOAST_DURATION = 3000;
const listeners = new Set<Listener>();

let toastId = 0;
let state: OverlayState = {
  toast: null,
};

function emit(nextState: OverlayState) {
  state = nextState;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return state;
}

export function useOverlaySnapshot() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export const toast = {
  show: ({ type = 'default', text1, duration = DEFAULT_TOAST_DURATION, hideClose = false }: ToastShowParams) => {
    toastId += 1;
    emit({
      ...state,
      toast: {
        id: toastId,
        type,
        text1,
        duration,
        hideClose,
      },
    });
  },
  hide: (id?: number) => {
    if (id !== undefined && state.toast?.id !== id) return;
    emit({ ...state, toast: null });
  },
};
