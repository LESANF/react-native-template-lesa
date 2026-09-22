#!/usr/bin/env node
/**
 * 도메인을 감지해 그 영역의 스킬·MCP 를 한 줄로 알린다. 규칙은 AGENTS.md ①.
 *   node route.mjs prompt    — UserPromptSubmit (stdin JSON)
 *   node route.mjs state     — SessionStart (현재 켜져 있는 opt-in 스냅샷)
 *   node route.mjs grep      — PreToolUse(Grep). 심볼 검색이면 codegraph 를 권한다
 *
 * Claude Code · Codex CLI 양쪽에서 돈다. 계약 차이는 두 곳뿐이다 —
 * 프롬프트 필드가 `user_input`(Claude) / `prompt`(Codex), PreToolUse 출력이
 * `hookSpecificOutput`(Claude) / 평문(Codex). 둘 다 받아 넘긴다.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.env.CLAUDE_PROJECT_DIR ?? process.env.CODEX_PROJECT_DIR ?? process.cwd();
/** Claude Code 만 PreToolUse 에서 JSON 계약을 요구한다. */
const IS_CLAUDE = Boolean(process.env.CLAUDE_PROJECT_DIR);
const read = () => new Promise(r => {
  let s = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', d => (s += d));
  process.stdin.on('end', () => r(s));
});

/**
 * 설치된 스킬 이름. 하네스마다 스킬이 따로 설치되므로(Claude 는 `~/.agents/skills` 를
 * 심링크, Codex 는 `~/.codex/skills` 에 별도 복사) 있는 것만 권한다. 없는 이름을 권하면
 * 그 지침은 죽은 줄이 된다.
 */
const SKILLS = (() => {
  const home = process.env.HOME ?? '';
  const roots = ['.agents/skills', '.claude/skills', '.codex/skills'].map(r => path.join(home, r));
  for (const cache of ['.claude/plugins/cache', '.codex/plugins/cache']) {
    try {
      const base = path.join(home, cache);
      for (const market of readdirSync(base)) {
        for (const plug of readdirSync(path.join(base, market))) {
          for (const ver of readdirSync(path.join(base, market, plug))) {
            roots.push(path.join(base, market, plug, ver, 'skills'));
          }
        }
      }
    } catch {}
  }
  const found = new Set();
  for (const dir of roots) {
    try {
      for (const name of readdirSync(dir)) found.add(name);
    } catch {}
  }
  return found;
})();

/** 설치된 것만 남긴다. */
const have = (...names) => names.filter(n => SKILLS.has(n));

