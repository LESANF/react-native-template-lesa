import { HotUpdater } from '@hot-updater/react-native';
import { Env } from '@env';

/** OTA 클라이언트 — v1 은 인스턴스 API라 모듈에서 1회 init. `urls.ota` 가 비면 null, ota 스테이지가 스킵한다. */
export const hotUpdater = Env.urls.ota ? HotUpdater.init({ baseURL: Env.urls.ota }) : null;
