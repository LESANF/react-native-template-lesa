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

export type PopupChoice = 'confirm' | 'cancel';

export type PopupOptions = {
  readonly title?: string;
  readonly message: ReactNode;
  readonly confirmText?: string;
  /** null이면 취소 버튼 없음(단일 버튼). 기본 '취소'. */
  readonly cancelText?: string | null;
  /** 배경 탭·Android 뒤로가기로 닫힘 허용. 강제 업데이트류는 false. 기본 true. */
  readonly dismissible?: boolean;
  readonly blur?: boolean;
};

type PopupState = {
  readonly id: number;
  readonly title?: string;
  readonly message: ReactNode;
  readonly confirmText: string;
  readonly cancelText: string | null;
  readonly dismissible: boolean;
  readonly blur: boolean;
  readonly resolve: (choice: PopupChoice) => void;
} | null;

type OverlayState = {
  readonly toast: ToastState;
  readonly popup: PopupState;
};

const DEFAULT_TOAST_DURATION = 3000;
let toastId = 0;
let popupId = 0;

export const useOverlayStore = create<OverlayState>(() => ({ toast: null, popup: null }));

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

// 확인 팝업. Promise로 사용자 선택을 돌려주므로 프리로더(강제 업데이트·OTA)처럼
// React 밖의 async 흐름에서도 `const choice = await popup.confirm(...)`로 쓴다. 한 번에 하나만.
export const popup = {
  confirm: (options: PopupOptions): Promise<PopupChoice> =>
    new Promise((resolve) => {
      // 열려 있던 팝업은 취소로 정리하고 교체한다.
      useOverlayStore.getState().popup?.resolve('cancel');
      popupId += 1;
      useOverlayStore.setState({
        popup: {
          id: popupId,
          title: options.title,
          message: options.message,
          confirmText: options.confirmText ?? '확인',
          cancelText: options.cancelText === undefined ? '취소' : options.cancelText,
          dismissible: options.dismissible ?? true,
          blur: options.blur ?? false,
          resolve,
        },
      });
    }),
  close: (choice: PopupChoice = 'cancel', id?: number) => {
    const current = useOverlayStore.getState().popup;
    if (!current || (id !== undefined && current.id !== id)) return;
    useOverlayStore.setState({ popup: null });
    current.resolve(choice);
  },
};
