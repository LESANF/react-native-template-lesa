/**
 * Preloader 파이프라인 단계. 순서대로 실행.
 * forced-update-check / ota-check는 현재 no-op 스텁 (콜백 주입 시 활성화).
 */
export const STAGES = ['hydrate', 'forced-update-check', 'ota-check', 'permissions-check'] as const;
