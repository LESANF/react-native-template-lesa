import { createMMKV } from 'react-native-mmkv';

export const storage = createMMKV();

export function getItem(key: string): unknown | null {
  const value = storage.getString(key);
  if (value === undefined) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export function setItem(key: string, value: unknown): void {
  storage.set(key, JSON.stringify(value));
}

export function removeItem(key: string): void {
  storage.remove(key);
}
