import type { ReactNode } from 'react';
import { create } from 'zustand';

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

const DEFAULT_TOAST_DURATION = 3000;
let toastId = 0;

export const useOverlayStore = create<OverlayState>(() => ({ toast: null }));

export const toast = {
  show: ({
    type = 'default',
    text1,
    duration = DEFAULT_TOAST_DURATION,
    hideClose = false,
  }: ToastShowParams) => {
    toastId += 1;
    useOverlayStore.setState({
      toast: { id: toastId, type, text1, duration, hideClose },
    });
  },
  hide: (id?: number) => {
    if (id !== undefined && useOverlayStore.getState().toast?.id !== id) return;
    useOverlayStore.setState({ toast: null });
  },
};
