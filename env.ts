/**
 * env.ts — defineEnv 기계. 템플릿 소유 파일이며 프로젝트에서 수정할 일이 없습니다.
 *
 * 값을 바꾸려면 env-candidates.ts 를 편집하세요.
 *
 * 동작: env-candidates.ts 의 트리를 재귀 순회하며,
 * { development, preview, production } 모양의 leaf 를 현재 환경 값으로 치환.
 * - 환경 키가 일부만 있는 record → 경로를 표시하며 throw (조용한 버그 차단)
 * - 잘못된 EXPO_PUBLIC_APP_ENV 값 → throw, 미설정 → 'development'
 *
 * process.env 읽기는 아래 EXPO_PUBLIC_APP_ENV 한 곳뿐입니다.
 * (정적 멤버 접근 — Metro 가 클라이언트 번들에 인라인하는 조건)
 */
import { values } from './env-candidates';

const APP_ENVS = ['development', 'preview', 'production'] as const;
export type AppEnv = (typeof APP_ENVS)[number];

function resolveAppEnv(raw: string | undefined): AppEnv {
  if (raw === undefined) return 'development';
  if ((APP_ENVS as readonly string[]).includes(raw)) return raw as AppEnv;
  throw new Error(
    `Invalid EXPO_PUBLIC_APP_ENV="${raw}". Expected one of: ${APP_ENVS.join(', ')}`,
  );
}

export const APP_ENV: AppEnv = resolveAppEnv(process.env.EXPO_PUBLIC_APP_ENV);

// ---- type-level resolver ----
type IsEnvRecord<T> = T extends object
  ? [keyof T] extends [AppEnv]
    ? [AppEnv] extends [keyof T]
      ? true
      : false
    : false
  : false;

type ResolveTree<T> = IsEnvRecord<T> extends true
  ? T[Extract<keyof T, AppEnv>]
  : T extends readonly unknown[]
    ? T
    : T extends object
      ? { readonly [K in keyof T]: ResolveTree<T[K]> }
      : T;

// ---- runtime resolver ----
function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function resolveNode(node: unknown, appEnv: AppEnv, path: string): unknown {
  if (!isPlainObject(node)) return node;

  const keys = Object.keys(node);
  const envKeyCount = APP_ENVS.filter((e) => keys.includes(e)).length;

  if (envKeyCount > 0) {
    // 환경 키를 하나라도 가진 객체는 정확히 세 키만 가져야 한다.
    if (envKeyCount !== APP_ENVS.length || keys.length !== APP_ENVS.length) {
      throw new Error(
        `[env] Malformed env record at "${path}": keys=[${keys.join(', ')}]. ` +
          `An env record must have exactly: ${APP_ENVS.join(', ')}`,
      );
    }
    return node[appEnv];
  }

  const out: Record<string, unknown> = {};
  for (const k of keys) out[k] = resolveNode(node[k], appEnv, `${path}.${k}`);
  return out;
}

/** 테스트용 — 환경을 명시해서 트리를 해석한다. */
export function defineEnvWith<T>(tree: T, appEnv: AppEnv): ResolveTree<T> {
  return resolveNode(tree, appEnv, 'Env') as ResolveTree<T>;
}

/** 공개 표면 — 현재 APP_ENV 를 자동 적용한다. */
export function defineEnv<T>(tree: T): ResolveTree<T> {
  return defineEnvWith(tree, APP_ENV);
}

export const Env = defineEnv(values);
export default Env;

// 부팅 확인용 1줄 로그 — 클라이언트(__DEV__)와 Node(app.config.ts) 양쪽 컨텍스트 대응
const IS_DEV =
  typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV !== 'production';
if (IS_DEV) {
  console.log(
    `[env] ${APP_ENV} · ${Env.identity.bundleId} · v${Env.version.app}(${Env.version.iosBuildNumber})`,
  );
}
