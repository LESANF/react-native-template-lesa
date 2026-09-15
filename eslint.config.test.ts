/**
 * 경계 규칙이 실제로 발동하는지 eslint 를 돌려서 확인한다. flat config 는 같은 rule 키를
 * 쓰는 블록 중 마지막 것만 적용하므로, 넓은 블록의 규칙이 좁은 블록에 조용히 덮여 사라진
 * 적이 두 번 있다 — providers 역류 error 가 features 에서 비어 있었다.
 *
 * 경로 기반 규칙이라 실제 `src/` 안에 임시 파일을 두고 돌린다.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const FIXTURE_DIRS = ['lib', 'features', 'providers', 'app'] as const;
const dirFor = (layer: string) => path.join('src', layer, '__eslint_fixture__');
const fileFor = (layer: string) => path.join(dirFor(layer), 'probe.ts');

const SOURCE = `import { AppProviders } from '@/providers/app-providers';
import { Button } from '@/components/ui/button';
import type { HomeScreen } from '@/features/home/home-screen';
export const probe = [AppProviders, Button];
export type Probe = typeof HomeScreen;
`;

type Message = { ruleId: string | null; severity: number; message: string };
let results: Record<string, Message[]> = {};

beforeAll(() => {
  for (const layer of FIXTURE_DIRS) {
    mkdirSync(dirFor(layer), { recursive: true });
    writeFileSync(fileFor(layer), SOURCE, 'utf8');
  }
  let raw = '';
  try {
    raw = execFileSync('npx', ['eslint', '--format', 'json', ...FIXTURE_DIRS.map(fileFor)], {
      encoding: 'utf8',
    });
  } catch (error) {
    // eslint 는 위반이 있으면 exit 1 이다 — stdout 이 결과다.
    raw = (error as { stdout?: string }).stdout ?? '';
  }
  results = Object.fromEntries(
    (JSON.parse(raw) as { filePath: string; messages: Message[] }[]).map(r => [
      path.basename(path.dirname(path.dirname(r.filePath))),
      r.messages,
    ])
  );
});

afterAll(() => {
  for (const layer of FIXTURE_DIRS) rmSync(dirFor(layer), { force: true, recursive: true });
});

const providersError = (layer: string) =>
  (results[layer] ?? []).filter(
    m => m.severity === 2 && m.message.includes('providers는 루트 조립')
  );

const messagesFor = (layer: string) => JSON.stringify(results[layer] ?? []);

describe('import 경계', () => {
  it('providers 역류는 features 에서도 error 다 — 가장 중요한 곳이 조용히 비어 있었다', () => {
    expect(providersError('features')).toHaveLength(1);
  });

  it('shared 계층에서도 error 다', () => {
    expect(providersError('lib')).toHaveLength(1);
  });

  it('app 과 providers 는 providers 를 쓸 수 있다', () => {
    expect(providersError('app')).toHaveLength(0);
    expect(providersError('providers')).toHaveLength(0);
  });

  it('barrel 규칙이 좁은 블록에서 사라지지 않는다', () => {
    for (const layer of ['features', 'lib', 'app']) {
      expect(messagesFor(layer)).toContain('barrel 경유 권장');
    }
  });

  it('features 는 cross-feature, shared 는 계층 메시지를 받는다', () => {
    expect(messagesFor('features')).toContain('cross-feature 결합');
    expect(messagesFor('lib')).toContain('shared 계층은 features를 모릅니다');
  });
});
