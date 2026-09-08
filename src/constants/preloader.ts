/** 프리로더 단계. 순서대로 실행. forced-update·ota 는 콜백 주입 시 활성. */
export const STAGES = ['hydrate', 'forced-update-check', 'ota-check', 'permissions-check'] as const;