/** 프롬프트에 이 패턴이 있으면 그 줄을 낸다. 겹치면 다 낸다. */
const ROUTES = [
  {
    re: /애니메이|animat|모션|motion|제스처|gesture|스와이프|swipe|(screen|화면|탭|page)\s*transition|트랜지션|햅틱|haptic|reanimated|worklet|withTiming|withSpring|useSharedValue|덜컹|stutter|jank|프레임\s*드[랍롭]/i,
    say: () => {
      const rn = have('animate-expo', 'react-native-animation-patterns');
      const web = have('animate', 'motion-react', 'css-animations', 'animation-performance');
      const lines = rn.length
        ? [`애니메이션·제스처 → ${rn.map(s => `\`${s}\``).join(' · ')} 스킬.`]
        : ['애니메이션·제스처 → **RN 애니메이션 스킬이 이 하네스에 없다.** Reanimated 는 UI 스레드에서 돌고 `useSharedValue`/`useAnimatedStyle` 로 JS 왕복을 없앤다는 것만 지키고, 확실하지 않으면 expo MCP 로 확인한다.'];
      if (web.length)
        lines.push(`⚠ ${web.map(s => `\`${s}\``).join(' · ')} 는 **웹 전용**(CSS·Framer Motion)이다. RN 에 그 조언을 쓰면 안 된다 — \`will-change\`·GPU 레이어 같은 건 없다.`);
      return lines.join('\n  ');
    },
  },
  {
    re: /키보드|keyboard|TextInput|소프트\s*키|입력\s*필드|(폼|form)[^.]{0,20}(가림|가려|키보드|스크롤|포커스)/i,
    say: () => have('rn-keyboard-handling').length
      ? '키보드 회피 → `rn-keyboard-handling` 스킬 (KeyboardAvoidingView vs avoid-softinput 선택, iOS/Android 차이).'
      : '키보드 회피 → 전용 스킬이 이 하네스에 없다. iOS 는 KeyboardAvoidingView, Android 는 `adjustResize` 가 기본이고 바텀시트·포털 안에서는 둘 다 어긋난다 — 실기로 확인한다.',
  },
  {
    re: /\bOTA\b|hot-?updater|번들\s*배포|롤백|rollback|핫픽스|hotfix/i,
    say: () => have('hot-updater').length
      ? 'OTA → `hot-updater` 스킬. 이 템플릿의 OTA 엔진이다. 흐름은 `docs/boot.md`.'
      : 'OTA → `hot-updater`(이 템플릿의 엔진). 전용 스킬이 없으니 `docs/boot.md` 와 `scripts/ota-deploy.mjs` 를 읽는다.',
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
    re: /푸시|FCM|notifee|APNs|알림|(push|remote)\s*(notification|message|token)|notification\s*(배지|탭|권한|채널)/i,
    say: '푸시 → `docs/push.md`. 활성화는 `firebase/` 파일 존재로 갈린다. 헤드리스 체인에 React 를 import 하면 안 된다.',
  },
  {
    re: /딥링크|deep\s*link|스킴|scheme|유니버설|universal\s*link|어트리뷰션|attribution|airbridge/i,
    say: '딥링크 → `docs/routing.md`·`docs/boot.md`. 진입은 어디든 `deepLinkDispatcher.enqueue` 하나로 모인다. `+native-intent` 는 리다이렉트만.',
  },
  {
    re: /스토어\s*(배포|제출)|app\s*store|testflight|play\s*(store|console)|EAS\s*build|github\s*actions|(CI|워크플로|workflow)\s*(설정|구성|추가|만들|파이프라인)/i,
    say: () => {
      const s = have('expo-deployment', 'expo-cicd-workflows');
      return s.length
        ? `배포·CI → ${s.map(x => '`' + x + '`').join(' · ')} 스킬. 이 템플릿은 EAS 미연결이 기본이다(\`docs/config.md\`).`
        : '배포·CI → 이 템플릿은 EAS 미연결이 기본이다. 빌드 경로는 로컬 prebuild + run:ios/android — `docs/config.md`.';
    },
  },
  {
    re: /SDK\s*업그레이드|expo\s*upgrade|버전\s*올리|sdk\s*5[89]/i,
    say: () => have('upgrading-expo').length
      ? 'SDK 업그레이드 → `upgrading-expo` 스킬 + **expo MCP** 로 해당 버전 문서 확인.'
      : 'SDK 업그레이드 → `npx expo install --check` 로 시작하고 해당 버전 문서를 **expo MCP** 로 확인한다.',
  },
  {
    re: /색상?|컬러|colou?r|hex|(디자인|색상?|컬러)\s*토큰|design\s*token|테마|theme|다크\s*모드|css\.create|useCSSVariable|getCSSVariable/i,
    say: '색 → 값은 `src/styles/tokens` CSS 에만 둔다. 정적인 곳은 className, JS 값은 `useCSSVariable` 배열 읽기. hex 직접 기입·`getCSSVariable`·생성 스크립트는 거부된 대안이다(ESLint error) — `docs/colors-in-js.md`.',
  },
];

const EXPO_RE = /\bexpo\b|expo-router|expo-\w+|EAS\b/i;

function routePrompt(text) {
  const lines = ROUTES.filter(r => r.re.test(text)).map(
    r => `- ${typeof r.say === 'function' ? r.say() : r.say}`
  );
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
    out.push(n ? 'iOS NSE: targets/ 있음 (푸시가 켜져 있을 때만 붙는다)' : 'iOS NSE: 없음');
  } catch {
    out.push('iOS NSE: 없음 (targets/ 를 지운 상태 — 리치 푸시 이미지는 백그라운드에서 안 나온다)');
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
    const say = `심볼 \`${pattern}\` 을 찾는 중이라면 \`codegraph_explore\` 가 정의·호출자·영향 범위를 한 번에 준다(AGENTS.md ①). 문자열 내용을 찾는 거면 grep 이 맞다.`;
    // permissionDecision 은 주지 않는다 — 막지 않고 알리기만 한다.
    process.stdout.write(
      IS_CLAUDE
        ? JSON.stringify({
            hookSpecificOutput: { hookEventName: 'PreToolUse', additionalContext: say },
          })
        : say
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
