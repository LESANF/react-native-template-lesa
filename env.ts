/**
 * defineEnv 기계. **값은 여기가 아니라 `env-candidates.ts` 에서 바꾼다.**
 * `process.env` 읽기는 아래 한 곳뿐이다 — 정적 멤버 접근이어야 Metro 가 번들에 인라인한다.
 */
import { values } from './env-candidates';

const APP_ENVS = ['development', 'preview', 'production'] as const;
export type AppEnv = (typeof APP_ENVS)[number];

function resolveAppEnv(raw: string | undefined): AppEnv {
  if (raw === undefined) return 'development';
  if (isAppEnv(raw)) return raw;
  throw new Error(`Invalid EXPO_PUBLIC_APP_ENV="${raw}". Expected one of: ${APP_ENVS.join(', ')}`);
}

function isAppEnv(value: string): value is AppEnv {
  return APP_ENVS.some(appEnv => appEnv === value);
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

type ResolveTree<T> =
  IsEnvRecord<T> extends true
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
  const envKeyCount = APP_ENVS.filter(e => keys.includes(e)).length;

  if (envKeyCount > 0) {
    // 환경 키를 하나라도 가진 객체는 정확히 세 키만 가져야 한다.
    if (envKeyCount !== APP_ENVS.length || keys.length !== APP_ENVS.length) {
      throw new Error(
        `[env] Malformed env record at "${path}": keys=[${keys.join(', ')}]. ` +
          `An env record must have exactly: ${APP_ENVS.join(', ')}`
      );
    }
    return node[appEnv];
  }

  const out: Record<string, unknown> = {};
  for (const k of keys) out[k] = resolveNode(node[k], appEnv, `${path}.${k}`);
  return out;
}

export function defineEnvWith<T>(tree: T, appEnv: AppEnv): ResolveTree<T>;
export function defineEnvWith(tree: unknown, appEnv: AppEnv): unknown;
export function defineEnvWith(tree: unknown, appEnv: AppEnv): unknown {
  return resolveNode(tree, appEnv, 'Env');
}

export function defineEnv<T>(tree: T): ResolveTree<T> {
  return defineEnvWith(tree, APP_ENV);
}

export const Env = defineEnv(values);

if (APP_ENV === 'production' && Env.urls.api.endsWith('.invalid')) {
  throw new Error('[env] Env.urls.api must be configured for production in env-candidates.ts');
}

function logEnvSummary(): void {
  console.log(`\n${'='.repeat(60)}`);
  console.log('✅ Environment Variables Loaded Successfully');
  console.log('='.repeat(60));
  console.log('📌 APP_ENV:', APP_ENV);
  console.log('📌 APP_NAME:', Env.identity.name);
  console.log('📌 SLUG:', Env.identity.slug);
  console.log('📌 SCHEME:', Env.identity.scheme);
  console.log('📌 BUNDLE_ID:', Env.identity.bundleId);
  console.log('📌 PACKAGE:', Env.identity.package);
  console.log('📌 API_URL:', Env.urls.api);
  console.log('📌 VERSION:', Env.version.app);
  console.log('📌 IOS_BUILD_NUMBER:', Env.version.iosBuildNumber);
  console.log('📌 ANDROID_VERSION_CODE:', Env.version.androidVersionCode);
  console.log(`${'='.repeat(60)}\n`);
}

if (process.env.STRICT_ENV_VALIDATION === '1') {
  logEnvSummary();
}

export default Env;
