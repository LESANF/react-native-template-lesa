/** `defineEnvWith` — 환경 leaf 를 접는 기계. 여기가 틀리면 전부 조용히 잘못된 값이 된다. */
import { defineEnvWith } from './env';

describe('defineEnvWith', () => {
  it('세 키를 가진 leaf 를 현재 환경 값으로 접는다', () => {
    const tree = { urls: { api: { development: 'dev', preview: 'pre', production: 'prod' } } };
    expect(defineEnvWith(tree, 'preview')).toEqual({ urls: { api: 'pre' } });
  });

  it('환경 키가 아닌 객체는 그대로 내려가며 접는다', () => {
    const tree = {
      identity: {
        name: 'app',
        scheme: { development: 'a-dev', preview: 'a-pre', production: 'a' },
      },
    };
    expect(defineEnvWith(tree, 'production')).toEqual({
      identity: { name: 'app', scheme: 'a' },
    });
  });

  it('배열은 leaf 로 두고 내려가지 않는다', () => {
    const hosts = ['a.example', 'b.example'];
    const resolved = defineEnvWith({ hosts }, 'development') as { hosts: string[] };
    expect(resolved.hosts).toEqual(hosts);
  });

  it('환경 키가 하나라도 빠지면 throw 한다 — 조용히 undefined 가 되지 않게', () => {
    const tree = { urls: { api: { development: 'dev', production: 'prod' } } };
    expect(() => defineEnvWith(tree, 'development')).toThrow(
      /Malformed env record at "Env.urls.api"/
    );
  });

  it('환경 키에 다른 키가 섞이면 throw 한다', () => {
    const tree = { api: { development: 'd', preview: 'p', production: 'r', staging: 's' } };
    expect(() => defineEnvWith(tree, 'development')).toThrow(/Malformed env record/);
  });

  it('경로를 메시지에 담는다 — 어느 필드인지 바로 찾게', () => {
    const tree = { a: { b: { c: { development: 1, preview: 2 } } } };
    expect(() => defineEnvWith(tree, 'preview')).toThrow(/"Env\.a\.b\.c"/);
  });

  it('환경마다 다른 값을 고른다', () => {
    const tree = { v: { development: 1, preview: 2, production: 3 } };
    expect(defineEnvWith(tree, 'development')).toEqual({ v: 1 });
    expect(defineEnvWith(tree, 'preview')).toEqual({ v: 2 });
    expect(defineEnvWith(tree, 'production')).toEqual({ v: 3 });
  });
});
