import type { ApiTokenPair, ApiTokenStore } from './client.types';

const emptyTokenStore: ApiTokenStore = {
  getAccessToken: () => null,
  getRefreshToken: () => null,
  setTokens: () => {},
  clearTokens: () => {},
};

let currentTokenStore = emptyTokenStore;

export function configureApiTokenStore(tokenStore: ApiTokenStore) {
  currentTokenStore = tokenStore;
}

export const apiTokenStore = {
  getAccessToken() {
    return currentTokenStore.getAccessToken();
  },

  getRefreshToken() {
    return currentTokenStore.getRefreshToken();
  },

  setTokens(tokens: ApiTokenPair) {
    return currentTokenStore.setTokens(tokens);
  },

  clearTokens() {
    return currentTokenStore.clearTokens();
  },
} as const;
