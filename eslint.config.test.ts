/**
 * 경계 규칙이 실제로 발동하는지 eslint 를 돌려서 확인한다. flat config 는 같은 rule 키를
 * 쓰는 블록 중 마지막 것만 적용하므로, 넓은 블록의 규칙이 좁은 블록에 조용히 덮여 사라진
 * 적이 두 번 있다 — providers 역류 error 가 features 에서 비어 있었다.
 *
 * **파일을 만들지 않는다.** 경로 기반 규칙이라 예전에는 `src/<layer>/` 에 임시 파일을
 * 두고 돌렸는데, `src/app/` 아래에 파일이 생기면 expo-router 가 라우트를 다시 만들고
 * Metro 가 리로드한다 — 에디터가 테스트를 자동 실행하면 그게 끝없이 반복된다(실개발에서
 * 보고됨). `--stdin-filename` 은 그 경로의 설정을 그대로 적용하면서 디스크를 건드리지 않는다.
 */
import { execFileSync } from 'node:child_process';

type Message = { ruleId: string | null; severity: number; message: string };

/** 그 경로에 있는 파일인 것처럼 검사한다. 파일은 만들지 않는다. */
function lintAs(virtualPath: string, source: string): Message[] {
  let raw: string;
  try {
    raw = execFileSync(
      'npx',
      ['eslint', '--stdin', '--stdin-filename', virtualPath, '--format', 'json'],
      {
        encoding: 'utf8',
        input: source,
        stdio: ['pipe', 'pipe', 'ignore'],
      }
    );
  } catch (error) {
    // 위반이 있으면 eslint 는 exit 1 이다 — stdout 이 결과다.
    raw = (error as { stdout?: string }).stdout ?? '';
  }
  const [result] = JSON.parse(raw) as { messages: Message[] }[];
  return result?.messages ?? [];
}

const SOURCE = `import { AppProviders } from '@/providers/app-providers';
import { Button } from '@/components/ui/button';
import type { HomeScreen } from '@/features/home/home-screen';
export const probe = [AppProviders, Button];
export type Probe = typeof HomeScreen;
`;

const LAYERS = {
  app: 'src/app/probe.ts',
  features: 'src/features/home/probe.ts',
  lib: 'src/lib/api/probe.ts',
  providers: 'src/providers/probe.ts',
} as const;

const results = Object.fromEntries(
  Object.entries(LAYERS).map(([layer, file]) => [layer, lintAs(file, SOURCE)])
) as Record<keyof typeof LAYERS, Message[]>;

const providersErrors = (layer: keyof typeof LAYERS) =>
  results[layer].filter(m => m.severity === 2 && m.message.includes('providers는 루트 조립'));

const textOf = (layer: keyof typeof LAYERS) => JSON.stringify(results[layer]);

describe('import 경계', () => {
  it('providers 역류는 features 에서도 error 다 — 가장 중요한 곳이 조용히 비어 있었다', () => {
    expect(providersErrors('features')).toHaveLength(1);
  });

  it('shared 계층에서도 error 다', () => {
    expect(providersErrors('lib')).toHaveLength(1);
  });

  it('app 과 providers 는 providers 를 쓸 수 있다', () => {
    expect(providersErrors('app')).toHaveLength(0);
    expect(providersErrors('providers')).toHaveLength(0);
  });

  it('barrel 규칙이 좁은 블록에서 사라지지 않는다', () => {
    for (const layer of ['features', 'lib', 'app'] as const) {
      expect(textOf(layer)).toContain('barrel 경유 권장');
    }
  });

  it('features 는 cross-feature, shared 는 계층 메시지를 받는다', () => {
    expect(textOf('features')).toContain('cross-feature 결합');
    expect(textOf('lib')).toContain('shared 계층은 features를 모릅니다');
  });
});
