import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const DEFAULT_LANGUAGE = 'ko';

// 다국어를 시작할 때 true 로 — docs/ui.md "i18n".
const USE_DEVICE_LANGUAGE = false;

const initialLanguage = USE_DEVICE_LANGUAGE
  ? (getLocales()[0]?.languageCode ?? DEFAULT_LANGUAGE)
  : DEFAULT_LANGUAGE;

/** `resources` 가 비면 키를 그대로 반환한다 — 사용법은 `docs/ui.md` "i18n". */
// eslint-disable-next-line import/no-named-as-default-member -- i18next 표준 체이닝 API
void i18n.use(initReactI18next).init({
  lng: initialLanguage,
  fallbackLng: DEFAULT_LANGUAGE,
  resources: { ko: { translation: {} } },
  keySeparator: false,
  nsSeparator: false,
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
});

export default i18n;
