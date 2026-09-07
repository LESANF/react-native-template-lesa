import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

/** 기본 언어 — resources 에 없는 언어면 fallbackLng 가 받는다. */
const DEFAULT_LANGUAGE = 'ko';

// ── 디바이스 언어 따라가기 — 기본 off ──────────────────────────────────────
// 템플릿 기본은 DEFAULT_LANGUAGE 고정이다. resources 가 하나뿐인 단일 언어 앱에서는
// 디바이스 언어를 읽어도 결과가 같고(없는 언어 → fallbackLng → 빈 맵 → 키=원문),
// 부팅 언어만 기기마다 달라진다.
//
// 다국어를 시작하는 날 이 상수를 true 로 바꾼다 — expo-localization 은 이미 설치돼 있다.
// (getLocales() 는 네이티브 동기 호출이라 모듈 스코프에서 안전하다.)
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
