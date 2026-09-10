#!/usr/bin/env node
/**
 * 도메인을 감지해 그 영역의 스킬·MCP 를 한 줄로 알린다. 규칙은 AGENTS.md ①.
 *   node route.mjs prompt    — UserPromptSubmit (stdin JSON)
 *   node route.mjs state     — SessionStart (현재 켜져 있는 opt-in 스냅샷)
 *   node route.mjs grep      — PreToolUse(Grep). 심볼 검색이면 codegraph 를 권한다
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
const read = () => new Promise(r => {
  let s = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', d => (s += d));
  process.stdin.on('end', () => r(s));
});

/** 프롬프트에 이 패턴이 있으면 그 줄을 낸다. 겹치면 다 낸다. */
const ROUTES = [
  {
    re: /애니메이|animat|모션|motion|제스처|gesture|스와이프|swipe|(screen|화면|탭|page)\s*transition|트랜지션|햅틱|haptic|reanimated|worklet|withTiming|withSpring|useSharedValue|덜컹|stutter|jank|프레임\s*드[랍롭]/i,
    say: '애니메이션·제스처 → `animate-expo` 스킬. `animate`·`motion-react`·`css-animations`·`animation-performance` 는 **웹 전용**이라 RN 에 쓰면 안 된다. 원리·프레임 진단은 `react-native-animation-patterns`.',
  },
  {
    re: /키보드|keyboard|TextInput|소프트\s*키|입력\s*필드|(폼|form)[^.]{0,20}(가림|가려|키보드|스크롤|포커스)/i,
    say: '키보드 회피 → `rn-keyboard-handling` 스킬 (KeyboardAvoidingView vs avoid-softinput 선택, iOS/Android 차이).',
  },
  {
    re: /\bOTA\b|hot-?updater|번들\s*배포|롤백|rollback|핫픽스|hotfix/i,
    say: 'OTA → `hot-updater` 스킬. 이 템플릿의 OTA 엔진이다. 흐름은 `docs/boot.md`.',
  },
  {
    re: /safe\s*area|인셋|inset|노치|notch|SafeAreaView|하단\s*여백/i,
    say: 'safe area → `InsetView`(components/ui). 네이티브 `SafeAreaView` 는 쓰지 않는다. 탭 안 화면은 `edges={[\'top\']}` 만 — `docs/ui.md`.',
  },
  {
    re: /prebuild|app\.config|config\s*plugin|네이티브\s*(설정|수정)|entitlement|Info\.plist|build\.gradle|Podfile/i,
    say: '네이티브 설정 → `ios/`·`android/` 는 산출물이다. `plugins/` 의 config plugin 으로 한다. Expo 동작은 **expo MCP** 로 확인 — `docs/config.md`.',
  },
  {
    re: /푸시|push\b|FCM|알림|notification|notifee/i,
    say: '푸시 → `docs/push.md`. 활성화는 `firebase/` 파일 존재로 갈린다. 헤드리스 체인에 React 를 import 하면 안 된다.',
  },
  {
    re: /딥링크|deep\s*link|스킴|scheme|유니버설|universal\s*link|어트리뷰션|attribution|airbridge/i,
    say: '딥링크 → `docs/routing.md`·`docs/boot.md`. 진입은 어디든 `deepLinkDispatcher.enqueue` 하나로 모인다. `+native-intent` 는 리다이렉트만.',
  },
  {
    re: /스토어\s*(배포|제출)|app\s*store|testflight|play\s*(store|console)|EAS\s*build|github\s*actions|(CI|워크플로|workflow)\s*(설정|구성|추가|만들|파이프라인)/i,
    say: '배포·CI → `expo-deployment` · `expo-cicd-workflows` 스킬. 이 템플릿은 EAS 미연결이 기본이다(`docs/config.md`).',
  },
  {
    re: /SDK\s*업그레이드|expo\s*upgrade|버전\s*올리|sdk\s*5[89]/i,
    say: 'SDK 업그레이드 → `upgrading-expo` 스킬 + **expo MCP** 로 해당 버전 문서 확인.',
  },
];

const EXPO_RE = /\bexpo\b|expo-router|expo-\w+|EAS\b/i;

