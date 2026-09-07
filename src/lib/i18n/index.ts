import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

/** 기본 언어 — resources 에 없는 언어면 fallbackLng 가 받는다. */
const DEFAULT_LANGUAGE = 'ko';

// 디바이스 언어 따라가기 — 다국어를 시작할 때 true 로. 단일 언어면 켜도 결과가 같다.
const USE_DEVICE_LANGUAGE = false;

const initialLanguage = USE_DEVICE_LANGUAGE
  ? (getLocales()[0]?.languageCode ?? DEFAULT_LANGUAGE)
  : DEFAULT_LANGUAGE;

/**
 * 단일 언어 기본 셋업.
 *
 * resources 가 비어있으면 t('안녕하세요')는 '안녕하세요'를 그대로 반환한다.
 * 즉 화면엔 <Text>안녕하세요</Text> 처럼 한국어를 바로 적고, 번역 파일은 만들 필요가 없다.
 *
 * 다국어가 필요해지는 날:
 *   resources 에 en 등을 추가하고 changeLanguage('en') 하면,
 *   같은 <Text>안녕하세요</Text> 가 매핑된 영어로 나온다. (JSX 변경 0)
 *   import en from '@/translations/en.json';  resources: { ko: ..., en: { translation: en } }
 *
 * keySeparator/nsSeparator = false: 한국어 문장의 '.' ':' 를 중첩키/네임스페이스로
 * 오해하지 않도록. (예: '확인.' 이 깨지지 않게)
 */
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
