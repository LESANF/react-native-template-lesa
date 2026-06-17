import { createMMKV } from 'react-native-mmkv';

export const storage = createMMKV();

export function getItem(key: string) {
  return storage.getString(key) ?? null;
}

export function setItem(key: string, value: string) {
  storage.set(key, value);
}

export function removeItem(key: string) {
  storage.remove(key);
}
