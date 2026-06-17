/**
 * 화면(라우트)이 아니지만 앱 전역에 떠 있어야 하는 것들을 여기서 마운트한다.
 * 네비게이터 형제로 children 뒤에 렌더 → 화면 위에 겹친다. 프로바이더(감싸는 것)와 구분 — 여긴 "띄우는 것".
 *
 *   예) <FlashMessage />, 전역 <FilterBottomSheet />, <IOSKeyboardToolbar />, dev <NetLogFab />
 *   헤드리스 러너(UI 없음)도 여기: <DeepLinkRunner />, <AuthIntentRunner />
 *
 * 각 컴포넌트의 실체는 자기 폴더(features/·components/)에 두고, 여기선 "모아서 마운트"만.
 * (jp처럼 프로바이더 피라미드에 섞지 않기 위한 별도 공간.)
 */
export function GlobalOverlays() {
  return null; // 아직 없음 — 라이브러리/컴포넌트 추가 시 여기에 한 줄씩
}