function routePrompt(text) {
  const lines = ROUTES.filter(r => r.re.test(text)).map(r => `- ${r.say}`);
  // Expo 를 언급했는데 위에 안 걸렸으면 MCP 만 짚는다.
  if (!lines.length && EXPO_RE.test(text)) {
    lines.push('- Expo 사실은 **expo MCP**(`search_documentation` → `read_documentation`)로 확인한다. 기억으로 답하지 않는다.');
  }
  return lines;
}

/** 지금 무엇이 켜져 있는지 — 문서가 가질 수 없는 정보다. */
function projectState() {
  const out = [];
  const at = p => path.join(ROOT, p);

  out.push(existsSync(at('.codegraph')) ? 'codegraph: 인덱스 있음 — 구조 질문은 `codegraph_explore`' : 'codegraph: 미초기화 — 구조 질문 전에 `codegraph init -i` 를 안내한다');

  try {
    const files = readdirSync(at('firebase'));
    const envs = ['development', 'preview', 'production'].filter(
      e => files.some(f => f === `GoogleService-Info.${e}.plist`) && files.some(f => f === `google-services.${e}.json`)
    );
    out.push(envs.length ? `푸시: ${envs.join('·')} 켜짐` : '푸시: 꺼짐 (firebase/ 에 plist+json 쌍이 없다)');
  } catch {
    out.push('푸시: 꺼짐 (firebase/ 없음)');
  }

  try {
    const src = readFileSync(at('env-candidates.ts'), 'utf8');
    const ota = /ota:\s*\{[^}]*?development:\s*'([^']*)'/s.exec(src);
    out.push(ota?.[1] ? 'OTA: 설정됨' : 'OTA: 비활성 (urls.ota 가 비어 있다 — 프리로더가 스킵)');
    const left = (src.match(/write[-.]your/g) ?? []).length;
    if (left) out.push(`⚠ env-candidates 에 자리표시 ${left}개 — 아직 치환 전 템플릿이다`);
  } catch {}

  try {
    const n = readdirSync(at('targets'), { recursive: true }).length;
    out.push(n ? 'iOS NSE: targets/ 있음' : 'iOS NSE: 미포함');
  } catch {
    out.push('iOS NSE: 미포함 (리치 푸시 이미지는 백그라운드에서 안 나온다)');
  }

  return out;
}

/**
 * 식별자 하나를 찾는 grep 인가. 정규식·공백·문자열 검색이면 grep 이 맞으니 침묵한다.
 * codegraph 인덱스가 없으면 권할 것도 없다.
 */
function isSymbolLookup(pattern) {
  if (typeof pattern !== 'string' || !existsSync(path.join(ROOT, '.codegraph'))) return false;
  if (/[\s|()[\]{}*+?^$\\.]/.test(pattern)) return false;
  return /^[A-Za-z_$][A-Za-z0-9_$]{3,}$/.test(pattern) && /[A-Z_]/.test(pattern.slice(1));
}

const mode = process.argv[2];

if (mode === 'grep') {
  const raw = await read();
  let pattern;
  try {
    pattern = JSON.parse(raw)?.tool_input?.pattern;
  } catch {}
  if (isSymbolLookup(pattern)) {
    // PreToolUse 는 hookSpecificOutput.additionalContext 로 넣는다. permissionDecision 은
    // 주지 않는다 — 막지 않고 알리기만 한다.
    process.stdout.write(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: 'PreToolUse',
          additionalContext: `심볼 \`${pattern}\` 을 찾는 중이라면 \`codegraph_explore\` 가 정의·호출자·영향 범위를 한 번에 준다(AGENTS.md ①). 문자열 내용을 찾는 거면 grep 이 맞다.`,
        },
      })
    );
  }
  process.exit(0);
}

if (mode === 'state') {
  console.log(`[템플릿 현재 상태]\n${projectState().map(l => `- ${l}`).join('\n')}`);
  process.exit(0);
}

if (mode === 'prompt') {
  const raw = await read();
  let text = raw;
  try {
    const json = JSON.parse(raw);
    text = json.user_input ?? json.prompt ?? raw;
  } catch {}
  const lines = routePrompt(text);
  if (lines.length) console.log(`[이 영역의 도구 — AGENTS.md ①]\n${lines.join('\n')}`);
  process.exit(0);
}

process.exit(0);
